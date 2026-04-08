import requests, json, sys, io, os, re, time, urllib.parse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://ejeiuqcmkznfbglvbkbe.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg"
DEEPSEEK_API_KEY = "sk-d8718e08229f408782512f0abe13e208"
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

GARBAGE_PATTERNS = [
    r"不忘初心.*牢记使命",
    r"学习贯彻习近平.*特色社会主义思想.*主题教育",
    r"版权所有.*禁止",
    r"ICP备\d+号",
    r"京公网安备",
    r"京ICP备",
    r"忘记密码",
    r"党史学习.*教育.*官方.*网站",
    r"中央文件.*人事任免.*反腐倡廉",
    r"工会新闻网.*中国侨联",
    r"党建要闻.*党建论坛",
    r"党建要参.*人民日报",
    r"先锋人物.*创新案例.*基层党建",
    r"高层动态",
    r"独家稿件.*专题专栏",
    r"言之有理",
    r"QQ空间.*豆瓣网",
    r"全国社科工作办.*中国人事考试网",
    r"旗帜网.*整治形式主义",
    r"中组部12380",
    r"人民网版",
    r"新华网.*版权",
    r"中国.*网.*版权所有",
    r"本网.*版权.*未经.*授权",
    r"纪检.*举报",
    r"举报电话",
    r"更多.*进入.*专题",
    r"来源:.*编辑:",
    r"扫一扫.*二维码",
    r"客户端下载",
    r"关注.*微信.*公众",
    r"分享到.*微博",
    r"微博.*微信.*客户端",
]

def has_garbage(text):
    if not text or len(text) < 20:
        return False
    for pat in GARBAGE_PATTERNS:
        if re.search(pat, text):
            return True
    return False

def is_extractive_loose(summary, full_text):
    if not summary or len(summary) < 30:
        return False
    if not full_text or len(full_text) < 50:
        return False
    clean_text = re.sub(r'\s+', '', full_text)
    clean_summary = re.sub(r'\s+', '', summary)
    for start_len in [60, 50, 40, 30]:
        if len(clean_summary) < start_len:
            continue
        chunk = clean_summary[:start_len]
        pos = clean_text.find(chunk)
        if pos >= 0:
            return True
    return False

def is_problematic(summary, full_text):
    if not summary or len(summary.strip()) < 15:
        return True, "empty_or_tiny"
    if has_garbage(summary):
        return True, "garbage_content"
    if is_extractive_loose(summary, full_text):
        return True, "extractive"
    if len(summary) < 40:
        return True, "too_short"
    return False, "ok"

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

def generate_deepseek_summary_v2(title, full_text):
    content_for_ai = full_text[:5000] if len(full_text) > 5000 else full_text

    prompt = f"""你是一位资深时政编辑。请用你自己的话，为以下文章写一段120到200字的摘要。

重要规则：
- 绝对不要复制原文中的任何句子或段落，必须用自己的语言重新概括
- 不要加"摘要："等标签前缀
- 概括核心信息：人物、事件、关键观点、意义

文章标题：{title}

文章内容：
{content_for_ai}

请直接输出摘要："""

    for attempt in range(3):
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
                    "temperature": 0.7,
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

            return content.strip()
        except Exception as e:
            if attempt < 2:
                time.sleep(3)
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
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_fix_v2_retry_log.txt")

    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"Fix v2 retry starting at {time.strftime('%Y-%m-%d %H:%M:%S')}\n")

    _log(log_path, "Re-scanning all articles for remaining problems...")
    headers = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}

    rows, offset = [], 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/articles",
            params={"select": "id,title,summary", "order": "date.desc", "offset": offset, "limit": 500},
            headers=headers,
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        rows.extend(batch)
        offset += 500
    articles = rows

    details_data, offset = [], 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/article_details",
            params={"select": "id,abstract,full_text", "order": "id", "offset": offset, "limit": 500},
            headers=headers,
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        details_data.extend(batch)
        offset += 500
    detail_map = {d["id"]: d for d in details_data}

    _log(log_path, f"Total: {len(articles)} articles, {len(details_data)} details")

    problems = []
    for a in articles:
        aid = a["id"]
        summary = (a.get("summary") or "").strip()
        detail = detail_map.get(aid, {})
        abstract = (detail.get("abstract") or "").strip()
        full_text = (detail.get("full_text") or "").strip()

        display_summary = abstract or summary
        is_bad, cat = is_problematic(display_summary, full_text)

        if is_bad and full_text:
            problems.append({
                "id": aid,
                "title": a["title"],
                "category": cat,
                "old_summary": display_summary[:200],
                "full_text": full_text,
            })

    _log(log_path, f"Remaining problems: {len(problems)}")
    cats = {}
    for p in problems:
        cats[p["category"]] = cats.get(p["category"], 0) + 1
    for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
        _log(log_path, f"  {cat}: {count}")

    _log(log_path, "=" * 70)

    success = 0
    fail = 0
    still_bad_count = 0

    for i, item in enumerate(problems, 1):
        aid = item["id"]
        title = item["title"]
        full_text = item["full_text"]
        category = item["category"]

        _log(log_path, f"\n[{i}/{len(problems)}] {aid} ({category}) {title}")

        new_summary = generate_deepseek_summary_v2(title, full_text)

        if not new_summary or new_summary.startswith("__ERROR__"):
            err_msg = new_summary.replace("__ERROR__", "") if new_summary else "too short"
            _log(log_path, f"  FAIL generate: {err_msg}")
            fail += 1
            time.sleep(2)
            continue

        is_still_bad, _ = is_problematic(new_summary, full_text)
        if is_still_bad:
            _log(log_path, f"  FORCE SAVE (still flagged but better): {new_summary[:80]}...")
            try:
                supabase_patch("articles", aid, {"summary": new_summary})
                supabase_patch("article_details", aid, {"abstract": new_summary})
                still_bad_count += 1
                _log(log_path, f"  FORCE SAVED OK")
            except Exception as e:
                _log(log_path, f"  FORCE SAVE FAIL: {e}")
                fail += 1
        else:
            try:
                supabase_patch("articles", aid, {"summary": new_summary})
                supabase_patch("article_details", aid, {"abstract": new_summary})
                _log(log_path, f"  OK ({len(new_summary)}chars): {new_summary[:80]}...")
                success += 1
            except Exception as e:
                _log(log_path, f"  FAIL db: {e}")
                fail += 1

        time.sleep(1.5)

    _log(log_path, "=" * 70)
    _log(log_path, f"DONE: success={success}, force_saved={still_bad_count}, fail={fail}, total={len(problems)}")

if __name__ == "__main__":
    main()
