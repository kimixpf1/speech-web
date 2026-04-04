#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量修正 articles 表中的失效原文链接。

说明：
- 默认读取内置的 URL 修复映射；
- 通过 --service-role-key 传入写库权限；
- 仅更新 articles.url 字段，不修改其他字段。
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.append(str(ROOT))

import refill_article_details as rad


URL_FIXES = {
    "ZJG-C05": "http://www.jcrb.com/xztpd/2026/202603/slhjxzqzjg/ywylzjg/202603/t20260318_7637329.html",
    "ZJG-S02": "http://www.subaonet.com/2026/szyw/0307/xDLe5egk.html",
    "ZJG-C14": "http://politics.people.com.cn/n1/2026/0319/c461001-40685172.html",
    "ZJG-C11": "http://opinion.people.com.cn/n1/2026/0314/c461529-40681762.html",
    "ZJG-C09": "http://opinion.people.com.cn/n1/2026/0304/c441030-40674325.html",
    "ZJG-C06": "http://politics.people.com.cn/n1/2026/0226/c461001-40670389.html",
    "2026-12": "http://jhsjk.people.cn/article/40675966",
    "2025-09": "http://cpc.people.com.cn/n1/2025/0520/c64094-40484072.html",
    "2024-01": "http://cpc.people.com.cn/n1/2024/1213/c64094-40381254.html",
    "2024-13": "http://politics.people.com.cn/n1/2024/1128/c1024-40371064.html",
    "2024-06": "http://politics.people.com.cn/n1/2024/1107/c1024-40355570.html",
    "2024-F01": "http://politics.people.com.cn/n1/2024/0628/c1024-40266475.html",
    "2024-08": "http://cpc.people.com.cn/n1/2024/0524/c64094-40243040.html",
    "P2024-0281": "https://www.gov.cn/yaowen/liebiao/202407/content_6962098.htm?jump=true",
    "P2024-0161": "https://paper.people.com.cn/rmrb/html/2024-10/15/nw.D110000renmrb_20241015_1-01.htm",
    "2024-02": "http://cpc.people.com.cn/n1/2024/1017/c64094-40341041.html",
    "P2024-0184": "http://cpc.people.com.cn/n1/2024/0927/c64094-40329817.html",
    "P2024-0273": "http://paper.people.com.cn/rmrbhwb/html/2024-07/13/content_26068856.htm",
    "2024-20": "https://www.news.cn/politics/leaders/20240718/a41ada3016874e358d5064bba05eba98/c.html",
    "2024-22": "http://cpc.people.com.cn/n1/2024/0622/c64094-40261819.html",
    "P2024-0383": "http://politics.people.com.cn/n1/2024/0527/c1024-40243733.html",
    "P2024-0440": "http://cpc.people.com.cn/n1/2024/0430/c64094-40227513.html",
    "2024-09": "http://cpc.people.com.cn/n1/2024/0424/c64094-40223174.html",
    "2026-09": "http://cpc.people.com.cn/n1/2026/0215/c64094-40666403.html",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="修正失效 article url")
    parser.add_argument("--service-role-key", default="", help="Supabase service role key")
    return parser.parse_args()


def patch_article_url(token: str, article_id: str, url: str) -> None:
    encoded_id = article_id.replace('"', "%22")
    rad.supabase_request(
        f"/rest/v1/{rad.ARTICLES_TABLE}?id=eq.{encoded_id}",
        method="PATCH",
        data={"url": url},
        token=token,
    )


def main() -> None:
    args = parse_args()
    if args.service_role_key:
        rad.SERVICE_ROLE_KEY = args.service_role_key.strip()
    token = rad.get_write_token()

    for article_id, url in URL_FIXES.items():
        patch_article_url(token, article_id, url)
        print(f"已更新: {article_id} -> {url}")


if __name__ == "__main__":
    main()
