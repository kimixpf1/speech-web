/**
 * AI 搜索服务 - 使用 Kimi/DeepSeek API 联网搜索文章
 */

import { supabase } from '@/lib/supabase';

// API 端点
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 本地存储键
const DEEPSEEK_API_KEY_STORAGE = 'deepseek_api_key';
const PREFERRED_API_STORAGE = 'preferred_search_api';
const LAST_SEARCH_TIME_STORAGE = 'last_search_time';

// 搜索关键词配置 - 多维度搜索确保不漏
const SEARCH_QUERIES = [
  '习近平总书记今日最新讲话 文章 会议',
  '习近平 人民网 最新',
  '习近平 新华网 最新',
];

// 官方网站列表页 - 直接爬取获取真实文章
const OFFICIAL_LIST_PAGES = [
  {
    name: '人民网-讲话数据库',
    url: 'http://jhsjk.people.cn/article',
    source: '人民网',
  },
  {
    name: '人民网-时政',
    url: 'http://politics.people.com.cn/GB/1024/index.html',
    source: '人民网',
  },
  {
    name: '人民网-学习',
    url: 'http://cpc.people.com.cn/xuexi/',
    source: '人民网',
  },
  {
    name: '新华网-领导人',
    url: 'http://www.news.cn/politics/leaders/index.htm',
    source: '新华网',
  },
  {
    name: '求是网-理论',
    url: 'http://www.qstheory.cn/llwx/index.htm',
    source: '求是网',
  },
];

// 百度搜索配置 - 指定网站
const BAIDU_SEARCH_SITES = ['people.com.cn', 'xinhuanet.com', 'qstheory.cn'];
const BAIDU_SEARCH_QUERY = '习近平 最新 site:people.com.cn OR site:xinhuanet.com OR site:qstheory.cn';

// 官方来源域名白名单
const OFFICIAL_DOMAINS = [
  'people.com.cn', 'www.people.com.cn', 'jhsjk.people.cn',
  'xinhuanet.com', 'www.xinhuanet.com', 'news.cn', 'www.news.cn',
  'qstheory.cn', 'www.qstheory.cn',
  'cctv.com', 'www.cctv.com', 'cntv.cn',
  'gov.cn', 'www.gov.cn',
];

// 获取今天的日期提示词
function getTodayDatePrompt(): string {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const today = beijingTime.toISOString().split('T')[0];
  const todayCN = `${beijingTime.getFullYear()}年${beijingTime.getMonth() + 1}月${beijingTime.getDate()}日`;
  return `今天是${todayCN}（${today}）。\n\n重要：只返回${today}及之后发布的新闻，更早的新闻直接丢弃，不要返回！`;
}

// 系统提示词 - 动态生成
function getSearchSystemPrompt(): string {
  const datePrompt = getTodayDatePrompt();
  return `你是一个新闻搜索助手。${datePrompt}

请使用联网搜索功能搜索习近平总书记最近的重要讲话、文章、会议、考察调研新闻。

【最重要的规则 - URL真实性】
1. 你必须使用 $web_search 联网搜索
2. 只能返回搜索结果中明确显示的真实URL
3. 绝对禁止自己编造、拼凑、猜测URL
4. 如果搜索结果没有显示完整URL，就不要返回这条新闻
5. 宁可返回空数组[]，也不能返回任何虚假URL

【如何判断URL是否真实】
- 真实URL：搜索结果直接显示的链接，你点击后能打开的
- 虚假URL：你根据规律自己拼凑的，如 people.com.cn/n1/2026/XXXX/c1001-XXXXXXX.html
- 如果你不确定URL是否真实，就不要返回

请返回JSON数组格式，每条新闻包含：
{
  "title": "完整新闻标题",
  "date": "YYYY-MM-DD",
  "category": "speech/article/meeting/inspection",
  "categoryName": "重要讲话/发表文章/重要会议/考察调研",
  "source": "人民网/新华网/央视等",
  "url": "搜索结果中的真实URL",
  "summary": "一句话摘要"
}

要求：
1. 只返回最近3天的新闻
2. 最多5条
3. URL必须是搜索结果中真实存在的
4. 只返回JSON数组，无其他文字
5. 如果没找到或不确定URL真实性，返回空数组 []`;
}

export interface SearchedArticle {
  title: string;
  date: string;
  category: string;
  categoryName: string;
  source: string;
  url: string;
  summary: string;
}

