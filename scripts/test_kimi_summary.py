# -*- coding: utf-8 -*-
"""测试Kimi API摘要生成，查看原始返回内容"""

import requests
import json

KIMI_API_KEY = "sk-cVSHv98fxGwLpCJCOuH05MZ7GdJb5gtKx8HPxAijCGKWIpom"
KIMI_API_URL = "https://api.moonshot.cn/v1/chat/completions"

def test_generate():
    """测试生成摘要"""
    
    article_title = "习近平在河北雄安新区考察并主持召开深入推进雄安新区高质量建设座谈会"
    article_content = """
    中共中央总书记、国家主席、中央军委主席习近平近日在河北雄安新区考察，
    并主持召开深入推进雄安新区高质量建设座谈会。他强调，要深入贯彻党的二十大精神，
    坚持世界眼光、国际标准、中国特色、高点定位，加快建设高水平社会主义现代化城市。
    """
    
    prompt = f"""你是一位资深的时政理论专家。

请根据以下文章内容，生成专业的摘要和深度解读。

文章标题：{article_title}

文章内容：
{article_content}

【摘要要求】150-200字，准确概括核心内容。

【解读要求】300-400字，包含：
1. 政治高度：结合习近平新时代中国特色社会主义思想分析
2. 理论深度：阐释核心要义
3. 实践意义：指出对实际工作的指导作用

请直接输出纯中文内容，格式如下（不要输出JSON）：

【摘要】
（在此写摘要内容）

【解读】
（在此写解读内容）"""

    response = requests.post(
        KIMI_API_URL,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {KIMI_API_KEY}',
        },
        json={
            'model': 'moonshot-v1-8k',
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.7,
            'max_tokens': 2000,
        }
    )
    
    print("=" * 60)
    print("HTTP状态码:", response.status_code)
    print("=" * 60)
    
    if response.ok:
        data = response.json()
        content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
        
        print("\n原始返回内容:")
        print("-" * 40)
        print(content)
        print("-" * 40)
        
        print("\n内容字符分析:")
        print(f"总长度: {len(content)} 字符")
        
        # 检查特殊字符
        special_chars = {
            '\\n': content.count('\\n'),
            '\\r': content.count('\\r'),
            '\\t': content.count('\\t'),
            '\\"': content.count('\\"'),
            '```': content.count('```'),
        }
        for char, count in special_chars.items():
            if count > 0:
                print(f"  {repr(char)}: {count}个")
    else:
        print("API调用失败:")
        print(response.text)

if __name__ == '__main__':
    test_generate()
