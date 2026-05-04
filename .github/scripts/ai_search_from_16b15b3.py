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
# 浼樺厛浣跨敤service_role_key锛屽洖閫€鍒癮non_key
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_ANON_KEY', '')
KIMI_API_KEY = os.environ.get('KIMI_API_KEY', '')

# 璋冭瘯杈撳嚭鐜鍙橀噺鐘舵€?print(f'[Config] SUPABASE_URL: {"宸查厤缃? if SUPABASE_URL else "鏈厤缃?}')
print(f'[Config] SUPABASE_KEY: {"宸查厤缃? if SUPABASE_KEY else "鏈厤缃?} (service_role={"鏄? if os.environ.get("SUPABASE_SERVICE_ROLE_KEY") else "鍚?})')
print(f'[Config] KIMI_API_KEY: {"宸查厤缃? if KIMI_API_KEY else "鏈厤缃?}')

KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'
TABLE = 'pending_articles'
LOG_TABLE = 'search_logs'

# 瀹樻柟鏉ユ簮鍩熷悕鐧藉悕鍗?OFFICIAL_DOMAINS = [
    'people.com.cn', 'www.people.com.cn', 'jhsjk.people.cn',  # 浜烘皯缃?    'xinhuanet.com', 'www.xinhuanet.com', 'news.cn', 'www.news.cn',  # 鏂板崕缃?    'qstheory.cn', 'www.qstheory.cn',  # 姹傛槸缃?    'cctv.com', 'www.cctv.com', 'cntv.cn',  # 澶缃?    'gov.cn', 'www.gov.cn',  # 涓浗鏀垮簻缃?]

BAIDU_SITES = ['people.com.cn', 'xinhuanet.com', 'qstheory.cn']

