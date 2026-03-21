"""
文章自动发现脚本 - 多方案组合
方案A: 直接爬取官方网站 (BeautifulSoup)
方案B: Playwright 搜索引擎自动化 (百度搜索)

结果写入 Supabase pending_articles 表，执行日志写入 search_logs 表
"""
import os
import re
import json
import uuid
import time
import traceback
import requests
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, List

try:
    from bs4 import BeautifulSoup
except ImportError:
    print('[警告] beautifulsoup4 未安装，方案A将不可用')
    BeautifulSoup = None

# ============ 配置 ============
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
TABLE = 'pending_articles'
LOG_TABLE = 'search_logs'

REQUEST_DELAY = 2.0
MAX_RETRIES = 3

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

# 官方来源域名白名单
OFFICIAL_DOMAINS = {
    'people.com.cn': '人民网',
    'cpc.people.com.cn': '人民网',
    'jhsjk.people.cn': '人民网',
    'xinhuanet.com': '新华网',
    'news.cn': '新华网',
    'gov.cn': '中国政府网',
    'qstheory.cn': '求是网',
    'cctv.com': '央视网',
    'cnr.cn': '央广网',
    'chinanews.com.cn': '中国新闻网',
    'gmw.cn': '光明网',
    'youth.cn': '中国青年网',
    'dangjian.cn': '党建网',
}

# ============ 领域和分类检测 ============
DOMAIN_KEYWORDS = {
    'diplomacy': ['外交', '会见', '出访', '峰会', '联合国', '大使', '建交', '贺电', '国事访问',
                  '总统', '总理', '首相', '元首', '国际', '双边', '多边'],
    'defense': ['军队', '国防', '军事', '军委', '强军', '练兵', '备战', '将士', '部队'],
    'party': ['党建', '从严治党', '纪检', '巡视', '组织', '党校', '党员', '纪委', '自我革命',
              '党的建设', '初心', '使命', '主题教育'],
    'ecology': ['生态', '环境', '绿色', '碳达峰', '碳中和', '污染', '美丽中国', '长江保护'],
    'culture': ['文化', '文明', '文艺', '教育', '体育', '遗产', '文物', '非遗', '思想'],
    'society': ['民生', '扶贫', '乡村振兴', '医疗', '社会', '安全', '就业', '养老', '住房',
                '脱贫', '慰问', '春节', '新年'],
    'economy': ['经济', '金融', '财政', '贸易', '产业', '科技', '创新', '消费', '投资',
                '高质量发展', '新质生产力', '供给侧', '数字经济', '海洋经济', '改革开放'],
    'politics': ['政治', '人大', '政协', '全会', '两会', '法治', '改革', '制度', '宪法',
                 '政府工作报告', '规划纲要', '中央政治局'],
}

CATEGORY_KEYWORDS = {
    'meeting': ['会议', '会见', '会晤', '座谈会', '全会', '峰会', '茶话会', '集体学习',
                '审议', '全体会议', '开幕式', '闭幕'],
    'inspection': ['考察', '调研', '走访', '看望', '慰问', '视察'],
    'article': ['《求是》', '发表文章', '发表重要文章', '重要文章'],
    'speech': ['讲话', '指示', '批示', '贺电', '贺信', '致辞', '致信', '复信', '回信',
               '主席令', '任免'],
}

CATEGORY_NAMES = {
    'speech': '重要讲话', 'article': '发表文章',
    'meeting': '重要会议', 'inspection': '考察调研',
}

DOMAIN_NAMES = {
    'economy': '经济', 'politics': '政治', 'culture': '文化', 'society': '社会',
    'ecology': '生态', 'party': '党建', 'defense': '国防', 'diplomacy': '外交',
}


def detect_domain(title: str, summary: str = '') -> str:
    text = title + ' ' + summary
    scores = {}
    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scores[domain] = score
    return max(scores, key=scores.get) if scores else 'politics'


def detect_category(title: str, summary: str = '') -> str:
    text = title + ' ' + summary
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                return cat
    return 'speech'


def detect_source(url: str) -> str:
    for domain, name in OFFICIAL_DOMAINS.items():
        if domain in url:
            return name
    return '官方媒体'


def is_official_url(url: str) -> bool:
    return any(domain in url for domain in OFFICIAL_DOMAINS)


