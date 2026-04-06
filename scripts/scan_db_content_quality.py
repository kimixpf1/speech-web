#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接扫描数据库中的 articles.summary / article_details.abstract / full_text 质量。
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.append(str(ROOT))

import refill_article_details as rad

MOJIBAKE_PATTERN = re.compile(
    r"[ÃÂÐÑØæåçéêëîïðñòóôõöøùúûüýþÿ]{2,}|�|&#xfffd;|[\u0080-\u009f]{2,}"
)
TIMESTAMP_PREFIX = re.compile(
    r"^\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?(\s+\d{1,2}:\d{2})?|\d{1,2}月\d{1,2}日)"
)
NOISY_PREFIX = re.compile(r"^\s*(新华社|人民网|本报|央视网|新华网|中新网|来源[:：])")


def normalize_text(value: str) -> str:
    text = (value or "").strip()
    text = re.sub(r"\s+", " ", text)
    return text


def looks_bad_summary(text: str) -> list[str]:
    issues: list[str] = []
    normalized = normalize_text(text)
    if not normalized:
        issues.append("empty")
        return issues
    if MOJIBAKE_PATTERN.search(normalized):
        issues.append("mojibake")
    if TIMESTAMP_PREFIX.search(normalized):
        issues.append("timestamp_prefix")
    if NOISY_PREFIX.search(normalized):
        issues.append("source_prefix")
    if len(normalized) < 20:
        issues.append("too_short")
    if "责任编辑" in normalized or "原标题" in normalized or "【纠错】" in normalized:
        issues.append("tail_noise")
    return issues


def looks_bad_full_text(text: str) -> list[str]:
    issues: list[str] = []
    normalized = normalize_text(text)
    if not normalized:
        issues.append("empty")
        return issues
    if MOJIBAKE_PATTERN.search(normalized):
        issues.append("mojibake")
    return issues


def main() -> None:
    articles = rad.fetch_all_rows(
        rad.ARTICLES_TABLE,
        "id,title,summary,url,source,date",
        "date.desc",
        batch_size=100,
    )
    details = rad.fetch_all_rows(
        rad.DETAILS_TABLE,
        "id,abstract,full_text",
        "id.asc",
        batch_size=100,
    )
    detail_map = {item["id"]: item for item in details}

    summary_hits = []
    fulltext_hits = []
    mismatch_hits = []

    for article in articles:
        article_id = article["id"]
        detail = detail_map.get(article_id, {})
        summary = article.get("summary") or ""
        abstract = detail.get("abstract") or ""
        full_text = detail.get("full_text") or ""

        summary_issues = looks_bad_summary(summary)
        abstract_issues = looks_bad_summary(abstract)
        fulltext_issues = looks_bad_full_text(full_text)

        if summary_issues or abstract_issues:
            summary_hits.append(
                {
                    "id": article_id,
                    "title": article.get("title"),
                    "summary_issues": summary_issues,
                    "abstract_issues": abstract_issues,
                    "summary_preview": normalize_text(summary)[:220],
                    "abstract_preview": normalize_text(abstract)[:220],
                }
            )

        if fulltext_issues:
            fulltext_hits.append(
                {
                    "id": article_id,
                    "title": article.get("title"),
                    "issues": fulltext_issues,
                    "preview": normalize_text(full_text)[:300],
                }
            )

        normalized_summary = normalize_text(summary)
        normalized_abstract = normalize_text(abstract)
        if normalized_summary and normalized_abstract and normalized_summary != normalized_abstract:
            mismatch_hits.append(
                {
                    "id": article_id,
                    "title": article.get("title"),
                    "summary_preview": normalized_summary[:180],
                    "abstract_preview": normalized_abstract[:180],
                }
            )

    output = {
        "summary_issue_count": len(summary_hits),
        "fulltext_issue_count": len(fulltext_hits),
        "summary_abstract_mismatch_count": len(mismatch_hits),
        "summary_hits": summary_hits[:300],
        "fulltext_hits": fulltext_hits[:300],
        "mismatch_hits": mismatch_hits[:300],
    }
    (ROOT / "_db_content_quality_scan.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(
        f"summary_issue_count={len(summary_hits)} "
        f"fulltext_issue_count={len(fulltext_hits)} "
        f"mismatch_count={len(mismatch_hits)}"
    )


if __name__ == "__main__":
    main()
