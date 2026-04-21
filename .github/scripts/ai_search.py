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
    'xinhuanet.com', 'www.xinhuanet.com', 'news.cn', 'www.news.cn', 'mrdx.cn', 'www.mrdx.cn',  # 新华网/新华每日电讯
    'qstheory.cn', 'www.qstheory.cn',  # 求是网
    'cctv.com', 'www.cctv.com', 'cntv.cn',  # 央视网
    'gov.cn', 'www.gov.cn',  # 中国政府网
]

BAIDU_SITES = ['people.com.cn', 'xinhuanet.com', 'news.cn', 'mrdx.cn', 'qstheory.cn', 'gov.cn', 'cctv.com']

# 领域关键词 - 按优先级排列（外交优先检测）
DOMAIN_KEYWORDS = {
    'diplomacy': ['外交', '出访', '峰会', '总统', '总理', '国际', '外国', '国事访问', '友好访问', '会见', '访问', '联合声明', '多边', '双边', '联合国', '一带一路', '合作', '签署'],
    'defense': ['军队', '国防', '军事', '军委', '强军', '部队', '战士', '武装', '退役', '军人', '战区', '阅兵'],
    'party': ['党建', '从严治党', '纪检', '巡视', '党校', '党员', '党组织', '主题教育', '群众路线', '党纪', '干部', '反腐'],
    'ecology': ['生态', '环境', '绿色', '碳达峰', '碳中和', '环保', '污染', '长江', '黄河', '植树', '绿化', '新能源', '气候'],
    'culture': ['文化', '文明', '文艺', '体育', '艺术', '文学', '阅读', '读书', '书香', '出版', '图书', '教育', '非遗', '传统文化', '文化遗产', '博物馆', '新闻', '舆论', '宣传', '思想'],
    'society': ['民生', '扶贫', '乡村振兴', '医疗', '就业', '养老', '住房', '健康', '卫生', '疫情防控', '人口', '生育', '社保', '脱贫', '助残', '少年儿童'],
    'economy': ['经济', '金融', '科技', '创新', '高质量发展', '产业', '企业', '服务业', '制造业', '数字经济', '改革开放', '自贸', '投资', '消费', '贸易', '农业', '粮食'],
    'politics': ['政治', '人大', '政协', '全会', '两会', '法治', '立法', '宪法', '监察', '司法', '统一', '民族', '宗教', '港澳', '台湾'],
}

# 分类关键词 - 优化优先级
CATEGORY_KEYWORDS = {
    'inspection': ['考察', '调研', '视察', '走访', '看望', '慰问', '检查'],
    'article': ['《求是》', '发表文章', '重要文章', '署名文章', '节录', '论述摘编', '重要论述'],
    'meeting': ['会议', '座谈会', '全会', '研讨会', '工作会', '审议', '集体学习', '学习会', '会见', '会谈', '接见'],
    'speech': ['讲话', '指示', '批示', '贺电', '贺信', '致辞', '发言', '回信', '复信', '命令', '主旨演讲'],
}

CATEGORY_NAMES = {'speech': '重要讲话', 'article': '发表文章', 'meeting': '重要会议', 'inspection': '考察调研', 'call': '致电'}
DOMAIN_NAMES = {'economy': '经济', 'politics': '政治', 'culture': '文化', 'society': '社会',
                'ecology': '生态', 'party': '党建', 'defense': '国防', 'diplomacy': '外交'}

