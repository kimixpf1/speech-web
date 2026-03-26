# -*- coding: utf-8 -*-
"""
批量重新生成文章摘要和解读
使用 Kimi API 按照最新的解读格式要求重新生成所有文章
"""
import os
import re
import json
import time
import requests
from datetime import datetime, timezone, timedelta

# 配置
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_ANON_KEY', '')
KIMI_API_KEY = os.environ.get('KIMI_API_KEY', '')
DOMAIN_FILTER = os.environ.get('DOMAIN_FILTER', '')  # 领域筛选

KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'
ARTICLES_TABLE = 'articles'
DETAILS_TABLE = 'article_details'

# 领域名称映射
DOMAIN_NAMES = {
    'economy': '经济', 'politics': '政治', 'culture': '文化', 'society': '社会',
    'ecology': '生态', 'party': '党建', 'defense': '国防', 'diplomacy': '外交',
}

# 请求延迟（避免API限流）
REQUEST_DELAY = 2.0

print(f'[Config] SUPABASE_URL: {"已配置" if SUPABASE_URL else "未配置"}')
print(f'[Config] SUPABASE_KEY: {"已配置" if SUPABASE_KEY else "未配置"}')
print(f'[Config] KIMI_API_KEY: {"已配置" if KIMI_API_KEY else "未配置"}')
print(f'[Config] DOMAIN_FILTER: {DOMAIN_FILTER or "全部领域"}')


def get_beijing_time():
    """获取北京时间"""
    beijing_tz = timezone(timedelta(hours=8))
    return datetime.now(beijing_tz).isoformat()


def get_all_articles():
    """获取文章列表（支持领域筛选）"""
    if not SUPABASE_URL:
        print('[Error] SUPABASE_URL 未配置')
        return []
    
    try:
        # 构建查询URL - 先不带筛选获取所有文章
        base_url = f'{SUPABASE_URL}/rest/v1/{ARTICLES_TABLE}?select=id,title,url,summary,source,domain,domainName&order=date.desc&limit=2000'
        
        print(f'[Debug] 请求URL: {base_url[:100]}...')
        
        resp = requests.get(
            base_url,
            headers={
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json'
            },
            timeout=30
        )
        
        if resp.status_code == 200:
            articles = resp.json()
            print(f'[Fetch] 获取到 {len(articles)} 篇文章')
            
            # 显示 domain 字段的实际值分布
            domain_stats = {}
            for a in articles:
                d = a.get('domain') or a.get('domainName') or 'null'
                domain_stats[str(d)] = domain_stats.get(str(d), 0) + 1
            print(f'[Debug] domain 字段分布: {domain_stats}')
            
            # 客户端筛选领域
            if DOMAIN_FILTER:
                domain_name = DOMAIN_NAMES.get(DOMAIN_FILTER, DOMAIN_FILTER)
                print(f'[Filter] 筛选领域: domain="{DOMAIN_FILTER}" 或 domainName="{domain_name}"')
                
                # 显示前5篇文章的 domain 值
                print(f'[Debug] 前5篇文章的 domain 值:')
                for a in articles[:5]:
                    print(f'  - id={a.get("id")}, domain={a.get("domain")}, domainName={a.get("domainName")}')
                
                articles = [a for a in articles if a.get('domain') == DOMAIN_FILTER or a.get('domainName') == domain_name]
                print(f'[Filter] 筛选后: {len(articles)} 篇文章')
            
            return articles
        else:
            print(f'[Error] 获取文章失败: {resp.status_code}')
            print(f'[Error] 响应内容: {resp.text[:500]}')
            return []
    except Exception as e:
        print(f'[Error] 获取文章异常: {e}')
        return []


def get_article_content(url):
    """获取文章内容"""
    if not url:
        return ''
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code == 200:
            # 简单提取正文
            text = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', resp.text)
            text = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', text)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text).strip()
            return text[:8000]  # 限制长度
    except Exception as e:
        print(f'  [Warning] 获取内容失败: {e}')
    
    return ''


