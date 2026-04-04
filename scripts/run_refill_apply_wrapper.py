#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通过模块方式执行 article_details 批量回填，并输出结构化结果。

用途：
- 避开 PowerShell 里长 here-string + PSReadLine 的终端显示 bug；
- 复用 refill_article_details.py 的抓取、清洗、写库逻辑；
- 在执行结束后把 ready/error 统计写入 JSON，便于自动核验。
"""

from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.append(str(ROOT))

import refill_article_details as rad


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="执行 article_details 批量回填")
    parser.add_argument(
        "--service-role-key",
        default="",
        help="Supabase service role key；仅当前进程内使用，不写入文件",
    )
    parser.add_argument("--ids-file", default="", help="候选 ID 列表 JSON 文件")
    parser.add_argument("--offset", type=int, default=0, help="从候选列表第 N 条开始")
    parser.add_argument("--limit", type=int, default=0, help="仅处理前 N 条；0 表示全部")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.service_role_key:
        rad.SERVICE_ROLE_KEY = args.service_role_key.strip()

    if args.ids_file:
        ids_path = Path(args.ids_file)
        id_list = json.loads(ids_path.read_text(encoding="utf-8"))
        selected_ids = id_list[args.offset :]
        if args.limit > 0:
            selected_ids = selected_ids[: args.limit]
        articles = rad.fetch_rows_by_ids(
            rad.ARTICLES_TABLE,
            "id,title,date,source,url,summary",
            selected_ids,
        )
        details = rad.fetch_rows_by_ids(
            rad.DETAILS_TABLE,
            "id,abstract,full_text,analysis",
            selected_ids,
        )
        detail_map = {item["id"]: item for item in details}
        article_map = {item["id"]: item for item in articles}
        candidates = [
            (article_map[item_id], detail_map.get(item_id))
            for item_id in selected_ids
            if item_id in article_map
        ]
    else:
        articles = rad.fetch_all_rows(
            rad.ARTICLES_TABLE,
            "id,title,date,source,url,summary",
            "date.desc",
            batch_size=500,
        )
        details = rad.fetch_all_rows(
            rad.DETAILS_TABLE,
            "id,abstract,full_text,analysis",
            "id.asc",
            batch_size=500,
        )
        detail_map = {item["id"]: item for item in details}
        candidates = [
            (article, detail_map.get(article["id"]))
            for article in articles
            if rad.needs_refill(article, detail_map.get(article["id"]))
        ]

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        future_map = {
            executor.submit(rad.process_article, article, detail): article.get("id")
            for article, detail in candidates
        }
        for future in concurrent.futures.as_completed(future_map):
            results.append(future.result())

    results.sort(key=lambda item: item.id)
    ready = [item for item in results if item.status == "ready"]
    errors = [item for item in results if item.status == "error"]

    token = rad.get_write_token()
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
        "ids_file": args.ids_file,
        "offset": args.offset,
        "limit": args.limit,
        "candidate_count": len(candidates),
        "ready_count": len(ready),
        "error_count": len(errors),
        "ready_ids": [item.id for item in ready[:100]],
        "error_samples": [
            {"id": item.id, "title": item.title, "note": item.note}
            for item in errors[:50]
        ],
    }
    output_path = ROOT / "_manual_apply_summary.json"
    output_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"候选文章数: {len(candidates)}")
    print(f"可处理: {len(ready)}")
    print(f"错误: {len(errors)}")
    print(f"结果: {output_path}")


if __name__ == "__main__":
    main()
