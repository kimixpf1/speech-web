# -*- coding: utf-8 -*-
"""
AI scheduled search script - Kimi API + Baidu search
Morning 8:00: search yesterday's articles (catch up)
Evening 8:00: search today's articles
"""
import os
import re
import json
import uuid
import time
import requests
from datetime import date, datetime, timedelta
from typing import Dict, List
from urllib.parse import quote

# Config
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
KIMI_API_KEY = os.environ.get('KIMI_API_KEY', '')

# 调试输出环境变量状态
print(f'[Config] SUPABASE_URL: {"已配置" if SUPABASE_URL else "未配置"}')
print(f'[Config] SUPABASE_ANON_KEY: {"已配置" if SUPABASE_KEY else "未配置"}')
print(f'[Config] KIMI_API_KEY: {"已配置" if KIMI_API_KEY else "未配置"}')

KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'
TABLE = 'pending_articles'
LOG_TABLE = 'search_logs'

# 官方来源域名白名单
OFFICIAL_DOMAINS = [
    'people.com.cn', 'www.people.com.cn',  # 人民网
    'xinhuanet.com', 'www.xinhuanet.com', 'news.cn', 'www.news.cn',  # 新华网
    'qstheory.cn', 'www.qstheory.cn',  # 求是网
    'cctv.com', 'www.cctv.com', 'cntv.cn',  # 央视网
    'gov.cn', 'www.gov.cn',  # 中国政府网
]

BAIDU_SITES = ['people.com.cn', 'xinhuanet.com', 'qstheory.cn']

DOMAIN_KEYWORDS = {
    'diplomacy': ['外交', '会见', '出访', '峰会', '总统', '总理', '国际'],
    'defense': ['军队', '国防', '军事', '军委', '强军'],
    'party': ['党建', '从严治党', '纪检', '巡视', '党校'],
    'ecology': ['生态', '环境', '绿色', '碳达峰', '碳中和'],
    'culture': ['文化', '文明', '文艺', '教育', '体育'],
    'society': ['民生', '扶贫', '乡村振兴', '医疗', '就业'],
    'economy': ['经济', '金融', '科技', '创新', '高质量发展'],
    'politics': ['政治', '人大', '政协', '全会', '两会', '法治'],
}

CATEGORY_KEYWORDS = {
    'meeting': ['会议', '会见', '座谈会', '全会', '峰会'],
    'inspection': ['考察', '调研', '走访', '看望', '慰问'],
    'article': ['《求是》', '发表文章', '重要文章'],
    'speech': ['讲话', '指示', '批示', '贺电', '贺信', '致辞'],
}

CATEGORY_NAMES = {'speech': '重要讲话', 'article': '发表文章', 'meeting': '重要会议', 'inspection': '考察调研'}
DOMAIN_NAMES = {'economy': '经济', 'politics': '政治', 'culture': '文化', 'society': '社会',
                'ecology': '生态', 'party': '党建', 'defense': '国防', 'diplomacy': '外交'}


def get_search_query():
    """Generate search query based on time: morning searches yesterday, evening searches today"""
    utc_now = datetime.utcnow()
    beijing_hour = (utc_now.hour + 8) % 24
    
    if beijing_hour < 12:
        # Morning (0-12): search yesterday
        target_date = (utc_now + timedelta(hours=8) - timedelta(days=1)).strftime('%Y年%m月%d日')
        date_keyword = '昨日'
        search_date = 'yesterday'
    else:
        # Afternoon/Evening (12-24): search today
        target_date = (utc_now + timedelta(hours=8)).strftime('%Y年%m月%d日')
        date_keyword = '今日'
        search_date = 'today'
    
    query = f'习近平总书记{date_keyword}最新讲话 文章 调研 会议 {target_date}'
    print(f'[Time] Beijing {beijing_hour}:00, searching {date_keyword} ({target_date})')
    return query, search_date, target_date


def detect_domain(title: str) -> str:
    for domain, keywords in DOMAIN_KEYWORDS.items():
        if any(kw in title for kw in keywords):
            return domain
    return 'politics'


def detect_category(title: str) -> str:
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in title for kw in keywords):
            return category
    return 'speech'


