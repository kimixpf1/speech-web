# -*- coding: utf-8 -*-
import re
import json

# 读取文件
with open('src/data/speeches.ts', 'r', encoding='utf-8') as f:
    speeches_content = f.read()

with open('src/data/peopleArticles.ts', 'r', encoding='utf-8') as f:
    people_content = f.read()

# 提取文章信息
def extract_articles(content, filename):
    articles = []
    # 匹配文章块
    pattern = r'\{\s*id:\s*[\'"]([^\'"]+)[\'"],\s*title:\s*[\'"]([^\'"]+)[\'"],\s*date:\s*[\'"]([^\'"]+)[\'"],\s*year:\s*(\d+),\s*month:\s*(\d+),\s*day:\s*(\d+),.*?url:\s*[\'"]([^\'"]+)[\'"]'
    
    for match in re.finditer(pattern, content, re.DOTALL):
        articles.append({
            'file': filename,
            'id': match.group(1),
            'title': match.group(2),
            'date': match.group(3),
            'year': int(match.group(4)),
            'month': int(match.group(5)),
            'day': int(match.group(6)),
            'url': match.group(7)
        })
    return articles

speeches = extract_articles(speeches_content, 'speeches.ts')
people = extract_articles(people_content, 'peopleArticles.ts')

print(f'speeches.ts 文章数量: {len(speeches)}')
print(f'peopleArticles.ts 文章数量: {len(people)}')
print()

# 检查重复标题
all_articles = speeches + people

# 按标题相似性分组
def normalize_title(title):
    """标准化标题用于比较"""
    # 去掉常见前缀
    title = re.sub(r'^.*?习近平[：:]', '', title)
    title = re.sub(r'^《求是》杂志发表习近平总书记重要文章\s*', '', title)
    title = re.sub(r'^国家主席习近平', '', title)
    return title.strip()

# 找相似标题
print('=== 可能重复的文章 ===\n')

# 检查完全相同URL
url_count = {}
for art in all_articles:
    url = art['url']
    if url not in url_count:
        url_count[url] = []
    url_count[url].append(art)

print('【URL完全相同的文章】')
for url, arts in url_count.items():
    if len(arts) > 1:
        print(f'\nURL: {url[:60]}...')
        for art in arts:
            print(f"  [{art['file']}] {art['id']}: {art['title']} ({art['date']})")

# 检查标题高度相似且时间接近的文章
print('\n\n【标题和时间高度相似的文章】')

# 按标题关键词分组
title_groups = {}
for art in all_articles:
    norm_title = normalize_title(art['title'])
    # 提取关键词
    keywords = []
    if '政协' in norm_title or '茶话会' in norm_title:
        keywords.append('政协茶话会')
    if '春节团拜会' in norm_title:
        keywords.append('春节团拜会')
    if '新年贺词' in norm_title:
        keywords.append('新年贺词')
    if '北京考察' in art['title'] or '北京' in norm_title:
        keywords.append('北京考察')
    if '城市工作' in norm_title:
        keywords.append('城市工作')
    if '金融强国' in norm_title:
        keywords.append('金融强国')
    
    for kw in keywords:
        if kw not in title_groups:
            title_groups[kw] = []
        title_groups[kw].append(art)

for kw, arts in title_groups.items():
    if len(arts) > 1:
        print(f'\n关键词【{kw}】:')
        for art in sorted(arts, key=lambda x: x['date']):
            print(f"  [{art['file']}] {art['id']}: {art['title']} ({art['date']})")
            print(f"    URL: {art['url'][:70]}...")

# 输出JSON方便后续处理
result = {
    'speeches_count': len(speeches),
    'people_count': len(people),
    'same_url': [],
    'similar_title': []
}

for url, arts in url_count.items():
    if len(arts) > 1:
        result['same_url'].append({
            'url': url,
            'articles': [{'file': a['file'], 'id': a['id'], 'title': a['title'], 'date': a['date']} for a in arts]
        })

for kw, arts in title_groups.items():
    if len(arts) > 1:
        result['similar_title'].append({
            'keyword': kw,
            'articles': [{'file': a['file'], 'id': a['id'], 'title': a['title'], 'date': a['date'], 'url': a['url']} for a in arts]
        })

with open('scripts/duplicate_check_result.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print('\n\n结果已保存到 scripts/duplicate_check_result.json')