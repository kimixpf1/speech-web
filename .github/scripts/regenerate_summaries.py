# -*- coding: utf-8 -*-
"""
批量重新生成文章摘要和解读
使用 DeepSeek API 按照最新的解读格式要求重新生成所有文章
"""
import os
import re
import json
import time
import requests
from datetime import datetime, timezone, timedelta

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_ANON_KEY', '')
DS_API_KEY = os.environ.get('DS_API_KEY', '')
DS_API_URL = 'https://api.deepseek.com/v1/chat/completions'
DS_MODEL = 'deepseek-chat'
DOMAIN_FILTER = os.environ.get('DOMAIN_FILTER', '')
ARTICLES_TABLE = 'articles'
DETAILS_TABLE = 'article_details'

DOMAIN_NAMES = {
    'economy': '经济', 'politics': '政治', 'culture': '文化', 'society': '社会',
    'ecology': '生态', 'party': '党建', 'defense': '国防', 'diplomacy': '外交',
}

REQUEST_DELAY = 2.0
MAX_RETRIES = 3

print(f'[Config] SUPABASE_URL: {"已配置" if SUPABASE_URL else "未配置"}')
print(f'[Config] DS_API_KEY: {"已配置" if DS_API_KEY else "未配置"}')
print(f'[Config] DOMAIN_FILTER: {DOMAIN_FILTER or "全部领域"}')

def get_beijing_time():
    return datetime.now(timezone(timedelta(hours=8))).isoformat()

def get_articles_missing_details():
    if not SUPABASE_URL:
        return []
    articles_resp = requests.get(f'{SUPABASE_URL}/rest/v1/{ARTICLES_TABLE}?select=id,title,url,summary,domain,domain_name&order=date.desc&limit=2000', headers={'apikey': SUPABASE_KEY}, timeout=30)
    articles = articles_resp.json() if articles_resp.status_code == 200 else []
    print(f'[Fetch] 获取到 {len(articles)} 篇文章')
    
    details_resp = requests.get(f'{SUPABASE_URL}/rest/v1/{DETAILS_TABLE}?select=id,abstract,analysis', headers={'apikey': SUPABASE_KEY}, timeout=30)
    has_abstract, has_analysis = set(), set()
    if details_resp.status_code == 200:
        for d in details_resp.json():
            aid, abstract, analysis = d.get('id'), d.get('abstract', ''), d.get('analysis', '')
            if abstract and len(abstract) > 50 and '正在整理' not in abstract:
                has_abstract.add(aid)
            if analysis and len(analysis) > 100 and '正在整理' not in analysis:
                has_analysis.add(aid)
    print(f'[Debug] 已有摘要: {len(has_abstract)}, 已有解读: {len(has_analysis)}')
    
    missing = [a for a in articles if a.get('id') and (a['id'] not in has_abstract or a['id'] not in has_analysis)]
    print(f'[Filter] 缺少摘要或解读: {len(missing)} 篇')
    return missing

def get_article_content(url):
    if not url:
        return ''
    try:
        resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
        if resp.status_code == 200:
            text = re.sub(r'<[^>]+>', ' ', re.sub(r'<script[^>]*>[\s\S]*?</script>', '', re.sub(r'<style[^>]*>[\s\S]*?</style>', '', resp.text)))
            return re.sub(r'\s+', ' ', text).strip()[:8000]
    except:
        pass
    return ''

def generate_summary_and_analysis(title, content, existing_summary=''):
    if not DS_API_KEY:
        raise Exception('DS_API_KEY 未配置')
    article_content = content if content and len(content) > 200 else existing_summary or title
    prompt = f'''你是一位资深的时政理论专家。请根据以下文章生成摘要和解读。

文章标题：{title}
文章内容：{article_content[:6000]}

请按格式输出：
【摘要】150-200字，概括核心内容。
【解读】400-600字，分三段，每段用"一、""二、""三、"开头：
一、政治高度：阐述讲话的重大意义。
二、理论深度：阐释核心要义和马克思主义立场观点方法。
三、历史贯通与实践：分析思想脉络和实践指导意义。

要求：全中文，禁止JSON格式。'''

    for retry in range(MAX_RETRIES):
        try:
            resp = requests.post(DS_API_URL, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {DS_API_KEY}'}, json={'model': DS_MODEL, 'messages': [{'role': 'user', 'content': prompt}], 'temperature': 0.7, 'max_tokens': 2000}, timeout=120)
            if resp.status_code == 429:
                time.sleep(30 * (retry + 1))
                continue
            if resp.status_code != 200:
                raise Exception(f'API错误: {resp.status_code}')
            raw = resp.json().get('choices', [{}])[0].get('message', {}).get('content', '')
            sm = re.search(r'【摘要】[\s：:]*([\s\S]*?)(?=【解读】|$)', raw)
            am = re.search(r'【解读】[\s：:]*([\s\S]*?)$', raw)
            return {'summary': sm.group(1).strip() if sm else existing_summary or '摘要生成失败', 'analysis': am.group(1).strip() if am else '解读生成失败'}
        except Exception as e:
            if retry == MAX_RETRIES - 1:
                raise
            time.sleep(10)
    raise Exception('API调用失败')

def save_article_detail(article_id, abstract, analysis, full_text=''):
    resp = requests.post(f'{SUPABASE_URL}/rest/v1/{DETAILS_TABLE}?on_conflict=id', headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal'}, json={'id': article_id, 'abstract': abstract, 'analysis': analysis, 'full_text': full_text}, timeout=30)
    return resp.status_code in (200, 201)

def main():
    print(f'=== 批量生成摘要和解读 - {get_beijing_time()} ===')
    if not SUPABASE_URL or not DS_API_KEY:
        print('[Error] 配置不完整')
        return
    articles = get_articles_missing_details()
    if not articles:
        print('[Info] 没有需要处理的文章')
        return
    success, fail = 0, 0
    for i, a in enumerate(articles):
        print(f'\n[{i+1}/{len(articles)}] {a.get("title", "")[:40]}...')
        try:
            content = get_article_content(a.get('url', ''))
            time.sleep(1)
            result = generate_summary_and_analysis(a.get('title', ''), content, a.get('summary', ''))
            if save_article_detail(a['id'], result['summary'], result['analysis'], content):
                print('  [OK] 保存成功')
                success += 1
            else:
                print('  [Fail] 保存失败')
                fail += 1
            time.sleep(REQUEST_DELAY)
        except Exception as e:
            print(f'  [Fail] {e}')
            fail += 1
            time.sleep(30)
    print(f'\n=== 完成！成功: {success}, 失败: {fail} ===')

if __name__ == '__main__':
    main()