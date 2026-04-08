import requests, json, sys, io, os, re, time, urllib.parse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://ejeiuqcmkznfbglvbkbe.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg"
DEEPSEEK_API_KEY = "sk-d8718e08229f408782512f0abe13e208"
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

FAILED_IDS = [
    "P2025-0588",
    "P2025-0669",
    "P2025-0724",
    "P2025-0740",
    "P2025-0889",
    "P2025-0911",
    "P2024-0404",
    "P2024-0562",
]

def supabase_patch(table, article_id, data):
    encoded_id = urllib.parse.quote(article_id, safe="")
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{encoded_id}",
        headers={
            "apikey": ANON_KEY,
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ANON_KEY}",
            "Prefer": "return=minimal",
        },
        json=data,
        timeout=30,
    )
    r.raise_for_status()

def generate_summary_safe(title, full_text):
    short_title = title[:60] if len(title) > 60 else title
    content_for_ai = full_text[:3000] if len(full_text) > 3000 else full_text

    prompt = f"请用你自己的话，为以下文章写一段120到200字的摘要。绝对不要复制原文句子。不要加前缀。\n\n标题：{short_title}\n\n内容：\n{content_for_ai}\n\n摘要："

    for attempt in range(5):
        try:
            response = requests.post(
                DEEPSEEK_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.8,
                    "max_tokens": 400,
                },
                timeout=90,
            )
            response.raise_for_status()
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            content = re.sub(r"^【摘要】[\s：:]*", "", content)
            content = re.sub(r"^摘要[：:]\s*", "", content)
            content = content.strip('"\'')
            if len(content) < 40:
                return None
            return content.strip()
        except Exception as e:
            print(f"  attempt {attempt+1}/5 failed: {e}")
            if attempt < 4:
                wait = 5 * (attempt + 1)
                print(f"  waiting {wait}s...")
                time.sleep(wait)
            else:
                return f"__ERROR__{e}"
    return None

def _log(log_path, msg):
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(line + "\n")
        f.flush()
        os.fsync(f.fileno())

def main():
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_fix_v3_log.txt")

    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"Fix v3 final starting at {time.strftime('%Y-%m-%d %H:%M:%S')}\n")

    headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}

    ids_filter = ",".join(FAILED_IDS)
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/articles",
        params={"select": "id,title,summary", "id": f"in.({ids_filter})"},
        headers=headers,
    )
    r.raise_for_status()
    articles = {a["id"]: a for a in r.json()}

    r2 = requests.get(
        f"{SUPABASE_URL}/rest/v1/article_details",
        params={"select": "id,abstract,full_text", "id": f"in.({ids_filter})"},
        headers=headers,
    )
    r2.raise_for_status()
    details = {d["id"]: d for d in r2.json()}

    _log(log_path, f"Found {len(articles)} articles, {len(details)} details for {len(FAILED_IDS)} IDs")

    success = 0
    fail = 0

    for i, aid in enumerate(FAILED_IDS, 1):
        art = articles.get(aid)
        det = details.get(aid)
        if not art or not det:
            _log(log_path, f"\n[{i}/{len(FAILED_IDS)}] {aid} NOT FOUND in database")
            fail += 1
            continue

        title = art["title"]
        full_text = (det.get("full_text") or "").strip()
        if not full_text:
            _log(log_path, f"\n[{i}/{len(FAILED_IDS)}] {aid} no full_text, skip")
            fail += 1
            continue

        _log(log_path, f"\n[{i}/{len(FAILED_IDS)}] {aid} {title[:60]}")

        new_summary = generate_summary_safe(title, full_text)

        if not new_summary or new_summary.startswith("__ERROR__"):
            err_msg = new_summary.replace("__ERROR__", "") if new_summary else "too short"
            _log(log_path, f"  FAIL: {err_msg}")
            fail += 1
            continue

        try:
            supabase_patch("articles", aid, {"summary": new_summary})
            supabase_patch("article_details", aid, {"abstract": new_summary})
            _log(log_path, f"  OK ({len(new_summary)}chars): {new_summary[:80]}...")
            success += 1
        except Exception as e:
            _log(log_path, f"  FAIL db: {e}")
            fail += 1

        time.sleep(3)

    _log(log_path, "=" * 70)
    _log(log_path, f"DONE: success={success}, fail={fail}, total={len(FAILED_IDS)}")

if __name__ == "__main__":
    main()
