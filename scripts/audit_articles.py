#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量审计文章链接与详情内容质量，并输出 Markdown 日志。
"""

from __future__ import annotations

import concurrent.futures
import datetime as dt
import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import requests

SUPABASE_URL = "https://ejeiuqcmkznfbglvbkbe.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0."
    "NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg"
)
HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "User-Agent": "Mozilla/5.0 (Trae Audit Script)",
}
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
PLACEHOLDER_URLS = {"http://www.news.cn/", "https://www.qstheory.cn/"}
PLACEHOLDER_TEXTS = {"原文加载中...", "解读分析正在整理中...", "摘要正在整理中..."}
ROOT = Path(__file__).resolve().parent


@dataclass
class UrlCheckResult:
    id: str
    title: str
    source: str
    url: str
    normalized_url: str
    status: str
    final_url: str
    note: str = ""


def supabase_get(path: str, params: Dict[str, object]) -> List[dict]:
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=HEADERS,
        params=params,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def fetch_all_rows(path: str, select_sql: str, order_sql: str) -> List[dict]:
    items: List[dict] = []
    offset = 0
    limit = 1000

    while True:
        batch = supabase_get(
            path,
            {
                "select": select_sql,
                "order": order_sql,
                "limit": limit,
                "offset": offset,
            },
        )
        if not batch:
            break
        items.extend(batch)
        if len(batch) < limit:
            break
        offset += limit

    return items


def normalize_url(url: str) -> str:
    normalized = (url or "").strip()
    if not normalized:
        return ""

    replacement_map = {
        "http://paper.people.com.cn/rmrb/pc/content/202603/07/content_30143879.html": "https://paper.people.com.cn/rmrb/pc/content/202603/07/content_30143879.html",
        "http://paper.people.com.cn/rmrb/pc/content/202603/08/content_30143971.html": "https://paper.people.com.cn/rmrb/pc/content/202603/08/content_30143971.html",
        "http://paper.people.com.cn/rmrb/pc/content/202603/18/content_30145794.html": "https://paper.people.com.cn/rmrb/pc/content/202603/18/content_30145794.html",
        "http://www.news.cn/politics/leaders/20240424/84305235338744fd833e447a002574e4/c.html": "https://www.news.cn/politics/leaders/20240424/84305235338744fd833e447a002574e4/c.html",
        "http://www.news.cn/politics/20240321/c280965c8ddd41ff9659dbeb0d9e51b6/c.html": "https://www.news.cn/politics/20240321/c280965c8ddd41ff9659dbeb0d9e51b6/c.html",
        "http://www.news.cn/20240908/53d07ce1b0ba47e8a45bb75022109cc9/c.html": "https://www.news.cn/20240908/53d07ce1b0ba47e8a45bb75022109cc9/c.html",
        "http://www.cppcc.gov.cn/zxww/2025/12/31/ARTI1767168160430186.shtml": "https://www.cppcc.gov.cn/zxww/2025/12/31/ARTI1767168160430186.shtml",
        "https://js.people.com.cn/n2/2026/0306/c358232-41516244.html": "https://cpc.people.com.cn/n1/2026/0306/c435113-40676004.html",
        "http://js.people.com.cn/n2/2026/0306/c358232-41516244.html": "https://cpc.people.com.cn/n1/2026/0306/c435113-40676004.html",
        "http://paper.people.com.cn/rmrb/pc/content/20260306/content_30143971.html": "https://cpc.people.com.cn/n1/2026/0306/c435113-40676004.html",
    }

    normalized = replacement_map.get(normalized, normalized)

    if normalized.startswith("http://"):
        normalized = "https://" + normalized[len("http://") :]

    return normalized


def classify_detail_issue(detail: Optional[dict]) -> List[str]:
    issues: List[str] = []
    if not detail:
        return ["缺少详情记录"]

    abstract = (detail.get("abstract") or "").strip()
    full_text = (detail.get("full_text") or "").strip()
    analysis = (detail.get("analysis") or "").strip()

    if not abstract or abstract in PLACEHOLDER_TEXTS or len(abstract) < 20:
        issues.append("摘要缺失或过短")
    if not full_text or full_text in PLACEHOLDER_TEXTS or "加载中" in full_text:
        issues.append("正文缺失")
    if not analysis or analysis in PLACEHOLDER_TEXTS:
        issues.append("解读缺失")

    return issues


def check_url(article: dict) -> UrlCheckResult:
    article_id = article.get("id", "")
    title = article.get("title", "")
    source = article.get("source", "")
    raw_url = (article.get("url") or "").strip()
    normalized_url = normalize_url(raw_url)

    if not raw_url:
        return UrlCheckResult(article_id, title, source, raw_url, normalized_url, "EMPTY", "", "链接为空")
    if raw_url in PLACEHOLDER_URLS:
        return UrlCheckResult(article_id, title, source, raw_url, normalized_url, "PLACEHOLDER", normalized_url, "占位链接")
    if not re.match(r"^https?://", normalized_url):
        return UrlCheckResult(article_id, title, source, raw_url, normalized_url, "INVALID", normalized_url, "不是合法 http/https 链接")

    try:
        response = requests.get(
            normalized_url,
            headers=REQUEST_HEADERS,
            timeout=15,
            allow_redirects=True,
            stream=True,
        )
        final_url = response.url or normalized_url
        status = str(response.status_code)
        note = ""
        if raw_url != normalized_url:
            note = f"已归一化为 {normalized_url}"
        elif final_url != normalized_url:
            note = f"跳转到 {final_url}"
        response.close()
        return UrlCheckResult(article_id, title, source, raw_url, normalized_url, status, final_url, note)
    except requests.exceptions.Timeout:
        return UrlCheckResult(article_id, title, source, raw_url, normalized_url, "TIMEOUT", normalized_url, "请求超时")
    except requests.exceptions.RequestException as exc:
        return UrlCheckResult(article_id, title, source, raw_url, normalized_url, "ERROR", normalized_url, str(exc))


def main() -> None:
    now = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    articles = fetch_all_rows(
        "articles",
        "id,title,date,source,url,summary,is_zhengjiguan",
        "date.desc",
    )
    details = fetch_all_rows(
        "article_details",
        "id,abstract,full_text,analysis",
        "id.asc",
    )
    detail_map = {detail["id"]: detail for detail in details}

    detail_issues: List[dict] = []
    missing_summaries: List[dict] = []
    for article in articles:
        summary = (article.get("summary") or "").strip()
        if not summary or len(summary) < 20:
            missing_summaries.append(
                {
                    "id": article.get("id"),
                    "title": article.get("title"),
                    "summary_len": len(summary),
                }
            )

        issues = classify_detail_issue(detail_map.get(article["id"]))
        if issues:
            detail_issues.append(
                {
                    "id": article.get("id"),
                    "title": article.get("title"),
                    "issues": issues,
                }
            )

    url_results: List[UrlCheckResult] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(check_url, article) for article in articles]
        for future in concurrent.futures.as_completed(futures):
            url_results.append(future.result())

    url_results.sort(key=lambda item: item.id)
    broken_urls = [item for item in url_results if item.status not in {"200", "301", "302"}]
    normalized_urls = [item for item in url_results if item.url != item.normalized_url]
    redirected_urls = [
        item for item in url_results if item.status == "200" and item.final_url and item.final_url != item.normalized_url
    ]
    non_https_originals = [item for item in url_results if item.url.startswith("http://")]

    detail_counter = Counter()
    for item in detail_issues:
        detail_counter.update(item["issues"])

    log_lines: List[str] = []
    log_lines.append("# 文章链接与内容体检日志")
    log_lines.append("")
    log_lines.append(f"- 排查时间：{now}")
    log_lines.append(f"- 文章总数：{len(articles)}")
    log_lines.append(f"- 详情记录数：{len(details)}")
    log_lines.append(f"- 链接异常数：{len(broken_urls)}")
    log_lines.append(f"- 原始非 HTTPS 链接数：{len(non_https_originals)}")
    log_lines.append(f"- 自动归一化链接数：{len(normalized_urls)}")
    log_lines.append(f"- 发生跳转的链接数：{len(redirected_urls)}")
    log_lines.append(f"- 摘要异常数：{len(missing_summaries)}")
    log_lines.append(f"- 详情异常数：{len(detail_issues)}")
    log_lines.append("")

    log_lines.append("## 详情异常分布")
    if detail_counter:
        for issue, count in detail_counter.most_common():
            log_lines.append(f"- {issue}：{count}")
    else:
        log_lines.append("- 未发现详情异常")
    log_lines.append("")

    log_lines.append("## 重点坏链")
    if broken_urls:
        for item in broken_urls[:30]:
            log_lines.append(
                f"- `{item.id}` {item.title} | 状态：{item.status} | 原链接：{item.url} | 归一化：{item.normalized_url} | 备注：{item.note}"
            )
    else:
        log_lines.append("- 未发现非 200/301/302 的坏链")
    log_lines.append("")

    log_lines.append("## 自动归一化或替换的链接")
    if normalized_urls:
        for item in normalized_urls[:30]:
            log_lines.append(
                f"- `{item.id}` {item.title} | 原链接：{item.url} | 当前建议：{item.normalized_url}"
            )
    else:
        log_lines.append("- 未发现需要归一化的链接")
    log_lines.append("")

    log_lines.append("## 摘要异常")
    if missing_summaries:
        for item in missing_summaries[:30]:
            log_lines.append(
                f"- `{item['id']}` {item['title']} | 摘要长度：{item['summary_len']}"
            )
    else:
        log_lines.append("- 未发现摘要为空或过短的文章")
    log_lines.append("")

    log_lines.append("## 详情异常样本")
    if detail_issues:
        for item in detail_issues[:40]:
            log_lines.append(
                f"- `{item['id']}` {item['title']} | 异常：{'、'.join(item['issues'])}"
            )
    else:
        log_lines.append("- 未发现详情异常")
    log_lines.append("")

    markdown_path = ROOT / "article_audit_log_20260403.md"
    markdown_path.write_text("\n".join(log_lines), encoding="utf-8")

    json_payload = {
        "checked_at": now,
        "article_count": len(articles),
        "detail_count": len(details),
        "broken_urls": [item.__dict__ for item in broken_urls],
        "normalized_urls": [item.__dict__ for item in normalized_urls],
        "redirected_urls": [item.__dict__ for item in redirected_urls],
        "missing_summaries": missing_summaries,
        "detail_issues": detail_issues,
    }
    (ROOT / "article_audit_result_20260403.json").write_text(
        json.dumps(json_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"已输出日志：{markdown_path}")
    print(f"链接异常：{len(broken_urls)}")
    print(f"原始非 HTTPS 链接：{len(non_https_originals)}")
    print(f"详情异常：{len(detail_issues)}")


if __name__ == "__main__":
    main()
