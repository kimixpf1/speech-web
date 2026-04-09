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
from typing import Dict, List
from urllib.parse import quote

# Config
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
# 优先使用service_role_key，回退到anon_key
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_ANON_KEY', '')
KIMI_API_KEY = os.environ.get('KIMI_API_KEY', '')
DASHSCOPE_API_KEY = os.environ.get('DASHSCOPE_API_KEY', '')

# 调试输出环境变量状态
print(f'[Config] SUPABASE_URL: {"已配置" if SUPABASE_URL else "未配置"}')
print(f'[Config] SUPABASE_KEY: {"已配置" if SUPABASE_KEY else "未配置"} (service_role={"是" if os.environ.get("SUPABASE_SERVICE_ROLE_KEY") else "否"})')
print(f'[Config] KIMI_API_KEY: {"已配置" if KIMI_API_KEY else "未配置"}')
print(f'[Config] DASHSCOPE_API_KEY: {"已配置" if DASHSCOPE_API_KEY else "未配置"}')

KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'
DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
TABLE = 'pending_articles'
LOG_TABLE = 'search_logs'

# 官方来源域名白名单
OFFICIAL_DOMAINS = [
    'people.com.cn', 'www.people.com.cn', 'jhsjk.people.cn',  # 人民网
    'xinhuanet.com', 'www.xinhuanet.com', 'news.cn', 'www.news.cn',  # 新华网
    'qstheory.cn', 'www.qstheory.cn',  # 求是网
    'cctv.com', 'www.cctv.com', 'cntv.cn',  # 央视网
    'gov.cn', 'www.gov.cn',  # 中国政府网
]

BAIDU_SITES = ['people.com.cn', 'xinhuanet.com', 'news.cn', 'qstheory.cn', 'gov.cn', 'cctv.com']

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


def get_search_query():
    """Generate multiple search queries based on time: morning searches yesterday, evening searches today"""
    utc_now = datetime.utcnow()
    beijing_hour = (utc_now.hour + 8) % 24
    
    if beijing_hour < 12:
        target_date = (utc_now + timedelta(hours=8) - timedelta(days=1)).strftime('%Y年%m月%d日')
        date_keyword = '昨日'
        search_date = 'yesterday'
    else:
        target_date = (utc_now + timedelta(hours=8)).strftime('%Y年%m月%d日')
        date_keyword = '今日'
        search_date = 'today'
    
    queries = [
        f'习近平{date_keyword}最新讲话 指示 {target_date}',
        f'习近平{date_keyword}考察调研会议 {target_date}',
        f'习近平{date_keyword}重要活动新闻 {target_date}',
        f'习近平{date_keyword}回信贺信致辞 {target_date}',
    ]
    
    main_query = f'习近平总书记{date_keyword}最新活动新闻 {target_date}'
    
    print(f'[Time] Beijing {beijing_hour}:00, searching {date_keyword} ({target_date}), {len(queries)} queries')
    return main_query, queries, search_date, target_date


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


def _parse_ai_articles(content: str, source_name: str) -> List[Dict]:
    """通用解析AI返回的JSON文章列表"""
    if not content or content.strip() in ('', '...', '[]', '无', '没有'):
        print(f'[{source_name}] Empty or invalid response content')
        return []
    
    match = re.search(r'\[[\s\S]*?\]', content)
    if not match:
        print(f'[{source_name}] No JSON array found in response')
        return []
    
    try:
        articles = json.loads(match.group())
    except json.JSONDecodeError as e:
        print(f'[{source_name}] JSON parse error: {e}')
        return []
    
    valid = [a for a in articles if a.get('title') and a.get('url', '').startswith('http')]
    print(f'[{source_name}] Parsed {len(articles)} raw, {len(valid)} valid articles')
    return valid