# ============ HTTP 请求 ============
def fetch_page(url: str, retry: int = 0) -> Optional[str]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.encoding = 'utf-8'
        if resp.status_code != 200:
            raise Exception(f'HTTP {resp.status_code}')
        return resp.text
    except Exception as e:
        if retry < MAX_RETRIES:
            print(f'  [重试 {retry + 1}/{MAX_RETRIES}] {url}: {e}')
            time.sleep(3)
            return fetch_page(url, retry + 1)
        print(f'  [错误] 放弃 {url}: {e}')
        return None


# ============ Supabase 操作 ============
def get_existing_urls() -> set:
    urls = set()
    for table in [TABLE, 'articles']:
        try:
            r = requests.get(
                f'{SUPABASE_URL}/rest/v1/{table}?select=url&limit=2000',
                headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'},
                timeout=30,
            )
            if r.ok:
                urls |= {row['url'] for row in r.json() if row.get('url')}
        except Exception as e:
            print(f'  获取已有URL失败({table}): {e}')
    return urls


def get_existing_titles() -> set:
    titles = set()
    for table in [TABLE, 'articles']:
        try:
            r = requests.get(
                f'{SUPABASE_URL}/rest/v1/{table}?select=title&limit=2000',
                headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'},
                timeout=30,
            )
            if r.ok:
                titles |= {row['title'] for row in r.json() if row.get('title')}
        except Exception as e:
            print(f'  获取已有标题失败({table}): {e}')
    return titles


def supabase_insert(rows: list) -> bool:
    if not rows:
        return True
    try:
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/{TABLE}',
            headers={
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            json=rows,
            timeout=30,
        )
        if not r.ok:
            print(f'  插入失败: {r.status_code} {r.text[:200]}')
            return False
        return True
    except Exception as e:
        print(f'  插入异常: {e}')
        return False


def insert_search_log(log: Dict) -> bool:
    try:
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/{LOG_TABLE}',
            headers={
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            json=log,
            timeout=30,
        )
        if not r.ok:
            print(f'  写入日志失败: {r.status_code} {r.text[:200]}')
            return False
        return True
    except Exception as e:
        print(f'  写入日志异常: {e}')
        return False


# ============ 文章标准化 ============
def normalize_article(
    title: str,
    url: str,
    date_str: str = '',
    source: str = '',
    summary: str = '',
    discovered_by: str = 'crawl',
) -> Optional[Dict[str, Any]]:
    title = title.strip()
    url = url.strip()
    if not title or not url or not url.startswith('http'):
        return None
    if len(title) < 4:
        return None

    # 过滤非习近平相关的
    xi_keywords = ['习近平', '总书记', '中共中央', '中央政治局', '国务院', '全国人大', '全国政协']
    if not any(kw in title for kw in xi_keywords):
        # 来自官方习近平专栏的默认通过
        if 'xijinping' not in url and 'jhsjk' not in url:
            return None

    # 解析日期
    m = re.match(r'(\d{4})-(\d{1,2})-(\d{1,2})', date_str)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    else:
        today = date.today()
        y, mo, d = today.year, today.month, today.day
        date_str = str(today)

    # 自动检测
    if not source:
        source = detect_source(url)
    domain = detect_domain(title, summary)
    category = detect_category(title, summary)

    return {
        'id': str(uuid.uuid4()),
        'title': title,
        'date': date_str,
        'year': y, 'month': mo, 'day': d,
        'category': category,
        'categoryName': CATEGORY_NAMES.get(category, '重要讲话'),
        'domain': domain,
        'domainName': DOMAIN_NAMES.get(domain, '政治'),
        'is_zhengjiguan': False,
        'zhengjiguan_level': None,
        'source': source,
        'url': url,
        'summary': (summary or title)[:200],
        'status': 'pending',
        'discovered_by': discovered_by,
    }


def is_title_duplicate(title: str, existing_titles: set) -> bool:
    clean = title.strip()
    if clean in existing_titles:
        return True

    # 去除常见前缀后比较
    prefixes = [
        '《求是》杂志发表习近平总书记重要文章',
        '《求是》杂志发表习近平总书记重要文章《',
        '习近平总书记重要文章',
        '习近平总书记',
        '习近平',
    ]
    # 去除书名号内容差异
    suffixes = ['》', '。', '！']

    clean_title = clean
    for prefix in prefixes:
        clean_title = clean_title.replace(prefix, '').strip()
    for s in suffixes:
        clean_title = clean_title.rstrip(s).strip()

    if not clean_title or len(clean_title) < 4:
        return False

    for existing in existing_titles:
        clean_existing = existing
        for prefix in prefixes:
            clean_existing = clean_existing.replace(prefix, '').strip()
        for s in suffixes:
            clean_existing = clean_existing.rstrip(s).strip()

        if not clean_existing or len(clean_existing) < 4:
            continue

        # 完全匹配
        if clean_title == clean_existing:
            return True
        # 包含关系（一个标题完全包含另一个）
        if clean_title in clean_existing or clean_existing in clean_title:
            return True
        # 字符级相似度：相同字符占比超过80%视为重复
        if len(clean_title) >= 8 and len(clean_existing) >= 8:
            common = sum(1 for c in clean_title if c in clean_existing)
            ratio = common / max(len(clean_title), len(clean_existing))
            if ratio > 0.8:
                return True
    return False


