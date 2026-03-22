"""
用 DeepSeek API（联网搜索）自动抓取最新讲话/文章，写入 Supabase pending_articles 表
支持 DeepSeek 和 Kimi API 双重备选
支持多领域搜索和政绩观专题搜索
"""
import os
import re
import json
import uuid
import requests
from datetime import date
from typing import Optional, Dict, Any, List

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_ANON_KEY']
KIMI_API_KEY = os.environ.get('KIMI_API_KEY', '')
DS_API_KEY = os.environ.get('DS_API_KEY', '')
TABLE = 'pending_articles'

# API endpoints
KIMI_URL = 'https://api.moonshot.cn/v1/chat/completions'
DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

# 多领域搜索配置
DOMAIN_QUERIES = {
    'economy': [
        '习近平 经济工作 讲话 最新',
        '经济发展 高质量发展 最新讲话',
    ],
    'politics': [
        '习近平 政治建设 讲话 最新',
        '全面依法治国 最新讲话',
    ],
    'culture': [
        '习近平 文化建设 讲话 最新',
        '文化自信 社会主义文化 最新',
    ],
    'society': [
        '习近平 社会建设 民生 讲话',
        '共同富裕 民生保障 最新',
    ],
    'ecology': [
        '习近平 生态文明 讲话 最新',
        '绿色发展 碳达峰碳中和 最新',
    ],
    'party': [
        '习近平 党建工作 讲话 最新',
        '全面从严治党 党风廉政 最新',
    ],
    'defense': [
        '习近平 国防军队建设 讲话',
        '强军兴军 军队建设 最新',
    ],
    'diplomacy': [
        '习近平 外交工作 讲话 最新',
        '大国外交 人类命运共同体 最新',
    ],
}

# 政绩观专题搜索配置
ZHENGJIGUAN_QUERIES = {
    'central': [
        '政绩观 学习教育 中央 文件',
        '树立正确政绩观 习近平 重要指示',
    ],
    'jiangsu': [
        '政绩观 学习教育 江苏 省委',
        '正确政绩观 江苏 贯彻落实',
    ],
    'suzhou': [
        '政绩观 学习教育 苏州 市委',
        '正确政绩观 苏州 落实',
    ],
}

# 领域名称映射
DOMAIN_NAMES = {
    'economy': '经济',
    'politics': '政治',
    'culture': '文化',
    'society': '社会',
    'ecology': '生态',
    'party': '党建',
    'defense': '国防',
    'diplomacy': '外交',
}

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

只返回 JSON 数组，不要其他文字。如果没有找到相关内容，返回空数组 []."""

ZHENGJIGUAN_SYSTEM_PROMPT = """你是一个文件搜索助手。请搜索并返回关于政绩观学习教育的最新文件和新闻。
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

