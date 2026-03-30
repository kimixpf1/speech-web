// Kimi API 服务 - 用于精准提取文章内容
import { getDeepSeekApiKey, getPreferredApi } from '@/services/aiSearchService';

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

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
  domain?: 'economy' | 'politics' | 'culture' | 'society' | 'ecology' | 'party' | 'defense' | 'diplomacy';
  domainName?: string;
}

type ArticleExtractionProvider = 'kimi' | 'deepseek';

interface ArticleExtractionApiConfig {
  apiKey: string;
  provider: ArticleExtractionProvider;
  apiUrl: string;
  model: string;
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

async function fetchPageContent(sourceUrl: string): Promise<string> {
  const requestTargets = [
    {
      label: 'source',
      url: sourceUrl,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    },
    {
      label: 'corsproxy',
      url: `https://corsproxy.io/?${encodeURIComponent(sourceUrl)}`,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    },
    {
      label: 'allorigins',
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(sourceUrl)}`,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    },
    {
      label: 'codetabs',
      url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(sourceUrl)}`,
    },
    {
      label: 'codetabs-slash',
      url: `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(sourceUrl)}`,
    },
  ];

  let lastError: Error | null = null;

  for (const target of requestTargets) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      console.log(`Trying page fetch via ${target.label}:`, target.url.substring(0, 80));

      const response = await fetch(target.url, {
        signal: controller.signal,
        headers: target.headers,
      });

      if (!response.ok) {
        lastError = new Error(`${target.label} 返回状态 ${response.status}`);
        continue;
      }

      const text = await response.text();
      if (text && text.trim().length > 100) {
        console.log(`Fetched page content via ${target.label}, length:`, text.length);
        return text;
      }

      lastError = new Error(`${target.label} 返回内容过短`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.log(`Page fetch via ${target.label} failed:`, lastError.message);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(lastError?.message || '所有网页抓取方式都失败了');
}

/**
 * 清理HTML内容 - 提取文章正文
 * 针对人民网、新华网等官方新闻网站优化
 */
function cleanHtmlContent(html: string): string {
  // 使用 DOMParser 解析 HTML（浏览器环境）
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 移除无关元素
      const removeSelectors = [
        'script', 'style', 'nav', 'header', 'footer', 'aside',
        '.nav', '.header', '.footer', '.sidebar', '.comment', '.share',
        '.recommend', '.related', '.ad', '.advertisement',
        '[class*="nav"]', '[class*="sidebar"]', '[class*="footer"]',
        '[class*="share"]', '[class*="recommend"]', '[class*="related"]',
        '[class*="comment"]', '[class*="bread"]', '[class*="crumb"]',
        '[id*="nav"]', '[id*="sidebar"]', '[id*="footer"]',
      ];
      removeSelectors.forEach(sel => {
        doc.querySelectorAll(sel).forEach(el => el.remove());
      });

      // 尝试找到文章正文容器（按优先级）
      const articleSelectors = [
        '.rm_txt_con',          // 人民网
        '.text_con',            // 人民网旧版
        '#p-detail',            // 新华网
        '.article-content',     // 通用
        '.article_content',
        '#article_content',
        '.TRS_Editor',          // 政府网站常用
        '.content',             // 通用
        'article',
        '[class*="article"]',
        '.text',
        '#text',
        'main',
      ];

      for (const sel of articleSelectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent && el.textContent.trim().length > 200) {
          // 提取段落文本
          const paragraphs = el.querySelectorAll('p');
          if (paragraphs.length > 0) {
            return Array.from(paragraphs)
              .map(p => p.textContent?.trim() || '')
              .filter(t => t.length > 0)
              .join('\n\n');
          }
          // 没有 <p> 标签时直接取 textContent
          return el.textContent.trim()
            .replace(/\s*\n\s*/g, '\n')
            .replace(/\n{3,}/g, '\n\n');
        }
      }

      // 兜底：取 body 的 textContent
      const body = doc.body;
      if (body) {
        return body.textContent?.trim()
          .replace(/\s*\n\s*/g, '\n')
          .replace(/\n{3,}/g, '\n\n') || '';
      }
    } catch (e) {
      console.warn('DOMParser 解析失败，使用正则清理:', e);
    }
  }

  // 降级：正则清理（非浏览器环境或 DOMParser 失败）
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
    .replace(/&ldquo;/g, '\u201c')
    .replace(/&rdquo;/g, '\u201d')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function extractJsonCandidate(content: string): string {
  const normalized = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (normalized.startsWith('{') && normalized.endsWith('}')) {
    return normalized;
  }

  const firstBraceIndex = normalized.indexOf('{');
  if (firstBraceIndex === -1) {
    throw new Error('无法解析返回的JSON');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = firstBraceIndex; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return normalized.slice(firstBraceIndex, index + 1);
      }
    }
  }

  throw new Error('无法解析返回的JSON');
}