def generate_summary_and_analysis(title, content, existing_summary=''):
    """调用 Kimi API 生成摘要和解读"""
    if not KIMI_API_KEY:
        raise Exception('KIMI_API_KEY 未配置')
    
    # 使用现有摘要作为备选内容
    article_content = content if content and len(content) > 200 else existing_summary or title
    
    prompt = f'''你是一位资深的时政理论专家，擅长深度解读习近平总书记重要讲话。请根据以下文章内容，生成专业的摘要和深度解读。

文章标题：{title}

文章内容：
{article_content[:6000]}

请严格按照以下格式输出（禁止JSON，禁止英文）：

【摘要】
150-200字，准确概括文章核心内容，提炼关键论断。

【解读】
400-600字深度解读，分为三个段落（每段开头标注小标题）：

一、政治高度：结合习近平新时代中国特色社会主义思想，阐述讲话在党和国家事业全局中的重大意义。

二、理论深度：阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。

三、历史贯通与实践：联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。

严格要求：
1. 全部使用中文，禁止任何英文
2. 禁止JSON格式，禁止引号、大括号等符号
3. 解读必须分三段，每段用"一、""二、""三、"开头
4. 语言庄重规范，适合政务学习场景'''
    
    try:
        response = requests.post(
            KIMI_API_URL,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {KIMI_API_KEY}'
            },
            json={
                'model': 'moonshot-v1-8k',
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': 0.7,
                'max_tokens': 2000,
            },
            timeout=120
        )
        
        if response.status_code != 200:
            raise Exception(f'API 错误: {response.status_code}')
        
        data = response.json()
        raw_content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
        
        # 解析摘要和解读
        summary = ''
        analysis = ''
        
        # 方法一：通过【摘要】和【解读】标记提取
        summary_match = re.search(r'【摘要】[\s：:]*([\s\S]*?)(?=【解读】|$)', raw_content)
        analysis_match = re.search(r'【解读】[\s：:]*([\s\S]*?)$', raw_content)
        
        if summary_match:
            summary = summary_match.group(1).strip()
        if analysis_match:
            analysis = analysis_match.group(1).strip()
        
        # 方法二：通过关键词提取
        if not summary:
            kw_match = re.search(r'摘\s*要[\s：:]*([\s\S]*?)(?=解\s*读|一、|$)', raw_content)
            if kw_match:
                summary = kw_match.group(1).strip()
        
        if not analysis:
            kw_match = re.search(r'(一、政治高度[\s\S]*)', raw_content)
            if kw_match:
                analysis = kw_match.group(1).strip()
        
        return {
            'summary': summary or existing_summary or '摘要生成失败',
            'analysis': analysis or '解读生成失败'
        }
    
    except Exception as e:
        print(f'  [Error] 生成失败: {e}')
        raise


def save_article_detail(article_id, abstract, analysis, full_text=''):
    """保存文章详情到数据库"""
    if not SUPABASE_URL:
        print('  [Error] SUPABASE_URL 未配置')
        return False
    
    try:
        # 直接使用 upsert 插入或更新
        resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/{DETAILS_TABLE}?on_conflict=id',
            headers={
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates,return=minimal'
            },
            json={
                'id': article_id,
                'abstract': abstract,
                'analysis': analysis,
                'full_text': full_text
            },
            timeout=30
        )
        
        if resp.status_code in (200, 201):
            return True
        else:
            print(f'  [Error] 保存失败: HTTP {resp.status_code}')
            print(f'  [Error] 响应: {resp.text[:200]}')
            return False
    
    except Exception as e:
        print(f'  [Error] 保存异常: {e}')
        return False


def main():
    start_time = time.time()
    
    domain_display = DOMAIN_NAMES.get(DOMAIN_FILTER, DOMAIN_FILTER) if DOMAIN_FILTER else "全部领域"
    
    print('=' * 60)
    print(f'批量重新生成摘要和解读 - {get_beijing_time()}')
    print(f'目标领域: {domain_display}')
    print('=' * 60)
    
    if not SUPABASE_URL or not KIMI_API_KEY:
        print('[Error] 配置不完整，退出')
        return
    
    # 获取文章列表（已支持领域筛选）
    articles = get_all_articles()
    
    if not articles:
        print('[Info] 没有获取到文章，可能该领域暂无文章')
        return
    
    success_count = 0
    fail_count = 0
    skip_count = 0
    
    for i, article in enumerate(articles):
        article_id = article.get('id', '')
        title = article.get('title', '')
        url = article.get('url', '')
        existing_summary = article.get('summary', '')
        domain_name = article.get('domainName', '')
        
        domain_tag = f'[{domain_name}] ' if domain_name else ''
        print(f'\n[{i+1}/{len(articles)}] {domain_tag}{title[:40]}...')
        
        if not article_id:
            print('  [Skip] 缺少ID')
            skip_count += 1
            continue
        
        try:
            # 获取文章内容
            content = ''
            if url:
                content = get_article_content(url)
                time.sleep(1)  # 避免请求过快
            
            # 生成摘要和解读
            result = generate_summary_and_analysis(title, content, existing_summary)
            
            print(f'  [Summary] {result["summary"][:50]}...')
            print(f'  [Analysis] {result["analysis"][:50]}...')
            
            # 保存到数据库
            if save_article_detail(article_id, result['summary'], result['analysis'], content):
                print('  [OK] 保存成功')
                success_count += 1
            else:
                print('  [Fail] 保存失败')
                fail_count += 1
            
            # 延迟避免API限流
            time.sleep(REQUEST_DELAY)
            
        except Exception as e:
            print(f'  [Fail] {e}')
            fail_count += 1
            time.sleep(3)  # 失败后多等一会儿
    
    duration = int(time.time() - start_time)
    
    print('\n' + '=' * 60)
    print(f'处理完成！耗时 {duration} 秒')
    print(f'领域: {domain_display}')
    print(f'成功: {success_count}, 失败: {fail_count}, 跳过: {skip_count}')
    print('=' * 60)


if __name__ == '__main__':
    main()