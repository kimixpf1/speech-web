# -*- coding: utf-8 -*-
"""
AI scheduled search script - Kimi API + Baidu search + People.cn direct crawl
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
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import quote, urlparse, urlunparse

try:
    from bs4 import BeautifulSoup
except ImportError:
    print('[警告] beautifulsoup4 未安装，部分直抓来源将不可用')
    BeautifulSoup = None

# Config
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
# 优先使用service_role_key，回退到anon_key
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_ANON_KEY', '')
KIMI_API_KEY = os.environ.get('KIMI_API_KEY', '')

# 调试输出环境变量状态
print(f'[Config] SUPABASE_URL: {"已配置" if SUPABASE_URL else "未配置"}')
print(f'[Config] SUPABASE_KEY: {"已配置" if SUPABASE_KEY else "未配置"} (service_role={"是" if os.environ.get("SUPABASE_SERVICE_ROLE_KEY") else "否"})')
print(f'[Config] KIMI_API_KEY: {"已配置" if KIMI_API_KEY else "未配置"}')

KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'
TABLE = 'pending_articles'
LOG_TABLE = 'search_logs'
REQUEST_DELAY = 1.5
MAX_RETRIES = 2

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

# 官方来源域名白名单
OFFICIAL_DOMAINS = [
    'people.com.cn', 'www.people.com.cn', 'jhsjk.people.cn',  # 人民网
    'xinhuanet.com', 'www.xinhuanet.com', 'news.cn', 'www.news.cn',  # 新华网
    'qstheory.cn', 'www.qstheory.cn',  # 求是网
    'cctv.com', 'www.cctv.com', 'cntv.cn',  # 央视网
    'gov.cn', 'www.gov.cn',  # 中国政府网
]

BAIDU_SITES = ['people.com.cn', 'xinhuanet.com', 'qstheory.cn']
COMMENTARY_KEYWORDS = [
    '总书记关切事', '和总书记面对面', '学习进行时', '第一观察', '第1观察',
    '时政微观察', '时政新闻眼', '近镜头', '一见', '时习之',
    '学思践悟', '评论员', '观察', '综述', '侧记', '纪实', '解读',
]
SOURCE_PRIORITY = {
    'qstheory': 1,
    'xinhua': 2,
    'kimi': 3,
    'baidu': 4,
    'people_xijinping': 5,
    'people_jhsjk': 6,
}

# 领域关键词 - 按优先级排列（外交优先检测）
DOMAIN_KEYWORDS = {
    'diplomacy': ['外交', '出访', '峰会', '总统', '总理', '国际', '外国', '国事访问', '友好访问'],
    'defense': ['军队', '国防', '军事', '军委', '强军', '部队', '战士'],
    'party': ['党建', '从严治党', '纪检', '巡视', '党校', '党员', '党组织'],
    'ecology': ['生态', '环境', '绿色', '碳达峰', '碳中和', '环保'],
    'culture': ['文化', '文明', '文艺', '体育', '艺术', '文学'],
    'society': ['民生', '扶贫', '乡村振兴', '医疗', '就业', '养老', '住房'],
    'economy': ['经济', '金融', '科技', '创新', '高质量发展', '产业', '企业'],
    'politics': ['政治', '人大', '政协', '全会', '两会', '法治', '立法'],
}

# 分类关键词 - 优化优先级
CATEGORY_KEYWORDS = {
    'inspection': ['考察', '调研', '视察', '走访', '看望', '慰问'],
    'article': ['《求是》', '发表文章', '重要文章', '署名文章'],
    'meeting': ['会议', '座谈会', '全会', '研讨会', '工作会'],
    'speech': ['讲话', '指示', '批示', '贺电', '贺信', '致辞', '发言'],
}

CATEGORY_NAMES = {'speech': '重要讲话', 'article': '发表文章', 'meeting': '重要会议', 'inspection': '考察调研'}
DOMAIN_NAMES = {'economy': '经济', 'politics': '政治', 'culture': '文化', 'society': '社会',
                'ecology': '生态', 'party': '党建', 'defense': '国防', 'diplomacy': '外交'}


def get_target_search_context() -> Tuple[str, str, str, str]:
    """返回目标搜索日期信息：日期文案、日期ISO、昨日/今日标签、搜索类型"""
    utc_now = datetime.utcnow()
    beijing_hour = (utc_now.hour + 8) % 24
    
    if beijing_hour < 12:
        target_dt = (utc_now + timedelta(hours=8) - timedelta(days=1))
        date_keyword = '昨日'
        search_date = 'yesterday'
    else:
        target_dt = (utc_now + timedelta(hours=8))
        date_keyword = '今日'
        search_date = 'today'

    target_date_cn = f'{target_dt.year}年{target_dt.month:02d}月{target_dt.day:02d}日'
    target_date_iso = target_dt.strftime('%Y-%m-%d')
    return target_date_cn, target_date_iso, date_keyword, search_date


def get_search_query():
    """Generate search query based on time: morning searches yesterday, evening searches today"""
    target_date_cn, _, date_keyword, search_date = get_target_search_context()
    utc_now = datetime.utcnow()
    beijing_hour = (utc_now.hour + 8) % 24
    query = (
        f'习近平总书记{date_keyword}最新讲话 文章 调研 会议 会见 '
        f'{target_date_cn} 人民日报 人民网 新华社 新华网 求是杂志 求是网'
    )
    print(f'[Time] Beijing {beijing_hour}:00, searching {date_keyword} ({target_date_cn})')
    return query, search_date, target_date_cn


def detect_domain(title: str) -> str:
    """检测文章领域，外交优先"""
    # 优先检测外交（因为外交活动常包含"会见"等词）
    diplomacy_keywords = ['外交', '出访', '峰会', '总统', '总理', '国际', '外国', '国事访问', '友好访问']
    if any(kw in title for kw in diplomacy_keywords):
        return 'diplomacy'
    
    # 再按顺序检测其他领域
    for domain, keywords in DOMAIN_KEYWORDS.items():
        if domain == 'diplomacy':
            continue  # 已检测过
        if any(kw in title for kw in keywords):
            return domain
    return 'politics'


def detect_category(title: str) -> str:
    """检测文章分类，考虑外交会见的特殊情况"""
    # 如果是外交相关的会见，归为 meeting
    diplomacy_keywords = ['外交', '出访', '峰会', '总统', '总理', '国际', '外国']
    is_diplomacy = any(kw in title for kw in diplomacy_keywords)
    
    # 按优先级检测
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in title for kw in keywords):
            # 特殊处理：外交+会见 = meeting
            if is_diplomacy and '会见' in title:
                return 'meeting'
            return category
    
    # 如果有"会见"但没匹配到其他，归为 meeting
    if '会见' in title:
        return 'meeting'
    
    return 'speech'


def fetch_page(url: str, retry: int = 0) -> Optional[str]:
    try:
        response = requests.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
        response.encoding = 'utf-8'
        if response.status_code != 200:
            raise Exception(f'HTTP {response.status_code}')
        return response.text
    except Exception as error:
        if retry < MAX_RETRIES:
            print(f'[Fetch] 重试 {retry + 1}/{MAX_RETRIES}: {url} - {error}')
            time.sleep(2)
            return fetch_page(url, retry + 1)
        print(f'[Fetch] 放弃: {url} - {error}')
        return None


def normalize_title_for_compare(title: str) -> str:
    normalized = title.strip()
    prefixes = [
        '《求是》杂志发表习近平总书记重要文章《',
        '《求是》杂志发表习近平总书记重要文章',
        '习近平总书记重要文章',
        '习近平总书记',
        '习近平',
    ]
    for prefix in prefixes:
        normalized = normalized.replace(prefix, '').strip()
    normalized = re.sub(r'[《》「」『』【】\s"“”‘’·,，。:：!！?？\-—]', '', normalized)
    return normalized


def normalize_url_for_compare(url: str) -> str:
    if not url:
        return ''
    parsed = urlparse(url.strip())
    path = parsed.path.rstrip('/')
    if 'jhsjk.people.cn' in parsed.netloc and path.startswith('/article/'):
        return urlunparse((parsed.scheme or 'https', parsed.netloc, path, '', '', ''))
    return urlunparse((parsed.scheme or 'https', parsed.netloc, path, '', '', ''))


def clean_page_title(title: str) -> str:
    return (
        (title or '')
        .replace(' - 求是网', '')
        .replace(' - 新华网', '')
        .replace(' - 人民网', '')
        .replace(' - 中国共产党新闻网', '')
        .strip()
    )


def is_commentary_title(title: str) -> bool:
    return any(keyword in (title or '') for keyword in COMMENTARY_KEYWORDS)


def is_direct_xi_title(title: str) -> bool:
    stripped_title = (title or '').strip()
    if not stripped_title or is_commentary_title(stripped_title):
        return False
    direct_prefixes = [
        '习近平', '中共中央和习近平总书记',
    ]
    return any(stripped_title.startswith(prefix) for prefix in direct_prefixes)


def get_page_title_and_text(url: str) -> Tuple[str, str]:
    html = fetch_page(url)
    if not html or not BeautifulSoup:
        return '', ''
    soup = BeautifulSoup(html, 'html.parser')
    title = clean_page_title(soup.title.get_text(' ', strip=True) if soup.title else '')
    text = soup.get_text('\n', strip=True)
    return title, text


def normalize_direct_article(article: Dict) -> Optional[Dict]:
    normalized = dict(article)
    normalized['url'] = normalize_url_for_compare(article.get('url', ''))
    url = normalized['url']
    title = (normalized.get('title') or '').strip()

    if not url:
        return None

    if 'jhsjk.people.cn' in url and '/article/' in url:
        return normalized

    if 'qstheory.cn' in url:
        page_title, page_text = get_page_title_and_text(url)
        if not page_title or '作者：习近平' not in page_text:
            return None
        normalized['title'] = page_title
        normalized['summary'] = page_title
        normalized['source'] = '求是网'
        normalized['category'] = 'article'
        normalized['categoryName'] = '发表文章'
        return normalized

    if 'news.cn' in url or 'xinhuanet.com' in url:
        if not is_direct_xi_title(title):
            return None
        return normalized

    if 'people.com.cn' in url:
        if not is_direct_xi_title(title):
            return None
        return normalized

    return normalized if is_direct_xi_title(title) else None


def is_title_duplicate(title: str, existing_titles: Set[str]) -> bool:
    normalized_title = normalize_title_for_compare(title)
    if not normalized_title:
        return False

    for existing in existing_titles:
        normalized_existing = normalize_title_for_compare(existing)
        if not normalized_existing:
            continue
        if normalized_title == normalized_existing:
            return True
        if normalized_title in normalized_existing or normalized_existing in normalized_title:
            return True
        if len(normalized_title) >= 8 and len(normalized_existing) >= 8:
            common = sum(1 for char in normalized_title if char in normalized_existing)
            similarity = common / max(len(normalized_title), len(normalized_existing))
            if similarity > 0.8:
                return True
    return False


def extract_date_from_text(text: str) -> str:
    patterns = [
        r'(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})',
        r'(\d{4})(\d{2})(\d{2})',
        r'(\d{4})/(\d{2})(\d{2})',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return f'{match.group(1)}-{int(match.group(2)):02d}-{int(match.group(3)):02d}'
    return ''


def is_target_date(article_date: str, target_date_iso: str) -> bool:
    return bool(article_date and article_date == target_date_iso)


def ensure_url_accessible(url: str) -> Tuple[bool, str]:
    try:
        head_response = requests.head(url, timeout=10, allow_redirects=True, headers=HEADERS)
        if head_response.status_code < 400:
            return True, ''
        if head_response.status_code not in (403, 405):
            return False, f'HEAD返回错误: {head_response.status_code}'
    except Exception:
        pass

    try:
        get_response = requests.get(url, timeout=15, allow_redirects=True, headers=HEADERS, stream=True)
        if get_response.status_code < 400:
            return True, ''
        return False, f'GET返回错误: {get_response.status_code}'
    except Exception as error:
        return False, f'URL无法访问: {str(error)[:50]}'


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
    
    accessible, reason = ensure_url_accessible(url)
    if not accessible:
        result['valid'] = False
        result['reasons'].append(reason)
        return result
    
    return result


def search_with_kimi(query: str, target_date_iso: str, target_date_cn: str, date_keyword: str) -> List[Dict]:
    if not KIMI_API_KEY:
        print('[Kimi] API Key not configured')
        return []
    
    beijing_today = datetime.utcnow() + timedelta(hours=8)
    today = f'{beijing_today.year}年{beijing_today.month:02d}月{beijing_today.day:02d}日'
    
    system_prompt = f"""你是新闻搜索助手。今天是{today}。

