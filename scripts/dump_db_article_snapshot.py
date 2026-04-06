#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接读取数据库中的指定文章主表与详情表原始值。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.append(str(ROOT))

import refill_article_details as rad


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", dest="article_id", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    article = rad.fetch_rows_by_ids(
        "articles",
        "id,title,url,summary,source,date",
        [args.article_id],
    )
    detail = rad.fetch_rows_by_ids(
        "article_details",
        "id,abstract,full_text,analysis",
        [args.article_id],
    )

    payload = {
        "article": article[0] if article else None,
        "detail": detail[0] if detail else None,
    }
    Path(args.output).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
