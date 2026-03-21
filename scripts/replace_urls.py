#!/usr/bin/env python3
"""
批量替换jhsjk.people.cn文章URL为cpc.people.com.cn可访问URL
映射规则: jhsjk.people.cn/article/{ID} -> cpc.people.com.cn/n1/{YYYY}/{MMDD}/c64094-{ID}.html
备用频道: c64387 (部分求是等文章)
"""

import json
import re
import urllib.request
import urllib.parse
import time
import sys

# Supabase配置
SUPABASE_URL = "https://ejeiuqcmkznfbglvbkbe.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg"

ADMIN_EMAIL = "admin@office.local"
ADMIN_PASSWORD = "kimiclaw1"

CHANNELS = ["c64094", "c64387", "c1024", "c461529"]
BATCH_SIZE = 50
REQUEST_DELAY = 0.2


def supabase_request(path, method="GET", data=None, token=None):
    """发送Supabase API请求"""
    url = f"{SUPABASE_URL}{path}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        headers["Authorization"] = f"Bearer {SUPABASE_ANON_KEY}"

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"HTTP Error {e.code}: {error_body[:200]}")
        raise


def login():
    """管理员登录获取token"""
    print("正在登录管理员账号...")
    result = supabase_request(
        "/auth/v1/token?grant_type=password",
        method="POST",
        data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    token = result.get("access_token")
    if token:
        print(f"登录成功, user_id: {result['user']['id']}")
    else:
        print("登录失败!")
        sys.exit(1)
    return token


def jhsjk_to_cpc_url(jhsjk_url, date_str):
    """将jhsjk URL转换为cpc.people.com.cn URL"""
    m = re.search(r"article/(\d+)", jhsjk_url)
    if not m:
        return None
    article_id = m.group(1)
    date_parts = date_str.split("-")
    yyyy = date_parts[0]
    mm = date_parts[1]
    dd = date_parts[2]
    return f"http://cpc.people.com.cn/n1/{yyyy}/{mm}{dd}/c64094-{article_id}.html", article_id


def verify_url(url, article_id, date_str):
    """验证URL是否可访问，如果不行尝试备用频道"""
    date_parts = date_str.split("-")
    date_path = f"{date_parts[0]}/{date_parts[1]}{date_parts[2]}"

    for ch in CHANNELS:
        test_url = f"http://cpc.people.com.cn/n1/{date_path}/{ch}-{article_id}.html"
        try:
            req = urllib.request.Request(
                test_url, headers={"User-Agent": "Mozilla/5.0"}, method="HEAD"
            )
            resp = urllib.request.urlopen(req, timeout=8)
            if resp.status == 200:
                return test_url
        except:
            continue
    return None


def fetch_all_jhsjk_articles(token):
    """从Supabase获取所有jhsjk URL的文章"""
    print("正在从数据库获取jhsjk文章...")
    all_articles = []
    batch_size = 1000
    offset = 0

    while True:
        url = f"/rest/v1/articles?url=like.*jhsjk.people.cn*&select=id,title,date,url&offset={offset}&limit={batch_size}"
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        req_url = f"{SUPABASE_URL}{url}"
        req = urllib.request.Request(req_url, headers=headers)
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read().decode("utf-8"))

        if not data:
            break
        all_articles.extend(data)
        print(f"  已获取 {len(all_articles)} 篇文章...")
        if len(data) < batch_size:
            break
        offset += batch_size

    print(f"共找到 {len(all_articles)} 篇jhsjk文章需要更新")
    return all_articles


def update_article_url(token, article_id, new_url):
    """更新单篇文章的URL"""
    url = f"/rest/v1/articles?id=eq.{urllib.parse.quote(article_id)}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    body = json.dumps({"url": new_url}).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}{url}", data=body, headers=headers, method="PATCH"
    )
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return True
    except urllib.error.HTTPError as e:
        print(f"  更新失败 {article_id}: {e.code} {e.read().decode('utf-8')[:100]}")
        return False


def main():
    # 登录
    token = login()

    # 获取所有jhsjk文章
    articles = fetch_all_jhsjk_articles(token)

    if not articles:
        print("没有找到需要更新的文章")
        return

    # 转换URL
    updated = 0
    failed = 0
    verified = 0
    failed_articles = []

    print(f"\n开始转换 {len(articles)} 篇文章的URL...")
    print(f"策略: jhsjk.people.cn/article/ID -> cpc.people.com.cn/n1/YYYY/MMDD/c64094-ID.html\n")

    for i, art in enumerate(articles):
        result = jhsjk_to_cpc_url(art["url"], art["date"])
        if not result:
            failed += 1
            failed_articles.append(art)
            continue

        new_url, article_id = result

        # 每100篇验证一下URL（不是每篇都验证，太慢）
        if i % 100 == 0 and i > 0:
            verified_url = verify_url(new_url, article_id, art["date"])
            if verified_url:
                new_url = verified_url
                verified += 1
            else:
                print(f"  警告: 验证失败 [{art['id']}] {art['title'][:30]}")

        # 更新数据库
        if update_article_url(token, art["id"], new_url):
            updated += 1
        else:
            failed += 1
            failed_articles.append(art)

        # 进度输出
        if (i + 1) % 50 == 0:
            print(f"  进度: {i+1}/{len(articles)} (成功:{updated} 失败:{failed})")

        time.sleep(REQUEST_DELAY)

    print(f"\n===== 完成 =====")
    print(f"总计: {len(articles)}")
    print(f"成功: {updated}")
    print(f"失败: {failed}")
    print(f"验证: {verified}")

    if failed_articles:
        print(f"\n失败的文章:")
        for art in failed_articles:
            print(f"  [{art['id']}] {art['title'][:40]} -> {art['url']}")

    # 保存失败记录
    if failed_articles:
        with open(
            "e:/讲话网站/app/scripts/failed_urls.json", "w", encoding="utf-8"
        ) as f:
            json.dump(failed_articles, f, ensure_ascii=False, indent=2)
        print(f"\n失败记录已保存到 failed_urls.json")


if __name__ == "__main__":
    main()
