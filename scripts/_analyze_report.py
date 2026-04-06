#!/usr/bin/env python3
import json
from collections import Counter

r = json.loads(open("_db_fix_report.json", "r", encoding="utf-8").read())

print("=== 摘要需清理 ===")
print(f"总计: {len(r['summary_clean_fixes'])} 篇")
issue_counter = Counter()
for item in r["summary_clean_fixes"]:
    for iss in item["issues"]:
        issue_counter[iss] += 1
for k, v in issue_counter.most_common():
    print(f"  {k}: {v} 篇")

print()
print("=== 原文需重抓 ===")
print(f"总计: {len(r['fulltext_refill_ids'])} 篇")
reason_counter = Counter()
for item in r["fulltext_refill_ids"]:
    reason_counter[item["reason"]] += 1
for k, v in reason_counter.most_common():
    print(f"  {k}: {v} 篇")

print()
print("=== 摘要/abstract不一致 ===")
print(f"总计: {len(r['mismatch_fixes'])} 篇")

print()
print("=== source_prefix 样例(前5个) ===")
sp_items = [x for x in r["summary_clean_fixes"] if "source_prefix" in x["issues"]][:5]
for it in sp_items:
    print(f"  [{it['id']}] {it['title']}")

print()
print("=== timestamp_prefix 样例(前5个) ===")
tp_items = [x for x in r["summary_clean_fixes"] if "timestamp_prefix" in x["issues"]][:5]
for it in tp_items:
    print(f"  [{it['id']}] {it['title']}")

print()
print("=== 原文乱码样例(前5个) ===")
for it in r["fulltext_refill_ids"][:5]:
    print(f"  [{it['id']}] {it['title']}")
