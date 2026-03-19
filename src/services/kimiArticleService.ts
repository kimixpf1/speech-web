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
 * 使用CORS代理获取网页内容
 */
async function fetchWithCorsProxy(url: string): Promise<string> {
  // 多个CORS代理，按优先级排序
  const corsProxies = [
    // 代理1: corsproxy.io
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // 代理2: allorigins
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    // 代理3: cors-anywhere的替代品
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  let lastError: Error | null = null;

  for (const proxyUrl of corsProxies) {
    try {
      console.log('Trying proxy:', proxyUrl.substring(0, 50) + '...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        if (text && text.length > 100) {
          console.log('Successfully fetched content, length:', text.length);
          return text;
        }
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Unknown error');
      console.log('Proxy failed:', lastError.message);
    }
  }

  throw new Error(lastError?.message || '所有代理都无法访问该网页');
}

/**
 * 清理HTML内容
 */
function cleanHtmlContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/\n+/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 使用Kimi API从网页内容提取文章
 */
export async function extractArticleWithKimi(url: string, apiKey?: string): Promise<ExtractedArticle> {
  const key = apiKey || getKimiApiKey();
  
  if (!key) {
    throw new Error('请先配置Kimi API Key');
  }

  // 获取网页内容
  let pageContent = '';
  
  try {
    pageContent = await fetchWithCorsProxy(url);
  } catch (e) {
    console.error('Failed to fetch page:', e);
    throw new Error('无法获取网页内容。请检查链接是否正确，或尝试手动粘贴网页内容。');
  }

  if (!pageContent || pageContent.length < 100) {
    throw new Error('获取的网页内容太少，请检查链接是否正确');
  }

  // 清理HTML
  const cleanContent = cleanHtmlContent(pageContent);
  
  // 截取前15000字符
  const truncatedContent = cleanContent.substring(0, 15000);

  console.log('Cleaned content length:', truncatedContent.length);

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
    console.log('Calling Kimi API...');
    
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

    console.log('API response received, parsing...');

    // 解析JSON
    let article: ExtractedArticle;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        article = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析返回的JSON');
      }
    } catch (parseError) {
      console.error('JSON解析错误:', content.substring(0, 500));
      throw new Error('解析文章内容失败，请重试');
    }

    article.url = url;

    if (!article.title || !article.fullText) {
      throw new Error('提取的内容不完整，请重试');
    }

    console.log('Article extracted successfully:', article.title);
    return article;
  } catch (error) {
    console.error('Kimi API error:', error);
    throw error;
  }
}

/**
 * 使用Kimi API从用户粘贴的内容提取文章（备用方案）
 */
export async function extractArticleFromText(content: string, url: string, apiKey?: string): Promise<ExtractedArticle> {
  const key = apiKey || getKimiApiKey();
  
  if (!key) {
    throw new Error('请先配置Kimi API Key');
  }

  if (!content || content.length < 50) {
    throw new Error('请粘贴更多内容');
  }

  const truncatedContent = content.substring(0, 15000);

  const prompt = `你是一个专业的内容提取助手。请从以下用户粘贴的网页内容中提取文章信息，要求精确、完整、准确。

来源URL: ${url}

用户粘贴的内容：
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
  "fullText": "原文全文，必须完整、一字不差地保留原文内容",
  "analysis": "解读分析，300-500字，分析文章的核心要点、重要意义和背景"
}`;

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
            content: '你是一个专业的内容提取助手。请严格按照JSON格式输出。'
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
      throw new Error(errorData.error?.message || `API请求失败`);
    }

    const data = await response.json();
    const apiContent = data.choices?.[0]?.message?.content;

    if (!apiContent) {
      throw new Error('API返回内容为空');
    }

    const jsonMatch = apiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('解析失败');
    }

    const article: ExtractedArticle = JSON.parse(jsonMatch[0]);
    article.url = url;

    return article;
  } catch (error) {
    console.error('Extract from text error:', error);
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