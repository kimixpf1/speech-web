import requests, json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://ejeiuqcmkznfbglvbkbe.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg"

headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}

import urllib.parse

keywords = ["正确政绩观", "萨苏", "刚果"]
result = []

all_r = requests.get(
    f"{SUPABASE_URL}/rest/v1/articles",
    params={"select": "id,title,summary", "order": "date.desc", "limit": 2000},
    headers=headers,
)
all_articles = all_r.json()

matched = []
for a in all_articles:
    t = a.get("title") or ""
    for kw in keywords:
        if kw in t:
            matched.append(a)
            break

for a in matched:
        aid = a["id"]
        summary = a.get("summary") or ""
        info = {
            "id": aid,
            "title": a["title"],
            "summary": summary,
            "summary_len": len(summary),
            "abstract": "",
            "abstract_len": 0,
            "full_text_head": "",
            "full_text_len": 0,
            "first50_in_800": -1,
            "first80_in_full": -1,
        }
        r2 = requests.get(
            f"{SUPABASE_URL}/rest/v1/article_details",
            params={"select": "id,abstract,full_text", "id": f"eq.{aid}"},
            headers=headers,
        )
        details = r2.json()
        if details:
            d = details[0]
            abstract = d.get("abstract") or ""
            ft = d.get("full_text") or ""
            info["abstract"] = abstract
            info["abstract_len"] = len(abstract)
            info["full_text_head"] = ft[:300]
            info["full_text_len"] = len(ft)
            if abstract and ft:
                check_text = abstract[:50]
                info["first50_in_800"] = ft[:800].find(check_text)
                check_longer = abstract[:80] if len(abstract) >= 80 else abstract
                info["first80_in_full"] = ft.find(check_longer)
        result.append(info)

with open("_check_status_result.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

for item in result:
    print(f'ID: {item["id"]}')
    print(f'Title: {item["title"]}')
    print(f'Summary({item["summary_len"]}): {item["summary"][:200]}')
    print(f'Abstract({item["abstract_len"]}): {item["abstract"][:200]}')
    print(f'FullText({item["full_text_len"]}): {item["full_text_head"][:200]}')
    print(f'Extractive: first50_in_800={item["first50_in_800"]}, first80_in_full={item["first80_in_full"]}')
    is_extractive = item["first80_in_full"] >= 0
    print(f'STILL EXTRACTIVE: {is_extractive}')
    print()