NON_ORIGINAL_TITLE_KEYWORDS = [
    '总书记的关切·落地的回响', '总书记的人民情怀',
    '人民论坛', '人民观察', '人民时评', '人民要论', '人民观点',
    '仲音', '钟声', '和音', '任仲平',
    '评论员', '评论', '本报评论员', '述评', '观察', '解读', '综述', '侧记', '特稿',
    '通讯', '纪实', '报道', '扫描', '透视', '述写', '随笔', '感言', '网评', '圆桌', '专访', '之一', '之二', '之三'
]
NON_ORIGINAL_TITLE_PATTERNS = [
    r'（[^）]*(回响|人民情怀|人民论坛|人民观察|人民时评|人民要论|人民观点|仲音|钟声|和音|任仲平|评论|述评|观察|解读|综述|侧记|特稿|通讯|纪实|报道|扫描|透视)[^）]*）',
    r'\([^)]*(回响|人民情怀|人民论坛|人民观察|人民时评|人民要论|人民观点|仲音|钟声|和音|任仲平|评论|述评|观察|解读|综述|侧记|特稿|通讯|纪实|报道|扫描|透视)[^)]*\)',
]
NON_DIRECT_XI_KEYWORDS = [
    '学习领会总书记', '领会总书记', '学习贯彻总书记', '贯彻落实总书记',
    '作为习近平主席特别代表', '习近平主席特别代表', '习近平主席特使', '主席特别代表', '主席特使',
    '受习近平主席委派', '受习近平主席指派'
]
NON_DIRECT_XI_PATTERNS = [
    r'^领会总书记',
    r'作为习近平主席特别代表',
    r'习近平主席特使',
]
DIRECT_XI_ACTIVITY_KEYWORDS = [
    '习近平会见', '习近平同', '习近平出席', '习近平主持', '习近平在',
    '总书记会见', '总书记主持', '总书记在', '习近平致电', '习近平回信',
    '习近平致贺电', '习近平致贺信', '习近平发表', '习近平考察', '习近平调研'
]
QSTHEORY_TITLE_PREFIXES = [
    '《求是》杂志发表习近平总书记重要文章',
    '《求是》杂志发表习近平总书记重要文章：',
    '《求是》杂志发表习近平总书记重要文章“',
    '《求是》杂志发表习近平总书记重要文章《',
]


def is_non_original_title(title: str) -> bool:
    title = (title or '').strip()
    if not title:
        return True
    if any(keyword in title for keyword in NON_ORIGINAL_TITLE_KEYWORDS):
        return True
    return any(re.search(pattern, title) for pattern in NON_ORIGINAL_TITLE_PATTERNS)


def is_non_direct_xi_title(title: str) -> bool:
    title = (title or '').strip()
    if not title:
        return True

    compact_title = title.replace(' ', '')

    if any(keyword.replace(' ', '') in compact_title for keyword in DIRECT_XI_ACTIVITY_KEYWORDS):
        return False

    if any(keyword in title for keyword in NON_DIRECT_XI_KEYWORDS):
        return True

    if any(re.search(pattern, title) for pattern in NON_DIRECT_XI_PATTERNS):
        return True

    if ('习近平主席' in compact_title or '总书记' in compact_title) and ('特使' in compact_title or '特别代表' in compact_title):
        return True

    return False


def normalize_article_title(title: str) -> str:
    title = re.sub(r'\s+', ' ', (title or '')).strip()
    title = title.replace('※习近平', '').strip()

    for prefix in QSTHEORY_TITLE_PREFIXES:
        if title.startswith(prefix):
            title = title[len(prefix):].strip(' ：:《》“”"')

    title = re.sub(r'^习近平：', '', title).strip()
    title = re.sub(r'^习近平\s+', '', title).strip()
    return title


def simplify_title(t):
    normalized = normalize_article_title(t)
    return re.sub(r'[《》“”"「」『』【】\s：:·\-—（）()、，,\.．]', '', normalized)


def get_beijing_now() -> datetime:
    return datetime.utcnow() + timedelta(hours=8)


def get_recent_valid_dates(days: int = 2) -> List[str]:
    beijing_today = get_beijing_now().date()
    return [
        (beijing_today - timedelta(days=offset)).strftime('%Y-%m-%d')
        for offset in range(days)
    ]


