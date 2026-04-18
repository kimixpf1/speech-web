// Kimi API 服务 - 用于精准提取文章内容

import { getPreferredExtractionApi } from './aiSearchService';

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

type ApiProvider = 'kimi' | 'deepseek';

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
  category?: 'speech' | 'article' | 'meeting' | 'inspection' | 'call';
  categoryName?: string;
  domain?: 'economy' | 'politics' | 'culture' | 'society' | 'ecology' | 'party' | 'defense' | 'diplomacy';
  domainName?: string;
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

function getDeepSeekApiKeyLocal(): string | null {
  return localStorage.getItem('deepseek_api_key');
}

function getAvailableProviderAndKey(): { provider: ApiProvider; key: string } | null {
  const deepseekKey = getDeepSeekApiKeyLocal();
  const kimiKey = getKimiApiKey();
  const preferred = getPreferredExtractionApi();

  if (preferred === 'deepseek' && deepseekKey) {
    return { provider: 'deepseek', key: deepseekKey };
  }
  if (preferred === 'kimi' && kimiKey) {
    return { provider: 'kimi', key: kimiKey };
  }
  if (kimiKey) {
    return { provider: 'kimi', key: kimiKey };
  }
  if (deepseekKey) {
    return { provider: 'deepseek', key: deepseekKey };
  }
  return null;
}

function getApiUrl(provider: ApiProvider): string {
  return provider === 'deepseek' ? DEEPSEEK_API_URL : KIMI_API_URL;
}

function getModel(provider: ApiProvider): string {
  return provider === 'deepseek' ? 'deepseek-chat' : 'moonshot-v1-32k';
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
          console.log('Successfully fetched content via proxy, length:', text.length, 'first 200 chars:', text.substring(0, 200));
          return text;
        } else {
          console.warn('Proxy returned short content, length:', text?.length, 'first 100 chars:', text?.substring(0, 100));
        }
      } else {
        console.warn('Proxy returned status:', response.status, response.statusText);
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Unknown error');
      console.log('Proxy failed:', lastError.message);
    }
  }

  throw new Error(lastError?.message || '所有代理都无法访问该网页');
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

function extractFullTextFromHtml(html: string, title?: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const selectorsToRemove = [
    'script', 'style', 'nav', 'header', 'footer',
    '.share', '.comment', '.related', '.recommend',
    '.sidebar', '.ad', '.advertisement',
    '.breadcrumb', '.copyright', '.source',
    '.editor', '.author-info', '.page-nav',
    '[class*="share"]', '[class*="comment"]',
    '[class*="related"]', '[class*="recommend"]',
    '[id*="share"]', '[id*="comment"]',
    '[class*="footer"]', '[class*="sidebar"]',
  ];
  selectorsToRemove.forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  });

  let articleEl = doc.querySelector('.article-content')
    || doc.querySelector('.article_content')
    || doc.querySelector('.article-body')
    || doc.querySelector('.content-body')
    || doc.querySelector('.text-content')
    || doc.querySelector('.detail-content')
    || doc.querySelector('.pages_content')
    || doc.querySelector('#artContent')
    || doc.querySelector('.rm_txt_con')
    || doc.querySelector('article')
    || doc.querySelector('.post-content')
    || doc.querySelector('.entry-content')
    || doc.querySelector('.news-content')
    || doc.querySelector('.detail');

  if (!articleEl) {
    articleEl = doc.querySelector('.main') || doc.querySelector('#content') || doc.querySelector('main') || doc.body;
  }

  const paragraphs = articleEl.querySelectorAll('p, div');
  const textParts: string[] = [];

  paragraphs.forEach(p => {
    const text = p.textContent?.trim() || '';
    if (text.length < 10) return;
    if (/^(责任编辑|编辑：|记者|来源：|分享|版权|Copyright|备案|京ICP)/.test(text)) return;
    if (text === title) return;
    textParts.push(text);
  });

  if (textParts.length === 0) {
    const allText = articleEl.textContent?.trim() || '';
    return allText.replace(/\n{3,}/g, '\n\n').trim();
  }

  return textParts.join('\n\n');
}