# ============ 方案A: 直接爬取官方网站 ============

def crawl_people_jhsjk() -> List[Dict]:
    """爬取人民网金句库最新文章"""
    print('\n[方案A-1] 爬取人民网金句库...')
    articles = []
    current_year = date.today().year

    for year in [current_year, current_year - 1]:
        url = f'https://jhsjk.people.cn/result?year={year}&page=1'
        print(f'  请求: {url}')
        html = fetch_page(url)
        if not html:
            continue

        if not BeautifulSoup:
            print('  [跳过] BeautifulSoup 未安装')
            continue

        soup = BeautifulSoup(html, 'html.parser')
        all_links = soup.find_all('a', href=re.compile(r'article/\d+'))
        seen_urls = set()

        for link in all_links:
            href = link.get('href', '')
            if href in seen_urls:
                continue
            seen_urls.add(href)

            title = link.get_text(strip=True)
            if not title or len(title) < 4:
                continue

            article_url = href if href.startswith('http') else 'https://jhsjk.people.cn/' + href

            # 从父级提取日期
            parent = link.find_parent('li') or link.find_parent('div')
            date_str = ''
            if parent:
                text = parent.get_text()
                date_match = re.search(r'\[?(\d{4}-\d{2}-\d{2})\]?', text)
                if date_match:
                    date_str = date_match.group(1)

            articles.append({
                'title': title,
                'url': article_url,
                'date': date_str,
                'source': '人民网',
            })

        print(f'  {year}年: 找到 {len(seen_urls)} 条')
        time.sleep(REQUEST_DELAY)

        # 只取当前年即可（若有内容）
        if articles:
            break

    return articles


def crawl_people_xijinping() -> List[Dict]:
    """爬取人民网习近平专栏"""
    print('\n[方案A-2] 爬取人民网习近平专栏...')
    articles = []
    url = 'http://cpc.people.com.cn/xijinping/'
    print(f'  请求: {url}')
    html = fetch_page(url)
    if not html or not BeautifulSoup:
        return articles

    soup = BeautifulSoup(html, 'html.parser')

    # 查找新闻列表区域
    for link in soup.find_all('a', href=True):
        href = link.get('href', '')
        title = link.get_text(strip=True)

        # 过滤：只要包含文章路径的链接
        if not title or len(title) < 8:
            continue
        if not re.search(r'/n\d+/\d{4}/\d{4}/', href) and not re.search(r'/\d{6}/\d{2}/', href):
            continue

        # 构造完整URL
        if href.startswith('//'):
            href = 'http:' + href
        elif href.startswith('/'):
            href = 'http://cpc.people.com.cn' + href

        if not href.startswith('http'):
            continue

        # 从URL提取日期
        date_str = ''
        date_match = re.search(r'/(\d{4})/(\d{2})(\d{2})/', href)
        if date_match:
            date_str = f'{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}'

        articles.append({
            'title': title,
            'url': href,
            'date': date_str,
            'source': '人民网',
        })

    print(f'  找到 {len(articles)} 条')
    return articles


