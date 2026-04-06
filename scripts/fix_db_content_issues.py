#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复数据库中的乱码原文和有问题的摘要。
生成修复明细报告，然后执行修复。
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.append(str(ROOT))

import refill_article_details as rad

SCAN_FILE = ROOT / "_db_content_quality_scan.json"
REPORT_FILE = ROOT / "_db_fix_report.json"


TIMESTAMP_PREFIX = re.compile(
    r"^\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?(\s+\d{1,2}:\d{2}(:\d{2})?)?\s*[，,]?\s*|"
    r"\d{1,2}月\d{1,2}日\s*[，,]?\s*)"
)
NOISY_PREFIX = re.compile(
    r"^\s*((新华社|人民网|本报|央视网|新华网|中新网|光明日报|经济日报|中国青年报)[\w]*"
    r"(北京|上海|广州|深圳|武汉|成都|重庆|南京|杭州|西安|长沙|天津|郑州|沈阳|哈尔滨|长春|济南|福州|合肥|昆明|贵阳|南宁|兰州|银川|西宁|乌鲁木齐|呼和浩特|拉萨|海口|石家庄|太原|南昌)?"
    r"\d{1,2}月\d{1,2}日?\s*电\s*[，,]?\s*)"
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
    pattern = re.compile(
        r"[ÃÂÐÑØæåçéêëîïðñòóôõöøùúûüýþÿ]{2,}|�|&#xfffd;|[\u0080-\u009f]{2,}"
    )
    return bool(pattern.search(text))


def main() -> None:
    if not SCAN_FILE.exists():
        print("请先运行 scan_db_content_quality.py")
        return

    scan = json.loads(SCAN_FILE.read_text(encoding="utf-8"))

    summary_hits = scan.get("summary_hits", [])
    fulltext_hits = scan.get("fulltext_hits", [])
    mismatch_hits = scan.get("mismatch_hits", [])

    fix_report = {
        "summary_clean_fixes": [],
        "fulltext_refill_ids": [],
        "mismatch_fixes": [],
    }

    summary_fix_ids = set()
    for item in summary_hits:
        sid = item["id"]
        summary_issues = item.get("summary_issues", [])
        abstract_issues = item.get("abstract_issues", [])
        if not summary_issues and not abstract_issues:
            continue
        has_source = "source_prefix" in summary_issues or "source_prefix" in abstract_issues
        has_timestamp = "timestamp_prefix" in summary_issues or "timestamp_prefix" in abstract_issues
        has_tail = "tail_noise" in summary_issues or "tail_noise" in abstract_issues
        fix_report["summary_clean_fixes"].append({
            "id": sid,
            "title": item.get("title"),
            "issues": list(set(summary_issues + abstract_issues)),
            "action": "清理前缀/噪音" if (has_source or has_timestamp or has_tail) else "需检查",
        })
        summary_fix_ids.add(sid)

    fulltext_fix_ids = set()
    for item in fulltext_hits:
        fid = item["id"]
        issues = item.get("issues", [])
        if "mojibake" in issues:
            fix_report["fulltext_refill_ids"].append({
                "id": fid,
                "title": item.get("title"),
                "reason": "原文乱码(UTF-8编码错误)，需重新抓取",
            })
            fulltext_fix_ids.add(fid)
        elif "empty" in issues:
            fix_report["fulltext_refill_ids"].append({
                "id": fid,
                "title": item.get("title"),
                "reason": "原文为空，需重新抓取",
            })
            fulltext_fix_ids.add(fid)

    for item in mismatch_hits:
        fix_report["mismatch_fixes"].append({
            "id": item["id"],
            "title": item.get("title"),
            "action": "以 summary 为准同步 abstract",
        })

    print(f"摘要需清理: {len(summary_fix_ids)} 篇")
    print(f"原文需重抓: {len(fulltext_fix_ids)} 篇")
    print(f"摘要/abstract不一致: {len(mismatch_hits)} 篇")

    REPORT_FILE.write_text(
        json.dumps(fix_report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"明细报告已保存: {REPORT_FILE}")


if __name__ == "__main__":
    main()
