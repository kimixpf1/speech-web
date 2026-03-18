"""
用 Kimi API（联网搜索）自动抓取最新讲话/文章，写入 Supabase pending_articles 表
"""
import os
import re
import json
import uuid
import requests
from datetime import date
from typing import Optional, Dict, Any

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_ANON_KEY']
KIMI_API_KEY = os.environ['KIMI_API_KEY']
TABLE = 'pending_articles'

KIMI_URL = 'https://api.moonshot.cn/v1/chat/completions'

SEARCH_QUERIES = [
    '习近平最新讲话 site:xinhuanet.com OR site:people.com.cn',
    '习近平重要讲话 经济工作 最新',
    '全国两会 习近平讲话 最新',
    '求是杂志 习近平文章 最新',
]

SYSTEM_PROMPT = """你是一个新闻数据提取助手。请搜索并返回最新的习近平讲话、文章、会议相关新闻。
返回 JSON 数组，每条包含以下字段：
- title: 文章标题（字符串）
- date: 日期（格式 YYYY-MM-DD）
- year: 年份（整数）
- month: 月份（整数）
- day: 日期（整数）
- category: 分类（speech/article/meeting/inspection 之一）
- categoryName: 分类名称（重要讲话/发表文章/重要会议/考察调研 之一）
- source: 来源媒体（如 新华网、人民网、求是杂志）
- url: 原文链接
- summary: 一句话摘要（不超过100字）

只返回 JSON 数组，不要其他文字。如果没有找到相关内容，返回空数组 []。"""


def kimi_search(query: str) -> list:
    """调用 Kimi API 联网搜索"""
    try:
        resp = requests.post(
            KIMI_URL,
            headers={
                'Authorization': f'Bearer {KIMI_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'moonshot-v1-8k',
                'messages': [
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': f'请搜索：{query}\n返回最近15天（近半个月）内的文章，最多15条。'},
                ],
                'tools': [{'type': 'web_search'}],
                'temperature': 0.1,
            },
            timeout=60,
        )
        if not resp.ok:
            print(f'Kimi API 错误: {resp.status_code} {resp.text[:200]}')
            return []

        content = resp.json()['choices'][0]['message']['content']
        # 提取 JSON
        m = re.search(r'\[.*\]', content, re.DOTALL)
        if not m:
            print(f'未找到 JSON: {content[:200]}')
            return []
        return json.loads(m.group())
    except Exception as e:
        print(f'Kimi 搜索失败 ({query}): {e}')
        return []


def get_existing_urls() -> set:
    urls = set()
    for table in [TABLE, 'articles']:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/{table}?select=url&limit=500',
            headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'},
        )
        if r.ok:
            urls |= {row['url'] for row in r.json() if row.get('url')}
    return urls


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
        json=rows,
    )
    if not r.ok:
        print(f'插入失败: {r.status_code} {r.text[:200]}')


def normalize(article: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """校验并补全字段"""
    title = str(article.get('title', '')).strip()
    url = str(article.get('url', '')).strip()
    if not title or not url or not url.startswith('http'):
        return None

    date_str = str(article.get('date', ''))
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', date_str)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    else:
        today = date.today()
        y, mo, d = today.year, today.month, today.day
        date_str = str(today)

    category = article.get('category', 'speech')
    if category not in ('speech', 'article', 'meeting', 'inspection'):
        category = 'speech'
    category_names = {'speech': '重要讲话', 'article': '发表文章', 'meeting': '重要会议', 'inspection': '考察调研'}

    return {
        'id': str(uuid.uuid4()),
        'title': title,
        'date': date_str,
        'year': y, 'month': mo, 'day': d,
        'category': category,
        'categoryName': article.get('categoryName') or category_names[category],
        'source': str(article.get('source', '新华网')).strip(),
        'url': url,
        'summary': str(article.get('summary', title))[:200],
        'status': 'pending',
    }


def main():
    print(f'开始抓取，共 {len(SEARCH_QUERIES)} 个查询...')
    existing_urls = get_existing_urls()
    print(f'已有记录 {len(existing_urls)} 条')

    new_articles = []
    seen_urls = set(existing_urls)

    for query in SEARCH_QUERIES:
        print(f'搜索: {query}')
        results = kimi_search(query)
        print(f'  返回 {len(results)} 条')
        for raw in results:
            article = normalize(raw)
            if article and article['url'] not in seen_urls:
                seen_urls.add(article['url'])
                new_articles.append(article)

    print(f'新增 {len(new_articles)} 条待审核文章')
    for i in range(0, len(new_articles), 20):
        supabase_insert(new_articles[i:i+20])

    print('完成')


if __name__ == '__main__':
    main()
