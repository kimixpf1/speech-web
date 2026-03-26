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

  const prompt = `你是一位资深的时政理论和党史研究专家，擅长深度解读习近平总书记重要讲话的政治高度、理论深度和实践意义。

请根据以下文章内容，生成专业的摘要和深度解读。

文章标题：${articleTitle}

文章内容：
${articleContent.substring(0, 8000)}

【摘要撰写要求】
1. 准确概括文章核心内容，150-250字
2. 提炼核心观点和关键论断
3. 不添加个人观点，客观陈述

【解读分析撰写要求】
解读必须有政治高度和理论深度，严禁简单概括！必须包含以下维度：

1. **政治高度**（100字左右）：
   - 结合习近平新时代中国特色社会主义思想分析
   - 说明讲话在党和国家事业全局中的定位
   - 体现"两个确立"的决定性意义

2. **理论深度**（150字左右）：
   - 阐释核心要义和精神实质
   - 分析其中蕴含的马克思主义立场观点方法
   - 揭示其理论创新价值和学理内涵

3. **历史贯通**（100字左右）：
   - 联系习近平总书记之前的相关重要讲话和论述
   - 分析一脉相承的思想脉络和发展演进
   - 体现习近平新时代中国特色社会主义思想的系统性完整性

4. **实践意义**（100字左右）：
   - 指出对推动中国式现代化的指导作用
   - 分析对相关领域工作的实践要求
   - 说明贯彻落实的关键着力点

请按以下JSON格式输出：
{
  "summary": "文章摘要（150-250字）",
  "analysis": "深度解读（400-600字，分四个维度展开，每个维度用小标题区分）"
}

注意：
1. 解读必须体现政治高度，不能只是简单概括文章内容
2. 必须有历史贯通分析，联系相关重要讲话
3. 语言要庄重规范，适合政务学习场景`;

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