#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
扫描 article_details.full_text 中疑似乱码文本。
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.append(str(ROOT))

import refill_article_details as rad

MOJIBAKE_PATTERN = re.compile(r"[ÃÂÐÑØæåçéêëîïðñòóôõöøùúûüýþÿ]{3,}|�|&#xfffd;")


def suspicious_score(text: str) -> int:
    return len(MOJIBAKE_PATTERN.findall(text))


def main() -> None:
    details = rad.fetch_all_rows(
        rad.DETAILS_TABLE,
        "id,full_text,abstract",
        "id.asc",
        batch_size=500,
    )
    hits = []
    for item in details:
        text = (item.get("full_text") or "").strip()
        if not text:
            continue
        score = suspicious_score(text)
        if score <= 0:
            continue
        hits.append(
            {
                "id": item["id"],
                "score": score,
                "preview": text[:300],
            }
        )

    output = {
        "count": len(hits),
        "hits": hits[:300],
    }
    (ROOT / "_fulltext_mojibake_scan.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"mojibake_count={len(hits)}")


if __name__ == "__main__":
    main()
