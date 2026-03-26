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
 * 清理AI生成的文本中的转义字符和多余空白
 */
function cleanEscapeChars(text: string | undefined | null): string {
  if (!text) return '';
  
  return text
    // 移除JSON转义字符
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    // 移除markdown代码块标记
    .replace(/```[a-z]*\s*/gi, '')
    .replace(/```/g, '')
    // 清理多余空白和空行
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

  const prompt = `你是一位资深的时政理论专家，擅长深度解读习近平总书记重要讲话。请根据以下文章内容，生成专业的摘要和深度解读。

文章标题：${articleTitle}

文章内容：
${articleContent.substring(0, 6000)}

请严格按照以下格式输出（禁止JSON，禁止英文）：

【摘要】
150-200字，准确概括文章核心内容，提炼关键论断。

【解读】
400-600字深度解读，分为三个段落（每段开头标注小标题）：

一、政治高度：结合习近平新时代中国特色社会主义思想，阐述讲话在党和国家事业全局中的重大意义。

二、理论深度：阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。

三、历史贯通与实践：联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。

严格要求：
1. 全部使用中文，禁止任何英文
2. 禁止JSON格式，禁止引号、大括号等符号
3. 解读必须分三段，每段用"一、""二、""三、"开头
4. 语言庄重规范，适合政务学习场景`;

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
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API调用失败');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // 第一步：先清理转义字符，但保留【摘要】【解读】标记
  const rawContent = cleanEscapeChars(content);
  
  // 第二步：提取摘要和解读内容
  let summary = '';
  let analysis = '';
  
  // 方法一：通过【摘要】和【解读】标记提取（最可靠）
  // 匹配【摘要】后面到【解读】之前的内容
  const summaryMatch = rawContent.match(/【摘要】[\s：:]*([\s\S]*?)(?=【解读】|$)/i);
  // 匹配【解读】后面的所有内容
  const analysisMatch = rawContent.match(/【解读】[\s：:]*([\s\S]*?)$/i);
  
  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].trim();
  }
  if (analysisMatch && analysisMatch[1]) {
    analysis = analysisMatch[1].trim();
  }
  
  // 方法二：尝试JSON解析（兼容旧格式）
  if (!summary || !analysis) {
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        summary = summary || (parsed.summary ? String(parsed.summary).trim() : '');
        analysis = analysis || (parsed.analysis ? String(parsed.analysis).trim() : '');
      }
    } catch (e) {
      // JSON解析失败，继续
    }
  }
  
  // 方法三：尝试通过"摘要""解读"关键词提取
  if (!summary || !analysis) {
    const kwSummaryMatch = rawContent.match(/摘\s*要[\s：:]*([\s\S]*?)(?=解\s*读|$)/i);
    const kwAnalysisMatch = rawContent.match(/解\s*读[\s：:]*([\s\S]*?)$/i);
    if (kwSummaryMatch && kwSummaryMatch[1]) {
      summary = summary || kwSummaryMatch[1].trim();
    }
    if (kwAnalysisMatch && kwAnalysisMatch[1]) {
      analysis = analysis || kwAnalysisMatch[1].trim();
    }
  }
  
  // 方法四：按比例分割（最终降级）
  if (!summary && !analysis && rawContent.length > 100) {
    const splitPoint = Math.min(250, Math.floor(rawContent.length * 0.3));
    summary = rawContent.substring(0, splitPoint).trim();
    analysis = rawContent.substring(splitPoint).trim();
  }
  
  return {
    summary: summary || '摘要生成失败，请重试',
    analysis: analysis || '解读生成失败，请重试',
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
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 检查是否配置了API Key
 */
export function isApiKeyConfigured(): boolean {
  return !!getKimiApiKey();
}