def _build_news_search_prompt() -> tuple:
    """构建通用新闻搜索 system prompt，返回 (prompt, today, today_date)"""
    now_bj = datetime.utcnow() + timedelta(hours=8)
    today = f'{now_bj.year}\u5e74{now_bj.month:02d}\u6708{now_bj.day:02d}\u65e5'
    today_date = now_bj.strftime('%Y-%m-%d')
    
    system_prompt = f"""你是新闻搜索助手。今天是{today}。

重要提示：
1. 必须联网搜索获取最新新闻
2. 绝对不要使用训练数据中的旧新闻
3. 只返回{today_date}之后发布的新闻，更早的新闻直接丢弃

【极其重要】URL真实性要求：
- 必须返回你通过联网搜索实际访问过、确认存在的真实URL
- 禁止编造、拼凑、猜测任何URL
- 如果搜索结果没有提供完整URL，就不要返回这条新闻
- 宁可少返回，也不能返回假URL

请联网搜索习近平总书记最近的重要讲话、重要文章、重要会议、考察调研、指示批示、回信贺信等全部最新活动新闻。
特别注意：除了重要讲话和会议，还要关注产业发展、服务业、科技创新、民生保障等各领域的新动向。
搜索范围包括但不限于：新华网(xinhuanet.com/news.cn)、人民网(people.com.cn)、中国政府网(gov.cn)、央视网(cctv.com)、求是网(qstheory.cn)。
返回JSON数组，每条包含：
{{"title": "标题", "date": "YYYY-MM-DD", "category": "speech", "categoryName": "重要讲话", "source": "来源", "url": "真实可访问的链接", "summary": "摘要"}}
要求：只返回最近3天内的新闻，最多15条，只返回JSON数组。如果没找到最新新闻或无法确认URL真实性，返回空数组[]。"""
    
    return system_prompt, today, today_date


def search_with_qwen(query: str) -> List[Dict]:
    """通义千问联网搜索 - 使用DashScope OpenAI兼容接口 + enable_search"""
    if not DASHSCOPE_API_KEY:
        print('[Qwen] API Key not configured, skipping')
        return []
    
    system_prompt, _, _ = _build_news_search_prompt()
    
    print(f'[Qwen] Searching with DashScope API (enable_search=True)')
    try:
        payload = {
            'model': 'qwen3.5-flash',
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': query},
            ],
            'temperature': 0.1,
            'enable_search': True,
        }
        
        response = requests.post(
            DASHSCOPE_API_URL,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {DASHSCOPE_API_KEY}',
            },
            json=payload,
            timeout=120
        )
        
        print(f'[Qwen] HTTP status: {response.status_code}')
        
        if response.status_code != 200:
            print(f'[Qwen] API error: {response.status_code} - {response.text[:300]}')
            return []
        
        resp_json = response.json()
        
        # Debug: print full response structure
        choices = resp_json.get('choices', [])
        if not choices:
            print(f'[Qwen] No choices in response: {json.dumps(resp_json, ensure_ascii=False)[:300]}')
            return []
        
        message = choices[0].get('message', {})
        content = message.get('content', '')
        
        # Check for tool calls / search results metadata
        tool_calls = message.get('tool_calls', [])
        if tool_calls:
            print(f'[Qwen] Has {len(tool_calls)} tool_calls')
        
        print(f'[Qwen] Response content: {content[:300]}...')
        
        return _parse_ai_articles(content, 'Qwen')
    
    except requests.exceptions.Timeout:
        print(f'[Qwen] Request timeout (120s)')
        return []
    except Exception as e:
        print(f'[Qwen] Search failed: {e}')
        return []


def search_with_kimi(query: str) -> List[Dict]:
    if not KIMI_API_KEY:
        print('[Kimi] API Key not configured, skipping')
        return []
    
    system_prompt, _, _ = _build_news_search_prompt()
    
    print(f'[Kimi] Searching with moonshot-v1-auto + web_search')
    try:
        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': query},
        ]
        tools = [{'type': 'builtin_function', 'function': {'name': '$web_search'}}]
        
        for round_num in range(3):
            response = requests.post(
                KIMI_API_URL,
                headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {KIMI_API_KEY}'},
                json={
                    'model': 'moonshot-v1-auto',
                    'messages': messages,
                    'tools': tools if round_num == 0 else None,
                    'temperature': 0.1,
                },
                timeout=120
            )
            
            print(f'[Kimi] Round {round_num + 1} HTTP status: {response.status_code}')
            
            if response.status_code != 200:
                print(f'[Kimi] API error: {response.status_code} - {response.text[:300]}')
                return []
            
            resp_json = response.json()
            choices = resp_json.get('choices', [])
            if not choices:
                print(f'[Kimi] No choices in response')
                return []
            
            message = choices[0].get('message', {})
            content = message.get('content', '')
            tool_calls = message.get('tool_calls', [])
            finish_reason = choices[0].get('finish_reason', '')
            
            print(f'[Kimi] Round {round_num + 1}: finish_reason={finish_reason}, content_len={len(content)}, tool_calls={len(tool_calls)}')
            
            if tool_calls and finish_reason == 'tool_calls':
                print(f'[Kimi] Web search invoked, sending follow-up request...')
                messages.append(message)
                for tc in tool_calls:
                    tc_id = tc.get('id', '')
                    tc_name = tc.get('function', {}).get('name', '')
                    tc_args = tc.get('function', {}).get('arguments', '{}')
                    print(f'[Kimi] Tool call: {tc_name}({tc_args[:100]})')
                    messages.append({
                        'role': 'tool',
                        'content': json.dumps({'result': 'web_search_completed'}),
                        'tool_call_id': tc_id,
                    })
                tools = None
                continue
            
            if content:
                print(f'[Kimi] Final content (first 500 chars): {content[:500]}...')
                return _parse_ai_articles(content, 'Kimi')
            
            print(f'[Kimi] Empty content in round {round_num + 1}, retrying...')
        
        print(f'[Kimi] Max rounds reached with no content')
        return []
    
    except requests.exceptions.Timeout:
        print(f'[Kimi] Request timeout (120s)')
        return []
    except Exception as e:
        print(f'[Kimi] Search failed: {e}')
        return []