function normalizeJsonStringLiterals(candidate: string): string {
  let normalized = '';
  let inString = false;
  let escaped = false;

  for (const char of candidate) {
    if (escaped) {
      normalized += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      normalized += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      normalized += char;
      inString = !inString;
      continue;
    }

    if (inString) {
      if (char === '\n') {
        normalized += '\\n';
        continue;
      }

      if (char === '\r') {
        normalized += '\\r';
        continue;
      }

      if (char === '\t') {
        normalized += '\\t';
        continue;
      }
    }

    normalized += char;
  }

  return normalized;
}

function parseExtractedArticleResponse(content: string): ExtractedArticle {
  const candidate = normalizeJsonStringLiterals(extractJsonCandidate(content))
    .replace(/,\s*([}\]])/g, '$1')
    .trim();

  return JSON.parse(candidate) as ExtractedArticle;
}

function buildArticleExtractionPrompt(url: string, pageContent: string): string {
  const truncatedContent = pageContent.substring(0, 15000);

  console.log('Cleaned content length:', truncatedContent.length);

  return `你是一个专业的内容提取助手。请从以下网页内容中提取文章信息。

网页URL: ${url}

网页内容：
${truncatedContent}

请严格按照以下JSON格式输出：

{
  "title": "文章完整标题",
  "date": "发布日期，格式为YYYY-MM-DD",
  "source": "来源，如：求是杂志、人民网、新华网等",
  "author": "作者（如果有）",
  "location": "地点（如果是考察调研类文章）",
  "category": "分类，必须是以下之一：speech（重要讲话）、article（发表文章）、meeting（重要会议）、inspection（考察调研）",
  "categoryName": "分类中文名",
  "domain": "领域，必须是以下之一：diplomacy（外交）、defense（国防）、party（党建）、ecology（生态）、culture（文化）、society（社会）、economy（经济）、politics（政治）",
  "domainName": "领域中文名",
  "summary": "文章摘要，200-300字，概述主要内容",
  "fullText": "纯净的正文内容（见下方详细要求）",
  "analysis": "深度解读分析，400-600字，必须分为三个段落，每段开头用小标题标注：\n一、政治高度：结合习近平新时代中国特色社会主义思想，阐述讲话在党和国家事业全局中的重大意义。\n二、理论深度：阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。\n三、历史贯通与实践：联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。"
}

【解读分析撰写规范】
解读必须分为三个段落，每段开头用小标题标注：
一、政治高度：结合习近平新时代中国特色社会主义思想，阐述讲话在党和国家事业全局中的重大意义。
二、理论深度：阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。
三、历史贯通与实践：联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。

【最重要】fullText正文提取规则：

必须排除的内容（绝对不能出现在fullText中）：
× 标题（不要在正文开头重复标题）
× 来源/日期/时间（如"2026年03月22日08:15"、"来源：人民网"）
× 作者信息（如"作者：XXX"）
× 编辑信息（如"责任编辑：XXX"、"编辑：XXX"）
× 来源声明（如"（来源：XXX）"、"原标题：XXX"）
× 分享按钮文字（如"分享到："、"微博"、"微信"）
× 版权声明（如"版权所有"、"未经授权"）
× 导航/面包屑（如"首页 > 政治"）
× 推荐/相关（如"相关阅读"、"推荐阅读"、"延伸阅读"）
× 广告/推广内容
× 网站固定页脚内容

正文格式要求：
1. 直接从第一段正文内容开始
2. 每个自然段之间用一个空行分隔
3. 保持段落完整，不要拆分句子
4. 正文结束于最后一段实际内容，不要包含后续的网页杂项

分类判断（按优先级）：
1. 标题含"会见"+"外国/总统/总理" → meeting（外交会见）
2. 标题含"出访/峰会" → meeting
3. 标题含"讲话/发表重要讲话/致辞" → speech
4. 标题含"《求是》/发表文章" → article
5. 标题含"考察/调研/视察" → inspection
6. 标题含"会议/座谈会/全会" → meeting

领域判断（按优先级）：
1. 标题含"外交/出访/峰会/总统/总理/国事访问/会见外国" → diplomacy（外交）
2. 标题含"军队/国防/军事/军委/强军" → defense（国防）
3. 标题含"党建/从严治党/纪检/巡视/党校" → party（党建）
4. 标题含"生态/环境/绿色/碳达峰/碳中和" → ecology（生态）
5. 标题含"文化/文明/文艺/体育" → culture（文化）
6. 标题含"民生/扶贫/乡村振兴/医疗/就业/养老" → society（社会）
7. 标题含"经济/金融/高质量发展/产业/企业/科技/创新/新质生产力/改革开放/营商环境/招商引资/项目建设/产业升级" → economy（经济）
8. 其他默认 → politics（政治）

【重要】考察调研类文章领域判断补充：
- 分类为"考察调研(inspection)"的文章，需结合内容判断领域：
- 考察地点为"科技园区/企业/工厂/开发区/产业基地/创新平台" → economy（经济）
- 考察内容涉及"科技创新/产业发展/企业经营/项目建设/营商环境" → economy（经济）
- 考察内容涉及"农业生产/乡村振兴/农民增收" → society（社会）或 economy（经济）
- 考察内容涉及"生态环境/污染治理/绿色发展" → ecology（生态）
- 考察内容涉及"文化遗产/文物保护/文化教育" → culture（文化）`;
}

