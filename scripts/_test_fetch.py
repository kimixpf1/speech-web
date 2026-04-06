#!/usr/bin/env python3
import sys, traceback
sys.path.insert(0, r"E:\ccswitch\AI编程工作目录\讲话网站\app\scripts")

import json
from pathlib import Path

ROOT = Path(r"E:\ccswitch\AI编程工作目录\讲话网站\app\scripts")
import refill_article_details as rad
import execute_db_fixes as edf

SCAN_FILE = ROOT / "_db_content_quality_scan.json"
scan = json.loads(SCAN_FILE.read_text(encoding="utf-8"))

summary_hits = scan.get("summary_hits", [])
all_ids = list({item["id"] for item in summary_hits})
print(f"Total IDs: {len(all_ids)}", flush=True)

test_ids = all_ids[:3]
print(f"Testing with: {test_ids}", flush=True)

try:
    print("Fetching detail rows...", flush=True)
    rows = edf.fetch_detail_rows(test_ids)
    print(f"Got {len(rows)} detail rows", flush=True)
    for r in rows:
        print(f"  {r['id']}: abstract={repr((r.get('abstract') or '')[:60])}", flush=True)
except Exception as exc:
    traceback.print_exc()

try:
    print("Fetching article rows...", flush=True)
    rows = edf.fetch_article_rows(test_ids)
    print(f"Got {len(rows)} article rows", flush=True)
    for r in rows:
        print(f"  {r['id']}: summary={repr((r.get('summary') or '')[:60])}", flush=True)
except Exception as exc:
    traceback.print_exc()