重要提示：
1. 必须使用联网搜索($web_search)获取最新新闻
2. 绝对不要使用训练数据中的旧新闻
3. 本次只返回{date_keyword}（{target_date_cn} / {target_date_iso}）发布的新闻，其他日期直接丢弃

【极其重要】URL真实性要求：
- 必须返回你通过联网搜索实际访问过、确认存在的真实URL
- 禁止编造、拼凑、猜测任何URL
- 如果搜索结果没有提供完整URL，就不要返回这条新闻
- 宁可少返回，也不能返回假URL

请联网搜索习近平总书记在以下权威来源发布的新内容：
- 人民日报 / 人民网
- 新华社 / 新华网
- 求是杂志 / 求是网
- 人民网总书记讲话数据库或总书记专栏

内容类型包括：重要讲话、发表文章、重要会议、会见会谈、考察调研。
返回JSON数组，每条包含：
{{"title": "标题", "date": "YYYY-MM-DD", "category": "speech", "categoryName": "重要讲话", "source": "来源", "url": "真实可访问的链接", "summary": "摘要"}}
要求：只返回{target_date_iso}这一天的新闻，最多10条，只返回JSON数组。如果没找到最新新闻或无法确认URL真实性，返回空数组[]。"""

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


def search_with_baidu(target_date_iso: str) -> List[Dict]:
    print('[Baidu] Starting search...')
    articles = []
    if not BeautifulSoup:
        print('[Baidu] BeautifulSoup not installed')
        return []
    
    for site in BAIDU_SITES:
        search_query = f'site:{site} 习近平 总书记 最新 {target_date_iso}'
        url = f'https://www.baidu.com/s?wd={quote(search_query)}&rn=10'
        
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
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
                    'date': target_date_iso,
                    'summary': title,
                })
            time.sleep(REQUEST_DELAY)
        except Exception as e:
            print(f'[Baidu] {site} failed: {e}')
    
    print(f'[Baidu] Found {len(articles)} articles')
    return articles


def crawl_people_jhsjk(target_date_iso: str) -> List[Dict]:
    """直接从人民网习近平系列重要讲话数据库抓取目标日期文章"""
    print('[People JHSJK] Starting direct crawl...')
    articles = []
    if not BeautifulSoup:
        print('[People JHSJK] BeautifulSoup not installed')
        return []
    
    try:
        resp = requests.get('https://jhsjk.people.cn/result?year={}&page=1'.format(date.today().year), headers=HEADERS, timeout=30)
        if resp.status_code != 200:
            print(f'[People JHSJK] HTTP error: {resp.status_code}')
            return []
        
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')

        seen_urls = set()
        for link in soup.select('a[href*="article/"]'):
            title = link.get_text(strip=True)
            href = link.get('href', '')
            if not title or not href:
                continue
            if href in seen_urls:
                continue
            seen_urls.add(href)

            full_url = normalize_url_for_compare(href if href.startswith('http') else f'https://jhsjk.people.cn/{href.lstrip("/")}')
            parent = link.find_parent('li') or link.find_parent('div')
            article_date = extract_date_from_text(parent.get_text(' ', strip=True) if parent else '')
            if not is_target_date(article_date, target_date_iso):
                continue
            
            articles.append({
                'title': title,
                'url': full_url,
                'source': '人民网',
                'date': article_date,
                'summary': title,
            })
            print(f'[People JHSJK] 发现: {title[:40]}... ({article_date})')
        
        print(f'[People JHSJK] Found {len(articles)} target-day articles')
        return articles
        
    except Exception as e:
        print(f'[People JHSJK] Error: {e}')
        return []


def crawl_people_xijinping(target_date_iso: str) -> List[Dict]:
    print('[People XJP Column] Starting direct crawl...')
    articles = []
    if not BeautifulSoup:
        return articles

    html = fetch_page('https://cpc.people.com.cn/xijinping/')
    if not html:
        return articles

    soup = BeautifulSoup(html, 'html.parser')
    seen_urls = set()
    for link in soup.find_all('a', href=True):
        href = link.get('href', '')
        title = link.get_text(strip=True)
        if not title or len(title) < 8:
            continue
        if not re.search(r'/n\d+/\d{4}/\d{4}/', href) and not re.search(r'/\d{6}/\d{2}/', href):
            continue

        if href.startswith('//'):
            href = 'https:' + href
        elif href.startswith('/'):
            href = 'https://cpc.people.com.cn' + href
        if href in seen_urls or not href.startswith('http'):
            continue
        seen_urls.add(href)

        article_date = extract_date_from_text(href.replace('/', '-'))
        if not is_target_date(article_date, target_date_iso):
            continue

        articles.append({
            'title': title,
            'url': href,
            'date': article_date,
            'source': '人民网',
            'summary': title,
        })

    print(f'[People XJP Column] Found {len(articles)} target-day articles')
    return articles


def crawl_qstheory(target_date_iso: str) -> List[Dict]:
    print('[QSTheory] Starting direct crawl...')
    articles = []
    if not BeautifulSoup:
        return articles

    for page_url in ['https://www.qstheory.cn/llwx/index.htm', 'https://www.qstheory.cn/']:
        html = fetch_page(page_url)
        if not html:
            continue

        soup = BeautifulSoup(html, 'html.parser')
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            title = link.get_text(strip=True)
            if not title or len(title) < 8:
                continue
            if not re.search(r'/\d{8}/', href) and not re.search(r'/\d{4}-\d{2}/\d{2}/', href) and not re.search(r'/\d{4}/\d{4}/', href):
                continue

            if href.startswith('//'):
                href = 'https:' + href
            elif href.startswith('/'):
                href = 'https://www.qstheory.cn' + href
            if 'en.qstheory.cn' in href or not href.startswith('http'):
                continue

            href = normalize_url_for_compare(href)
            article_date = extract_date_from_text(href)
            if not is_target_date(article_date, target_date_iso):
                continue

            articles.append({
                'title': title,
                'url': href,
                'date': article_date,
                'source': '求是网',
                'summary': title,
            })
        time.sleep(REQUEST_DELAY)

    unique_articles = []
    seen_urls = set()
    for article in articles:
        if article['url'] in seen_urls:
            continue
        seen_urls.add(article['url'])
        unique_articles.append(article)

    print(f'[QSTheory] Found {len(unique_articles)} target-day articles')
    return unique_articles


def crawl_xinhua(target_date_iso: str) -> List[Dict]:
    print('[Xinhua] Starting direct crawl...')
    articles = []
    if not BeautifulSoup:
        return articles

    html = fetch_page('https://www.news.cn/politics/leaders/xijinping/index.htm')
    if not html:
        html = fetch_page('https://www.xinhuanet.com/politics/leaders/xijinping/')
    if not html:
        return articles

    soup = BeautifulSoup(html, 'html.parser')
    seen_urls = set()
    for link in soup.find_all('a', href=True):
        href = link.get('href', '')
        title = link.get_text(strip=True)
        if not title or len(title) < 8:
            continue
        if not re.search(r'/\d{8}/\d+', href) and not re.search(r'/\d{4}-\d{2}/\d{2}/', href):
            continue

        if href.startswith('//'):
            href = 'https:' + href
        elif href.startswith('/'):
            href = 'https://www.news.cn' + href
        if not href.startswith('http') or href in seen_urls:
            continue
        seen_urls.add(href)

        article_date = extract_date_from_text(href)
        if not is_target_date(article_date, target_date_iso):
            continue

        articles.append({
            'title': title,
            'url': href,
            'date': article_date,
            'source': '新华网',
            'summary': title,
        })

    print(f'[Xinhua] Found {len(articles)} target-day articles')
    return articles


def merge_and_dedupe(source_articles: Dict[str, List[Dict]], existing_titles: Optional[Set[str]] = None) -> List[Dict]:
    all_articles = []
    seen_titles = set()
    seen_urls = set()
    rejected = []
    existing_titles = existing_titles or set()
    
    def add(article, source_tag):
        normalized_article = normalize_direct_article(article)
        if not normalized_article:
            return

        title, url = normalized_article.get('title', ''), normalized_article.get('url', '')
        normalized_url = normalize_url_for_compare(url)
        if not title or not normalized_url or normalized_url in seen_urls:
            return
        if is_title_duplicate(title, existing_titles) or is_title_duplicate(title, seen_titles):
            return
        
        validation = validate_article(normalized_article)
        if not validation['valid']:
            rejected.append({'title': title, 'url': normalized_url, 'reasons': validation['reasons']})
            print(f'[Validate] 拒绝: {title[:30]}... - {validation["reasons"]}')
            return
        
        seen_urls.add(normalized_url)
        seen_titles.add(title)
        
        domain = detect_domain(title)
        category = normalized_article.get('category') or detect_category(title)
        
        all_articles.append({
            'id': str(uuid.uuid4()),
            'title': title, 'url': normalized_url,
            'date': normalized_article.get('date', date.today().isoformat()),
            'source': normalized_article.get('source', '官方媒体'),
            'summary': normalized_article.get('summary', title),
            'category': category,
            'categoryname': normalized_article.get('categoryName', CATEGORY_NAMES.get(category, '重要讲话')),
            'status': 'pending',
            'discovered_by': f'ai_auto_{source_tag}',
            'fetched_at': datetime.now().isoformat(),
        })

    ordered_sources = sorted(
        source_articles.items(),
        key=lambda item: SOURCE_PRIORITY.get(item[0], 99)
    )

    for source_tag, articles in ordered_sources:
        for article in articles:
            add(article, source_tag)
    
    return all_articles


def get_existing_urls() -> set:
    if not SUPABASE_URL:
        return set()
    urls = set()
    for table in [TABLE, 'articles']:
        try:
            resp = requests.get(
                f'{SUPABASE_URL}/rest/v1/{table}?select=url&limit=2000',
                headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'},
                timeout=30
            )
            if resp.status_code == 200:
                urls |= {normalize_url_for_compare(row['url']) for row in resp.json() if row.get('url')}
        except Exception:
            continue
    return urls


def get_existing_titles() -> set:
    if not SUPABASE_URL:
        return set()
    titles = set()
    for table in [TABLE, 'articles']:
        try:
            resp = requests.get(
                f'{SUPABASE_URL}/rest/v1/{table}?select=title&limit=2000',
                headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'},
                timeout=30
            )
            if resp.status_code == 200:
                titles |= {row['title'] for row in resp.json() if row.get('title')}
        except Exception:
            continue
    return titles


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


def save_log(crawl_count, search_count, new_count, status, details):
    if not SUPABASE_URL:
        print('[Log] SUPABASE_URL not configured')
        return
    try:
        # 使用北京时间，明确带时区信息
        from datetime import timezone
        beijing_tz = timezone(timedelta(hours=8))
        beijing_now = datetime.now(beijing_tz)
        log_data = {
            'executed_at': beijing_now.isoformat(),  # 带时区的北京时间
            'crawl_count': crawl_count,
            'search_count': search_count,
            'new_count': new_count,
            'status': status,
            'details': {**details, 'search_type': 'auto', 'api_used': 'direct+kimi+baidu'},
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
    
    target_date_cn, target_date_iso, date_keyword, search_date = get_target_search_context()
    search_query, _, _ = get_search_query()
    print(f'[Target] 目标日期: {target_date_iso} ({date_keyword}/{target_date_cn})')

    existing_urls = get_existing_urls()
    existing_titles = get_existing_titles()
    print(f'[Existing] urls={len(existing_urls)}, titles={len(existing_titles)}')

    direct_source_articles = {
        'people_jhsjk': crawl_people_jhsjk(target_date_iso),
        'people_xijinping': crawl_people_xijinping(target_date_iso),
        'xinhua': crawl_xinhua(target_date_iso),
        'qstheory': crawl_qstheory(target_date_iso),
    }

    kimi_articles = search_with_kimi(search_query, target_date_iso, target_date_cn, date_keyword)
    baidu_articles = search_with_baidu(target_date_iso)

    source_articles = {
        **direct_source_articles,
        'kimi': kimi_articles,
        'baidu': baidu_articles,
    }

    merged = merge_and_dedupe(source_articles, existing_titles)
    print(f'[Merge] After dedup: {len(merged)} articles')
    
    new_articles = [a for a in merged if a['url'] not in existing_urls]
    print(f'[Filter] New: {len(new_articles)} articles')
    
    saved = save_articles(new_articles)
    
    # 状态判定：工作流正常运行即为成功，没找到文章不是失败
    # failed 仅用于 API 调用异常等真正的失败情况
    status = 'success'
    # 记录搜索源状态到 details 中，但不改变 success 状态
    # 因为"没找到文章"也是正常的业务结果
    
    direct_count = sum(len(items) for items in direct_source_articles.values())
    save_log(
        direct_count + len(kimi_articles) + len(baidu_articles),
        len(kimi_articles) + len(baidu_articles),
        saved,
        status,
        {
            'people_jhsjk': len(direct_source_articles['people_jhsjk']),
            'people_xijinping': len(direct_source_articles['people_xijinping']),
            'xinhua': len(direct_source_articles['xinhua']),
            'qstheory': len(direct_source_articles['qstheory']),
            'kimi': len(kimi_articles),
            'baidu': len(baidu_articles),
            'search_date': search_date,
            'target_date': target_date_iso,
        }
    )
    
    print(
        '=== Done: '
        f'PeopleJHSJK {len(direct_source_articles["people_jhsjk"])}, '
        f'PeopleXJP {len(direct_source_articles["people_xijinping"])}, '
        f'Xinhua {len(direct_source_articles["xinhua"])}, '
        f'QSTheory {len(direct_source_articles["qstheory"])}, '
        f'Kimi {len(kimi_articles)}, Baidu {len(baidu_articles)}, New {saved} ==='
    )


if __name__ == '__main__':
    main()
