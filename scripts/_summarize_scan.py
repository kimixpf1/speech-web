import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

with open("_scan_all_result.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total articles: {data['total_articles']}")
print(f"Problems found: {data['problems_found']}")
print()

garbage = [p for p in data["problems"] if p["category"] == "garbage_content"]
extractive = [p for p in data["problems"] if "extractive" in p["category"]]
too_short = [p for p in data["problems"] if "too_short" in p["category"] or "empty" in p["category"]]

print(f"=== GARBAGE CONTENT: {len(garbage)} ===")
for p in garbage[:20]:
    print(f"  {p['id']} {p['title']}")
    print(f"    summary: {p['summary'][:100]}")
    print()

print(f"=== EXTRACTIVE: {len(extractive)} ===")
for p in extractive[:10]:
    print(f"  {p['id']} {p['title']}")
    print(f"    summary: {p['summary'][:100]}")
    print()

print(f"=== TOO SHORT: {len(too_short)} ===")
for p in too_short[:10]:
    print(f"  {p['id']} {p['title']}")
    print(f"    summary: {p['summary'][:100]}")
    print()

print(f"Summary: garbage={len(garbage)}, extractive={len(extractive)}, too_short={len(too_short)}, total_to_fix={len(garbage)+len(extractive)+len(too_short)}")
