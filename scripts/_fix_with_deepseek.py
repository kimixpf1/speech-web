import requests, json, sys, io, os, re, time, urllib.parse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://ejeiuqcmkznfbglvbkbe.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg"
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

def fetch_all(table, select, order="id"):
    rows, offset = [], 0
    api_key = SERVICE_ROLE_KEY or ANON_KEY
    auth_key = api_key
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            params={"select": select, "order": order, "offset": offset, "limit": 500},
            headers={"apikey": api_key, "Authorization": f"Bearer {auth_key}"},
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        rows.extend(batch)
        offset += 500
    return rows

def is_extractive_strict(summary, full_text):
    if not summary or len(summary) < 40:
        return False, "too_short", 0
    if not full_text:
        return False, "no_full_text", 0
    search_range = full_text[:800]
    pos = search_range.find(summary[:50])
    if pos >= 0:
        longer_check = summary[:80] if len(summary) >= 80 else summary[:50]
        pos2 = full_text.find(longer_check)
        if pos2 >= 0:
            ratio = len(summary) / len(full_text)
            return True, f"match_at_{pos2}", ratio
    return False, "looks_ai", 0

def supabase_patch(table, article_id, data):
    api_key = SERVICE_ROLE_KEY or ANON_KEY
    auth_key = api_key
    encoded_id = urllib.parse.quote(article_id, safe="")
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{encoded_id}",
        headers={
            "apikey": api_key,
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_key}",
            "Prefer": "return=minimal",
        },
        json=data,
        timeout=30,
    )
    r.raise_for_status()

def generate_deepseek_summary(title, full_text):
    content_for_ai = full_text[:4000] if len(full_text) > 4000 else full_text

    prompt = f"""你是一位资深的时政新闻编辑。请根据以下文章内容，生成一段简洁准确的摘要。

要求：
- 120-200字
- 概括文章核心内容，使用总结性语言
- 不要直接复制原文句子，要用自己的话总结
- 不要加任何前缀标签（如"摘要："等）
- 全部使用中文

文章标题：{title}

文章内容：
{content_for_ai}

请直接输出摘要内容，不要输出任何其他内容。"""

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
                "temperature": 0.5,
                "max_tokens": 500,
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

        content = re.sub(r"^【摘要】[\s：:]*", "", content)
        content = re.sub(r"^摘要[：:]\s*", "", content)
        content = content.strip('"\'')

        if len(content) < 60:
            return None

        if len(content) > 220:
            sentences = [s.strip() for s in re.split(r"(?<=[。！？；])", content) if s.strip()]
            selected = []
            current_len = 0
            for s in sentences:
                if current_len + len(s) > 220:
                    break
                selected.append(s)
                current_len += len(s)
                if current_len >= 90:
                    break
            content = "".join(selected) if selected else content[:220]

        return content.strip()

    except Exception as e:
        return f"__ERROR__{e}"

def _log(log_path, msg):
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(msg + "\n")
        f.flush()
        os.fsync(f.fileno())

def main():
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_fix_deepseek_log.txt")

    if not DEEPSEEK_API_KEY:
        _log(log_path, "ERROR: DEEPSEEK_API_KEY not set")
        sys.exit(1)

    test_mode = "--test" in sys.argv
    test_count = 5

    with open(log_path, "w", encoding="utf-8") as f:
        f.write("Starting data fetch...\n")

    articles = fetch_all("articles", "id,title,summary", "date.desc")
    details = fetch_all("article_details", "id,abstract,full_text", "id")
    detail_map = {d["id"]: d for d in details}

    _log(log_path, f"Fetched {len(articles)} articles, {len(details)} details")

    extractive_list = []
    for a in articles:
        aid = a["id"]
        summary = (a.get("summary") or "").strip()
        detail = detail_map.get(aid, {})
        full_text = (detail.get("full_text") or "").strip()
        is_bad, reason, ratio = is_extractive_strict(summary, full_text)
        if is_bad and full_text:
            extractive_list.append({
                "id": aid,
                "title": a["title"],
                "old_summary": summary,
                "full_text": full_text,
                "ratio": round(ratio, 3),
            })

    if test_mode:
        extractive_list = extractive_list[:test_count]

    _log(log_path, f"Extractive articles found: {len(extractive_list)}")

    mode_str = f"测试模式（前{test_count}篇）" if test_mode else f"正式模式（共{len(extractive_list)}篇）"
    _log(log_path, f"DeepSeek摘要修复 - {mode_str}")
    _log(log_path, f"待处理: {len(extractive_list)} 篇")
    _log(log_path, "=" * 70)

    success = 0
    fail = 0

    for i, item in enumerate(extractive_list, 1):
        aid = item["id"]
        title = item["title"]
        full_text = item["full_text"]

        _log(log_path, f"\n[{i}/{len(extractive_list)}] ID={aid} {title}")
        _log(log_path, f"  旧摘要({len(item['old_summary'])}字): {item['old_summary'][:80]}...")

        new_summary = generate_deepseek_summary(title, full_text)

        if not new_summary or new_summary.startswith("__ERROR__"):
            err_msg = new_summary.replace("__ERROR__", "") if new_summary else "生成内容过短"
            _log(log_path, f"  X 生成失败: {err_msg}")
            fail += 1
            time.sleep(1)
            continue

        is_still_extractive, _, _ = is_extractive_strict(new_summary, full_text)
        if is_still_extractive:
            _log(log_path, f"  X 生成结果仍是截断式，跳过")
            fail += 1
            time.sleep(1)
            continue

        try:
            supabase_patch("articles", aid, {"summary": new_summary})
            supabase_patch("article_details", aid, {"abstract": new_summary})
            _log(log_path, f"  OK 新摘要({len(new_summary)}字): {new_summary[:80]}...")
            success += 1
        except Exception as e:
            _log(log_path, f"  X 数据库更新失败: {e}")
            fail += 1

        time.sleep(1)

    _log(log_path, "=" * 70)
    _log(log_path, f"完成: 成功 {success}, 失败 {fail}, 共 {len(extractive_list)}")
    if not test_mode:
        _log(log_path, f"剩余截断式摘要: {len(extractive_list) - success}")

    print(f"完成。结果已写入 {log_path}")

if __name__ == "__main__":
    main()