def get_search_query():
    """Generate multiple search queries based on time: morning searches yesterday, evening searches today"""
    beijing_now = get_beijing_now()
    beijing_hour = beijing_now.hour

    if beijing_hour < 12:
        target_dt = beijing_now - timedelta(days=1)
        date_keyword = '昨日'
        search_date = 'yesterday'
    else:
        target_dt = beijing_now
        date_keyword = '今日'
        search_date = 'today'

    target_date = f'{target_dt.year}年{target_dt.month:02d}月{target_dt.day:02d}日'

    queries = [
        f'习近平{date_keyword}最新讲话 指示 {target_date}',
        f'习近平{date_keyword}考察调研会议 {target_date}',
        f'习近平{date_keyword}重要活动新闻 {target_date}',
        f'习近平{date_keyword}回信贺信致辞 {target_date}',
        f'《求是》杂志 习近平{date_keyword}重要文章 {target_date}',
    ]

    main_query = f'习近平总书记{date_keyword}最新活动新闻 {target_date}'

    print(f'[Time] Beijing {beijing_hour}:00, searching {date_keyword} ({target_date}), {len(queries)} queries')
    return main_query, queries, search_date, target_date


def detect_domain(title: str) -> str:
    """检测文章领域，外交优先"""
    diplomacy_keywords = ['外交', '出访', '峰会', '总统', '总理', '国际', '外国', '国事访问', '友好访问', '会见', '访问', '联合声明', '多边', '双边', '联合国', '一带一路', '合作', '签署', '致电', '贺电', '回信', '复信']
    if any(kw in title for kw in diplomacy_keywords):
        return 'diplomacy'

    for domain, keywords in DOMAIN_KEYWORDS.items():
        if domain == 'diplomacy':
            continue
        if any(kw in title for kw in keywords):
            return domain
    return 'politics'


def detect_category(article: Dict) -> str:
    """检测文章分类，支持致电单独归类，并避免求是文章误判为讲话"""
    title = article.get('title', '') or ''
    source = (article.get('source', '') or '').lower()
    url = (article.get('url', '') or '').lower()
    is_qstheory = 'qstheory.cn' in url or '求是' in source

    if '致电' in title:
        return 'call'

    if '会见' in title:
        return 'meeting'

    if any(kw in title for kw in ['会议', '座谈会', '全会', '研讨会', '工作会', '审议', '集体学习', '学习会']):
        return 'meeting'

    if any(kw in title for kw in ['考察', '调研', '视察', '走访', '看望', '慰问', '检查']):
        return 'inspection'

    if is_qstheory and (('发表' in title) or ('文章' in title) or ('《求是》' in title) or ('总书记重要文章' in title)):
        return 'article'

    if any(kw in title for kw in ['《求是》', '发表文章', '重要文章', '署名文章', '节录', '论述摘编', '重要论述']):
        return 'article'

    if any(kw in title for kw in ['讲话', '指示', '批示', '贺电', '贺信', '致辞', '发言', '回信', '复信', '命令', '主旨演讲']):
        return 'speech'

    if is_qstheory:
        return 'article'

    return 'speech'


def validate_article(article: Dict) -> Dict:
    """验证文章有效性：URL可访问、日期正确、来源官方"""
    result = {'valid': True, 'reasons': []}

    url = article.get('url', '')
    title = article.get('title', '')
    article_date = article.get('date', '')

    if not url or not url.startswith('http'):
        result['valid'] = False
        result['reasons'].append('URL格式无效')
        return result

    from urllib.parse import urlparse
    domain = urlparse(url).netloc.lower()
    is_official = any(off_domain in domain for off_domain in OFFICIAL_DOMAINS)
    if not is_official:
        result['valid'] = False
        result['reasons'].append(f'非官方来源: {domain}')
        return result

    try:
        if article_date:
            art_date = datetime.strptime(article_date, '%Y-%m-%d')
            today = datetime.utcnow() + timedelta(hours=8)
            days_diff = (today - art_date).days
            if days_diff > 1 or days_diff < -2:
                result['valid'] = False
                result['reasons'].append(f'日期过旧: {article_date}（距今{days_diff}天）')
                return result
    except:
        pass

    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        resp = requests.head(url, timeout=10, allow_redirects=True, headers=headers)
        if resp.status_code < 400:
            return result
    except Exception:
        pass

    try:
        resp = requests.get(url, timeout=15, allow_redirects=True, headers=headers, stream=True)
        if resp.status_code >= 400:
            result['valid'] = False
            result['reasons'].append(f'URL返回错误: {resp.status_code}')
            return result
        return result
    except Exception as e:
        result['valid'] = False
        result['reasons'].append(f'URL无法访问: {str(e)[:50]}')
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
特别注意：《求是》杂志发表习近平总书记重要文章是高频场景，务必重点搜索求是网(qstheory.cn)上的总书记原文。
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
    fallback_sites = ['xinhuanet.com', 'news.cn', 'people.com.cn', 'qstheory.cn']
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
        valid_dates = get_recent_valid_dates(2)
        fallback_article_date = valid_dates[0]
        
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
                # 没有日期时，使用北京时间当天作为兜底
                article_date = fallback_article_date
            
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