def validate_article(article: Dict) -> Dict:
    """验证文章有效性：URL可访问、日期正确、来源官方"""
    result = {'valid': True, 'reasons': []}
    
    url = article.get('url', '')
    title = article.get('title', '')
    article_date = article.get('date', '')
    
    # 1. 检查URL格式
    if not url or not url.startswith('http'):
        result['valid'] = False
        result['reasons'].append('URL格式无效')
        return result
    
    # 2. 检查来源是否官方
    from urllib.parse import urlparse
    domain = urlparse(url).netloc.lower()
    is_official = any(off_domain in domain for off_domain in OFFICIAL_DOMAINS)
    if not is_official:
        result['valid'] = False
        result['reasons'].append(f'非官方来源: {domain}')
        return result
    
    # 3. 检查日期是否最近3天
    try:
        if article_date:
            art_date = datetime.strptime(article_date, '%Y-%m-%d')
            today = datetime.utcnow() + timedelta(hours=8)
            days_diff = (today - art_date).days
            if days_diff > 3 or days_diff < -1:
                result['valid'] = False
                result['reasons'].append(f'日期过旧: {article_date}（距今{days_diff}天）')
                return result
    except:
        pass
    
    # 4. 检查URL是否可访问（HEAD请求）
    try:
        resp = requests.head(url, timeout=10, allow_redirects=True, 
                           headers={'User-Agent': 'Mozilla/5.0'})
        if resp.status_code == 404:
            result['valid'] = False
            result['reasons'].append('URL返回404')
            return result
        if resp.status_code >= 400:
            result['valid'] = False
            result['reasons'].append(f'URL返回错误: {resp.status_code}')
            return result
    except Exception as e:
        result['valid'] = False
        result['reasons'].append(f'URL无法访问: {str(e)[:50]}')
        return result
    
    return result


def search_with_kimi(query: str) -> List[Dict]:
    if not KIMI_API_KEY:
        print('[Kimi] API Key not configured')
        return []
    
    # 获取今天日期
    today = (datetime.utcnow() + timedelta(hours=8)).strftime('%Y年%m月%d日')
    today_date = (datetime.utcnow() + timedelta(hours=8)).strftime('%Y-%m-%d')
    
    system_prompt = f"""你是新闻搜索助手。今天是{today}。

重要提示：
1. 必须使用联网搜索($web_search)获取最新新闻
2. 绝对不要使用训练数据中的旧新闻
3. 只返回{today_date}之后发布的新闻，更早的新闻直接丢弃

请联网搜索习近平总书记最近的重要讲话、文章、会议、考察调研新闻。
返回JSON数组，每条包含：
{{"title": "标题", "date": "YYYY-MM-DD", "category": "speech", "categoryName": "重要讲话", "source": "来源", "url": "链接", "summary": "摘要"}}
要求：只返回最近3天内的新闻，最多10条，只返回JSON数组。如果没找到最新新闻，返回空数组[]。"""

    print(f'[Kimi] Searching: {query}')
    try:
        response = requests.post(
            KIMI_API_URL,
            headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {KIMI_API_KEY}'},
            json={
                'model': 'moonshot-v1-auto',
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': query},
                ],
                'tools': [{'type': 'builtin_function', 'function': {'name': '$web_search'}}],
                'temperature': 0.1,
            },
            timeout=120
        )
        
        if response.status_code != 200:
            print(f'[Kimi] API error: {response.status_code}')
            return []
        
        content = response.json().get('choices', [{}])[0].get('message', {}).get('content', '')
        print(f'[Kimi] Response: {content[:200]}...')
        
        match = re.search(r'\[[\s\S]*?\]', content)
        if not match:
            return []
        
        articles = json.loads(match.group())
        print(f'[Kimi] Found {len(articles)} articles')
        return [a for a in articles if a.get('title') and a.get('url', '').startswith('http')]
    
    except Exception as e:
        print(f'[Kimi] Search failed: {e}')
        return []


def search_with_baidu(query: str) -> List[Dict]:
    print('[Baidu] Starting search...')
    articles = []
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print('[Baidu] BeautifulSoup not installed')
        return []
    
    for site in BAIDU_SITES:
        search_query = f'site:{site} 习近平 最新'
        url = f'https://www.baidu.com/s?wd={quote(search_query)}&rn=10'
        
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code != 200:
                continue
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            for result in soup.select('.result.c-container')[:5]:
                title_elem = result.select_one('h3 a')
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                if '习近平' not in title and '总书记' not in title:
                    continue
                
                articles.append({
                    'title': title,
                    'url': title_elem.get('href', ''),
                    'source': site.split('.')[0],
                    'date': date.today().isoformat(),
                    'summary': title,
                })
            time.sleep(2)
        except Exception as e:
            print(f'[Baidu] {site} failed: {e}')
    
    print(f'[Baidu] Found {len(articles)} articles')
    return articles