def crawl_qstheory() -> List[Dict]:
    """爬取求是网习近平相关文章"""
    print('\n[方案A-3] 爬取求是网...')
    articles = []

    urls_to_try = [
        'http://www.qstheory.cn/llwx/index.htm',  # 理论文选
        'http://www.qstheory.cn/',  # 首页
    ]

    for page_url in urls_to_try:
        print(f'  请求: {page_url}')
        html = fetch_page(page_url)
        if not html or not BeautifulSoup:
            continue

        soup = BeautifulSoup(html, 'html.parser')

        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            title = link.get_text(strip=True)

            if not title or len(title) < 8:
                continue

            # 求是网文章链接通常包含日期路径
            if not re.search(r'/\d{4}-\d{2}/\d{2}/', href) and not re.search(r'/\d{4}/\d{4}/', href):
                continue

            if href.startswith('//'):
                href = 'http:' + href
            elif href.startswith('/'):
                href = 'http://www.qstheory.cn' + href

            if not href.startswith('http'):
                continue

            # 跳过英文版
            if 'en.qstheory.cn' in href:
                continue

            # 从URL提取日期
            date_str = ''
            date_match = re.search(r'/(\d{4})-(\d{2})/(\d{2})/', href)
            if date_match:
                date_str = f'{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}'
            else:
                date_match = re.search(r'/(\d{4})/(\d{2})(\d{2})/', href)
                if date_match:
                    date_str = f'{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}'

            articles.append({
                'title': title,
                'url': href,
                'date': date_str,
                'source': '求是网',
            })

        time.sleep(REQUEST_DELAY)

    # 去重
    seen = set()
    unique = []
    for a in articles:
        if a['url'] not in seen:
            seen.add(a['url'])
            unique.append(a)

    print(f'  找到 {len(unique)} 条')
    return unique


def crawl_xinhua() -> List[Dict]:
    """爬取新华网习近平相关文章"""
    print('\n[方案A-4] 爬取新华网...')
    articles = []

    # 新华网习近平活动报道页面
    url = 'http://www.news.cn/politics/leaders/xijinping/index.htm'
    print(f'  请求: {url}')
    html = fetch_page(url)
    if not html or not BeautifulSoup:
        # 备用URL
        url = 'http://www.xinhuanet.com/politics/leaders/xijinping/'
        print(f'  备用请求: {url}')
        html = fetch_page(url)
        if not html:
            return articles

    soup = BeautifulSoup(html, 'html.parser')

    for link in soup.find_all('a', href=True):
        href = link.get('href', '')
        title = link.get_text(strip=True)

        if not title or len(title) < 8:
            continue

        # 新华网文章链接模式
        if not re.search(r'/\d{8}/\d+', href) and not re.search(r'/\d{4}-\d{2}/\d{2}/', href):
            continue

        if href.startswith('//'):
            href = 'http:' + href
        elif href.startswith('/'):
            href = 'http://www.news.cn' + href

        if not href.startswith('http'):
            continue

        # 提取日期
        date_str = ''
        date_match = re.search(r'/(\d{4})(\d{2})(\d{2})/', href)
        if date_match:
            date_str = f'{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}'
        else:
            date_match = re.search(r'/(\d{4})-(\d{2})/(\d{2})/', href)
            if date_match:
                date_str = f'{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}'

        articles.append({
            'title': title,
            'url': href,
            'date': date_str,
            'source': '新华网',
        })

    # 去重
    seen = set()
    unique = []
    for a in articles:
        if a['url'] not in seen:
            seen.add(a['url'])
            unique.append(a)

    print(f'  找到 {len(unique)} 条')
    return unique


def run_crawlers() -> tuple:
    """运行所有爬虫，返回合并结果和详细日志"""
    all_articles = []
    crawl_details = {}

    crawlers = [
        ('people_jhsjk', crawl_people_jhsjk, '人民网金句库'),
        ('people_xijinping', crawl_people_xijinping, '人民网习近平专栏'),
        ('xinhua', crawl_xinhua, '新华网'),
        ('qstheory', crawl_qstheory, '求是网'),
    ]

    for name, crawler, display_name in crawlers:
        print(f'\n  [{display_name}] 开始爬取...')
        try:
            articles = crawler()
            all_articles.extend(articles)
            crawl_details[name] = {
                'name': display_name,
                'count': len(articles),
                'status': 'success',
                'error': None
            }
            print(f'  [{display_name}] 成功: {len(articles)} 条')
        except Exception as e:
            error_msg = str(e)[:200]
            print(f'  [{display_name}] 失败: {error_msg}')
            traceback.print_exc()
            crawl_details[name] = {
                'name': display_name,
                'count': 0,
                'status': 'failed',
                'error': error_msg
            }
        time.sleep(REQUEST_DELAY)

    return all_articles, crawl_details


# ============ 方案B: Playwright 搜索引擎自动化 ============

SEARCH_QUERIES = [
    '习近平 最新讲话 site:people.com.cn',
    '习近平 重要会议 site:xinhuanet.com',
    '习近平 考察调研 最新 2026',
    '求是杂志 习近平 重要文章 2026',
]