export interface SearchLog {
  id?: string;
  executed_at: string;
  search_type: 'manual' | 'auto';
  api_used: 'kimi' | 'deepseek' | 'kimi+baidu';
  queries: string[];
  crawl_count: number;
  new_count: number;
  status: 'success' | 'partial_fail' | 'failed';
  details: Record<string, unknown>;
  duration_seconds: number;
}

export interface SearchResult {
  success: boolean;
  articles: SearchedArticle[];
  newCount: number;
  totalCount: number;
  duration: number;
  error?: string;
  apiUsed: 'kimi' | 'deepseek' | 'kimi+baidu';
}

// ============ API Key 管理 ============

export function saveDeepSeekApiKey(apiKey: string): void {
  localStorage.setItem(DEEPSEEK_API_KEY_STORAGE, apiKey);
}

export function getDeepSeekApiKey(): string | null {
  return localStorage.getItem(DEEPSEEK_API_KEY_STORAGE);
}

export function clearDeepSeekApiKey(): void {
  localStorage.removeItem(DEEPSEEK_API_KEY_STORAGE);
}

export function setPreferredApi(api: 'kimi' | 'deepseek'): void {
  localStorage.setItem(PREFERRED_API_STORAGE, api);
}

export function getPreferredApi(): 'kimi' | 'deepseek' {
  return (localStorage.getItem(PREFERRED_API_STORAGE) as 'kimi' | 'deepseek') || 'kimi';
}

export function getLastSearchTime(): number | null {
  const time = localStorage.getItem(LAST_SEARCH_TIME_STORAGE);
  return time ? parseInt(time, 10) : null;
}

export function setLastSearchTime(time: number): void {
  localStorage.setItem(LAST_SEARCH_TIME_STORAGE, time.toString());
}

export function shouldAutoSearch(): boolean {
  const lastTime = getLastSearchTime();
  if (!lastTime) return true;
  // 超过 12 小时建议搜索
  return Date.now() - lastTime > 12 * 60 * 60 * 1000;
}

// ============ API 验证 ============

export async function validateDeepSeekApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10,
      }),
    });

    if (response.ok) {
      return { valid: true };
    } else {
      const error = await response.json();
      return { valid: false, error: error.error?.message || 'API Key 无效' };
    }
  } catch (error) {
    return { valid: false, error: '网络错误，请重试' };
  }
}

// ============ 搜索功能 ============

/**
 * 验证文章有效性
 */