def search_qstheory() -> List[Dict]:
    """直接从求是网抓取最新习近平总书记重要文章原文（非报道/评论）"""
    print('[QiuShi] Starting direct crawl of qstheory.cn...')
    articles = []
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print('[QiuShi] BeautifulSoup not installed')
        return []

    today = (datetime.utcnow() + timedelta(hours=8)).date()
    yesterday = today - timedelta(days=1)
    valid_dates = [today.strftime('%Y-%m-%d'), yesterday.strftime('%Y-%m-%d')]

    urls_to_check = [
        'https://www.qstheory.cn/',
        'https://www.qstheory.cn/dt/',
    ]

    seen_urls = set()

    for page_url in urls_to_check:
        try:
            resp = requests.get(page_url, headers=headers, timeout=30)
            if resp.status_code != 200:
                print(f'[QiuShi] HTTP {resp.status_code} for {page_url}')
                continue

            resp.encoding = 'utf-8'
            soup = BeautifulSoup(resp.text, 'html.parser')

            for a_tag in soup.find_all('a', href=True):
                title = a_tag.get_text(strip=True)
                href = a_tag['href']

                if not title or len(title) < 8:
                    continue

                is_original = (
                    '※习近平' in title
                    or title.startswith('习近平：')
                )

                if not is_original:
                    if '习近平' not in title and '总书记' not in title:
                        continue
                    print(f'[QiuShi] 跳过非原文（未命中原文规则）: {title[:50]}...')
                    continue

                if href.startswith('/'):
                    full_url = f'https://www.qstheory.cn{href}'
                elif href.startswith('http'):
                    full_url = href
                else:
                    full_url = f'https://www.qstheory.cn/{href}'

                normalized_url = full_url.lower()
                if '/video/' in normalized_url or '/pk/' in normalized_url:
                    print(f'[QiuShi] 跳过非原文链接: {title[:50]}... ({full_url})')
                    continue
                if '/c.html' not in normalized_url:
                    print(f'[QiuShi] 跳过非文章页链接: {title[:50]}... ({full_url})')
                    continue

                if full_url in seen_urls:
                    continue
                seen_urls.add(full_url)

                article_date = today.strftime('%Y-%m-%d')

                date_match = re.search(r'/(\d{4}-\d{2}/\d{2})/', full_url)
                if not date_match:
                    date_match = re.search(r'(\d{2}-\d{2})', a_tag.parent.get_text(' ', strip=True))
                    if date_match:
                        mmdd = date_match.group(1)
                        article_date = f'{today.year}-{mmdd}'
                if date_match and '/' in date_match.group(1):
                    try:
                        parsed = datetime.strptime(date_match.group(1), '%Y-%m/%d')
                        article_date = parsed.strftime('%Y-%m-%d')
                    except ValueError:
                        pass

                if article_date not in valid_dates:
                    print(f'[QiuShi] 跳过旧文章: {title[:40]}... ({article_date})')
                    continue

                clean_title = title.replace('※习近平', '').strip()
                articles.append({
                    'title': clean_title,
                    'url': full_url,
                    'source': '求是网',
                    'date': article_date,
                    'summary': clean_title,
                })
                print(f'[QiuShi] Found: {clean_title[:50]}... ({article_date})')

        except Exception as e:
            print(f'[QiuShi] Error crawling {page_url}: {e}')

    print(f'[QiuShi] Total: {len(articles)} articles found')
    return articles


