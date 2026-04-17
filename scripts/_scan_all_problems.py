import requests, json, io, sys, os, re, time, urllib.parse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ejeiuqcmkznfbglvbkbe.supabase.co")
ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("ANON_KEY", "")

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
    if not ANON_KEY:
        raise RuntimeError("SUPABASE_ANON_KEY or ANON_KEY is required")

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
        return False, "too_short"
    if not full_text or len(full_text) < 50:
        return False, "no_full_text"

    clean_text = re.sub(r'\s+', '', full_text)
    clean_summary = re.sub(r'\s+', '', summary)

    for start_len in [60, 50, 40, 30]:
        if len(clean_summary) < start_len:
            continue
        chunk = clean_summary[:start_len]
        pos = clean_text.find(chunk)
        if pos >= 0:
            return True, f"extractive_start{start_len}_at{pos}"

    return False, "looks_ok"

def classify(summary, full_text):
    if not summary or len(summary.strip()) < 15:
        return "empty_or_tiny", 1

    if has_garbage(summary):
        return "garbage_content", 2

    is_ext, reason = is_extractive_loose(summary, full_text)
    if is_ext:
        return f"extractive({reason})", 3

    if len(summary) < 40:
        return "too_short(<40)", 4

    return "ok", 0

def main():
    print("Fetching articles...")
    articles = fetch_all("articles", "id,title,summary", "date.desc")
    print(f"Fetched {len(articles)} articles")

    print("Fetching details...")
    details = fetch_all("article_details", "id,abstract,full_text", "id")
    detail_map = {d["id"]: d for d in details}
    print(f"Fetched {len(details)} details")

    problems = []
    stats = {}

    for a in articles:
        aid = a["id"]
        summary = (a.get("summary") or "").strip()
        detail = detail_map.get(aid, {})
        abstract = (detail.get("abstract") or "").strip()
        full_text = (detail.get("full_text") or "").strip()

        display_summary = abstract or summary
        cat, severity = classify(display_summary, full_text)

        if cat not in stats:
            stats[cat] = 0
        stats[cat] += 1

        if severity > 0:
            problems.append({
                "id": aid,
                "title": a["title"],
                "category": cat,
                "severity": severity,
                "summary": summary[:150],
                "abstract": abstract[:150],
                "full_text_len": len(full_text),
                "display_summary": display_summary[:150],
            })

    problems.sort(key=lambda x: x["severity"], reverse=True)

    output = {
        "total_articles": len(articles),
        "total_details": len(details),
        "problems_found": len(problems),
        "stats": stats,
        "problems": problems,
    }

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_scan_all_result.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nTotal: {len(articles)} articles")
    print(f"Problems: {len(problems)}")
    print(f"\nStats:")
    for cat, count in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")

if __name__ == "__main__":
    main()
