#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全量扫描 articles.url 是否可访问，并粗略检测是否为图集页。
"""

from __future__ import annotations

import concurrent.futures
import json
import sys
from pathlib import Path

import requests
import urllib3

ROOT = Path(__file__).resolve().parent
sys.path.append(str(ROOT))

import refill_article_details as rad

urllib3.disable_warnings()


def is_gallery_page(html_text: str) -> bool:
    text = html_text[:6000]
    return ("图集" in text and "上一图集" in text) or ("图集" in text and "下一图集" in text)


def check_article(article: dict) -> dict:
    raw_url = article.get("url") or ""
    url = rad.normalize_article_url(raw_url)
    lowered = url.lower()
    verify = not any(domain in lowered for domain in ["lianghui.people.com.cn/", "cppcc.gov.cn/", "spp.gov.cn/"])
    try:
        response = requests.get(
            url,
            headers=rad.REQUEST_HEADERS,
            timeout=15,
            allow_redirects=True,
            verify=verify,
        )
        content_type = response.headers.get("content-type", "")
        response.encoding = response.apparent_encoding or response.encoding or "utf-8"
        body = response.text if ("text" in content_type or "html" in content_type or not content_type) else ""
        gallery = is_gallery_page(body)
        return {
            "id": article.get("id"),
            "title": article.get("title"),
            "url": url,
            "status_code": response.status_code,
            "final_url": response.url,
            "gallery": gallery,
            "ok": response.status_code == 200 and not gallery,
        }
    except Exception as exc:
        return {
            "id": article.get("id"),
            "title": article.get("title"),
            "url": url,
            "error": str(exc),
            "gallery": False,
            "ok": False,
        }


def main() -> None:
    articles = rad.fetch_all_rows(
        rad.ARTICLES_TABLE,
        "id,title,url,source,date",
        "date.desc",
        batch_size=500,
    )
    targets = [item for item in articles if item.get("url")]
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
        for result in executor.map(check_article, targets):
            results.append(result)

    bad = [item for item in results if not item.get("ok")]
    output = {
        "checked_count": len(targets),
        "bad_count": len(bad),
        "bad_hits": bad,
    }
    (ROOT / "_link_scan_recheck.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"checked={len(targets)} bad={len(bad)}")


if __name__ == "__main__":
    main()
