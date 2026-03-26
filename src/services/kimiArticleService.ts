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

  const prompt = `你是一个专业的内容提取助手。请从以下网页内容中提取文章信息。

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
  "analysis": "深度解读分析，400-600字，要求：1.有政治高度，结合习近平新时代中国特色社会主义思想分析；2.有理论深度，阐释核心要义和精神实质；3.有历史视野，结合习近平总书记之前的相关重要讲话和论述进行纵向分析；4.有实践意义，指出对推动中国式现代化的指导作用"
}

【解读分析撰写规范】
解读必须体现政治高度和理论深度，不能只是简单概括。要：
- 从政治高度阐释文章的重大意义
- 结合习近平总书记系列重要讲话精神进行关联分析
- 揭示文章蕴含的理论创新和实践要求
- 分析对推进中国式现代化的重要指导意义

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
  "analysis": "深度解读分析，400-600字，要求：1.有政治高度，结合习近平新时代中国特色社会主义思想分析；2.有理论深度，阐释核心要义和精神实质；3.有历史视野，结合习近平总书记之前的相关重要讲话和论述进行纵向分析；4.有实践意义，指出对推动中国式现代化的指导作用"
}

【解读分析撰写规范】
解读必须体现政治高度和理论深度，不能只是简单概括。要：
- 从政治高度阐释文章的重大意义
- 结合习近平总书记系列重要讲话精神进行关联分析
- 揭示文章蕴含的理论创新和实践要求
- 分析对推进中国式现代化的重要指导意义

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