function validateArticle(article: SearchedArticle): { valid: boolean; reason: string } {
  // 1. 检查URL格式
  if (!article.url || !article.url.startsWith('http')) {
    return { valid: false, reason: 'URL格式无效' };
  }
  
  // 2. 检查来源是否官方
  let domain = '';
  try {
    domain = new URL(article.url).hostname.toLowerCase();
    const isOfficial = OFFICIAL_DOMAINS.some(d => domain.includes(d) || d.includes(domain));
    if (!isOfficial) {
      return { valid: false, reason: `非官方来源: ${domain}` };
    }
  } catch {
    return { valid: false, reason: 'URL解析失败' };
  }
  
  // 3. 检查日期 - 只保留前一天或当天的文章
  // 早上搜索应只保留前一天，晚上搜索应只保留当天
  if (article.date) {
    try {
      const articleDate = new Date(article.date);
      const now = new Date();
      const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const beijingHour = beijingNow.getHours();
      
      // 计算允许的日期范围
      const todayStr = beijingNow.toISOString().split('T')[0];
      const yesterday = new Date(beijingNow.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const articleDateStr = articleDate.toISOString().split('T')[0];
      
      // 根据北京时间决定允许的日期
      let allowedDates: string[];
      if (beijingHour < 12) {
        // 早上(0-12点): 只允许前一天的文章
        allowedDates = [yesterdayStr];
      } else {
        // 晚上(12-24点): 只允许当天的文章
        allowedDates = [todayStr];
      }
      
      if (!allowedDates.includes(articleDateStr)) {
        const daysDiff = Math.floor((beijingNow.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24));
        return { valid: false, reason: `日期不在范围内: ${article.date}（需要${beijingHour < 12 ? '前一天' : '当天'}的文章，距今${daysDiff}天）` };
      }
    } catch {
      // 日期解析失败，继续处理
    }
  }
  
  const url = article.url;
  
  // 4. 检查是否有明显的假URL特征
  if (url.includes('XXXXXXX') || url.includes('example') || url.includes('test')) {
    return { valid: false, reason: 'URL看起来是占位符' };
  }
  
  // 5. 检查文章ID是否像是编造的（连续数字、全相同数字等）
  const idMatch = url.match(/[c_-](\d{7,})/);
  if (idMatch) {
    const id = idMatch[1];
    // 检查是否是连续数字 (如 1234567, 12345678)
    const isSequential = /^(0123456789|1234567890|123456789|12345678|1234567)/.test(id) ||
                         /^(\d)\1{5,}$/.test(id);  // 全相同数字如 1111111
    if (isSequential) {
      return { valid: false, reason: 'URL中的文章ID看起来是编造的' };
    }
  }
  
  // 6. jhsjk.people.cn 特殊处理：讲话数据库URL格式
  if (domain.includes('jhsjk.people.cn')) {
    // 讲话数据库URL格式：/article/或直接包含article
    if (!url.includes('article')) {
      return { valid: false, reason: 'URL格式不符合讲话数据库格式' };
    }
    // 通过验证
    return { valid: true, reason: '' };
  }
  
  // 7. 人民网URL验证：检查格式和日期
  if (domain.includes('people.com.cn')) {
    // 人民网URL应该包含 /n1/YYYY/MMDD/ 或 /n1/YYYY/M/DD/ 格式
    const peopleMatch = url.match(/\/n1\/(\d{4})\/(\d{2,4})\/c\d+-(\d+)/);
    if (!peopleMatch) {
      return { valid: false, reason: 'URL格式不符合人民网真实文章格式' };
    }
    // 检查年份是否合理
    const year = parseInt(peopleMatch[1]);
    if (year < 2020 || year > 2030) {
      return { valid: false, reason: 'URL中的年份不合理' };
    }
    // 检查文章ID长度（真实ID通常是8位以上）
    const articleId = peopleMatch[3];
    if (articleId.length < 8) {
      return { valid: false, reason: '人民网文章ID长度不足' };
    }
  }
  
  // 8. 新华网URL验证
  if (domain.includes('xinhuanet.com') || domain.includes('news.cn')) {
    if (!/c_\d{8,}/.test(url) && !/\/\d{4}-\d{2}\/\d{2}\//.test(url)) {
      return { valid: false, reason: 'URL格式不符合新华网真实文章格式' };
    }
  }
  
  // 9. 求是网URL验证
  if (domain.includes('qstheory.cn')) {
    if (!/c_\d{8,}/.test(url) && !/\/\d{4}-\d{2}\/\d{2}\//.test(url)) {
      return { valid: false, reason: 'URL格式不符合求是网真实文章格式' };
    }
  }
  
  return { valid: true, reason: '' };
}

/**
 * 使用 Kimi 的 web_browser 工具真正访问 URL 验证是否可访问
 * 这是防止 AI 幻觉的最后一道防线
 */
async function verifyUrlsWithKimi(articles: SearchedArticle[], apiKey: string): Promise<SearchedArticle[]> {
  if (!articles.length || !apiKey) return [];
  
  const verifiedArticles: SearchedArticle[] = [];
  
  // 逐个验证每个 URL（确保真正访问）
  for (const article of articles) {
    try {
      console.log(`验证URL: ${article.url}`);
      
      const response = await fetch(KIMI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'moonshot-v1-auto',
          messages: [
            { 
              role: 'system', 
              content: `你是一个URL验证助手。请使用web_browser工具打开用户提供的URL，验证页面是否存在。

返回JSON格式：
{"accessible": true/false, "pageTitle": "页面标题", "reason": "原因"}

判断标准：
- accessible=true：页面正常显示新闻内容，有标题和正文
- accessible=false：404错误、页面不存在、无法加载、重定向到首页、不是新闻页面

只返回JSON，不要其他文字。`
            },
            { role: 'user', content: `请打开这个URL并告诉我页面是否存在：${article.url}` },
          ],
          tools: [
            {
              type: 'builtin_function',
              function: { name: '$web_browser' },  // 使用 web_browser 真正打开页面
            }
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        console.log(`验证请求失败: ${response.status}`);
        continue;  // 跳过这篇文章
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      console.log(`验证结果: ${content.substring(0, 200)}`);
      
      // 解析结果
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        console.log('无法解析验证结果，跳过');
        continue;
      }
      
      let result: {accessible: boolean; pageTitle?: string; reason?: string};
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch {
        console.log('JSON解析失败，跳过');
        continue;
      }
      
      if (!result.accessible) {
        console.log(`URL不可访问: ${article.title?.substring(0, 30)}... - ${result.reason}`);
        continue;
      }
      
      // 对比标题
      if (result.pageTitle) {
        const similarity = calculateTitleSimilarity(article.title, result.pageTitle);
        if (similarity < 0.3) {
          console.log(`标题不匹配: "${article.title?.substring(0, 25)}" vs "${result.pageTitle?.substring(0, 25)}" (${similarity.toFixed(2)})`);
          continue;
        }
      }
      
      console.log(`验证通过: ${article.title?.substring(0, 40)}...`);
      verifiedArticles.push(article);
      
      // 避免限流
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error(`验证异常: ${article.url}`, error);
      continue;
    }
  }
  
  console.log(`URL验证完成: ${verifiedArticles.length}/${articles.length} 通过`);
  return verifiedArticles;
}

/**
 * 计算两个标题的相似度（简单实现）
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  if (!title1 || !title2) return 0;
  
  // 清理标题：去除标点、空格，转小写
  const clean = (s: string) => s.replace(/[《》""「」『』【】\s\-_—·：:,，。.、]/g, '').toLowerCase();
  const s1 = clean(title1);
  const s2 = clean(title2);
  
  if (s1 === s2) return 1;
  
  // 检查包含关系
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // 计算公共子串长度
  let commonLen = 0;
  const shorter = s1.length < s2.length ? s1 : s2;
  const longer = s1.length < s2.length ? s2 : s1;
  
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      commonLen++;
    }
  }
  
  return commonLen / Math.max(s1.length, s2.length);
}

/**
 * 使用 Kimi API 联网搜索文章
 */
async function searchWithKimi(query: string, apiKey: string): Promise<SearchedArticle[]> {
  try {
    console.log('开始 Kimi 搜索:', query);
    const systemPrompt = getSearchSystemPrompt();
    console.log('System Prompt:', systemPrompt.substring(0, 100) + '...');
    
    // Kimi 联网搜索使用 $web_search 内置工具
    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-auto',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        tools: [{
          type: 'builtin_function',
          function: {
            name: '$web_search',
          },
        }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kimi API 响应错误:', response.status, errorText);
      throw new Error(`Kimi API 错误: ${response.status}`);
    }

    const data = await response.json();
    console.log('Kimi 返回数据:', JSON.stringify(data).substring(0, 500));
    
    const content = data.choices?.[0]?.message?.content || '';
    console.log('Kimi 返回内容:', content.substring(0, 500));

    // 提取 JSON 数组
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      console.log('Kimi 返回内容无 JSON 数组');
      return [];
    }

    try {
      const articles: SearchedArticle[] = JSON.parse(jsonMatch[0]);
      console.log('解析到文章数量:', articles.length);
      
      // 验证每篇文章
      const validArticles: SearchedArticle[] = [];
      for (const article of articles) {
        if (!article.title || !article.url || !article.url.startsWith('http')) {
          console.log('跳过无效文章:', article.title?.substring(0, 30));
          continue;
        }
        const validation = validateArticle(article);
        if (validation.valid) {
          validArticles.push(article);
        } else {
          console.log(`拒绝文章: ${article.title?.substring(0, 30)}... - ${validation.reason}`);
        }
      }
      
      console.log('验证后有效文章:', validArticles.length);
      return validArticles;
    } catch (parseError) {
      console.error('JSON 解析失败:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Kimi 搜索失败:', error);
    throw error;
  }
}

