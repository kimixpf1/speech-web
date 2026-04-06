#!/usr/bin/env python3
import sys, traceback
sys.path.insert(0, r"E:\ccswitch\AI编程工作目录\讲话网站\app\scripts")

import json
from pathlib import Path
import refill_article_details as rad
import execute_db_fixes as edf

ROOT = Path(r"E:\ccswitch\AI编程工作目录\讲话网站\app\scripts")
SCAN_FILE = ROOT / "_db_content_quality_scan.json"
scan = json.loads(SCAN_FILE.read_text(encoding="utf-8"))

all_ids = list({item["id"] for cat in ["summary_hits","fulltext_hits","mismatch_hits"] for item in scan.get(cat, [])})
print(f"Total IDs: {len(all_ids)}", flush=True)

print("Fetching detail rows (all)...", flush=True)
try:
    detail_rows = edf.fetch_detail_rows(all_ids)
    print(f"Got {len(detail_rows)} detail rows", flush=True)
except Exception as exc:
    traceback.print_exc()

print("Fetching article rows (all)...", flush=True)
try:
    article_rows = edf.fetch_article_rows(all_ids)
    print(f"Got {len(article_rows)} article rows", flush=True)
except Exception as exc:
    traceback.print_exc()

print("Done.", flush=True)
