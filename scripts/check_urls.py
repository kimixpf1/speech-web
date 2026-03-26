# -*- coding: utf-8 -*-
"""
URL验证脚本 - 检查所有文章URL是否可访问
"""
import requests
import re
import json
from urllib.parse import urlparse

# 读取文件中的URL
def extract_urls_from_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 匹配url: 'xxx' 或 url: "xxx"
    pattern = r"url:\s*['\"]([^'\"]+)['\"]"
    matches = re.findall(pattern, content)
    return matches

# 检查URL是否可访问
def check_url(url, timeout=10):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    try:
        resp = requests.head(url, headers=headers, timeout=timeout, allow_redirects=True)
        return resp.status_code
    except requests.exceptions.Timeout:
        return 'TIMEOUT'
    except requests.exceptions.ConnectionError:
        return 'CONN_ERROR'
    except Exception as e:
        return str(e)

# 主函数
def main():
    files = [
        'src/data/speeches.ts',
        'src/data/zhengjiguanArticles.ts',
        'src/data/peopleArticles.ts',
        'src/data/migratedArticles.ts'
    ]
    
    all_urls = []
    for f in files:
        urls = extract_urls_from_file(f)
        for url in urls:
            all_urls.append((f, url))
    
    print(f'共找到 {len(all_urls)} 个URL')
    print('=' * 80)
    
    # 检查每个URL
    failed_urls = []
    for filepath, url in all_urls:
        status = check_url(url)
        if status != 200:
            print(f'[{status}] {url}')
            failed_urls.append({
                'file': filepath,
                'url': url,
                'status': status
            })
    
    print('=' * 80)
    print(f'检查完成。失败: {len(failed_urls)} 个')
    
    # 保存失败URL
    with open('scripts/failed_urls.json', 'w', encoding='utf-8') as f:
        json.dump(failed_urls, f, ensure_ascii=False, indent=2)
    
    print('失败URL已保存到 scripts/failed_urls.json')

if __name__ == '__main__':
    main()