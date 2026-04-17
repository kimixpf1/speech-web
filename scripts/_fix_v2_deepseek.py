import requests, json, sys, io, os, re, time, urllib.parse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ejeiuqcmkznfbglvbkbe.supabase.co")
ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("ANON_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
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

def fetch_all(table, select, order="id"):
    rows, offset = [], 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            params={"select": select, "order": order, "offset": offset, "limit": 500},
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"},
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        rows.extend(batch)
        offset += 500
    return rows

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
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(line + "\n")
        f.flush()
        os.fsync(f.fileno())

def main():
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_fix_v2_log.txt")

    test_mode = "--test" in sys.argv
    test_count = 5

    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"Fix v2 starting at {time.strftime('%Y-%m-%d %H:%M:%S')}\n")

    _log(log_path, "Fetching data from Supabase...")
    articles = fetch_all("articles", "id,title,summary", "date.desc")
    details = fetch_all("article_details", "id,abstract,full_text", "id")
    detail_map = {d["id"]: d for d in details}
    _log(log_path, f"Fetched {len(articles)} articles, {len(details)} details")

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

    if test_mode:
        problems = problems[:test_count]

    _log(log_path, f"Problem articles found: {len(problems)}")

    cats = {}
    for p in problems:
        cats[p["category"]] = cats.get(p["category"], 0) + 1
    for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
        _log(log_path, f"  {cat}: {count}")

    mode_str = f"TEST mode (first {test_count})" if test_mode else f"FULL mode ({len(problems)} articles)"
    _log(log_path, f"Starting fix: {mode_str}")
    _log(log_path, "=" * 70)

    success = 0
    fail = 0
    skipped = 0

    for i, item in enumerate(problems, 1):
        aid = item["id"]
        title = item["title"]
        full_text = item["full_text"]
        category = item["category"]

        _log(log_path, f"\n[{i}/{len(problems)}] {aid} ({category}) {title}")
        _log(log_path, f"  old: {item['old_summary'][:80]}...")

        new_summary = generate_deepseek_summary(title, full_text)

        if not new_summary or new_summary.startswith("__ERROR__"):
            err_msg = new_summary.replace("__ERROR__", "") if new_summary else "too short"
            _log(log_path, f"  FAIL generate: {err_msg}")
            fail += 1
            time.sleep(1.5)
            continue

        still_bad, _ = is_problematic(new_summary, full_text)
        if still_bad:
            _log(log_path, f"  SKIP still problematic after generation")
            skipped += 1
            time.sleep(1.5)
            continue

        try:
            supabase_patch("articles", aid, {"summary": new_summary})
            supabase_patch("article_details", aid, {"abstract": new_summary})
            _log(log_path, f"  OK ({len(new_summary)}chars): {new_summary[:80]}...")
            success += 1
        except Exception as e:
            _log(log_path, f"  FAIL db update: {e}")
            fail += 1

        if i % 50 == 0:
            _log(log_path, f"--- Progress: {i}/{len(problems)} | success={success} fail={fail} skip={skipped} ---")

        time.sleep(1.2)

    _log(log_path, "=" * 70)
    _log(log_path, f"DONE: success={success}, fail={fail}, skipped={skipped}, total={len(problems)}")

if __name__ == "__main__":
    main()