def search_with_baidu(queries: List[str]) -> List[Dict]:
    """百度搜索 - 降级为最后兜底手段，带反爬虫检测"""
    print('[Baidu] Starting (fallback mode, limited queries)...')
    articles = []
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print('[Baidu] BeautifulSoup not installed')
        return []
    
    seen_baidu_titles = set()
    blocked = False
    
    # 只用第一个 query + 3个核心站点，减少被封概率
    fallback_sites = ['xinhuanet.com', 'news.cn', 'people.com.cn']
    fallback_query = queries[0] if queries else ''
    
    for site in fallback_sites:
        if blocked:
            break
        search_query = f'site:{site} {fallback_query}'
        url = f'https://www.baidu.com/s?wd={quote(search_query)}&rn=10'
        
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code != 200:
                continue
            
            # 反爬虫检测：百度安全验证页
            if '百度安全验证' in resp.text or '安全验证' in resp.text[:500]:
                print(f'[Baidu] Anti-bot detected for {site}, stopping all Baidu searches')
                blocked = True
                break
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            for result in soup.select('.result.c-container')[:8]:
                title_elem = result.select_one('h3 a')
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                if '习近平' not in title and '总书记' not in title:
                    continue
                
                simple = re.sub(r'[《》""「」『』【】\s]', '', title)
                if simple in seen_baidu_titles:
                    continue
                seen_baidu_titles.add(simple)
                
                articles.append({
                    'title': title,
                    'url': title_elem.get('href', ''),
                    'source': site.split('.')[0],
                    'date': (datetime.utcnow() + timedelta(hours=8)).date().isoformat(),
                    'summary': title,
                })
            time.sleep(2)
        except Exception as e:
            print(f'[Baidu] {site} failed: {e}')
    
    if blocked:
        print(f'[Baidu] BLOCKED by anti-bot, got {len(articles)} articles before block')
    else:
        print(f'[Baidu] Found {len(articles)} articles (fallback mode)')
    return articles


def search_people_jhsjk() -> List[Dict]:
    """直接从人民网习近平系列重要讲话数据库抓取最新文章"""
    print('[People JHSJK] Starting direct crawl...')
    articles = []
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print('[People JHSJK] BeautifulSoup not installed')
        return []
    
    try:
        # 抓取人民网讲话数据库首页
        resp = requests.get('http://jhsjk.people.cn/article', headers=headers, timeout=30)
        if resp.status_code != 200:
            print(f'[People JHSJK] HTTP error: {resp.status_code}')
            return []
        
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 查找所有文章链接 - 国内和国际部分
        today = (datetime.utcnow() + timedelta(hours=8)).date()
        yesterday = today - timedelta(days=1)
        valid_dates = [today.strftime('%Y-%m-%d'), yesterday.strftime('%Y-%m-%d')]
        
        # 查找所有 li 元素中的链接
        for li in soup.select('li'):
            link = li.find('a')
            if not link:
                continue
            
            title = link.get_text(strip=True)
            href = link.get('href', '')
            
            # 跳过非文章链接
            if not title or not href or 'article' not in href:
                continue
            
            # 跳过非习近平相关
            if '习近平' not in title and '总书记' not in title and '主席' not in title:
                continue
            
            # 提取日期 [2026-03-28 来源：...]
            date_match = re.search(r'\[(\d{4}-\d{2}-\d{2})', li.get_text())
            if date_match:
                article_date = date_match.group(1)
                # 只要最近2天的
                if article_date not in valid_dates:
                    print(f'[People JHSJK] 跳过旧文章: {title[:30]}... ({article_date})')
                    continue
            else:
                # 没有日期的默认今天
                article_date = today.strftime('%Y-%m-%d')
            
            # 构建完整URL
            if href.startswith('/'):
                full_url = f'http://jhsjk.people.cn{href}'
            elif href.startswith('http'):
                full_url = href
            else:
                full_url = f'http://jhsjk.people.cn/{href}'
            
            articles.append({
                'title': title,
                'url': full_url,
                'source': '人民网',
                'date': article_date,
                'summary': title,
            })
            print(f'[People JHSJK] 发现: {title[:40]}... ({article_date})')
        
        print(f'[People JHSJK] Found {len(articles)} recent articles')
        return articles
        
    except Exception as e:
        print(f'[People JHSJK] Error: {e}')
        return []