# 棰嗗煙鍏抽敭璇?- 鎸変紭鍏堢骇鎺掑垪锛堝浜や紭鍏堟娴嬶級
DOMAIN_KEYWORDS = {
    'diplomacy': ['澶栦氦', '鍑鸿', '宄颁細', '鎬荤粺', '鎬荤悊', '鍥介檯', '澶栧浗', '鍥戒簨璁块棶', '鍙嬪ソ璁块棶'],
    'defense': ['鍐涢槦', '鍥介槻', '鍐涗簨', '鍐涘', '寮哄啗', '閮ㄩ槦', '鎴樺＋'],
    'party': ['鍏氬缓', '浠庝弗娌诲厷', '绾', '宸¤', '鍏氭牎', '鍏氬憳', '鍏氱粍缁?],
    'ecology': ['鐢熸€?, '鐜', '缁胯壊', '纰宠揪宄?, '纰充腑鍜?, '鐜繚'],
    'culture': ['鏂囧寲', '鏂囨槑', '鏂囪壓', '浣撹偛', '鑹烘湳', '鏂囧'],
    'society': ['姘戠敓', '鎵惰传', '涔℃潙鎸叴', '鍖荤枟', '灏变笟', '鍏昏€?, '浣忔埧'],
    'economy': ['缁忔祹', '閲戣瀺', '绉戞妧', '鍒涙柊', '楂樿川閲忓彂灞?, '浜т笟', '浼佷笟'],
    'politics': ['鏀挎不', '浜哄ぇ', '鏀垮崗', '鍏ㄤ細', '涓や細', '娉曟不', '绔嬫硶'],
}

# 鍒嗙被鍏抽敭璇?- 浼樺寲浼樺厛绾?CATEGORY_KEYWORDS = {
    'inspection': ['鑰冨療', '璋冪爺', '瑙嗗療', '璧拌', '鐪嬫湜', '鎱伴棶'],
    'article': ['銆婃眰鏄€?, '鍙戣〃鏂囩珷', '閲嶈鏂囩珷', '缃插悕鏂囩珷'],
    'meeting': ['浼氳', '搴ц皥浼?, '鍏ㄤ細', '鐮旇浼?, '宸ヤ綔浼?],
    'speech': ['璁茶瘽', '鎸囩ず', '鎵圭ず', '璐虹數', '璐轰俊', '鑷磋緸', '鍙戣█'],
}

CATEGORY_NAMES = {'speech': '閲嶈璁茶瘽', 'article': '鍙戣〃鏂囩珷', 'meeting': '閲嶈浼氳', 'inspection': '鑰冨療璋冪爺'}
DOMAIN_NAMES = {'economy': '缁忔祹', 'politics': '鏀挎不', 'culture': '鏂囧寲', 'society': '绀句細',
                'ecology': '鐢熸€?, 'party': '鍏氬缓', 'defense': '鍥介槻', 'diplomacy': '澶栦氦'}


def get_search_query():
    """Generate search query based on time: morning searches yesterday, evening searches today"""
    utc_now = datetime.utcnow()
    beijing_hour = (utc_now.hour + 8) % 24
    
    if beijing_hour < 12:
        # Morning (0-12): search yesterday
        target_date = (utc_now + timedelta(hours=8) - timedelta(days=1)).strftime('%Y骞?m鏈?d鏃?)
        date_keyword = '鏄ㄦ棩'
        search_date = 'yesterday'
    else:
        # Afternoon/Evening (12-24): search today
        target_date = (utc_now + timedelta(hours=8)).strftime('%Y骞?m鏈?d鏃?)
        date_keyword = '浠婃棩'
        search_date = 'today'
    
    # 澶氱淮搴︽悳绱㈠叧閿瘝锛岀‘淇濅笉婕?    query = f'涔犺繎骞虫€讳功璁皗date_keyword}鏈€鏂拌璇?鏂囩珷 璋冪爺 浼氳 浼氳 鎸囩ず 绮剧 鏈嶅姟 浜т笟 {target_date} 浜烘皯缃?鏂板崕绀?
    print(f'[Time] Beijing {beijing_hour}:00, searching {date_keyword} ({target_date})')
    return query, search_date, target_date


def detect_domain(title: str) -> str:
    """妫€娴嬫枃绔犻鍩燂紝澶栦氦浼樺厛"""
    # 浼樺厛妫€娴嬪浜わ紙鍥犱负澶栦氦娲诲姩甯稿寘鍚?浼氳"绛夎瘝锛?    diplomacy_keywords = ['澶栦氦', '鍑鸿', '宄颁細', '鎬荤粺', '鎬荤悊', '鍥介檯', '澶栧浗', '鍥戒簨璁块棶', '鍙嬪ソ璁块棶']
    if any(kw in title for kw in diplomacy_keywords):
        return 'diplomacy'
    
    # 鍐嶆寜椤哄簭妫€娴嬪叾浠栭鍩?    for domain, keywords in DOMAIN_KEYWORDS.items():
        if domain == 'diplomacy':
            continue  # 宸叉娴嬭繃
        if any(kw in title for kw in keywords):
            return domain
    return 'politics'


def detect_category(title: str) -> str:
    """妫€娴嬫枃绔犲垎绫伙紝鑰冭檻澶栦氦浼氳鐨勭壒娈婃儏鍐?""
    # 濡傛灉鏄浜ょ浉鍏崇殑浼氳锛屽綊涓?meeting
    diplomacy_keywords = ['澶栦氦', '鍑鸿', '宄颁細', '鎬荤粺', '鎬荤悊', '鍥介檯', '澶栧浗']
    is_diplomacy = any(kw in title for kw in diplomacy_keywords)
    
    # 鎸変紭鍏堢骇妫€娴?    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in title for kw in keywords):
            # 鐗规畩澶勭悊锛氬浜?浼氳 = meeting
            if is_diplomacy and '浼氳' in title:
                return 'meeting'
            return category
    
    # 濡傛灉鏈?浼氳"浣嗘病鍖归厤鍒板叾浠栵紝褰掍负 meeting
    if '浼氳' in title:
        return 'meeting'
    
    return 'speech'


def validate_article(article: Dict) -> Dict:
    """楠岃瘉鏂囩珷鏈夋晥鎬э細URL鍙闂€佹棩鏈熸纭€佹潵婧愬畼鏂?""
    result = {'valid': True, 'reasons': []}
    
    url = article.get('url', '')
    title = article.get('title', '')
    article_date = article.get('date', '')
    
    # 1. 妫€鏌RL鏍煎紡
    if not url or not url.startswith('http'):
        result['valid'] = False
        result['reasons'].append('URL鏍煎紡鏃犳晥')
        return result
    
    # 2. 妫€鏌ユ潵婧愭槸鍚﹀畼鏂?    from urllib.parse import urlparse
    domain = urlparse(url).netloc.lower()
    is_official = any(off_domain in domain for off_domain in OFFICIAL_DOMAINS)
    if not is_official:
        result['valid'] = False
        result['reasons'].append(f'闈炲畼鏂规潵婧? {domain}')
        return result
    
    # 3. 妫€鏌ユ棩鏈熸槸鍚︽渶杩?澶?    try:
        if article_date:
            art_date = datetime.strptime(article_date, '%Y-%m-%d')
            today = datetime.utcnow() + timedelta(hours=8)
            days_diff = (today - art_date).days
            if days_diff > 3 or days_diff < -1:
                result['valid'] = False
                result['reasons'].append(f'鏃ユ湡杩囨棫: {article_date}锛堣窛浠妠days_diff}澶╋級')
                return result
    except:
        pass
    
    # 4. 妫€鏌RL鏄惁鍙闂紙HEAD璇锋眰锛?    try:
        resp = requests.head(url, timeout=10, allow_redirects=True, 
                           headers={'User-Agent': 'Mozilla/5.0'})
        if resp.status_code == 404:
            result['valid'] = False
            result['reasons'].append('URL杩斿洖404')
            return result
        if resp.status_code >= 400:
            result['valid'] = False
            result['reasons'].append(f'URL杩斿洖閿欒: {resp.status_code}')
            return result
    except Exception as e:
        result['valid'] = False
        result['reasons'].append(f'URL鏃犳硶璁块棶: {str(e)[:50]}')
        return result
    
    return result


def search_with_kimi(query: str) -> List[Dict]:
    if not KIMI_API_KEY:
        print('[Kimi] API Key not configured')
        return []
    
    # 鑾峰彇浠婂ぉ鏃ユ湡
    today = (datetime.utcnow() + timedelta(hours=8)).strftime('%Y骞?m鏈?d鏃?)
    today_date = (datetime.utcnow() + timedelta(hours=8)).strftime('%Y-%m-%d')
    
    system_prompt = f"""浣犳槸鏂伴椈鎼滅储鍔╂墜銆備粖澶╂槸{today}銆?
閲嶈鎻愮ず锛?1. 蹇呴』浣跨敤鑱旂綉鎼滅储($web_search)鑾峰彇鏈€鏂版柊闂?2. 缁濆涓嶈浣跨敤璁粌鏁版嵁涓殑鏃ф柊闂?3. 鍙繑鍥瀧today_date}涔嬪悗鍙戝竷鐨勬柊闂伙紝鏇存棭鐨勬柊闂荤洿鎺ヤ涪寮?
銆愭瀬鍏堕噸瑕併€慤RL鐪熷疄鎬ц姹傦細
- 蹇呴』杩斿洖浣犻€氳繃鑱旂綉鎼滅储瀹為檯璁块棶杩囥€佺‘璁ゅ瓨鍦ㄧ殑鐪熷疄URL
- 绂佹缂栭€犮€佹嫾鍑戙€佺寽娴嬩换浣昒RL
- 濡傛灉鎼滅储缁撴灉娌℃湁鎻愪緵瀹屾暣URL锛屽氨涓嶈杩斿洖杩欐潯鏂伴椈
- 瀹佸彲灏戣繑鍥烇紝涔熶笉鑳借繑鍥炲亣URL

璇疯仈缃戞悳绱範杩戝钩鎬讳功璁版渶杩戠殑閲嶈璁茶瘽銆侀噸瑕佹枃绔犮€侀噸瑕佷細璁€佽€冨療璋冪爺銆佹寚绀烘壒绀恒€佸洖淇¤春淇＄瓑鍏ㄩ儴鏈€鏂版椿鍔ㄦ柊闂汇€?鐗瑰埆娉ㄦ剰锛氶櫎浜嗛噸瑕佽璇濆拰浼氳锛岃繕瑕佸叧娉ㄤ骇涓氬彂灞曘€佹湇鍔′笟銆佺鎶€鍒涙柊銆佹皯鐢熶繚闅滅瓑鍚勯鍩熺殑鏂板姩鍚戙€?杩斿洖JSON鏁扮粍锛屾瘡鏉″寘鍚細
{{"title": "鏍囬", "date": "YYYY-MM-DD", "category": "speech", "categoryName": "閲嶈璁茶瘽", "source": "鏉ユ簮", "url": "鐪熷疄鍙闂殑閾炬帴", "summary": "鎽樿"}}
瑕佹眰锛氬彧杩斿洖鏈€杩?澶╁唴鐨勬柊闂伙紝鏈€澶?5鏉★紝鍙繑鍥濲SON鏁扮粍銆傚鏋滄病鎵惧埌鏈€鏂版柊闂绘垨鏃犳硶纭URL鐪熷疄鎬э紝杩斿洖绌烘暟缁刐]銆?""

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
        search_query = f'site:{site} {query}'
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
                if '涔犺繎骞? not in title and '鎬讳功璁? not in title:
                    continue
                
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
    
    print(f'[Baidu] Found {len(articles)} articles')
    return articles


def search_people_jhsjk() -> List[Dict]:
    """鐩存帴浠庝汉姘戠綉涔犺繎骞崇郴鍒楅噸瑕佽璇濇暟鎹簱鎶撳彇鏈€鏂版枃绔?""
    print('[People JHSJK] Starting direct crawl...')
    articles = []
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print('[People JHSJK] BeautifulSoup not installed')
        return []
    
    try:
        # 鎶撳彇浜烘皯缃戣璇濇暟鎹簱棣栭〉
        resp = requests.get('http://jhsjk.people.cn/article', headers=headers, timeout=30)
        if resp.status_code != 200:
            print(f'[People JHSJK] HTTP error: {resp.status_code}')
            return []
        
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 鏌ユ壘鎵€鏈夋枃绔犻摼鎺?- 鍥藉唴鍜屽浗闄呴儴鍒?        today = (datetime.utcnow() + timedelta(hours=8)).date()
        yesterday = today - timedelta(days=1)
        valid_dates = [today.strftime('%Y-%m-%d'), yesterday.strftime('%Y-%m-%d')]
        
        # 鏌ユ壘鎵€鏈?li 鍏冪礌涓殑閾炬帴
        for li in soup.select('li'):
            link = li.find('a')
            if not link:
                continue
            
            title = link.get_text(strip=True)
            href = link.get('href', '')
            
            # 璺宠繃闈炴枃绔犻摼鎺?            if not title or not href or 'article' not in href:
                continue
            
            # 璺宠繃闈炰範杩戝钩鐩稿叧
            if '涔犺繎骞? not in title and '鎬讳功璁? not in title and '涓诲腑' not in title:
                continue
            
            # 鎻愬彇鏃ユ湡 [2026-03-28 鏉ユ簮锛?..]
            date_match = re.search(r'\[(\d{4}-\d{2}-\d{2})', li.get_text())
            if date_match:
                article_date = date_match.group(1)
                # 鍙鏈€杩?澶╃殑
                if article_date not in valid_dates:
                    print(f'[People JHSJK] 璺宠繃鏃ф枃绔? {title[:30]}... ({article_date})')
                    continue
            else:
                # 娌℃湁鏃ユ湡鐨勯粯璁や粖澶?                article_date = today.strftime('%Y-%m-%d')
            
            # 鏋勫缓瀹屾暣URL
            if href.startswith('/'):
                full_url = f'http://jhsjk.people.cn{href}'
            elif href.startswith('http'):
                full_url = href
            else:
                full_url = f'http://jhsjk.people.cn/{href}'
            
            articles.append({
                'title': title,
                'url': full_url,
                'source': '浜烘皯缃?,
                'date': article_date,
                'summary': title,
            })
            print(f'[People JHSJK] 鍙戠幇: {title[:40]}... ({article_date})')
        
        print(f'[People JHSJK] Found {len(articles)} recent articles')
        return articles
        
    except Exception as e:
        print(f'[People JHSJK] Error: {e}')
        return []


def merge_and_dedupe(kimi_articles: List[Dict], baidu_articles: List[Dict], people_articles: List[Dict] = None):
    all_articles = []
    seen_titles = set()
    seen_urls = set()
    duplicate_seen_title = []
    duplicate_seen_url = []
    validation_rejected = []
    kept_articles = []

    if people_articles is None:
        people_articles = []

    source_counts = {'kimi': len(kimi_articles or []), 'baidu': len(baidu_articles or []), 'people': len(people_articles or [])}

    def simplify(t): return re.sub(r'[銆娿€?"銆屻€嶃€庛€忋€愩€慭s]', '', t)

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
            print(f'[Validate] 鎷掔粷: {title[:30]}... - {validation["reasons"]}')
            return

        seen_urls.add(url)
        seen_titles.add(simple)

        domain = detect_domain(title)
        category = detect_category(title)

        all_articles.append({
            'id': str(uuid.uuid4()),
            'title': title, 'url': url,
            'date': article.get('date', (datetime.utcnow() + timedelta(hours=8)).date().isoformat()),
            'source': article.get('source', '瀹樻柟濯掍綋'),
            'summary': article.get('summary', title),
            'category': category,
            'categoryname': CATEGORY_NAMES.get(category, '閲嶈璁茶瘽'),
            'status': 'pending',
            'discovered_by': f'ai_auto_{source_tag}',
            'fetched_at': datetime.now().isoformat(),
        })
        kept_articles.append({'title': title, 'url': url, 'source': source_tag})

    for a in kimi_articles:
        add(a, 'kimi')
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

    print(f'[Merge] 杈撳叆: {sum(source_counts.values())}, 鍘婚噸淇濈暀: {len(kept_articles)}, '
          f'鏈疆鏍囬閲嶅: {len(duplicate_seen_title)}, 鏈疆閾炬帴閲嶅: {len(duplicate_seen_url)}, '
          f'鏍￠獙娣樻卑: {len(validation_rejected)}')

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
        time_slot = '8:00 鎼滄槰鏃? if beijing_hour < 12 else '20:00 鎼滀粖鏃?
        return f'鑷姩瀹氭椂鎼滅储锛坽time_slot}锛?
    return '鎵嬪姩瑙﹀彂鎼滅储'


def save_log(kimi_count, baidu_count, people_count, new_count, status, details):
    if not SUPABASE_URL:
        print('[Log] SUPABASE_URL not configured')
        return
    try:
        from datetime import timezone
        beijing_tz = timezone(timedelta(hours=8))
        beijing_now = datetime.now(beijing_tz)
        search_type = get_search_type()
        pipeline_label = get_search_pipeline_label(search_type)
        log_data = {
            'executed_at': beijing_now.isoformat(),
            'crawl_count': kimi_count + baidu_count + people_count,
            'search_count': kimi_count + baidu_count + people_count,
            'new_count': new_count,
            'status': status,
            'details': {
                **details,
                'search_type': search_type,
                'api_used': pipeline_label,
                'pipeline': {
                    'step1': '鐩存姄浜烘皯缃戣璇濇暟鎹簱',
                    'step2': '鐧惧害鎼滅储(浜烘皯鏃ユ姤+鏂板崕绀?姹傛槸缃?',
                    'step3': 'Kimi鑱旂綉琛ユ紡',
                    'step4': '缁熶竴鍘婚噸(鏍囬+URL)',
                    'step5': '涓庡凡鏈夋枃绔犲簱姣斿',
                    'step6': '鏈€缁堟柊澧炲叆寰呭鏍?,
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
    return re.sub(r'[銆娿€?"銆屻€嶃€庛€忋€愩€慭s]', '', t)


def main():
    print(f'=== AI Scheduled Search {datetime.now()} ===')

    search_query, search_date, target_date = get_search_query()

    people_articles = search_people_jhsjk()
    kimi_articles = search_with_kimi(search_query)
    baidu_articles = search_with_baidu(search_query)

    merged, merge_info = merge_and_dedupe(kimi_articles, baidu_articles, people_articles)
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

    save_log(len(kimi_articles), len(baidu_articles), len(people_articles), saved, status, log_details)

    print(f'=== Done: People {len(people_articles)}, Kimi {len(kimi_articles)}, Baidu {len(baidu_articles)}, '
          f'Merged {len(merged)}, ExistingFiltered {len(existing_url_filtered)}, New {saved} ===')


if __name__ == '__main__':
    main()