只返回 JSON 数组，不要其他文字。如果没有找到相关内容，返回空数组 []."""


def deepseek_search(query: str, is_zhengjiguan: bool = False) -> List[Dict]:
    """调用 DeepSeek API 联网搜索（优先使用）"""
    if not DS_API_KEY:
        print('  DeepSeek API Key 未配置')
        return []
    
    try:
        print('  使用 DeepSeek 搜索...')
        system_prompt = ZHENGJIGUAN_SYSTEM_PROMPT if is_zhengjiguan else SYSTEM_PROMPT
        resp = requests.post(
            DEEPSEEK_URL,
            headers={
                'Authorization': f'Bearer {DS_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'deepseek-chat',
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': f'请搜索：{query}\n返回最近15天（近半个月）内的文章，最多10条。请使用联网搜索功能获取最新信息。'},
                ],
                'temperature': 0.1,
            },
            timeout=90,
        )
        if not resp.ok:
            print(f'  DeepSeek API 错误: {resp.status_code} {resp.text[:200]}')
            return []

        content = resp.json()['choices'][0]['message']['content']
        # 提取 JSON
        m = re.search(r'\[.*\]', content, re.DOTALL)
        if not m:
            print(f'  未找到 JSON: {content[:200]}')
            return []
        return json.loads(m.group())
    except Exception as e:
        print(f'  DeepSeek 搜索失败: {e}')
        return []


def kimi_search(query: str, is_zhengjiguan: bool = False) -> List[Dict]:
    """调用 Kimi API 联网搜索（备选方案）"""
    if not KIMI_API_KEY:
        print('  Kimi API Key 未配置')
        return []
    
    try:
        print('  使用 Kimi 搜索...')
        system_prompt = ZHENGJIGUAN_SYSTEM_PROMPT if is_zhengjiguan else SYSTEM_PROMPT
        resp = requests.post(
            KIMI_URL,
            headers={
                'Authorization': f'Bearer {KIMI_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'moonshot-v1-8k',
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': f'请搜索：{query}\n返回最近15天（近半个月）内的文章，最多10条。'},
                ],
                'tools': [{'type': 'web_search'}],
                'temperature': 0.1,
            },
            timeout=90,
        )
        if not resp.ok:
            print(f'  Kimi API 错误: {resp.status_code} {resp.text[:200]}')
            return []

        content = resp.json()['choices'][0]['message']['content']
        # 提取 JSON
        m = re.search(r'\[.*\]', content, re.DOTALL)
        if not m:
            print(f'  未找到 JSON: {content[:200]}')
            return []
        return json.loads(m.group())
    except Exception as e:
        print(f'  Kimi 搜索失败: {e}')
        return []


def search_articles(query: str, is_zhengjiguan: bool = False) -> List[Dict]:
    """搜索文章，优先使用 DeepSeek，失败则使用 Kimi 备选"""
    results = deepseek_search(query, is_zhengjiguan)
    if results:
        return results
    
    print('  DeepSeek 搜索无结果，尝试 Kimi...')
    return kimi_search(query, is_zhengjiguan)


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


def normalize(article: Dict[str, Any], domain: str = 'economy', is_zhengjiguan: bool = False, zhengjiguan_level: str = None) -> Optional[Dict[str, Any]]:
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

    result = {
        'id': str(uuid.uuid4()),
        'title': title,
        'date': date_str,
        'year': y, 'month': mo, 'day': d,
        'category': category,
        'categoryName': article.get('categoryName') or category_names[category],
        'domain': domain,
        'domainName': DOMAIN_NAMES.get(domain, '经济'),
        'is_zhengjiguan': is_zhengjiguan,
        'zhengjiguan_level': zhengjiguan_level,
        'source': str(article.get('source', '新华网')).strip(),
        'url': url,
        'summary': str(article.get('summary', title))[:200],
        'status': 'pending',
    }
    return result


def main():
    print('='*60)
    print('开始多领域文章抓取...')
    print(f'DeepSeek API: {"已配置" if DS_API_KEY else "未配置"}')
    print(f'Kimi API: {"已配置" if KIMI_API_KEY else "未配置"}')
    print('='*60)
    
    existing_urls = get_existing_urls()
    print(f'已有记录 {len(existing_urls)} 条')

    new_articles = []
    seen_urls = set(existing_urls)

    # 1. 按领域搜索文章
    for domain, queries in DOMAIN_QUERIES.items():
        print(f'\n--- 搜索领域: {DOMAIN_NAMES[domain]} ---')
        for query in queries:
            print(f'搜索: {query}')
            results = search_articles(query, is_zhengjiguan=False)
            print(f'  返回 {len(results)} 条')
            for raw in results:
                article = normalize(raw, domain=domain, is_zhengjiguan=False)
                if article and article['url'] not in seen_urls:
                    seen_urls.add(article['url'])
                    new_articles.append(article)

    # 2. 搜索政绩观专题文章
    print(f'\n--- 搜索政绩观专题 ---')
    for level, queries in ZHENGJIGUAN_QUERIES.items():
        print(f'\n层级: {level}')
        for query in queries:
            print(f'搜索: {query}')
            results = search_articles(query, is_zhengjiguan=True)
            print(f'  返回 {len(results)} 条')
            for raw in results:
                article = normalize(raw, domain='party', is_zhengjiguan=True, zhengjiguan_level=level)
                if article and article['url'] not in seen_urls:
                    seen_urls.add(article['url'])
                    new_articles.append(article)

    print(f'\n{"="*60}')
    print(f'新增 {len(new_articles)} 条待审核文章')
    
    # 批量插入
    for i in range(0, len(new_articles), 20):
        supabase_insert(new_articles[i:i+20])

    print('完成！')


if __name__ == '__main__':
    main()