def run_playwright_search() -> tuple:
    """使用 Playwright 通过百度搜索文章，返回结果和详细日志"""
    print('\n[方案B] Playwright 百度搜索...')
    articles = []
    search_details = {}

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('  [跳过] playwright 未安装')
        return articles, {'status': 'skipped', 'reason': 'playwright未安装'}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080},
            )
            page = context.new_page()

            for query in SEARCH_QUERIES:
                query_key = query.replace(' ', '_')[:30]
                print(f'  搜索: {query}')
                try:
                    page.goto('https://www.baidu.com/', timeout=30000)
                    page.wait_for_load_state('domcontentloaded')

                    search_input = page.locator('#kw')
                    search_input.fill(query)
                    page.locator('#su').click()

                    page.wait_for_selector('.result', timeout=15000)
                    time.sleep(2)

                    results = page.locator('.result')
                    count = results.count()
                    found = 0
                    print(f'  找到 {count} 个结果')

                    for i in range(min(count, 10)):
                        try:
                            result = results.nth(i)
                            title_el = result.locator('h3 a').first
                            if not title_el.count():
                                continue
                            title = title_el.inner_text().strip()
                            href = title_el.get_attribute('href') or ''

                            real_url = result.get_attribute('mu') or ''
                            if not real_url:
                                cite_el = result.locator('.c-showurl, cite').first
                                if cite_el.count():
                                    display_url = cite_el.inner_text().strip()
                                    if display_url and not display_url.startswith('http'):
                                        real_url = 'http://' + display_url

                            url = real_url or href
                            if not url or not title:
                                continue

                            title = re.sub(r'<[^>]+>', '', title).strip()

                            date_str = ''
                            try:
                                abstract_el = result.locator('.c-abstract, .content-right_8Zs40').first
                                if abstract_el.count():
                                    abstract_text = abstract_el.inner_text()
                                    date_match = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日', abstract_text)
                                    if date_match:
                                        date_str = f'{date_match.group(1)}-{int(date_match.group(2)):02d}-{int(date_match.group(3)):02d}'
                            except Exception:
                                pass

                            if is_official_url(url):
                                articles.append({
                                    'title': title,
                                    'url': url,
                                    'date': date_str,
                                    'source': detect_source(url),
                                })
                                found += 1
                        except Exception:
                            continue

                    search_details[query_key] = {
                        'query': query,
                        'total_results': count,
                        'official_found': found,
                        'status': 'success'
                    }

                    time.sleep(REQUEST_DELAY + 1)

                except Exception as e:
                    error_msg = str(e)[:100]
                    print(f'  搜索 "{query}" 失败: {error_msg}')
                    search_details[query_key] = {
                        'query': query,
                        'status': 'failed',
                        'error': error_msg
                    }
                    continue

            browser.close()
            search_details['overall_status'] = 'success'

    except Exception as e:
        error_msg = str(e)[:200]
        print(f'  Playwright 执行失败: {error_msg}')
        traceback.print_exc()
        search_details['overall_status'] = 'failed'
        search_details['error'] = error_msg

    # 去重
    seen = set()
    unique = []
    for a in articles:
        if a['url'] not in seen:
            seen.add(a['url'])
            unique.append(a)

    print(f'  方案B总计: {len(unique)} 条')
    return unique, search_details


# ============ 主函数 ============

