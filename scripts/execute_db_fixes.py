#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
执行数据库修复：
  步骤1: 清洗 summary 和 abstract 的前缀噪音，以 abstract 为准同步回 summary
  步骤2: 重新抓取乱码全文 (full_text)
  步骤3: 生成修复明细报告

使用方式:
  python execute_db_fixes.py              # dry-run 模式，不写数据库
  python execute_db_fixes.py --apply      # 真正写回数据库
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
from pathlib import Path
from typing import Dict, List, Optional

ROOT = Path(__file__).resolve().parent
sys.path.append(str(ROOT))

import refill_article_details as rad

SCAN_FILE = ROOT / "_db_content_quality_scan.json"
REPORT_FILE = ROOT / "_db_fix_execution_report.json"
CHECKPOINT_FILE = ROOT / "_db_fix_checkpoint.json"

TIMESTAMP_PREFIX = re.compile(
    r"^\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?(\s+\d{1,2}:\d{2}(:\d{2})?)?\s*[，,]?\s*|"
    r"\d{1,2}月\d{1,2}日\s*[，,]?\s*)"
)
NOISY_PREFIX = re.compile(
    r"^\s*((新华社|人民网|本报|央视网|新华网|中新网|光明日报|经济日报|中国青年报)[\w]*"
    r"(北京|上海|广州|深圳|武汉|成都|重庆|南京|杭州|西安|长沙|天津|郑州|沈阳|哈尔滨|长春|济南|福州|合肥|昆明|贵阳|南宁|兰州|银川|西宁|乌鲁木齐|呼和浩特|拉萨|海口|石家庄|太原|南昌)?"
    r"\d{1,2}月\d{1,2}日?\s*电\s*[，,]?\s*)"
)
MOJIBAKE_PATTERN = re.compile(
    r"[ÃÂÐÑØæåçéêëîïðñòóôõöøùúûüýþÿ]{2,}|�|&#xfffd;|[\u0080-\u009f]{2,}"
)


