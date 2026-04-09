# -*- coding: utf-8 -*-
"""Test DashScope API with both native and OpenAI-compatible formats"""
import requests
import json

API_KEY = 'sk-0c5b824c52c246b78c18980f81397529'

models = ['qwen-plus', 'qwen-turbo', 'qwen3.5-flash', 'qwen3.6-plus', 'qwen-max']

def test_openai_compatible(model):
    url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    payload = {
        'model': model,
        'messages': [
            {'role': 'user', 'content': '你好，请说一句话'}
        ],
        'temperature': 0.1,
    }
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}',
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        return resp.status_code, resp.text[:300]
    except Exception as e:
        return -1, str(e)[:200]

def test_native_dashscope(model):
    url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
    payload = {
        'model': model,
        'input': {
            'messages': [
                {'role': 'user', 'content': '你好，请说一句话'}
            ]
        },
        'parameters': {
            'result_format': 'message',
        }
    }
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}',
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        return resp.status_code, resp.text[:300]
    except Exception as e:
        return -1, str(e)[:200]

print('=' * 60)
print('Testing OpenAI-compatible endpoint')
print('=' * 60)
for model in models:
    status, text = test_openai_compatible(model)
    print(f'  [{model}] Status: {status}')
    if status != 200:
        print(f'    Error: {text}')
    else:
        try:
            data = json.loads(text)
            content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            print(f'    Response: {content[:100]}')
        except:
            print(f'    Raw: {text[:200]}')
    print()

print('=' * 60)
print('Testing Native DashScope endpoint')
print('=' * 60)
for model in models:
    status, text = test_native_dashscope(model)
    print(f'  [{model}] Status: {status}')
    if status != 200:
        print(f'    Error: {text}')
    else:
        try:
            data = json.loads(text)
            content = data.get('output', {}).get('choices', [{}])[0].get('message', {}).get('content', '')
            if not content:
                content = data.get('output', {}).get('text', '')
            print(f'    Response: {content[:100]}')
        except:
            print(f'    Raw: {text[:200]}')
    print()