def search_xinhua_mrdx() -> List[Dict]:
    """直接从新华每日电讯抓取新华社最新相关文章"""
    print('[Xinhua] Starting direct crawl of news.cn/mrdx...')
    articles = []
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print('[Xinhua] BeautifulSoup not installed')
        return []

    today = (datetime.utcnow() + timedelta(hours=8)).date()
    yesterday = today - timedelta(days=1)
    valid_dates = [today.strftime('%Y-%m-%d'), yesterday.strftime('%Y-%m-%d')]
    issue_dates = [today.strftime('%Y%m%d'), yesterday.strftime('%Y%m%d')]
    urls_to_check = [
        'https://www.news.cn/mrdx/index.htm',
        'https://www.news.cn/mrdx/top.htm',
        'https://www.news.cn/politics/leaders/index.htm',
    ]
    seen_urls = set()

    def normalize_xinhua_url(href: str, base_url: str = '') -> str:
        href = (href or '').strip()
        if not href:
            return ''
        if href.startswith('//'):
            return f'https:{href}'
        if href.startswith('/'):
            return f'https://www.news.cn{href}'
        if href.startswith('http'):
            return href
        if href.startswith('Articel') and base_url and '/content/' in base_url:
            return requests.compat.urljoin(base_url, href)
        if href.startswith('Page') and base_url and '/content/' in base_url:
            return requests.compat.urljoin(base_url, href)
        return f'https://www.news.cn/mrdx/{href}'

    def extract_article_date(text: str, url: str, base_url: str = '') -> str:
        normalized_url = (url or '').lower()
        normalized_base = (base_url or '').lower()
        for candidate in [normalized_url, normalized_base]:
            date_match = re.search(r'/(20\d{2})[-/](\d{2})[-/](\d{2})/', candidate)
            if date_match:
                return f'{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}'
            date_match = re.search(r'/(20\d{2})(\d{2})(\d{2})/', candidate)
            if date_match:
                return f'{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}'

        text_match = re.search(r'(20\d{2})[-年/.](\d{1,2})[-月/.](\d{1,2})', text or '')
        if text_match:
            return f'{text_match.group(1)}-{int(text_match.group(2)):02d}-{int(text_match.group(3)):02d}'

        return ''

    def maybe_add_article(title: str, url: str, context_text: str, base_url: str = ''):
        clean_title = re.sub(r'\s+', ' ', (title or '')).strip(' *')
        full_url = normalize_xinhua_url(url, base_url)
        if not clean_title or len(clean_title) < 8 or not full_url:
            return
        if '习近平' not in clean_title and '总书记' not in clean_title and '主席' not in clean_title:
            return
        if is_non_original_title(clean_title):
            print(f'[Xinhua] 跳过评论/解读类: {clean_title[:50]}...')
            return

        normalized_url = full_url.lower()
        is_xinhua_article_url = (
            any(domain in normalized_url for domain in ['news.cn/', 'xinhuanet.com/', 'mrdx.cn/'])
            and (
                '/c.html' in normalized_url
                or '/c_' in normalized_url
                or '/leaders/' in normalized_url
                or 'articel' in normalized_url
            )
        )
        if not is_xinhua_article_url:
            return
        if full_url in seen_urls:
            return

        article_date = extract_article_date(context_text, full_url, base_url)
        if not article_date or article_date not in valid_dates:
            if article_date and len(article_date) == 10:
                article_date = article_date[:10]
            if article_date not in valid_dates:
                fallback_date = next((d for d in valid_dates if d.replace('-', '') in normalized_url), '')
                if fallback_date:
                    article_date = fallback_date
            if article_date not in valid_dates:
                return

        seen_urls.add(full_url)
        articles.append({
            'title': clean_title,
            'url': full_url,
            'source': '新华社',
            'date': article_date,
            'summary': clean_title,
        })
        print(f'[Xinhua] Found: {clean_title[:50]}... ({article_date})')

    def crawl_mrdx_issue_pages():
        for issue_date in issue_dates:
            issue_url = f'http://mrdx.cn/content/{issue_date}/Page01BC.htm'
            try:
                resp = requests.get(issue_url, headers=headers, timeout=30)
                if resp.status_code != 200:
                    print(f'[Xinhua] HTTP {resp.status_code} for {issue_url}')
                    continue

                resp.encoding = 'utf-8'
                soup = BeautifulSoup(resp.text, 'html.parser')
                issue_text = soup.get_text(' ', strip=True)

                for a_tag in soup.find_all('a'):
                    href = (a_tag.get('daoxiang') or a_tag.get('href') or '').strip()
                    title = a_tag.get_text(' ', strip=True)
                    if not href or not title:
                        continue
                    context_text = ' '.join(filter(None, [
                        title,
                        issue_text,
                        a_tag.get('title', ''),
                    ]))
                    maybe_add_article(title, href, context_text, issue_url)
            except Exception as e:
                print(f'[Xinhua] Error crawling {issue_url}: {e}')

    crawl_mrdx_issue_pages()

    for page_url in urls_to_check:
        try:
            resp = requests.get(page_url, headers=headers, timeout=30)
            if resp.status_code != 200:
                print(f'[Xinhua] HTTP {resp.status_code} for {page_url}')
                continue

            resp.encoding = 'utf-8'
            soup = BeautifulSoup(resp.text, 'html.parser')

            page_title = ''
            for selector in ['h1', '.title', '.h-title']:
                title_node = soup.select_one(selector)
                if title_node:
                    page_title = title_node.get_text(' ', strip=True)
                    if page_title:
                        break
            if page_title:
                maybe_add_article(page_title, page_url, soup.get_text(' ', strip=True), page_url)

            for a_tag in soup.find_all('a', href=True):
                title = a_tag.get_text(' ', strip=True)
                href = a_tag.get('href', '').strip()
                context_text = ' '.join(filter(None, [
                    title,
                    a_tag.parent.get_text(' ', strip=True) if a_tag.parent else '',
                    a_tag.get('title', ''),
                ]))
                maybe_add_article(title, href, context_text, page_url)

        except Exception as e:
            print(f'[Xinhua] Error crawling {page_url}: {e}')

    print(f'[Xinhua] Total: {len(articles)} articles found')
    return articles


