"""
自动抓取习近平讲话/经济工作相关文章，写入 Supabase pending_articles 表
来源：人民网、新华网
"""
import os
import re
import json
import requests
from datetime import datetime, date
from bs4 import BeautifulSoup

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_ANON_KEY']
TABLE = 'pending_articles'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

# 关键词过滤：必须包含其中之一
KEYWORDS = [
    '习近平', '总书记',
    '经济工作', '高质量发展', '新质生产力',
    '全国两会', '政府工作报告',
    '求是', '深化改革', '宏观经济',
]

def matches_keywords(text: str) -> bool:
    return any(kw in text for kw in KEYWORDS)

def supabase_get(url_suffix: str):
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/{url_suffix}',
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    )
    return r.json() if r.ok else []

def supabase_insert(rows: list):
    if not rows:
        return
    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/{TABLE}',
        headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
        },
        json=rows
    )
    if not r.ok:
        print(f'Insert failed: {r.status_code} {r.text}')

def get_existing_urls() -> set:
    """获取已存在的 URL，避免重复插入"""
    existing = supabase_get(f'{TABLE}?select=url&limit=500')
    articles = supabase_get('articles?select=url&limit=500')
    urls = {row['url'] for row in existing if row.get('url')}
    urls |= {row['url'] for row in articles if row.get('url')}
    return urls

def parse_date(text: str):
    """从字符串中提取日期，返回 (date_str, year, month, day)"""
    m = re.search(r'(\d{4})[-年](\d{1,2})[-月](\d{1,2})', text)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f'{y}-{mo:02d}-{d:02d}', y, mo, d
    today = date.today()
    return str(today), today.year, today.month, today.day

def fetch_qiushi() -> list:
    """抓取求是杂志网站"""
    results = []
    try:
        url = 'http://www.qstheory.cn/economy/index.htm'
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.encoding = 'utf-8'
        soup = BeautifulSoup(r.text, 'html.parser')

        for a in soup.select('a[href]')[:60]:
            title = a.get_text(strip=True)
            href = a['href']
            if not title or len(title) < 10:
                continue
            if not href.startswith('http'):
                href = 'http://www.qstheory.cn' + href

            date_str, y, mo, d = parse_date(href + title)
            results.append({
                'title': title,
                'date': date_str,
                'year': y, 'month': mo, 'day': d,
                'category': 'article',
                'categoryName': '发表文章',
                'source': '求是杂志',
                'url': href,
                'summary': title,
                'status': 'pending',
            })
    except Exception as e:
        print(f'求是杂志抓取失败: {e}')
    return results

def fetch_qiushi_xijinping() -> list:
    """抓取求是杂志习近平文章专题"""
    results = []
    try:
        url = 'http://www.qstheory.cn/zhuanqu/xjpzl/index.htm'
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.encoding = 'utf-8'
        soup = BeautifulSoup(r.text, 'html.parser')

        for a in soup.select('a[href]')[:60]:
            title = a.get_text(strip=True)
            href = a['href']
            if not title or len(title) < 10:
                continue
            if not href.startswith('http'):
                href = 'http://www.qstheory.cn' + href

            date_str, y, mo, d = parse_date(href + title)
            results.append({
                'title': title,
                'date': date_str,
                'year': y, 'month': mo, 'day': d,
                'category': 'article',
                'categoryName': '发表文章',
                'source': '求是杂志',
                'url': href,
                'summary': title,
                'status': 'pending',
            })
    except Exception as e:
        print(f'求是杂志习近平专题抓取失败: {e}')
    return results

def fetch_xinhua() -> list:
    """抓取新华网习近平专题"""
    results = []
    try:
        url = 'http://www.xinhuanet.com/politics/leaders/xijinping/index.htm'
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.encoding = 'utf-8'
        soup = BeautifulSoup(r.text, 'html.parser')

        for a in soup.select('a[href]')[:60]:
            title = a.get_text(strip=True)
            href = a['href']
            if not title or len(title) < 10:
                continue
            if not matches_keywords(title):
                continue
            if not href.startswith('http'):
                href = 'http://www.xinhuanet.com' + href

            date_str, y, mo, d = parse_date(href + title)
            results.append({
                'title': title,
                'date': date_str,
                'year': y, 'month': mo, 'day': d,
                'category': 'speech',
                'categoryName': '重要讲话',
                'source': '新华网',
                'url': href,
                'summary': title,
                'status': 'pending',
            })
    except Exception as e:
        print(f'新华网抓取失败: {e}')
    return results

def fetch_people_daily() -> list:
    """抓取人民网习近平专题"""
    results = []
    try:
        url = 'http://jhsjk.people.cn/result?keywords=%E4%B9%A0%E8%BF%91%E5%B9%B3&page=1'
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.encoding = 'utf-8'
        soup = BeautifulSoup(r.text, 'html.parser')

        for item in soup.select('.result-item, .list-item, li')[:40]:
            a = item.find('a', href=True)
            if not a:
                continue
            title = a.get_text(strip=True)
            href = a['href']
            if not title or len(title) < 10:
                continue
            if not matches_keywords(title):
                continue
            if not href.startswith('http'):
                href = 'http://jhsjk.people.cn' + href

            # 尝试从 item 文本中提取日期
            item_text = item.get_text()
            date_str, y, mo, d = parse_date(item_text)

            results.append({
                'title': title,
                'date': date_str,
                'year': y, 'month': mo, 'day': d,
                'category': 'speech',
                'categoryName': '重要讲话',
                'source': '人民网',
                'url': href,
                'summary': title,
                'status': 'pending',
            })
    except Exception as e:
        print(f'人民网抓取失败: {e}')
    return results

def fetch_xinhua_economy() -> list:
    """抓取新华网经济频道"""
    results = []
    try:
        url = 'http://www.xinhuanet.com/fortune/index.htm'
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.encoding = 'utf-8'
        soup = BeautifulSoup(r.text, 'html.parser')

        for a in soup.select('a[href]')[:80]:
            title = a.get_text(strip=True)
            href = a['href']
            if not title or len(title) < 10:
                continue
            if not matches_keywords(title):
                continue
            if not href.startswith('http'):
                href = 'http://www.xinhuanet.com' + href

            date_str, y, mo, d = parse_date(href + title)
            results.append({
                'title': title,
                'date': date_str,
                'year': y, 'month': mo, 'day': d,
                'category': 'meeting',
                'categoryName': '重要会议',
                'source': '新华网',
                'url': href,
                'summary': title,
                'status': 'pending',
            })
    except Exception as e:
        print(f'新华网经济频道抓取失败: {e}')
    return results

def main():
    print(f'开始抓取... {datetime.now()}')
    existing_urls = get_existing_urls()
    print(f'已有 {len(existing_urls)} 条记录')

    all_articles = []
    all_articles += fetch_qiushi()
    all_articles += fetch_qiushi_xijinping()
    all_articles += fetch_xinhua()
    all_articles += fetch_people_daily()
    all_articles += fetch_xinhua_economy()

    # 去重：过滤已存在的 URL
    new_articles = []
    seen_urls = set()
    for a in all_articles:
        url = a.get('url', '')
        if url and url not in existing_urls and url not in seen_urls:
            seen_urls.add(url)
            new_articles.append(a)

    print(f'新增 {len(new_articles)} 条待审核文章')

    # 分批插入（每批20条）
    for i in range(0, len(new_articles), 20):
        batch = new_articles[i:i+20]
        supabase_insert(batch)
        print(f'已插入 {min(i+20, len(new_articles))}/{len(new_articles)}')

    print('完成')

if __name__ == '__main__':
    main()