def clean_summary(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = TIMESTAMP_PREFIX.sub("", cleaned)
    cleaned = NOISY_PREFIX.sub("", cleaned)
    cleaned = cleaned.strip()
    if cleaned.startswith("，"):
        cleaned = cleaned[1:].strip()
    if cleaned.startswith("，"):
        cleaned = cleaned[1:].strip()
    return cleaned


def is_mojibake(text: str) -> bool:
    if not text:
        return False
    return bool(MOJIBAKE_PATTERN.search(text))


def fetch_detail_rows(ids: List[str]) -> List[dict]:
    if not ids:
        return []
    all_rows = []
    batch_size = 50
    for i in range(0, len(ids), batch_size):
        batch_ids = ids[i:i + batch_size]
        print(f"    detail batch {i // batch_size + 1}/{(len(ids) + batch_size - 1) // batch_size} ({len(batch_ids)} ids)...", flush=True, end=" ")
        quoted = ",".join(f'"{item}"' for item in batch_ids)
        query = urllib.parse.urlencode({
            "select": "id,abstract,full_text",
            "id": f"in.({quoted})",
        })
        rows = rad.supabase_request(f"/rest/v1/article_details?{query}") or []
        print(f"{len(rows)} rows", flush=True)
        all_rows.extend(rows)
    return all_rows


def fetch_article_rows(ids: List[str]) -> List[dict]:
    if not ids:
        return []
    all_rows = []
    batch_size = 50
    for i in range(0, len(ids), batch_size):
        batch_ids = ids[i:i + batch_size]
        print(f"    article batch {i // batch_size + 1}/{(len(ids) + batch_size - 1) // batch_size} ({len(batch_ids)} ids)...", flush=True, end=" ")
        quoted = ",".join(f'"{item}"' for item in batch_ids)
        query = urllib.parse.urlencode({
            "select": "id,title,summary,url",
            "id": f"in.({quoted})",
        })
        rows = rad.supabase_request(f"/rest/v1/articles?{query}") or []
        print(f"{len(rows)} rows", flush=True)
        all_rows.extend(rows)
    return all_rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="真正写回数据库")
    parser.add_argument("--skip-fulltext", action="store_true", help="跳过全文重抓")
    parser.add_argument("--skip-summary", action="store_true", help="跳过摘要清洗")
    args = parser.parse_args()

    mode_label = "APPLY" if args.apply else "DRY-RUN"
    print(f"=== 数据库修复执行 ({mode_label}) ===\n", flush=True)

    if not SCAN_FILE.exists():
        print("请先运行 scan_db_content_quality.py", flush=True)
        return

    scan = json.loads(SCAN_FILE.read_text(encoding="utf-8"))

    summary_hits = scan.get("summary_hits", [])
    fulltext_hits = scan.get("fulltext_hits", [])
    mismatch_hits = scan.get("mismatch_hits", [])

    summary_ids = {item["id"] for item in summary_hits}
    fulltext_ids = {item["id"] for item in fulltext_hits if "mojibake" in item.get("issues", [])}
    mismatch_ids = {item["id"] for item in mismatch_hits}

    all_ids = list(summary_ids | fulltext_ids | mismatch_ids)
    print(f"涉及文章总数: {len(all_ids)}", flush=True)
    print(f"  - 摘要需清洗: {len(summary_ids)}", flush=True)
    print(f"  - 全文乱码需重抓: {len(fulltext_ids)}", flush=True)
    print(f"  - summary/abstract 不一致: {len(mismatch_ids)}", flush=True)
    print(flush=True)

    print("正在从数据库获取文章数据...", flush=True)
    try:
        detail_rows_raw = fetch_detail_rows(all_ids)
        print(f"  获取到 {len(detail_rows_raw)} 条详情记录", flush=True)
    except Exception as exc:
        print(f"  获取详情数据失败: {exc}", flush=True)
        detail_rows_raw = []
    try:
        article_rows_raw = fetch_article_rows(all_ids)
        print(f"  获取到 {len(article_rows_raw)} 条文章记录", flush=True)
    except Exception as exc:
        print(f"  获取文章数据失败: {exc}", flush=True)
        article_rows_raw = []
    detail_map = {row["id"]: row for row in detail_rows_raw}
    article_map = {row["id"]: row for row in article_rows_raw}

    report = {
        "mode": mode_label,
        "summary_cleaned": [],
        "fulltext_refilled": [],
        "synced_abstract_to_summary": [],
        "errors": [],
    }

    token = None
    if args.apply:
        token = rad.get_write_token()

    # ========== 步骤1: 清洗摘要 + 同步 ==========
    if not args.skip_summary:
        print(f"--- 步骤1: 清洗摘要前缀 + 以 abstract 为准同步回 summary ---", flush=True)
        summary_cleaned_count = 0
        synced_count = 0

        for aid in sorted(all_ids):
            detail = detail_map.get(aid, {})
            article = article_map.get(aid, {})

            old_summary = (article.get("summary") or "").strip()
            old_abstract = (detail.get("abstract") or "").strip()

            cleaned_summary = clean_summary(old_summary)
            cleaned_abstract = clean_summary(old_abstract)

            final_abstract = cleaned_abstract if cleaned_abstract else cleaned_summary
            final_summary = final_abstract

            summary_changed = old_summary != final_summary
            abstract_changed = old_abstract != final_abstract
            needs_sync = final_summary != final_abstract

            if not summary_changed and not abstract_changed and not needs_sync:
                continue

            entry = {
                "id": aid,
                "title": article.get("title", ""),
                "old_summary": old_summary[:120],
                "old_abstract": old_abstract[:120],
                "cleaned_summary": cleaned_summary[:120],
                "cleaned_abstract": cleaned_abstract[:120],
                "final_abstract": final_abstract[:120],
                "final_summary": final_summary[:120],
            }

            if args.apply and token:
                try:
                    if summary_changed or needs_sync:
                        rad.patch_article_summary(token, aid, final_summary)
                    if abstract_changed:
                        rad.patch_article_detail(token, aid, {"abstract": final_abstract})
                    summary_cleaned_count += 1
                    if needs_sync or summary_changed:
                        synced_count += 1
                except Exception as exc:
                    report["errors"].append({"id": aid, "step": "summary_clean", "error": str(exc)})
                    continue
            else:
                summary_cleaned_count += 1
                if needs_sync or summary_changed:
                    synced_count += 1

            report["summary_cleaned"].append(entry)

        print(f"  清洗完成: {summary_cleaned_count} 篇", flush=True)
        print(f"  同步完成: {synced_count} 篇 (abstract -> summary)", flush=True)
        print(flush=True)

    # ========== 步骤2: 重抓乱码全文 ==========
    if not args.skip_fulltext:
        print(f"--- 步骤2: 重新抓取乱码全文 ({len(fulltext_ids)} 篇) ---")

        fulltext_ids_sorted = sorted(fulltext_ids)
        batch_size = 10
        refilled_count = 0
        error_count = 0

        for batch_start in range(0, len(fulltext_ids_sorted), batch_size):
            batch = fulltext_ids_sorted[batch_start:batch_start + batch_size]
            print(f"  批次 {batch_start // batch_size + 1}/{(len(fulltext_ids_sorted) + batch_size - 1) // batch_size}: 处理 {len(batch)} 篇...")

            for aid in batch:
                article = article_map.get(aid, {})
                detail = detail_map.get(aid, {})
                title = article.get("title", "")
                url = (article.get("url") or "").strip()

                if not url:
                    report["errors"].append({"id": aid, "step": "fulltext_refill", "error": "URL为空"})
                    error_count += 1
                    continue

                try:
                    page_html = rad.fetch_html(url)
                    extracted = rad.extract_text_from_html(page_html)
                    cleaned_text = rad.clean_full_text(title, article.get("source", ""), extracted)

                    if len(cleaned_text) < 40:
                        report["errors"].append({"id": aid, "step": "fulltext_refill", "error": f"正文过短({len(cleaned_text)}字)"})
                        error_count += 1
                        continue

                    entry = {
                        "id": aid,
                        "title": title,
                        "url": url,
                        "old_fulltext_len": len((detail.get("full_text") or "")),
                        "new_fulltext_len": len(cleaned_text),
                        "preview": cleaned_text[:150],
                    }

                    if args.apply and token:
                        rad.patch_article_detail(token, aid, {"full_text": cleaned_text})

                    refilled_count += 1
                    report["fulltext_refilled"].append(entry)

                except Exception as exc:
                    report["errors"].append({"id": aid, "step": "fulltext_refill", "error": str(exc)})
                    error_count += 1

            if batch_start + batch_size < len(fulltext_ids_sorted):
                time.sleep(0.5)

        print(f"  重抓完成: {refilled_count} 篇成功, {error_count} 篇失败")
        print()

    # ========== 保存报告 ==========
    report["summary"] = {
        "total_articles": len(all_ids),
        "summary_cleaned": len(report["summary_cleaned"]),
        "fulltext_refilled": len(report["fulltext_refilled"]),
        "errors": len(report["errors"]),
    }

    REPORT_FILE.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"修复明细报告已保存: {REPORT_FILE}")

    if report["errors"]:
        print(f"\n错误明细:")
        for err in report["errors"][:20]:
            print(f"  - {err['id']}: [{err['step']}] {err['error']}")


if __name__ == "__main__":
    main()