def search_rmrb() -> List[Dict]:
    """直接从人民日报电子版头版/要闻版抓取最新相关文章"""
    print('[RMRB] Starting direct crawl of paper.people.com.cn...')
    articles = []
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print('[RMRB] BeautifulSoup not installed')
        return []

    today = (datetime.utcnow() + timedelta(hours=8)).date()
    yesterday = today - timedelta(days=1)
    valid_dates = [today.strftime('%Y-%m-%d'), yesterday.strftime('%Y-%m-%d')]
    seen_urls = set()

    from urllib.parse import urljoin

    for target_date in [today, yesterday]:
        date_str = target_date.strftime('%Y%m/%d')
        for node in ['node_01.html', 'node_02.html', 'node_03.html', 'node_04.html']:
            page_url = f'https://paper.people.com.cn/rmrb/pc/layout/{date_str}/{node}'
            try:
                resp = requests.get(page_url, headers=headers, timeout=30)
                if resp.status_code != 200:
                    print(f'[RMRB] HTTP {resp.status_code} for {page_url}')
                    continue
                resp.encoding = 'utf-8'
                soup = BeautifulSoup(resp.text, 'html.parser')

                for a_tag in soup.find_all('a', href=True):
                    title = a_tag.get_text(' ', strip=True)
                    href = a_tag.get('href', '').strip()
                    if not title or len(title) < 8:
                        continue
                    if '习近平' not in title and '总书记' not in title and '主席' not in title:
                        continue
                    if is_non_original_title(title):
                        print(f'[RMRB] 跳过评论/解读类: {title[:50]}...')
                        continue

                    full_url = urljoin(page_url, href)
                    if 'content_' not in full_url:
                        continue
                    if full_url in seen_urls:
                        continue

                    article_date = target_date.strftime('%Y-%m-%d')

                    seen_urls.add(full_url)
                    articles.append({
                        'title': title,
                        'url': full_url,
                        'source': '人民日报',
                        'date': article_date,
                        'summary': title,
                    })
                    print(f'[RMRB] Found: {title[:50]}... ({article_date})')
            except Exception as e:
                print(f'[RMRB] Error crawling {page_url}: {e}')

    print(f'[RMRB] Total: {len(articles)} articles found')
    return articles


