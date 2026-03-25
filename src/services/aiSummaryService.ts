// AI 摘要和解读生成服务
// 基于文章URL动态生成摘要和解读分析

import { getKimiApiKey } from './kimiArticleService';

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// 缓存键前缀
const CACHE_PREFIX = 'ai_summary_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时过期

export interface GeneratedContent {
  summary: string;
  analysis: string;
  generatedAt: number;
}

/**
 * 获取缓存的生成内容
 */
function getCachedContent(articleId: string): GeneratedContent | null {
  try {
    const cacheKey = CACHE_PREFIX + articleId;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as GeneratedContent;
      // 检查是否过期
      if (Date.now() - parsed.generatedAt < CACHE_EXPIRY) {
        return parsed;
      }
      // 过期则删除
      localStorage.removeItem(cacheKey);
    }
  } catch (e) {
    console.warn('读取缓存失败:', e);
  }
  return null;
}

/**
 * 保存生成内容到缓存
 */
function saveToCache(articleId: string, content: GeneratedContent): void {
  try {
    const cacheKey = CACHE_PREFIX + articleId;
    localStorage.setItem(cacheKey, JSON.stringify(content));
  } catch (e) {
    console.warn('保存缓存失败:', e);
  }
}

/**
 * 清除缓存
 */
export function clearSummaryCache(articleId?: string): void {
  if (articleId) {
    localStorage.removeItem(CACHE_PREFIX + articleId);
  } else {
    // 清除所有摘要缓存
    Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  }
}

/**
 * 调用 Kimi API 生成摘要和解读
 */
async function generateWithKimi(
  articleContent: string,
  articleTitle: string
): Promise<{ summary: string; analysis: string }> {
  const apiKey = getKimiApiKey();
  if (!apiKey) {
    throw new Error('未配置 Kimi API Key，请在管理员后台配置');
  }

  const prompt = `你是一个专业的时政文章分析师。请根据以下文章内容，生成摘要和解读分析。

文章标题：${articleTitle}

文章内容：
${articleContent.substring(0, 8000)}

请按以下格式输出（使用JSON格式）：
{
  "summary": "文章摘要（100-200字，概括文章核心内容）",
  "analysis": "解读分析（200-300字，分析文章的主要观点、背景意义和实践指导）"
}

注意：
1. 摘要要准确概括文章核心内容，不要添加个人观点
2. 解读要分析文章的背景、意义和实践指导价值
3. 语言要简洁专业，适合政务学习场景`;

  const response = await fetch(KIMI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API调用失败');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // 尝试解析JSON
  try {
    // 提取JSON部分（可能被markdown代码块包裹）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || '生成失败',
        analysis: parsed.analysis || '生成失败',
      };
    }
  } catch (e) {
    console.warn('JSON解析失败，尝试直接提取:', e);
  }

  // 降级：直接使用返回内容作为摘要
  return {
    summary: content.substring(0, 200) || '生成失败',
    analysis: content.substring(200, 500) || '生成失败',
  };
}

/**
 * 生成文章摘要和解读
 * @param articleId 文章ID
 * @param articleUrl 文章URL（用于获取内容）
 * @param articleTitle 文章标题
 * @param articleSummary 文章现有摘要（作为备选）
 * @param forceRegenerate 是否强制重新生成
 */
export async function generateSummaryAndAnalysis(
  articleId: string,
  articleUrl: string,
  articleTitle: string,
  articleSummary?: string,
  forceRegenerate: boolean = false
): Promise<GeneratedContent> {
  // 1. 检查缓存
  if (!forceRegenerate) {
    const cached = getCachedContent(articleId);
    if (cached) {
      console.log('使用缓存的摘要和解读');
      return cached;
    }
  }

  // 2. 尝试获取文章内容
  let articleContent = '';
  try {
    // 使用CORS代理获取内容
    const corsProxies = [
      `https://corsproxy.io/?${encodeURIComponent(articleUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(articleUrl)}`,
    ];

    for (const proxyUrl of corsProxies) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          articleContent = await response.text();
          if (articleContent && articleContent.length > 100) break;
        }
      } catch (e) {
        console.log('代理获取失败:', e);
      }
    }

    // 清理HTML获取纯文本
    if (articleContent) {
      articleContent = extractTextFromHtml(articleContent);
    }
  } catch (e) {
    console.warn('获取文章内容失败:', e);
  }

  // 3. 如果没有获取到内容，使用现有摘要
  if (!articleContent || articleContent.length < 100) {
    articleContent = articleSummary || articleTitle;
  }

  // 4. 调用AI生成
  try {
    const result = await generateWithKimi(articleContent, articleTitle);
    
    const generated: GeneratedContent = {
      summary: result.summary,
      analysis: result.analysis,
      generatedAt: Date.now(),
    };

    // 保存缓存
    saveToCache(articleId, generated);

    return generated;
  } catch (e) {
    console.error('AI生成失败:', e);
    throw e;
  }
}

/**
 * 从HTML中提取纯文本
 */
function extractTextFromHtml(html: string): string {
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 移除无关元素
      const removeSelectors = [
        'script', 'style', 'nav', 'header', 'footer', 'aside',
        '.nav', '.header', '.footer', '.sidebar', '.comment', '.share',
        '.recommend', '.related', '.ad', '.advertisement',
      ];
      removeSelectors.forEach(sel => {
        doc.querySelectorAll(sel).forEach(el => el.remove());
      });

      // 查找文章正文
      const articleSelectors = [
        '.rm_txt_con', '.text_con', '#p-detail',
        '.article-content', '.article_content', '#article_content',
        '.TRS_Editor', '.content', 'article', 'main',
      ];

      for (const sel of articleSelectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent && el.textContent.trim().length > 200) {
          return el.textContent.trim()
            .replace(/\s*\n\s*/g, '\n')
            .replace(/\n{3,}/g, '\n\n');
        }
      }

      // 兜底：取body
      return doc.body?.textContent?.trim() || '';
    } catch (e) {
      console.warn('HTML解析失败:', e);
    }
  }

  // 降级：正则清理
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 检查是否配置了API Key
 */
export function isApiKeyConfigured(): boolean {
  return !!getKimiApiKey();
}