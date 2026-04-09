# -*- coding: utf-8 -*-
import os
import sys
import json

os.environ['KIMI_API_KEY'] = 'sk-0wiWGpNU81SdgsbI6PWfEvzMrbGD8ftCcMjLP32oINF7liXL'
os.environ['DASHSCOPE_API_KEY'] = ''

sys.path.insert(0, '.github/scripts')
from ai_search import search_with_kimi

query = '习近平 重要讲话 最新 2026年4月'
print(f'Testing Kimi with query: {query}')
print('---')

articles = search_with_kimi(query)
print(f'\nKimi found {len(articles)} articles')
for i, a in enumerate(articles[:8]):
    print(f'  {i+1}. {a.get("title", "?")[:70]}')
    print(f'     URL: {a.get("url", "?")[:100]}')
    print(f'     Source: {a.get("source", "?")}')