def merge_and_dedupe(baidu_articles: List[Dict], people_articles: List[Dict] = None, qstheory_articles: List[Dict] = None, xinhua_articles: List[Dict] = None, rmrb_articles: List[Dict] = None):
    all_articles = []
    seen_titles = set()
    seen_urls = set()
    duplicate_seen_title = []
    duplicate_seen_url = []
    validation_rejected = []
    non_direct_rejected = []
    kept_articles = []

    if people_articles is None:
        people_articles = []
    if qstheory_articles is None:
        qstheory_articles = []
    if xinhua_articles is None:
        xinhua_articles = []
    if rmrb_articles is None:
        rmrb_articles = []

    source_counts = {
        'xinhua': len(xinhua_articles or []),
        'qstheory': len(qstheory_articles or []),
        'rmrb': len(rmrb_articles or []),
        'baidu': len(baidu_articles or []),
        'people': len(people_articles or []),
    }

    def simplify(t): return simplify_title(t)

    def add(article, source_tag):
        title, url = article.get('title', ''), article.get('url', '')
        if not title or not url:
            return

        if is_non_direct_xi_title(title):
            non_direct_rejected.append({'title': title, 'url': url, 'source': source_tag})
            print(f'[Filter] 跳过非总书记直接相关: {title[:50]}...')
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
        category = detect_category({'title': title, 'source': article.get('source', ''), 'url': url})

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

    for a in xinhua_articles:
        add(a, 'xinhua')
    for a in qstheory_articles:
        add(a, 'qstheory')
    for a in rmrb_articles:
        add(a, 'rmrb')
    for a in baidu_articles:
        add(a, 'baidu')
    for a in people_articles:
        add(a, 'people')

    merge_info = {
        'source_breakdown': source_counts,
        'merge_summary': {
            'input_total': sum(source_counts.values()),
            'kept_count': len(kept_articles),
            'duplicate_seen_title_count': len(duplicate_seen_title),
            'duplicate_seen_url_count': len(duplicate_seen_url),
            'validation_rejected_count': len(validation_rejected),
            'non_direct_rejected_count': len(non_direct_rejected),
            'normalized_rejected_count': 0,
        },
        'merge_details': {
            'kept_articles': kept_articles,
            'duplicate_seen_title': duplicate_seen_title,
            'duplicate_seen_url': duplicate_seen_url,
            'validation_rejected': validation_rejected,
            'non_direct_rejected': non_direct_rejected,
            'normalized_rejected': [],
        },
    }

    print(f'[Merge] 输入: {sum(source_counts.values())}, 去重保留: {len(kept_articles)}, '
          f'本轮标题重复: {len(duplicate_seen_title)}, 本轮链接重复: {len(duplicate_seen_url)}, '
          f'校验淘汰: {len(validation_rejected)}, 非直接相关淘汰: {len(non_direct_rejected)}')

    return all_articles, merge_info


