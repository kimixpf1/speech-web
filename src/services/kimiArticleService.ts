// Kimi API 服务 - 用于精准提取文章内容

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// 本地存储键
const KIMI_API_KEY_STORAGE = 'kimi_api_key';

export interface ExtractedArticle {
  title: string;
  date: string;
  source: string;
  summary: string;
  fullText: string;
  analysis: string;
  url: string;
  author?: string;
  location?: string;
  category?: 'speech' | 'article' | 'meeting' | 'inspection';
  categoryName?: string;
}

/**
 * 保存Kimi API Key到本地存储
 */
export function saveKimiApiKey(apiKey: string): void {
  localStorage.setItem(KIMI_API_KEY_STORAGE, apiKey);
}

/**
 * 获取Kimi API Key
 */
export function getKimiApiKey(): string | null {
  return localStorage.getItem(KIMI_API_KEY_STORAGE);
}

/**
 * 清除Kimi API Key
 */
export function clearKimiApiKey(): void {
  localStorage.removeItem(KIMI_API_KEY_STORAGE);
}

/**
 * 验证Kimi API Key是否有效
 */
export async function validateKimiApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10,
      }),
    });

    if (response.ok) {
      return { valid: true };
    } else {
      const error = await response.json();
      return { valid: false, error: error.error?.message || 'API Key无效' };
    }
  } catch (error) {
    return { valid: false, error: '网络错误，请重试' };
  }
}

/**
 * 使用Kimi API提取文章内容
 */
export async function extractArticleWithKimi(url: string, apiKey?: string): Promise<ExtractedArticle> {
  const key = apiKey || getKimiApiKey();
  
  if (!key) {
    throw new Error('请先配置Kimi API Key');
  }

  // 首先获取网页内容
  let pageContent = '';
  
  // 使用CORS代理获取网页
  const corsProxies = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
  ];
  
  for (const proxy of corsProxies) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      const response = await fetch(proxyUrl);
      if (response.ok) {
        pageContent = await response.text();
        if (pageContent && pageContent.length > 100) {
          break;
        }
      }
    } catch (e) {
      console.log(`Proxy ${proxy} failed:`, e);
    }
  }

  if (!pageContent) {
    throw new Error('无法获取网页内容，请检查链接是否正确');
  }

  // 清理HTML，提取纯文本内容
  const cleanContent = pageContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\n+/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  // 截取前15000字符（避免超出token限制）
  const truncatedContent = cleanContent.substring(0, 15000);

  const prompt = `你是一个专业的内容提取助手。请从以下网页内容中提取文章信息，要求精确、完整、准确。

网页URL: ${url}

网页内容：
${truncatedContent}

请严格按照以下JSON格式输出，不要输出任何其他内容：

{
  "title": "文章完整标题",
  "date": "发布日期，格式为YYYY-MM-DD",
  "source": "来源，如：求是杂志、人民网、新华网等",
  "author": "作者（如果有）",
  "location": "地点（如果是考察调研类文章）",
  "category": "分类，必须是以下之一：speech（重要讲话）、article（发表文章）、meeting（重要会议）、inspection（考察调研）",
  "categoryName": "分类中文名",
  "summary": "文章摘要，200-300字，概述主要内容",
  "fullText": "原文全文，必须完整、一字不差地提取原文内容，保留所有段落和格式",
  "analysis": "解读分析，300-500字，分析文章的核心要点、重要意义和背景"
}

注意事项：
1. fullText必须完整提取原文内容，不能省略或总结
2. date格式必须为YYYY-MM-DD
3. 如果无法确定某项内容，填写"未知"
4. category必须准确判断文章类型
5. 解读分析要有深度，体现文章的重要意义`;

  try {
    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的内容提取助手，擅长从网页内容中精确提取文章信息。请严格按照JSON格式输出，不要输出任何其他内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('API返回内容为空');
    }

    // 解析JSON
    let article: ExtractedArticle;
    try {
      // 尝试提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        article = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析返回的JSON');
      }
    } catch (parseError) {
      console.error('JSON解析错误:', content);
      throw new Error('解析文章内容失败，请重试');
    }

    // 添加URL
    article.url = url;

    // 验证必要字段
    if (!article.title || !article.fullText) {
      throw new Error('提取的内容不完整，请重试');
    }

    return article;
  } catch (error) {
    console.error('Kimi API error:', error);
    throw error;
  }
}

/**
 * 验证URL是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}