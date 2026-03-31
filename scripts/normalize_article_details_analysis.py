#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ejeiuqcmkznfbglvbkbe.supabase.co")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg",
)
ADMIN_EMAIL = os.getenv("SUPABASE_ADMIN_EMAIL") or os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("SUPABASE_ADMIN_PASSWORD") or os.getenv("ADMIN_PASSWORD")
TABLE_NAME = "article_details"


def normalize_analysis_text(analysis: str) -> str:
    value = analysis or ""
    rules = [
        (r"^[ \t]*一[、，,.\s]*政治高度[：:]", "一、政治高度："),
        (r"^[ \t]*二[、，,.\s]*理论深度[：:]", "二、理论深度："),
        (r"^[ \t]*三[、，,.\s]*(历史贯通与实践|历史贯通|实践要求|实践指向)[：:]", "三、历史贯通与实践："),
        (r"^(一、政治高度：)\s*结合习近平新时代中国特色社会主义思想，阐述讲话在党和国家事业全局中的重大意义。?\s*", r"\1"),
        (r"^(二、理论深度：)\s*阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。?\s*", r"\1"),
        (r"^(三、历史贯通与实践：)\s*联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。?\s*", r"\1"),
        (r"^(一、政治高度：)\s*(政治高度(?:主要)?(?:是指|就是|意味着)|所谓政治高度|这里的政治高度(?:主要)?(?:是指|体现在)?|从政治高度来看，?)", r"\1"),
        (r"^(二、理论深度：)\s*(理论深度(?:主要)?(?:是指|就是|意味着)|所谓理论深度|这里的理论深度(?:主要)?(?:是指|体现在)?|从理论深度来看，?)", r"\1"),
        (r"^(三、历史贯通与实践：)\s*((历史贯通与实践|历史贯通|实践要求)(?:主要)?(?:是指|就是|意味着)|所谓历史贯通与实践|这里的历史贯通与实践(?:主要)?(?:是指|体现在)?|从历史贯通与实践来看，?)", r"\1"),
        (r"[ \t]+\n", "\n"),
        (r"\n{3,}", "\n\n"),
    ]

    for pattern, replacement in rules:
        value = re.sub(pattern, replacement, value, flags=re.MULTILINE)

    return value.strip()


def supabase_request(path: str, method: str = "GET", data=None, token: str | None = None):
    url = f"{SUPABASE_URL}{path}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token or SUPABASE_ANON_KEY}",
    }
    body = json.dumps(data).encode("utf-8") if data is not None else None
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=30) as response:
        text = response.read().decode("utf-8")
        return json.loads(text) if text else None


def login() -> str:
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        print("请先设置环境变量 SUPABASE_ADMIN_EMAIL 和 SUPABASE_ADMIN_PASSWORD")
        sys.exit(1)

    result = supabase_request(
        "/auth/v1/token?grant_type=password",
        method="POST",
        data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    token = result.get("access_token") if isinstance(result, dict) else None
    if not token:
        print("管理员登录失败")
        sys.exit(1)
    return token


def fetch_records(token: str, batch_size: int):
    records = []
    offset = 0

    while True:
        query = urllib.parse.urlencode(
            {
                "select": "id,analysis",
                "order": "id.asc",
                "offset": offset,
                "limit": batch_size,
            }
        )
        data = supabase_request(f"/rest/v1/{TABLE_NAME}?{query}", token=token)
        batch = data or []
        if not batch:
            break
        records.extend(batch)
        if len(batch) < batch_size:
            break
        offset += batch_size

    return records


def patch_record(token: str, record_id: str, analysis: str) -> None:
    encoded_id = urllib.parse.quote(record_id, safe="")
    supabase_request(
        f"/rest/v1/{TABLE_NAME}?id=eq.{encoded_id}",
        method="PATCH",
        data={"analysis": analysis},
        token=token,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    token = login()
    records = fetch_records(token, args.batch_size)

    if args.limit > 0:
        records = records[: args.limit]

    changed = []
    unchanged = 0

    for item in records:
        original = item.get("analysis") or ""
        normalized = normalize_analysis_text(original)
        if normalized != original:
            changed.append(
                {
                    "id": item["id"],
                    "before_length": len(original),
                    "after_length": len(normalized),
                }
            )
            if args.apply:
                patch_record(token, item["id"], normalized)
        else:
            unchanged += 1

    print(f"总记录数: {len(records)}")
    print(f"需清洗: {len(changed)}")
    print(f"无需处理: {unchanged}")
    print(f"执行模式: {'apply' if args.apply else 'dry-run'}")

    preview = changed[:20]
    if preview:
        print(json.dumps(preview, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