def merge_and_dedupe(kimi_articles: List[Dict], baidu_articles: List[Dict], people_articles: List[Dict] = None, qwen_articles: List[Dict] = None):
    all_articles = []
    seen_titles = set()
    seen_urls = set()
    duplicate_seen_title = []
    duplicate_seen_url = []
    validation_rejected = []
    kept_articles = []

    if people_articles is None:
        people_articles = []
    if qwen_articles is None:
        qwen_articles = []

    source_counts = {'kimi': len(kimi_articles or []), 'qwen': len(qwen_articles or []), 'baidu': len(baidu_articles or []), 'people': len(people_articles or [])}

    def simplify(t): return re.sub(r'[《》""「」『』【】\s]', '', t)

    def add(article, source_tag):
        title, url = article.get('title', ''), article.get('url', '')
        if not title or not url:
            return

        if url in seen_urls:
            duplicate_seen_url.append({'title': title, 'url': url, 'source': source_tag})
            return

        simple = simplify(title)
        if simple in seen_titles:
            duplicate_seen_title.append({'title': title, 'url': url, 'source': source_tag})
            return

        validation = validate_article(article)
        if not validation['valid']:
            validation_rejected.append({'title': title, 'url': url, 'reasons': validation['reasons'], 'source': source_tag})
            print(f'[Validate] 拒绝: {title[:30]}... - {validation["reasons"]}')
            return

        seen_urls.add(url)
        seen_titles.add(simple)

        domain = detect_domain(title)
        category = detect_category(title)

        all_articles.append({
            'id': str(uuid.uuid4()),
            'title': title, 'url': url,
            'date': article.get('date', (datetime.utcnow() + timedelta(hours=8)).date().isoformat()),
            'source': article.get('source', '官方媒体'),
            'summary': article.get('summary', title),
            'category': category,
            'categoryname': CATEGORY_NAMES.get(category, '重要讲话'),
            'status': 'pending',
            'discovered_by': f'ai_auto_{source_tag}',
            'fetched_at': datetime.now().isoformat(),
        })
        kept_articles.append({'title': title, 'url': url, 'source': source_tag})

    for a in people_articles:
        add(a, 'people')
    for a in qwen_articles:
        add(a, 'qwen')
    for a in kimi_articles:
        add(a, 'kimi')
    for a in baidu_articles:
        add(a, 'baidu')

    merge_info = {
        'source_breakdown': source_counts,
        'merge_summary': {
            'input_total': sum(source_counts.values()),
            'kept_count': len(kept_articles),
            'duplicate_seen_title_count': len(duplicate_seen_title),
            'duplicate_seen_url_count': len(duplicate_seen_url),
            'validation_rejected_count': len(validation_rejected),
            'normalized_rejected_count': 0,
        },
        'merge_details': {
            'kept_articles': kept_articles,
            'duplicate_seen_title': duplicate_seen_title,
            'duplicate_seen_url': duplicate_seen_url,
            'validation_rejected': validation_rejected,
            'normalized_rejected': [],
        },
    }

    print(f'[Merge] 输入: {sum(source_counts.values())}, 去重保留: {len(kept_articles)}, '
          f'本轮标题重复: {len(duplicate_seen_title)}, 本轮链接重复: {len(duplicate_seen_url)}, '
          f'校验淘汰: {len(validation_rejected)}')

    return all_articles, merge_info


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