def merge_and_dedupe(kimi_articles: List[Dict], baidu_articles: List[Dict]) -> List[Dict]:
    all_articles = []
    seen_titles = set()
    seen_urls = set()
    rejected = []
    
    def simplify(t): return re.sub(r'[《》""「」『』【】\s]', '', t)
    
    def add(article, source_tag):
        title, url = article.get('title', ''), article.get('url', '')
        if not title or not url or url in seen_urls:
            return
        
        simple = simplify(title)
        if simple in seen_titles:
            return
        
        # 验证文章有效性
        validation = validate_article(article)
        if not validation['valid']:
            rejected.append({'title': title, 'url': url, 'reasons': validation['reasons']})
            print(f'[Validate] 拒绝: {title[:30]}... - {validation["reasons"]}')
            return
        
        seen_urls.add(url)
        seen_titles.add(simple)
        
        domain = detect_domain(title)
        category = detect_category(title)
        
        all_articles.append({
            'id': str(uuid.uuid4()),
            'title': title, 'url': url,
            'date': article.get('date', date.today().isoformat()),
            'source': article.get('source', '官方媒体'),
            'summary': article.get('summary', title),
            'category': category,
            'categoryname': CATEGORY_NAMES.get(category, '重要讲话'),
            'status': 'pending',
            'discovered_by': f'ai_auto_{source_tag}',
            'fetched_at': datetime.now().isoformat(),
        })
    
    for a in kimi_articles:
        add(a, 'kimi')
    for a in baidu_articles:
        add(a, 'baidu')
    
    return all_articles


def get_existing_urls() -> set:
    if not SUPABASE_URL:
        return set()
    try:
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/{TABLE}?select=url',
            headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'},
            timeout=10
        )
        return {r['url'] for r in resp.json() if r.get('url')} if resp.status_code == 200 else set()
    except:
        return set()


def save_articles(articles: List[Dict]) -> int:
    if not articles or not SUPABASE_URL:
        return 0
    try:
        resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/{TABLE}',
            headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}',
                     'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
            json=articles, timeout=30
        )
        return len(articles) if resp.status_code in (200, 201) else 0
    except:
        return 0


def save_log(kimi_count, baidu_count, new_count, status, details):
    if not SUPABASE_URL:
        print('[Log] SUPABASE_URL not configured')
        return
    try:
        log_data = {
            'executed_at': datetime.now().isoformat(),
            'crawl_count': kimi_count + baidu_count,
            'search_count': kimi_count + baidu_count,
            'new_count': new_count,
            'status': status,
            'details': {**details, 'search_type': 'auto', 'api_used': 'kimi+baidu'},
            'duration_seconds': 0,
        }
        print(f'[Log] Saving to {LOG_TABLE}: {json.dumps(log_data, ensure_ascii=False)}')
        
        resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/{LOG_TABLE}',
            headers={
                'apikey': SUPABASE_KEY, 
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            json=log_data, 
            timeout=10
        )
        print(f'[Log] Response: {resp.status_code} - {resp.text[:200] if resp.text else "empty"}')
        if resp.status_code not in (200, 201):
            print(f'[Log] ERROR: Failed to save log')
    except Exception as e:
        print(f'[Log] Exception: {e}')


def main():
    print(f'=== AI Scheduled Search {datetime.now()} ===')
    
    # Get search query based on time
    search_query, search_date, target_date = get_search_query()
    
    kimi_articles = search_with_kimi(search_query)
    baidu_articles = search_with_baidu(search_query)
    
    merged = merge_and_dedupe(kimi_articles, baidu_articles)
    print(f'[Merge] After dedup: {len(merged)} articles')
    
    existing = get_existing_urls()
    new_articles = [a for a in merged if a['url'] not in existing]
    print(f'[Filter] New: {len(new_articles)} articles')
    
    saved = save_articles(new_articles)
    
    status = 'success'
    if not kimi_articles and not baidu_articles:
        status = 'failed'
    elif not kimi_articles or not baidu_articles:
        status = 'partial_fail'
    
    save_log(len(kimi_articles), len(baidu_articles), saved, status,
             {'kimi': len(kimi_articles), 'baidu': len(baidu_articles), 
              'search_date': search_date, 'target_date': target_date})
    
    print(f'=== Done: Kimi {len(kimi_articles)}, Baidu {len(baidu_articles)}, New {saved} ===')


if __name__ == '__main__':
    main()
