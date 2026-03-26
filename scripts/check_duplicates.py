# -*- coding: utf-8 -*-
"""
检查重复文章脚本 - 查找标题相似或内容重复的文章
"""
import re
import json

def extract_articles_from_file(filepath):
    """从TypeScript文件中提取文章数据"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    articles = []
    # 匹配 id: 'xxx' 和 title: 'xxx'
    id_pattern = r"id:\s*'([^']+)'"
    title_pattern = r"title:\s*'([^']+)'"
    url_pattern = r"url:\s*'([^']+)'"
    
    ids = re.findall(id_pattern, content)
    titles = re.findall(title_pattern, content)
    urls = re.findall(url_pattern, content)
    
    # 简单匹配（假设顺序一致）
    min_len = min(len(ids), len(titles), len(urls))
    for i in range(min_len):
        articles.append({
            'id': ids[i],
            'title': titles[i],
            'url': urls[i],
            'file': filepath
        })
    
    return articles

def find_similar_titles(articles):
    """查找相似标题"""
    similar = []
    for i, a1 in enumerate(articles):
        for a2 in articles[i+1:]:
            # 检查标题相似度
            title1 = a1['title']
            title2 = a2['title']
            
            # 简单相似判断：包含关系或编辑距离
            if title1 in title2 or title2 in title1:
                similar.append({
                    'title1': title1,
                    'title2': title2,
                    'id1': a1['id'],
                    'id2': a2['id'],
                    'file1': a1['file'],
                    'file2': a2['file']
                })
    
    return similar

def main():
    files = [
        'src/data/speeches.ts',
        'src/data/peopleArticles.ts',
        'src/data/migratedArticles.ts',
        'src/data/zhengjiguanArticles.ts'
    ]
    
    all_articles = []
    for f in files:
        try:
            articles = extract_articles_from_file(f)
            all_articles.extend(articles)
            print(f'[OK] {f}: {len(articles)} 篇文章')
        except Exception as e:
            print(f'[Error] {f}: {e}')
    
    print(f'\n总共找到 {len(all_articles)} 篇文章')
    print('=' * 80)
    
    # 查找相似标题
    similar = find_similar_titles(all_articles)
    
    if similar:
        print(f'\n发现 {len(similar)} 组相似标题：')
        for s in similar:
            print(f'\n[相似]')
            print(f'  标题1: {s["title1"]}')
            print(f'  标题2: {s["title2"]}')
            print(f'  ID: {s["id1"]} vs {s["id2"]}')
            print(f'  文件: {s["file1"]} vs {s["file2"]}')
    else:
        print('\n未发现相似标题')
    
    # 保存结果
    with open('scripts/duplicate_check.json', 'w', encoding='utf-8') as f:
        json.dump({
            'total': len(all_articles),
            'similar_count': len(similar),
            'similar': similar
        }, f, ensure_ascii=False, indent=2)
    
    print(f'\n检查结果已保存到 scripts/duplicate_check.json')

if __name__ == '__main__':
    main()