def get_search_type():
    event = os.environ.get('GITHUB_EVENT_NAME', '')
    if event == 'schedule':
        return 'auto'
    return 'manual'


def get_search_pipeline_label(search_type):
    beijing_hour = (datetime.utcnow() + timedelta(hours=8)).hour
    if search_type == 'auto':
        time_slot = '8:00 搜昨日' if beijing_hour < 12 else '20:00 搜今日'
        return f'自动定时搜索（{time_slot}）'
    return '手动触发搜索'


def save_log(qwen_count, kimi_count, baidu_count, people_count, new_count, status, details):
    if not SUPABASE_URL:
        print('[Log] SUPABASE_URL not configured')
        return
    try:
        from datetime import timezone
        beijing_tz = timezone(timedelta(hours=8))
        beijing_now = datetime.now(beijing_tz)
        search_type = get_search_type()
        pipeline_label = get_search_pipeline_label(search_type)
        total = qwen_count + kimi_count + baidu_count + people_count
        log_data = {
            'executed_at': beijing_now.isoformat(),
            'crawl_count': total,
            'search_count': total,
            'new_count': new_count,
            'status': status,
            'details': {
                **details,
                'search_type': search_type,
                'api_used': pipeline_label,
                'pipeline': {
                    'step1': '直抓人民网讲话数据库',
                    'step2': 'Qwen联网搜索(通义千问+enable_search)',
                    'step3': 'Kimi联网补漏(Moonshot)',
                    'step4': '百度搜索兜底(仅新华社/人民网)',
                    'step5': '统一去重(标题+URL)',
                    'step6': '与已有文章库比对',
                    'step7': '最终新增入待审核',
                },
            },
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


def simplify_title(t):
    return re.sub(r'[《》""「」『』【】\s]', '', t)


def main():
    print(f'=== AI Scheduled Search {datetime.now()} ===')

    main_query, queries, search_date, target_date = get_search_query()

    people_articles = search_people_jhsjk()
    qwen_articles = search_with_qwen(main_query)
    kimi_articles = search_with_kimi(main_query)
    baidu_articles = search_with_baidu(queries)

    merged, merge_info = merge_and_dedupe(kimi_articles, baidu_articles, people_articles, qwen_articles)
    print(f'[Merge] After dedup: {len(merged)} articles')

    existing_urls = get_existing_urls()
    existing_url_filtered = []
    duplicate_existing_title = []

    existing_titles_simple = {}
    for a in merged:
        s = simplify_title(a.get('title', ''))
        if s:
            existing_titles_simple[s] = a.get('title', '')

    new_articles = []
    for a in merged:
        if a['url'] in existing_urls:
            existing_url_filtered.append({'title': a['title'], 'url': a['url']})
            continue

        simple = simplify_title(a.get('title', ''))
        matched = existing_titles_simple.get(simple)
        if matched and matched != a.get('title', ''):
            duplicate_existing_title.append({'title': a['title'], 'url': a['url'], 'matched_title': matched})
            continue

        new_articles.append(a)

    print(f'[Filter] Existing URL filtered: {len(existing_url_filtered)}, New: {len(new_articles)} articles')

    saved = save_articles(new_articles)

    status = 'success'

    final_new_titles = [{'title': a['title'], 'url': a['url']} for a in new_articles]

    save_result = {'attempted_count': len(new_articles), 'saved_count': saved}
    if saved == 0 and len(new_articles) > 0:
        save_result['error'] = 'save returned 0'

    merge_info['merge_summary']['duplicate_existing_title_count'] = len(duplicate_existing_title)
    merge_info['merge_details']['duplicate_existing_title'] = duplicate_existing_title

    log_details = {
        **merge_info,
        'search_date': search_date,
        'target_date': target_date,
        'existing_url_filtered': existing_url_filtered,
        'existing_url_filtered_count': len(existing_url_filtered),
        'final_new_articles': final_new_titles,
        'save_result': save_result,
    }

    save_log(len(qwen_articles), len(kimi_articles), len(baidu_articles), len(people_articles), saved, status, log_details)

    print(f'=== Done: People {len(people_articles)}, Qwen {len(qwen_articles)}, Kimi {len(kimi_articles)}, Baidu {len(baidu_articles)}, '
          f'Merged {len(merged)}, ExistingFiltered {len(existing_url_filtered)}, New {saved} ===')


if __name__ == '__main__':
    main()