function buildArticleExtractionApiConfig(
  apiKey: string,
  provider: ArticleExtractionProvider
): ArticleExtractionApiConfig {
  return {
    apiKey,
    provider,
    apiUrl: provider === 'deepseek' ? DEEPSEEK_API_URL : KIMI_API_URL,
    model: provider === 'deepseek' ? 'deepseek-chat' : 'moonshot-v1-8k',
  };
}

function resolveArticleExtractionApiConfigs(
  apiKey?: string,
  provider?: ArticleExtractionProvider
): ArticleExtractionApiConfig[] {
  const kimiApiKey = getKimiApiKey();
  const deepSeekApiKey = getDeepSeekApiKey();
  const preferredProvider = getPreferredApi();
  const configs: ArticleExtractionApiConfig[] = [];
  const seenProviders = new Set<ArticleExtractionProvider>();

  const appendConfig = (nextProvider: ArticleExtractionProvider, nextApiKey: string | null) => {
    if (!nextApiKey || seenProviders.has(nextProvider)) {
      return;
    }

    seenProviders.add(nextProvider);
    configs.push(buildArticleExtractionApiConfig(nextApiKey, nextProvider));
  };

  if (apiKey) {
    const primaryProvider = provider || 'kimi';
    appendConfig(primaryProvider, apiKey);

    if (primaryProvider === 'kimi') {
      appendConfig('deepseek', deepSeekApiKey);
    } else {
      appendConfig('kimi', kimiApiKey);
    }

    return configs;
  }

  if (preferredProvider === 'deepseek') {
    appendConfig('deepseek', deepSeekApiKey);
    appendConfig('kimi', kimiApiKey);
  } else {
    appendConfig('kimi', kimiApiKey);
    appendConfig('deepseek', deepSeekApiKey);
  }

  if (!configs.length) {
    throw new Error('请先配置 Kimi 或 DeepSeek API Key');
  }

  return configs;
}

function getProviderDisplayName(provider: ArticleExtractionProvider): string {
  return provider === 'deepseek' ? 'DeepSeek' : 'Kimi';
}

function isAuthenticationErrorMessage(message: string): boolean {
  return /authentication|api key|unauthorized|invalid key|token|余额不足|insufficient/i.test(message);
}

function normalizeArticleExtractionError(error: unknown, provider: ArticleExtractionProvider): Error {
  const message = error instanceof Error ? error.message : '未知错误';
  if (!isAuthenticationErrorMessage(message)) {
    return error instanceof Error ? error : new Error(message);
  }

  return new Error(`${getProviderDisplayName(provider)} API Key 无效或不可用，请在“管理 API”中重新配置`);
}

function shouldTryNextProvider(error: Error): boolean {
  return isAuthenticationErrorMessage(error.message);
}

