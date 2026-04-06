#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCAN_FILE = ROOT / "_db_content_quality_scan.json"
OUTPUT_FILE = ROOT / "quality_fix_ids.json"


def main() -> None:
    data = json.loads(SCAN_FILE.read_text(encoding="utf-8"))
    ids = []
    seen = set()
    for bucket in ("summary_hits", "fulltext_hits", "mismatch_hits"):
        for item in data.get(bucket, []):
            article_id = item.get("id")
            if article_id and article_id not in seen:
                seen.add(article_id)
                ids.append(article_id)

    OUTPUT_FILE.write_text(
        json.dumps(ids, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"quality_fix_count={len(ids)}")


if __name__ == "__main__":
    main()
