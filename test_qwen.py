import os
import sys
import json

os.environ['DASHSCOPE_API_KEY'] = 'sk-0c5b824c52c246b78c18980f81397529'

sys.path.insert(0, '.github/scripts')
from ai_search import search_with_qwen

query = '习近平 重要讲话 最新 2026年4月'
print(f'Testing Qwen with query: {query}')
print('---')

articles = search_with_qwen(query)
print(f'\nQwen found {len(articles)} articles')
for i, a in enumerate(articles[:8]):
    print(f'  {i+1}. {a.get("title", "?")[:70]}')
    print(f'     URL: {a.get("url", "?")[:100]}')
    print(f'     Source: {a.get("source", "?")}')