async function requestArticleExtraction(
  prompt: string,
  url: string,
  apiConfig: ArticleExtractionApiConfig
): Promise<ExtractedArticle> {
  console.log(`Calling ${getProviderDisplayName(apiConfig.provider)} API...`);

  const response = await fetch(apiConfig.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: apiConfig.model,
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
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw normalizeArticleExtractionError(
      new Error(errorData.error?.message || `API请求失败: ${response.status}`),
      apiConfig.provider
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('API返回内容为空');
  }

  console.log('API response received, parsing...');

  let article: ExtractedArticle;
  try {
    article = parseExtractedArticleResponse(content);
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
}

async function requestArticleExtractionWithKimiBrowser(
  url: string,
  apiConfig: ArticleExtractionApiConfig
): Promise<ExtractedArticle> {
  const response = await fetch(apiConfig.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: 'moonshot-v1-auto',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的网页文章提取助手。请使用 web_browser 工具打开用户提供的网页，提取文章信息，并且只返回 JSON 对象。

返回格式必须是：
{
  "title": "文章完整标题",
  "date": "发布日期，格式为YYYY-MM-DD",
  "source": "来源，如：求是杂志、人民网、新华网等",
  "author": "作者（如果有）",
  "location": "地点（如果是考察调研类文章）",
  "category": "speech/article/meeting/inspection 之一",
  "categoryName": "分类中文名",
  "domain": "economy/politics/culture/society/ecology/party/defense/diplomacy 之一",
  "domainName": "领域中文名",
  "summary": "文章摘要，200-300字",
  "fullText": "纯净正文，不要包含标题、来源、日期、作者、责任编辑、相关阅读、页脚、版权和分享文案",
  "analysis": "深度解读分析，400-600字，分为三段：一、政治高度；二、理论深度；三、历史贯通与实践"
}

不要返回 markdown，不要返回解释，只返回 JSON。`
        },
        {
          role: 'user',
          content: `请打开这个网页并提取文章信息：${url}`
        }
      ],
      tools: [
        {
          type: 'builtin_function',
          function: { name: '$web_browser' },
        }
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw normalizeArticleExtractionError(
      new Error(errorData.error?.message || `API请求失败: ${response.status}`),
      apiConfig.provider
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Kimi 浏览网页后未返回内容');
  }

  const article = parseExtractedArticleResponse(content);
  article.url = url;

  if (!article.title || !article.fullText) {
    throw new Error('Kimi 浏览网页后返回的内容不完整');
  }

  return article;
}

/**
 * 使用Kimi API从网页内容提取文章
 */
export async function extractArticleWithKimi(
  url: string,
  apiKey?: string,
  provider?: ArticleExtractionProvider
): Promise<ExtractedArticle> {
  const apiConfigs = resolveArticleExtractionApiConfigs(apiKey, provider);
  let lastError: Error | null = null;
  let cachedPrompt: string | null = null;

  for (let index = 0; index < apiConfigs.length; index += 1) {
    const apiConfig = apiConfigs[index];

    try {
      if (apiConfig.provider === 'kimi') {
        try {
          return await requestArticleExtractionWithKimiBrowser(url, apiConfig);
        } catch (error) {
          const browserError = normalizeArticleExtractionError(error, apiConfig.provider);
          if (shouldTryNextProvider(browserError)) {
            throw browserError;
          }
          console.warn('Kimi web_browser 提取失败，回退到网页内容抓取模式:', browserError.message);
        }
      }

      if (!cachedPrompt) {
        let pageContent = '';

        try {
          pageContent = await fetchPageContent(url);
        } catch (error) {
          console.error('Failed to fetch page:', error);
          throw new Error('无法获取网页内容。请检查链接是否正确，或尝试手动粘贴网页内容。');
        }

        if (!pageContent || pageContent.length < 100) {
          throw new Error('获取的网页内容太少，请检查链接是否正确');
        }

        const cleanContent = cleanHtmlContent(pageContent);
        cachedPrompt = buildArticleExtractionPrompt(url, cleanContent);
      }

      return await requestArticleExtraction(cachedPrompt, url, apiConfig);
    } catch (error) {
      const normalizedError = normalizeArticleExtractionError(error, apiConfig.provider);
      console.error(`${getProviderDisplayName(apiConfig.provider)} API error:`, normalizedError);
      lastError = normalizedError;

      if (!shouldTryNextProvider(normalizedError) || index === apiConfigs.length - 1) {
        throw normalizedError;
      }
    }
  }

  throw lastError || new Error('提取文章失败，请重试');
}

/**
 * 使用Kimi API从用户粘贴的内容提取文章（备用方案）
 */
export async function extractArticleFromText(
  content: string,
  url: string,
  apiKey?: string,
  provider?: ArticleExtractionProvider
): Promise<ExtractedArticle> {
  const apiConfigs = resolveArticleExtractionApiConfigs(apiKey, provider);

  if (!content || content.length < 50) {
    throw new Error('请粘贴更多内容');
  }

  const truncatedContent = content.substring(0, 15000);

  const prompt = `你是一个专业的内容提取助手。请从以下用户粘贴的网页内容中提取文章信息。

来源URL: ${url}

用户粘贴的内容：
${truncatedContent}

请严格按照以下JSON格式输出：

{
  "title": "文章完整标题",
  "date": "发布日期，格式为YYYY-MM-DD",
  "source": "来源，如：求是杂志、人民网、新华网等",
  "author": "作者（如果有）",
  "location": "地点（如果是考察调研类文章）",
  "category": "分类，必须是以下之一：speech（重要讲话）、article（发表文章）、meeting（重要会议）、inspection（考察调研）",
  "categoryName": "分类中文名",
  "domain": "领域，必须是以下之一：diplomacy（外交）、defense（国防）、party（党建）、ecology（生态）、culture（文化）、society（社会）、economy（经济）、politics（政治）",
  "domainName": "领域中文名",
  "summary": "文章摘要，200-300字，概述主要内容",
  "fullText": "纯净的正文内容（见下方详细要求）",
  "analysis": "深度解读分析，400-600字，必须分为三个段落，每段开头用小标题标注：\n一、政治高度：结合习近平新时代中国特色社会主义思想，阐述讲话在党和国家事业全局中的重大意义。\n二、理论深度：阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。\n三、历史贯通与实践：联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。"
}

【解读分析撰写规范】
解读必须分为三个段落，每段开头用小标题标注：
一、政治高度：结合习近平新时代中国特色社会主义思想，阐述讲话在党和国家事业全局中的重大意义。
二、理论深度：阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。
三、历史贯通与实践：联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。

【最重要】fullText正文提取规则：

必须排除的内容（绝对不能出现在fullText中）：
× 标题（不要在正文开头重复标题）
× 来源/日期/时间（如"2026年03月22日08:15"、"来源：人民网"）
× 作者信息（如"作者：XXX"）
× 编辑信息（如"责任编辑：XXX"、"编辑：XXX"）
× 来源声明（如"（来源：XXX）"、"原标题：XXX"）
× 分享按钮文字（如"分享到："、"微博"、"微信"）
× 版权声明（如"版权所有"、"未经授权"）
× 导航/面包屑（如"首页 > 政治"）
× 推荐/相关（如"相关阅读"、"推荐阅读"、"延伸阅读"）
× 广告/推广内容
× 网站固定页脚内容

正文格式要求：
1. 直接从第一段正文内容开始
2. 每个自然段之间用一个空行分隔
3. 保持段落完整，不要拆分句子
4. 正文结束于最后一段实际内容，不要包含后续的网页杂项

分类判断（按优先级）：
1. 标题含"会见"+"外国/总统/总理" → meeting（外交会见）
2. 标题含"出访/峰会" → meeting
3. 标题含"讲话/发表重要讲话/致辞" → speech
4. 标题含"《求是》/发表文章" → article
5. 标题含"考察/调研/视察" → inspection
6. 标题含"会议/座谈会/全会" → meeting

领域判断（按优先级）：
1. 标题含"外交/出访/峰会/总统/总理/国事访问/会见外国" → diplomacy（外交）
2. 标题含"军队/国防/军事/军委/强军" → defense（国防）
3. 标题含"党建/从严治党/纪检/巡视/党校" → party（党建）
4. 标题含"生态/环境/绿色/碳达峰/碳中和" → ecology（生态）
5. 标题含"文化/文明/文艺/体育" → culture（文化）
6. 标题含"民生/扶贫/乡村振兴/医疗/就业/养老" → society（社会）
7. 标题含"经济/金融/高质量发展/产业/企业/科技/创新/新质生产力/改革开放/营商环境/招商引资/项目建设/产业升级" → economy（经济）
8. 其他默认 → politics（政治）

【重要】考察调研类文章领域判断补充：
- 分类为"考察调研(inspection)"的文章，需结合内容判断领域：
- 考察地点为"科技园区/企业/工厂/开发区/产业基地/创新平台" → economy（经济）
- 考察内容涉及"科技创新/产业发展/企业经营/项目建设/营商环境" → economy（经济）
- 考察内容涉及"农业生产/乡村振兴/农民增收" → society（社会）或 economy（经济）
- 考察内容涉及"生态环境/污染治理/绿色发展" → ecology（生态）
- 考察内容涉及"文化遗产/文物保护/文化教育" → culture（文化）`;

  let lastError: Error | null = null;

  for (let index = 0; index < apiConfigs.length; index += 1) {
    const apiConfig = apiConfigs[index];

    try {
      return await requestArticleExtraction(prompt, url, apiConfig);
    } catch (error) {
      const normalizedError = normalizeArticleExtractionError(error, apiConfig.provider);
      console.error('Extract from text error:', normalizedError);
      lastError = normalizedError;

      if (!shouldTryNextProvider(normalizedError) || index === apiConfigs.length - 1) {
        throw normalizedError;
      }
    }
  }

  throw lastError || new Error('提取文章失败，请重试');
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