def get_existing_articles() -> Dict[str, Dict]:
    existing_urls = set()
    existing_titles = {}
    if not SUPABASE_URL:
        return {'urls': existing_urls, 'titles': existing_titles}

    headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    targets = ['pending_articles', 'articles']

    for table_name in targets:
        try:
            resp = requests.get(
                f'{SUPABASE_URL}/rest/v1/{table_name}?select=url,title&limit=1000',
                headers=headers,
                timeout=10
            )
            if resp.status_code != 200:
                print(f'[Existing] Failed to fetch {table_name}: HTTP {resp.status_code}')
                continue

            for row in resp.json():
                url = row.get('url')
                title = row.get('title')
                if url:
                    existing_urls.add(url)
                if title:
                    simple = simplify_title(title)
                    if simple and simple not in existing_titles:
                        existing_titles[simple] = title
        except Exception as e:
            print(f'[Existing] Error fetching {table_name}: {e}')

    print(f'[Existing] Loaded {len(existing_urls)} urls, {len(existing_titles)} simplified titles')
    return {'urls': existing_urls, 'titles': existing_titles}




def titles_look_duplicate(title: str, existing_simple_map: Dict[str, str]) -> str:
    simple = simplify_title(title)
    if not simple:
        return ''

    exact = existing_simple_map.get(simple)
    if exact:
        return exact

    if len(simple) < 8:
        return ''

    for existing_simple, existing_title in existing_simple_map.items():
        if len(existing_simple) < 8:
            continue
        if simple in existing_simple or existing_simple in simple:
            return existing_title

    return ''


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


def save_log(baidu_count, people_count, qstheory_count, xinhua_count, rmrb_count, new_count, status, details):
    if not SUPABASE_URL:
        print('[Log] SUPABASE_URL not configured')
        return
    try:
        from datetime import timezone
        beijing_tz = timezone(timedelta(hours=8))
        beijing_now = datetime.now(beijing_tz)
        search_type = get_search_type()
        pipeline_label = get_search_pipeline_label(search_type)
        total = baidu_count + people_count + qstheory_count + xinhua_count + rmrb_count
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
                    'step1': '直抓新华社（新华每日电讯）',
                    'step2': '直抓人民日报电子版(头版/要闻)',
                    'step3': '直抓求是网(qstheory.cn)',
                    'step4': '百度搜索兜底(含求是网)',
                    'step5': '人民网讲话数据库兜底',
                    'step6': '统一去重(标题+URL)',
                    'step7': '与已有文章库比对',
                    'step8': '最终新增入待审核',
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


def main():
    print(f'=== AI Scheduled Search {datetime.now()} ===')

    main_query, queries, search_date, target_date = get_search_query()

    xinhua_articles = search_xinhua_mrdx()
    rmrb_articles = search_rmrb()
    people_articles = search_people_jhsjk()
    qstheory_articles = search_qstheory()
    baidu_articles = search_with_baidu(queries)

    merged, merge_info = merge_and_dedupe(baidu_articles, people_articles, qstheory_articles, xinhua_articles, rmrb_articles)
    print(f'[Merge] After dedup: {len(merged)} articles')

    existing_data = get_existing_articles()
    existing_urls = existing_data['urls']
    existing_titles_simple = existing_data['titles']
    existing_url_filtered = []
    duplicate_existing_title = []

    new_articles = []
    for a in merged:
        if a['url'] in existing_urls:
            existing_url_filtered.append({'title': a['title'], 'url': a['url']})
            continue

        matched = titles_look_duplicate(a.get('title', ''), existing_titles_simple)
        if matched:
            duplicate_existing_title.append({'title': a['title'], 'url': a['url'], 'matched_title': matched})
            continue

        simple = simplify_title(a.get('title', ''))
        if simple and simple not in existing_titles_simple:
            existing_titles_simple[simple] = a.get('title', '')
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

    save_log(
        len(baidu_articles),
        len(people_articles),
        len(qstheory_articles),
        len(xinhua_articles),
        len(rmrb_articles),
        saved,
        status,
        log_details,
    )

    print(f'=== Done: Xinhua {len(xinhua_articles)}, RMRB {len(rmrb_articles)}, People {len(people_articles)}, QiuShi {len(qstheory_articles)}, Baidu {len(baidu_articles)}, '
          f'Merged {len(merged)}, ExistingFiltered {len(existing_url_filtered)}, New {saved} ===')


if __name__ == '__main__':
    main()
