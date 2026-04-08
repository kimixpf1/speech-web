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

MANUAL_SUMMARIES = {
    "P2025-0588": "国家主席习近平在澳门听取澳门特别行政区行政长官岑浩辉述职报告，李强、蔡奇、丁薛祥等参加会见。习近平对岑浩辉上任以来的工作予以肯定，强调中央将一如既往支持澳门依法施政，推动澳门经济适度多元发展，维护社会大局稳定。",
    "P2025-0669": "国家主席习近平致电卢森堡大公纪尧姆，祝贺其即位成为卢森堡新任大公。习近平在贺电中指出，中卢建交50多年来始终相互尊重、平等相待，成为不同大小国家间互利共赢的典范。中方高度重视中卢关系发展，愿同纪尧姆大公一道努力，推动中卢关系迈上新台阶。",
    "P2025-0724": "纪念中国人民抗日战争暨世界反法西斯战争胜利80周年招待会在北京隆重举行，习近平发表重要讲话。他强调正义的信念不可动摇，和平的阳光必须永远照耀人类历史进程，呼吁各国以史为鉴、珍爱和平，共同维护以联合国为核心的国际秩序。",
    "P2025-0740": "习近平的英雄观深刻体现了对英雄精神的崇敬与传承。他多次强调要铭记一切为中华民族和中国人民作出贡献的英雄们，崇尚英雄、捍卫英雄、学习英雄、关爱英雄，在全社会树立正确的英雄观，让英雄精神薪火相传，激励亿万人民砥砺前行。",
    "P2025-0889": "国家主席习近平在钓鱼台国宾馆会见柬埔寨国王西哈莫尼。习近平指出中柬两国传统友谊深厚，是名副其实的铁杆朋友。双方要深化各领域务实合作，推进中柬命运共同体建设，推动双边关系不断迈上新台阶。西哈莫尼表示坚定奉行一个中国政策，愿同中方加强各领域合作。",
    "P2025-0911": "在对越南进行国事访问之际，习近平在越南《人民报》发表题为《志同道合携手前行 继往开来续写新篇》的署名文章。文章回顾了中越传统友谊，强调两国应秉持友好初心，深化战略互信，推进命运共同体建设，为两国人民带来更多福祉。",
    "P2024-0404": "国家主席习近平致电巴拿马当选总统穆利诺，祝贺其当选巴拿马总统。习近平表示高度重视中巴关系发展，愿同穆利诺总统一道努力，推动中巴关系持续健康稳定发展，造福两国人民。",
    "P2024-0562": "国家主席习近平致电丹麦国王腓特烈十世，祝贺其即位。习近平指出，中丹关系长期健康稳定发展，双方在经贸、绿色发展、科技创新等领域合作成果丰硕。中方高度重视中丹全面战略伙伴关系，愿同丹方携手努力，推动双边关系不断取得新进展。",
}

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

def _log(log_path, msg):
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(line + "\n")
        f.flush()
        os.fsync(f.fileno())

def main():
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_fix_v4_manual_log.txt")

    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"Fix v4 manual summaries at {time.strftime('%Y-%m-%d %H:%M:%S')}\n")

    success = 0
    fail = 0

    for i, aid in enumerate(FAILED_IDS, 1):
        summary = MANUAL_SUMMARIES.get(aid)
        if not summary:
            _log(log_path, f"[{i}/{len(FAILED_IDS)}] {aid} NO MANUAL SUMMARY")
            fail += 1
            continue

        _log(log_path, f"\n[{i}/{len(FAILED_IDS)}] {aid}")
        _log(log_path, f"  summary ({len(summary)}chars): {summary[:80]}...")

        try:
            supabase_patch("articles", aid, {"summary": summary})
            supabase_patch("article_details", aid, {"abstract": summary})
            _log(log_path, f"  SAVED OK")
            success += 1
        except Exception as e:
            _log(log_path, f"  FAIL: {e}")
            fail += 1

        time.sleep(1)

    _log(log_path, "=" * 70)
    _log(log_path, f"DONE: success={success}, fail={fail}, total={len(FAILED_IDS)}")

if __name__ == "__main__":
    main()