/**
 * 使用 Kimi API 搜索指定网站（模拟百度搜索）
 * 由于浏览器 CORS 限制，无法直接调用百度，通过 Kimi 联网搜索指定网站
 */
async function searchBaiduViaKimi(apiKey: string): Promise<SearchedArticle[]> {
  const datePrompt = getTodayDatePrompt();
  const BAIDU_SYSTEM_PROMPT = `你是一个新闻搜索助手。${datePrompt}

请使用联网搜索功能，在以下官方网站搜索习近平总书记最近的新闻：
- 人民网 (people.com.cn)
- 新华网 (xinhuanet.com, news.cn)
- 求是网 (qstheory.cn)

【最重要的规则 - URL真实性】
1. 你必须使用 $web_search 联网搜索
2. 只能返回搜索结果中明确显示的真实URL
3. 绝对禁止自己编造URL，如果搜索结果没显示完整URL就不返回
4. 宁可返回空数组[]，也不能返回任何虚假URL

请返回JSON数组：
{"title": "标题", "date": "YYYY-MM-DD", "category": "speech", "categoryName": "重要讲话", "source": "来源", "url": "真实URL", "summary": "摘要"}

要求：只返回最近3天新闻，最多5条，只返回JSON数组。不确定URL真实性就返回[]。`;

  try {
    console.log('开始百度搜索（via Kimi）...');
    
    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-auto',
        messages: [
          { role: 'system', content: BAIDU_SYSTEM_PROMPT },
          { role: 'user', content: BAIDU_SEARCH_QUERY },
        ],
        tools: [{
          type: 'builtin_function',
          function: { name: '$web_search' },
        }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('百度搜索 API 错误:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('百度搜索返回:', content.substring(0, 300));

    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return [];

    const articles: SearchedArticle[] = JSON.parse(jsonMatch[0]);
    console.log('百度搜索找到:', articles.length, '篇');
    
    // 验证文章
    const validArticles: SearchedArticle[] = [];
    for (const article of articles) {
      if (!article.title || !article.url || !article.url.startsWith('http')) continue;
      const validation = validateArticle(article);
      if (validation.valid) {
        validArticles.push(article);
      } else {
        console.log(`百度搜索拒绝: ${article.title?.substring(0, 30)}... - ${validation.reason}`);
      }
    }
    
    console.log('百度搜索验证后:', validArticles.length, '篇');
    return validArticles;
  } catch (error) {
    console.error('百度搜索失败:', error);
    return [];
  }
}

/**
 * 直接爬取官方网站列表页获取文章（最可靠的方式）
 * 通过 Kimi 的 web_browser 工具访问列表页，提取习近平相关文章
 */
async function crawlOfficialListPages(apiKey: string): Promise<SearchedArticle[]> {
  const allArticles: SearchedArticle[] = [];
  const datePrompt = getTodayDatePrompt();
  
  for (const page of OFFICIAL_LIST_PAGES) {
    try {
      console.log(`爬取官方列表页: ${page.name} - ${page.url}`);
      
      const response = await fetch(KIMI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'moonshot-v1-auto',
          messages: [
            { 
              role: 'system', 
              content: `你是一个网页数据提取助手。${datePrompt}

请使用 web_browser 工具打开用户提供的网页，从页面中提取与"习近平"相关的最新新闻文章。

提取要求：
1. 只提取标题中包含"习近平"的文章
2. 只提取最近3天内的文章
3. 必须提取文章的真实完整URL（从页面链接中获取）
4. 最多提取5篇

返回JSON数组格式：
[
  {
    "title": "完整标题",
    "date": "YYYY-MM-DD",
    "url": "文章的完整URL",
    "summary": "一句话摘要（如果有）"
  }
]

只返回JSON数组，不要其他文字。如果没有找到相关文章，返回空数组[]。`
            },
            { role: 'user', content: `请打开这个页面并提取习近平相关的最新文章：${page.url}` },
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
        console.error(`爬取 ${page.name} 失败:`, response.status);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      console.log(`${page.name} 返回:`, content.substring(0, 300));

      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        console.log(`${page.name} 无有效数据`);
        continue;
      }

      try {
        const articles = JSON.parse(jsonMatch[0]);
        console.log(`${page.name} 提取到 ${articles.length} 篇文章`);
        
        for (const article of articles) {
          if (!article.title || !article.url) continue;
          
          // 补充来源和分类信息
          const searchedArticle: SearchedArticle = {
            title: article.title,
            date: article.date || new Date().toISOString().split('T')[0],
            category: detectCategory(article.title),
            categoryName: detectCategoryName(article.title),
            source: page.source,
            url: article.url,
            summary: article.summary || article.title,
          };
          
          // 验证文章
          const validation = validateArticle(searchedArticle);
          if (validation.valid) {
            allArticles.push(searchedArticle);
            console.log(`  ✓ ${article.title.substring(0, 40)}...`);
          } else {
            console.log(`  ✗ ${article.title.substring(0, 30)}... - ${validation.reason}`);
          }
        }
      } catch (e) {
        console.error(`解析 ${page.name} 数据失败:`, e);
      }
      
      // 避免限流
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`爬取 ${page.name} 异常:`, error);
    }
  }
  
  console.log(`官方列表页爬取完成，共 ${allArticles.length} 篇`);
  return allArticles;
}

/**
 * 根据标题检测文章分类
 */
function detectCategory(title: string): string {
  if (title.includes('讲话') || title.includes('致辞') || title.includes('演讲')) return 'speech';
  if (title.includes('文章') || title.includes('发表')) return 'article';
  if (title.includes('会议') || title.includes('会见') || title.includes('会谈')) return 'meeting';
  if (title.includes('考察') || title.includes('调研') || title.includes('视察')) return 'inspection';
  return 'speech';
}

/**
 * 根据标题检测分类名称
 */
function detectCategoryName(title: string): string {
  if (title.includes('讲话') || title.includes('致辞') || title.includes('演讲')) return '重要讲话';
  if (title.includes('文章') || title.includes('发表')) return '发表文章';
  if (title.includes('会议') || title.includes('会见') || title.includes('会谈')) return '重要会议';
  if (title.includes('考察') || title.includes('调研') || title.includes('视察')) return '考察调研';
  return '重要讲话';
}

/**
 * 使用 DeepSeek API 联网搜索文章
 * 注意：DeepSeek 不支持真正的联网搜索，仅返回训练数据
 */
async function searchWithDeepSeek(query: string, apiKey: string): Promise<SearchedArticle[]> {
  console.warn('DeepSeek 不支持联网搜索，建议使用 Kimi');
  const systemPrompt = getSearchSystemPrompt();
  
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请搜索：${query}` },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API 错误: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('DeepSeek 返回内容无 JSON:', content.substring(0, 200));
      return [];
    }

    const articles: SearchedArticle[] = JSON.parse(jsonMatch[0]);
    
    // 验证文章
    const validArticles: SearchedArticle[] = [];
    for (const article of articles) {
      if (!article.title || !article.url || !article.url.startsWith('http')) continue;
      const validation = validateArticle(article);
      if (validation.valid) {
        validArticles.push(article);
      } else {
        console.log(`DeepSeek拒绝: ${article.title?.substring(0, 30)}... - ${validation.reason}`);
      }
    }
    
    return validArticles;
  } catch (error) {
    console.error('DeepSeek 搜索失败:', error);
    throw error;
  }
}

/**
 * 获取已存在的文章 URL 和标题（用于去重）
 */
async function getExistingArticles(): Promise<{ urls: Set<string>; titles: Set<string> }> {
  const urls = new Set<string>();
  const titles = new Set<string>();

  // 从 pending_articles 获取
  const { data: pendingData } = await supabase
    .from('pending_articles')
    .select('url, title')
    .limit(1000);

  if (pendingData) {
    pendingData.forEach(row => {
      if (row.url) urls.add(row.url);
      if (row.title) titles.add(row.title);
    });
  }

  // 从 articles 获取（如果表存在）
  const { data: articlesData } = await supabase
    .from('articles')
    .select('url, title')
    .limit(1000);

  if (articlesData) {
    articlesData.forEach(row => {
      if (row.url) urls.add(row.url);
      if (row.title) titles.add(row.title);
    });
  }

  return { urls, titles };
}

/**
 * 检查标题是否重复（模糊匹配）
 */
function isTitleDuplicate(title: string, existingTitles: Set<string>): boolean {
  const cleanTitle = title.trim();
  if (existingTitles.has(cleanTitle)) return true;

  // 简化标题后比较
  const simplify = (t: string) => t.replace(/[《》""「」『』【】\s]/g, '');
  const simplified = simplify(cleanTitle);

  for (const existing of existingTitles) {
    const existingSimplified = simplify(existing);
    if (simplified === existingSimplified) return true;
    // 包含关系检查
    if (simplified.length > 10 && existingSimplified.length > 10) {
      if (simplified.includes(existingSimplified) || existingSimplified.includes(simplified)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 执行完整的文章搜索流程
 */
export async function searchArticles(
  kimiApiKey: string | null,
  deepSeekApiKey: string | null,
  searchType: 'manual' | 'auto' = 'manual',
  onProgress?: (message: string) => void
): Promise<SearchResult> {
  const startTime = Date.now();
  const preferredApi = getPreferredApi();
  let apiUsed: 'kimi' | 'deepseek' = preferredApi;
  let allArticles: SearchedArticle[] = [];
  const searchDetails: Record<string, unknown> = {};

  onProgress?.('正在获取已有文章列表...');

  // 获取已有文章用于去重
  const { urls: existingUrls, titles: existingTitles } = await getExistingArticles();
  searchDetails['existing_count'] = existingUrls.size;

  // 选择 API
  const primaryKey = preferredApi === 'kimi' ? kimiApiKey : deepSeekApiKey;
  const fallbackKey = preferredApi === 'kimi' ? deepSeekApiKey : kimiApiKey;
  const fallbackApi = preferredApi === 'kimi' ? 'deepseek' : 'kimi';

  if (!primaryKey && !fallbackKey) {
    return {
      success: false,
      articles: [],
      newCount: 0,
      totalCount: 0,
      duration: (Date.now() - startTime) / 1000,
      error: '请先配置 Kimi 或 DeepSeek API Key',
      apiUsed,
    };
  }

  const activeKey = primaryKey || fallbackKey;
  if (!primaryKey && fallbackKey) {
    apiUsed = fallbackApi;
  }

  // ========== 步骤1: 直接爬取官方网站列表页（最可靠） ==========
  if (kimiApiKey) {
    onProgress?.('正在爬取官方网站列表页（人民网讲话数据库/时政/新华网/求是网）...');
    try {
      const officialResults = await crawlOfficialListPages(kimiApiKey);
      searchDetails['official_crawl'] = {
        count: officialResults.length,
        status: 'success',
        pages: OFFICIAL_LIST_PAGES.map(p => p.name),
      };
      allArticles.push(...officialResults);
      onProgress?.(`官方列表页找到 ${officialResults.length} 篇文章`);
    } catch (error) {
      searchDetails['official_crawl'] = {
        count: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : '爬取失败',
      };
    }
  }

  // ========== 步骤2: AI 联网搜索（补充） ==========
  // 只有在官方列表页没找到文章时才执行 AI 搜索
  if (allArticles.length === 0) {
    onProgress?.('官方列表页无结果，启用AI补充搜索...');
    
    for (let i = 0; i < SEARCH_QUERIES.length; i++) {
      const query = SEARCH_QUERIES[i];
      onProgress?.(`AI搜索 (${i + 1}/${SEARCH_QUERIES.length}): ${query}`);

      try {
        let results: SearchedArticle[];
        if (apiUsed === 'kimi') {
          results = await searchWithKimi(query, activeKey!);
        } else {
          results = await searchWithDeepSeek(query, activeKey!);
        }

        searchDetails[`ai_query_${i + 1}`] = {
          query,
          count: results.length,
          status: 'success',
        };

        allArticles.push(...results);
      } catch (error) {
        searchDetails[`ai_query_${i + 1}`] = {
          query,
          count: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : '未知错误',
        };
      }

      // 添加延迟避免限流
      if (i < SEARCH_QUERIES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 只对 AI 搜索的结果进行 URL 验证
    if (allArticles.length > 0 && kimiApiKey) {
      onProgress?.(`正在验证 AI 搜索结果的 URL 可访问性...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const verifiedAiArticles = await verifyUrlsWithKimi(allArticles, kimiApiKey);
      searchDetails['ai_url_verify'] = {
        before: allArticles.length,
        after: verifiedAiArticles.length,
        filtered: allArticles.length - verifiedAiArticles.length,
      };
      allArticles = verifiedAiArticles;
    }
  }

  onProgress?.('正在去重...');

  // 去重
  const seenUrls = new Set<string>();
  const newArticles: SearchedArticle[] = [];

  for (const article of allArticles) {
    if (!article.url || !article.title) continue;
    if (existingUrls.has(article.url)) continue;
    if (seenUrls.has(article.url)) continue;
    if (isTitleDuplicate(article.title, existingTitles)) continue;

    seenUrls.add(article.url);
    newArticles.push(article);
  }

  // 官方列表页爬取的 URL 是真实的，不需要再验证
  const verifiedArticles = newArticles;

  const duration = (Date.now() - startTime) / 1000;

  // 写入待审核表
  if (verifiedArticles.length > 0) {
    onProgress?.(`正在保存 ${verifiedArticles.length} 篇新文章...`);
    await savePendingArticles(verifiedArticles);
  }

  // 更新最后搜索时间
  setLastSearchTime(Date.now());

  // 写入搜索日志
  // status 定义：success=搜索成功完成，partial_fail=部分API失败，failed=全部API失败
  const hasApiError = Object.values(searchDetails).some(
    (detail: any) => detail?.status === 'failed'
  );
  const allApiFailed = Object.values(searchDetails).every(
    (detail: any) => detail?.status === 'failed' || detail?.status === undefined
  );
  
  let logStatus: 'success' | 'partial_fail' | 'failed' = 'success';
  if (allApiFailed && SEARCH_QUERIES.length > 0) {
    logStatus = 'failed';
  } else if (hasApiError) {
    logStatus = 'partial_fail';
  }
  
  // 判断是否使用了百度搜索
  const usedBaidu = searchDetails['baidu_search'] && (searchDetails['baidu_search'] as any).status === 'success';
  const finalApiUsed: 'kimi' | 'deepseek' | 'kimi+baidu' = usedBaidu && apiUsed === 'kimi' ? 'kimi+baidu' : apiUsed;
  
  // 获取北京时间字符串（ISO 格式带时区信息）
  const getBeijingTime = () => {
    const now = new Date();
    // getTime() 返回的是 UTC 时间戳，直接加 8 小时得到北京时间
    const beijingMs = now.getTime() + 8 * 60 * 60 * 1000;
    const beijingDate = new Date(beijingMs);
    
    // 使用 UTC 方法获取北京时间数值
    const year = beijingDate.getUTCFullYear();
    const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingDate.getUTCDate()).padStart(2, '0');
    const hours = String(beijingDate.getUTCHours()).padStart(2, '0');
    const minutes = String(beijingDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(beijingDate.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
  };

  const log: SearchLog = {
    executed_at: getBeijingTime(),
    search_type: searchType,
    api_used: finalApiUsed,
    queries: SEARCH_QUERIES,
    crawl_count: allArticles.length,
    new_count: verifiedArticles.length,
    status: logStatus,
    details: { ...searchDetails, filtered_by_url_check: newArticles.length - verifiedArticles.length },
    duration_seconds: Math.round(duration),
  };
  await saveSearchLog(log);

  onProgress?.('搜索完成！');

  return {
    success: true,
    articles: verifiedArticles,
    newCount: verifiedArticles.length,
    totalCount: allArticles.length,
    duration,
    apiUsed: finalApiUsed,
  };
}

/**
 * 保存待审核文章到 Supabase
 */
async function savePendingArticles(articles: SearchedArticle[]): Promise<void> {
  console.log('准备保存文章数量:', articles.length);
  
  const rows = articles.map(article => {
    // 解析日期
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    let day = new Date().getDate();

    const dateMatch = article.date?.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dateMatch) {
      year = parseInt(dateMatch[1]);
      month = parseInt(dateMatch[2]);
      day = parseInt(dateMatch[3]);
    }

    return {
      id: crypto.randomUUID(),
      title: article.title,
      date: article.date || `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      year,
      month,
      day,
      category: article.category || 'speech',
      categoryname: article.categoryName || '重要讲话',
      source: article.source || '官方媒体',
      url: article.url,
      summary: article.summary || article.title,
      status: 'pending',
      discovered_by: 'ai_search',
      fetched_at: new Date().toISOString(),
    };
  });

  console.log('保存文章数据:', JSON.stringify(rows[0]));

  const { data, error } = await supabase
    .from('pending_articles')
    .insert(rows)
    .select();

  if (error) {
    console.error('保存待审核文章失败:', error.message, error.details, error.hint);
    throw new Error(`保存文章失败: ${error.message}`);
  } else {
    console.log('保存文章成功:', data?.length || 0, '条');
  }
}

/**
 * 保存搜索日志到 Supabase
 * 注意：表中只有 executed_at, crawl_count, search_count, new_count, status, details, duration_seconds 列
 */
async function saveSearchLog(log: SearchLog): Promise<void> {
  console.log('保存搜索日志:', JSON.stringify(log));
  
  // 把额外信息放到 details 中，因为表中没有 search_type, api_used, queries 列
  const detailsWithExtra = {
    ...log.details,
    search_type: log.search_type,
    api_used: log.api_used,
    queries: log.queries,
  };
  
  const { data, error } = await supabase
    .from('search_logs')
    .insert({
      executed_at: log.executed_at,
      crawl_count: log.crawl_count,
      search_count: log.crawl_count,  // 复用 crawl_count
      new_count: log.new_count,
      status: log.status,
      details: detailsWithExtra,
      duration_seconds: log.duration_seconds,
    })
    .select();

  if (error) {
    console.error('保存搜索日志失败:', error.message, error.details, error.hint);
  } else {
    console.log('保存日志成功:', data);
  }
}

/**
 * 获取最近的搜索日志
 */
export async function getRecentSearchLogs(limit = 10): Promise<SearchLog[]> {
  const { data, error } = await supabase
    .from('search_logs')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取搜索日志失败:', error);
    return [];
  }

  return data || [];
}

/**
 * 获取今日搜索统计
 */
export async function getTodaySearchStats(): Promise<{
  runCount: number;
  totalFound: number;
  totalNew: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('search_logs')
    .select('crawl_count, new_count')
    .gte('executed_at', today.toISOString());

  if (error || !data) {
    return { runCount: 0, totalFound: 0, totalNew: 0 };
  }

  return {
    runCount: data.length,
    totalFound: data.reduce((sum, log) => sum + (log.crawl_count || 0), 0),
    totalNew: data.reduce((sum, log) => sum + (log.new_count || 0), 0),
  };
}