def main():
    start_time = time.time()
    today = date.today()
    run_id = datetime.now().strftime('%Y%m%d_%H%M%S')

    print('=' * 60)
    print(f'文章自动发现 - {today} (运行ID: {run_id})')
    print(f'Supabase: {"已配置" if SUPABASE_URL else "未配置"}')
    print('=' * 60)

    if not SUPABASE_URL or not SUPABASE_KEY:
        print('[错误] Supabase 配置缺失，退出')
        return

    # 获取已有数据用于去重
    print('\n[准备] 获取已有数据...')
    existing_urls = get_existing_urls()
    existing_titles = get_existing_titles()
    print(f'  已有 {len(existing_urls)} 个URL, {len(existing_titles)} 个标题')

    # 运行爬虫（方案A）- 返回元组 (articles, details)
    crawl_articles, crawl_details = run_crawlers()
    crawl_raw_count = len(crawl_articles)
    print(f'\n方案A 原始结果: {crawl_raw_count} 条')

    # 运行搜索（方案B）- 返回元组 (articles, details)
    search_articles = []
    search_details = {}
    try:
        search_articles, search_details = run_playwright_search()
    except Exception as e:
        print(f'\n方案B 执行失败: {e}')
        search_details = {'status': 'failed', 'error': str(e)[:200]}
    search_raw_count = len(search_articles)
    print(f'方案B 原始结果: {search_raw_count} 条')

    # 合并并去重
    print('\n[去重] 处理中...')
    all_raw = crawl_articles + search_articles
    seen_urls = set(existing_urls)
    new_articles = []

    for raw in all_raw:
        article = normalize_article(
            title=raw['title'],
            url=raw['url'],
            date_str=raw.get('date', ''),
            source=raw.get('source', ''),
            discovered_by='crawl' if raw in crawl_articles else 'search',
        )
        if not article:
            continue
        if article['url'] in seen_urls:
            continue
        if is_title_duplicate(article['title'], existing_titles):
            continue
        seen_urls.add(article['url'])
        existing_titles.add(article['title'])
        new_articles.append(article)

    print(f'  合并前: {len(all_raw)} 条')
    print(f'  去重后新增: {len(new_articles)} 条')

    # 只保留最近30天的文章
    cutoff = today - timedelta(days=30)
    recent_articles = []
    for a in new_articles:
        try:
            article_date = datetime.strptime(a['date'], '%Y-%m-%d').date()
            if article_date >= cutoff:
                recent_articles.append(a)
        except (ValueError, TypeError):
            recent_articles.append(a)

    if len(recent_articles) < len(new_articles):
        print(f'  过滤30天外文章后: {len(recent_articles)} 条')
        new_articles = recent_articles

    # 写入 Supabase
    insert_success = True
    if new_articles:
        print(f'\n[写入] 插入 {len(new_articles)} 条新文章...')
        for i in range(0, len(new_articles), 20):
            batch = new_articles[i:i + 20]
            success = supabase_insert(batch)
            print(f'  批次 {i // 20 + 1}: {"成功" if success else "失败"} ({len(batch)} 条)')
            if not success:
                insert_success = False
    else:
        print('\n[写入] 无新文章需要插入')

    # 计算耗时
    duration = int(time.time() - start_time)

    # 统计新增数量
    crawl_new = sum(1 for a in new_articles if a.get('discovered_by') == 'crawl')
    search_new = sum(1 for a in new_articles if a.get('discovered_by') == 'search')

    # 写入搜索日志（增强版 - 包含详细日志）
    log_entry = {
        'crawl_count': crawl_raw_count,
        'search_count': search_raw_count,
        'new_count': len(new_articles),
        'status': 'success' if insert_success else 'partial_fail',
        'details': {
            'run_id': run_id,
            'date': str(today),
            'duration_seconds': duration,
            'crawl_raw': crawl_raw_count,
            'search_raw': search_raw_count,
            'crawl_new': crawl_new,
            'search_new': search_new,
            'total_existing_urls': len(existing_urls),
            'crawler_results': crawl_details,
            'search_results': search_details,
        },
        'duration_seconds': duration,
    }

    print(f'\n[日志] 写入搜索日志...')
    log_success = insert_search_log(log_entry)

    # 输出汇总
    print(f'\n{"=" * 60}')
    print(f'执行完成! 运行ID: {run_id}, 耗时 {duration} 秒')
    print(f'\n爬虫结果 (方案A):')
    for name, details in crawl_details.items():
        status_icon = '✓' if details['status'] == 'success' else '✗'
        print(f'  {status_icon} {details.get("name", name)}: {details.get("count", 0)} 条')
        if details.get('error'):
            print(f'      错误: {details["error"][:60]}')
    print(f'\n搜索结果 (方案B):')
    if search_details.get('overall_status') == 'skipped':
        print(f'  - 跳过: {search_details.get("reason", "未知")}')
    elif search_details.get('overall_status') == 'failed':
        print(f'  - 失败: {search_details.get("error", "未知错误")[:60]}')
    else:
        print(f'  ✓ 百度搜索: {search_raw_count} 条')
    print(f'\n总结:')
    print(f'  方案A(爬取): 原始 {crawl_raw_count} 条, 新增 {crawl_new} 条')
    print(f'  方案B(搜索): 原始 {search_raw_count} 条, 新增 {search_new} 条')
    print(f'  总计新增: {len(new_articles)} 条')
    print(f'  日志写入: {"成功" if log_success else "失败"}')
    print('=' * 60)


if __name__ == '__main__':
    main()
