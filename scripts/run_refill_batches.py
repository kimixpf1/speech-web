#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
按固定 ID 快照分批执行 article_details 回填，支持断点续跑。

设计目标：
- 避开 Trae PowerShell 终端对长批任务的中断问题；
- 每批单独写出结果文件，便于复查 ready/error；
- 可通过 checkpoint 从上次 offset 继续，不重复手工计算批次。
"""

from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import json
import sys
from pathlib import Path
from typing import List

ROOT = Path(__file__).resolve().parent
sys.path.append(str(ROOT))

import refill_article_details as rad


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="按批次执行 article_details 回填")
    parser.add_argument("--ids-file", required=True, help="候选 ID 列表 JSON 文件")
    parser.add_argument("--service-role-key", default="", help="仅当前进程内使用的 service role key")
    parser.add_argument("--service-role-key-file", default="", help="本地 service role key 文本文件")
    parser.add_argument("--batch-size", type=int, default=20, help="每批处理条数")
    parser.add_argument("--start-offset", type=int, default=0, help="从第 N 条候选开始")
    parser.add_argument("--end-offset", type=int, default=-1, help="处理到第 N 条候选为止，-1 表示到末尾")
    parser.add_argument("--workers", type=int, default=4, help="每批并发数")
    parser.add_argument(
        "--checkpoint-file",
        default="",
        help="进度文件路径；默认写到 scripts/_refill_batch_progress.json",
    )
    parser.add_argument(
        "--summary-dir",
        default="",
        help="批次结果目录；默认写到 scripts/refill_batch_runs",
    )
    parser.add_argument("--resume", action="store_true", help="若存在 checkpoint，则从 checkpoint.next_offset 继续")
    return parser.parse_args()


def load_ids(path: Path) -> List[str]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("ids-file 必须是 JSON 数组")
    return [str(item) for item in payload if str(item).strip()]


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    args = parse_args()
    if args.service_role_key:
        rad.SERVICE_ROLE_KEY = args.service_role_key.strip()
    elif args.service_role_key_file:
        key_path = Path(args.service_role_key_file)
        if not key_path.is_absolute():
            key_path = (Path.cwd() / key_path).resolve()
        rad.SERVICE_ROLE_KEY = key_path.read_text(encoding="utf-8").strip()

    ids_path = Path(args.ids_file)
    if not ids_path.is_absolute():
        ids_path = (Path.cwd() / ids_path).resolve()
    checkpoint_path = (
        Path(args.checkpoint_file).resolve()
        if args.checkpoint_file
        else (ROOT / "_refill_batch_progress.json").resolve()
    )
    summary_dir = (
        Path(args.summary_dir).resolve()
        if args.summary_dir
        else (ROOT / "refill_batch_runs").resolve()
    )

    id_list = load_ids(ids_path)
    total_count = len(id_list)
    start_offset = max(args.start_offset, 0)
    if args.resume and checkpoint_path.exists():
        checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8"))
        start_offset = int(checkpoint.get("next_offset", start_offset))
    end_offset = total_count if args.end_offset < 0 else min(args.end_offset, total_count)
    batch_size = max(args.batch_size, 1)
    workers = max(args.workers, 1)

    if start_offset >= end_offset:
        print(f"无需执行，start_offset={start_offset} end_offset={end_offset}")
        return

    token = rad.get_write_token()
    print(f"总候选数: {total_count}")
    print(f"执行范围: {start_offset} -> {end_offset}")
    print(f"批次大小: {batch_size}")

    for batch_start in range(start_offset, end_offset, batch_size):
        batch_end = min(batch_start + batch_size, end_offset)
        batch_ids = id_list[batch_start:batch_end]
        timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
        print(f"[batch] {batch_start}:{batch_end} 开始，ID 数 {len(batch_ids)}")

        articles = rad.fetch_rows_by_ids(
            rad.ARTICLES_TABLE,
            "id,title,date,source,url,summary",
            batch_ids,
        )
        details = rad.fetch_rows_by_ids(
            rad.DETAILS_TABLE,
            "id,abstract,full_text,analysis",
            batch_ids,
        )
        article_map = {item["id"]: item for item in articles}
        detail_map = {item["id"]: item for item in details}
        candidates = [
            (article_map[item_id], detail_map.get(item_id))
            for item_id in batch_ids
            if item_id in article_map
        ]

        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
            future_map = {
                executor.submit(rad.process_article, article, detail): article.get("id")
                for article, detail in candidates
            }
            for future in concurrent.futures.as_completed(future_map):
                results.append(future.result())

        results.sort(key=lambda item: item.id)
        ready = [item for item in results if item.status == "ready"]
        errors = [item for item in results if item.status == "error"]
        skipped = [item for item in results if item.status == "skipped"]

        for item in ready:
            rad.patch_article_summary(token, item.id, item.new_summary)
            rad.patch_article_detail(
                token,
                item.id,
                {
                    "abstract": item.new_summary,
                    "full_text": item.new_full_text,
                },
            )

        summary = {
            "finished_at": dt.datetime.now().isoformat(),
            "ids_file": str(ids_path),
            "batch_start": batch_start,
            "batch_end": batch_end,
            "batch_size": batch_size,
            "candidate_count": len(candidates),
            "ready_count": len(ready),
            "error_count": len(errors),
            "skipped_count": len(skipped),
            "ready_ids": [item.id for item in ready],
            "error_samples": [
                {"id": item.id, "title": item.title, "note": item.note}
                for item in errors[:20]
            ],
        }
        summary_path = summary_dir / f"batch_{batch_start:04d}_{batch_end:04d}_{timestamp}.json"
        write_json(summary_path, summary)

        checkpoint = {
            "updated_at": dt.datetime.now().isoformat(),
            "ids_file": str(ids_path),
            "total_count": total_count,
            "next_offset": batch_end,
            "last_batch_start": batch_start,
            "last_batch_end": batch_end,
            "last_summary_path": str(summary_path),
        }
        write_json(checkpoint_path, checkpoint)

        print(
            f"[batch] {batch_start}:{batch_end} 完成 | ready={len(ready)} "
            f"error={len(errors)} skipped={len(skipped)}"
        )
        print(f"[batch] 结果: {summary_path}")

    print("全部批次执行完成")
    print(f"checkpoint: {checkpoint_path}")


if __name__ == "__main__":
    main()
