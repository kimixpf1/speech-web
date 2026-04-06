#!/usr/bin/env python3
import urllib.parse
ids = ['P2024-0189', 'P2024-0490']
quoted = ','.join(f'"{item}"' for item in ids)
print(f'quoted ids: {quoted}')
query = urllib.parse.urlencode({'select': 'id,abstract', 'id': f'in.({quoted})'})
print(f'query: {query}')