function parseArticleJson(content: string): ExtractedArticle {
  let jsonStr = content;

  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI返回内容中未找到JSON对象');
  }

  let rawJson = jsonMatch[0];

  try {
    return JSON.parse(rawJson);
  } catch {
    const sanitized = rawJson
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
      .replace(/,\s*([}\]])/g, '$1');

    try {
      return JSON.parse(sanitized);
    } catch {
      const escaped = sanitized
        .replace(/\r\n/g, '\\n')
        .replace(/\r/g, '\\n')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');

      try {
        return JSON.parse(escaped);
      } catch (e3) {
        throw new Error(`JSON解析失败: ${e3 instanceof Error ? e3.message : String(e3)}`);
      }
    }
  }
}

/**
 * 使用 AI API 从网页内容提取文章（自动选择可用 API）
 */
export async function extractArticleWithKimi(url: string, apiKey?: string): Promise<ExtractedArticle> {
  let provider: ApiProvider = 'kimi';
  let key: string;
  
  if (apiKey) {
    key = apiKey;
    provider = 'kimi';
  } else {
    const available = getAvailableProviderAndKey();
    if (!available) {
      throw new Error('请先配置 Kimi 或 DeepSeek API Key');
    }
    provider = available.provider;
    key = available.key;
  }
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

  const prompt = `你是一个专业的内容提取助手。请从以下网页内容中提取文章的结构化信息。

网页URL: ${url}

网页内容：
${truncatedContent}

请严格按照以下JSON格式输出（不要输出fullText，正文会从原文自动获取）：

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
  "summary": "文章摘要（见下方要求）",
  "analysis": "深度解读分析（见下方要求）"
}

【摘要撰写规范】
- 150-250字，简洁明了
- 尽量使用原文关键表述和核心语句，可适当提炼压缩
- 不要生造原文没有的表述
- 涵盖：什么事、什么要求、什么目标

【解读分析撰写规范】
400-600字，必须分为三段，每段以"一、""二、""三、"开头：

一、政治高度（约150-200字）：结合习近平新时代中国特色社会主义思想，阐述在党和国家事业全局中的重大意义。

二、理论深度（约150-200字）：阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。

三、历史贯通与实践（约150-200字）：联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。

分类判断（按优先级）：
1. 标题含"会见"+"外国/总统/总理" → meeting
2. 标题含"出访/峰会" → meeting
3. 标题含"讲话/发表重要讲话/致辞" → speech
4. 标题含"《求是》/发表文章" → article
5. 标题含"考察/调研/视察" → inspection
6. 标题含"会议/座谈会/全会" → meeting

【领域判断原则】必须根据文章的**核心主题和主要内容**判断领域，而非简单匹配标题关键词。

判断方法：先通读全文理解文章主旨，再判断属于哪个领域。当文章涉及多个领域时，选择文章**篇幅最多、论述最深**的领域。

各领域典型特征（用于辅助判断）：

diplomacy（外交）：涉及国事访问、双边/多边关系、国际组织、外国领导人会见、国际条约协议
defense（国防）：涉及全军/部队/官兵/军队建设/备战打仗/军事训练/联合作战/国防动员/武器装备/实战化/军委/强军。凡是文章主旨围绕军队和军事建设的，一律归defense
party（党建）：涉及从严治党、纪检监察、巡视巡察、党员干部教育管理、党校工作、党风廉政
ecology（生态）：涉及生态环境、污染治理、绿色发展、碳达峰碳中和、生物多样性、自然资源保护
culture（文化）：涉及文化传承、文艺创作、体育、宣传思想、文明建设、文化遗产
society（社会）：涉及民生保障、教育、医疗卫生、就业、养老、社会保障、人口、社区治理
economy（经济）：涉及经济发展、产业政策、企业经营、金融市场、贸易投资、消费内需、项目建设、营商环境、改革开放、科技创新、新质生产力、数字经济、服务业、高质量发展中的经济举措

【重要】常见易错案例：
- "关于服务业发展的讲话" → economy（不是politics，因为核心议题是产业发展）
- "全军XXX会议" → defense（不是politics，因为涉及军队建设）
- "关于科技创新的讲话" → economy（不是politics，因为核心是产业和经济发展）
- "在生态环境大会上的讲话" → ecology（不是politics）
- "关于乡村振兴的讲话" → society 或 economy（不是politics）
- "在外交场合的讲话" → diplomacy（不是politics）

politics（政治）仅限于：文章主旨确实是关于政治制度、国家治理、法治建设、全过程人民民主等政治性议题，且不属于以上任何领域的情况。不要将经济、国防、外交等文章默认归为politics。`;

  try {
    console.log(`Calling ${provider === 'deepseek' ? 'DeepSeek' : 'Kimi'} API...`);
    
    const response = await fetch(getApiUrl(provider), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: getModel(provider),
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
        max_tokens: 4000,
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

    console.log(`${provider} API response received, content length:`, content.length);
    console.log('API raw response (first 500 chars):', content.substring(0, 500));

    let article: ExtractedArticle;
    try {
      article = parseArticleJson(content);
    } catch (parseError) {
      console.error('JSON解析错误:', parseError instanceof Error ? parseError.message : parseError);
      console.error('Raw content (first 800 chars):', content.substring(0, 800));
      throw new Error('解析文章内容失败，请重试（AI返回格式异常）');
    }

    article.url = url;
    article.fullText = extractFullTextFromHtml(pageContent, article.title);

    if (!article.title) {
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
  let key: string;
  let provider: ApiProvider;

  if (apiKey) {
    key = apiKey;
    provider = 'kimi';
  } else {
    const available = getAvailableProviderAndKey();
    if (!available) {
      throw new Error('请先配置 Kimi 或 DeepSeek API Key');
    }
    provider = available.provider;
    key = available.key;
  }

  if (!key) {
    throw new Error('请先配置 API Key');
  }

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

【领域判断原则】必须根据文章的**核心主题和主要内容**判断领域，而非简单匹配标题关键词。

判断方法：先通读全文理解文章主旨，再判断属于哪个领域。当文章涉及多个领域时，选择文章**篇幅最多、论述最深**的领域。

各领域典型特征（用于辅助判断）：

diplomacy（外交）：涉及国事访问、双边/多边关系、国际组织、外国领导人会见、国际条约协议
defense（国防）：涉及全军/部队/官兵/军队建设/备战打仗/军事训练/联合作战/国防动员/武器装备/实战化/军委/强军。凡是文章主旨围绕军队和军事建设的，一律归defense
party（党建）：涉及从严治党、纪检监察、巡视巡察、党员干部教育管理、党校工作、党风廉政
ecology（生态）：涉及生态环境、污染治理、绿色发展、碳达峰碳中和、生物多样性、自然资源保护
culture（文化）：涉及文化传承、文艺创作、体育、宣传思想、文明建设、文化遗产
society（社会）：涉及民生保障、教育、医疗卫生、就业、养老、社会保障、人口、社区治理
economy（经济）：涉及经济发展、产业政策、企业经营、金融市场、贸易投资、消费内需、项目建设、营商环境、改革开放、科技创新、新质生产力、数字经济、服务业、高质量发展中的经济举措

【重要】常见易错案例：
- "关于服务业发展的讲话" → economy（不是politics，因为核心议题是产业发展）
- "全军XXX会议" → defense（不是politics，因为涉及军队建设）
- "关于科技创新的讲话" → economy（不是politics，因为核心是产业和经济发展）
- "在生态环境大会上的讲话" → ecology（不是politics）
- "关于乡村振兴的讲话" → society 或 economy（不是politics）
- "在外交场合的讲话" → diplomacy（不是politics）

politics（政治）仅限于：文章主旨确实是关于政治制度、国家治理、法治建设、全过程人民民主等政治性议题，且不属于以上任何领域的情况。不要将经济、国防、外交等文章默认归为politics。`;

  try {
    const response = await fetch(getApiUrl(provider), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: getModel(provider),
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

    const article: ExtractedArticle = parseArticleJson(apiContent);
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