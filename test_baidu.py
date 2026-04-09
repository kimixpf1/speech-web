import requests
from bs4 import BeautifulSoup
from urllib.parse import quote

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

query = '习近平今日最新讲话 指示 2026年04月09日'
site = 'news.cn'
search_query = f'site:{site} {query}'
url = f'https://www.baidu.com/s?wd={quote(search_query)}&rn=10'

print(f"URL: {url}")
print(f"Searching: {search_query}")

resp = requests.get(url, headers=headers, timeout=15)
print(f"Status: {resp.status_code}")
print(f"Content length: {len(resp.text)}")

soup = BeautifulSoup(resp.text, 'html.parser')

results_c = soup.select('.result.c-container')
print(f"Results with '.result.c-container': {len(results_c)}")

results_c2 = soup.select('.result')
print(f"Results with '.result': {len(results_c2)}")

results_c3 = soup.select('[class*="result"]')
print(f"Results with '[class*=result]': {len(results_c3)}")

results_h3 = soup.select('h3 a')
print(f"h3 links: {len(results_h3)}")
for h3 in results_h3[:5]:
    print(f"  - {h3.get_text(strip=True)[:60]}")

print("\n--- HTML snippet (first 2000 chars) ---")
print(resp.text[:2000])

print("\n--- Checking for anti-bot ---")
if '验证' in resp.text or 'verify' in resp.text.lower():
    print("WARNING: Anti-bot verification detected!")
if '安全验证' in resp.text:
    print("WARNING: Baidu security verification page!")
if 'title="百度安全验证"' in resp.text:
    print("WARNING: Baidu security verification!")

title = soup.title.string if soup.title else 'No title'
print(f"Page title: {title}")
