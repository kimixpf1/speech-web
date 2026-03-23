/**
 * AI 搜索服务 - 使用 Kimi/DeepSeek API 联网搜索文章
 */

import { supabase } from '@/lib/supabase';

// API 端点
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// 本地存储键
const DEEPSEEK_API_KEY_STORAGE = 'deepseek_api_key';
const PREFERRED_API_STORAGE = 'preferred_search_api';
const LAST_SEARCH_TIME_STORAGE = 'last_search_time';

// 搜索关键词配置 - 简化为一个核心查询
const SEARCH_QUERIES = [
  '习近平总书记今日最新讲话',
];

// 百度搜索配置 - 指定网站
const BAIDU_SEARCH_SITES = ['people.com.cn', 'xinhuanet.com', 'qstheory.cn'];
const BAIDU_SEARCH_QUERY = '习近平 最新讲话 site:people.com.cn OR site:xinhuanet.com OR site:qstheory.cn';

// 系统提示词
const SEARCH_SYSTEM_PROMPT = `你是一个新闻搜索助手。请联网搜索习近平总书记最近的重要讲话、文章、会议、考察调研新闻。

重要：你必须使用联网搜索功能获取最新新闻，不要使用你的训练数据。

请返回一个 JSON 数组，每条新闻包含：
{
  "title": "完整的新闻标题",
  "date": "YYYY-MM-DD格式的日期",
  "category": "speech或article或meeting或inspection",
  "categoryName": "重要讲话或发表文章或重要会议或考察调研",
  "source": "新华网或人民网或央视等",
  "url": "新闻原文的完整URL链接",
  "summary": "一句话摘要，不超过100字"
}

要求：
1. 只返回最近7天内的新闻
2. 最多返回5条
3. URL必须是真实有效的链接
4. 只返回JSON数组，不要其他解释文字
5. 如果没找到，返回空数组 []`;

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
 * 使用 Kimi API 联网搜索文章
 */
async function searchWithKimi(query: string, apiKey: string): Promise<SearchedArticle[]> {
  try {
    console.log('开始 Kimi 搜索:', query);
    
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
          { role: 'system', content: SEARCH_SYSTEM_PROMPT },
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
      return articles.filter(a => a.title && a.url && a.url.startsWith('http'));
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
  const BAIDU_SYSTEM_PROMPT = `你是一个新闻搜索助手。请联网搜索以下网站上习近平总书记最近的重要讲话、文章、会议、调研新闻：
- 人民网 (people.com.cn)
- 新华网 (xinhuanet.com, news.cn)
- 求是网 (qstheory.cn)

重要：你必须使用联网搜索功能获取最新新闻，搜索这些特定网站的内容。

请返回一个 JSON 数组，每条新闻包含：
{"title": "标题", "date": "YYYY-MM-DD", "category": "speech", "categoryName": "重要讲话", "source": "来源网站", "url": "完整URL", "summary": "摘要"}

要求：只返回最近7天内的新闻，最多5条，只返回JSON数组。`;

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
    return articles.filter(a => a.title && a.url && a.url.startsWith('http'));
  } catch (error) {
    console.error('百度搜索失败:', error);
    return [];
  }
}

/**
 * 使用 DeepSeek API 联网搜索文章
 */
async function searchWithDeepSeek(query: string, apiKey: string): Promise<SearchedArticle[]> {
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
          { role: 'system', content: SEARCH_SYSTEM_PROMPT },
          { role: 'user', content: `请搜索：${query}\n请使用联网搜索功能获取最新信息。` },
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
    return articles.filter(a => a.title && a.url && a.url.startsWith('http'));
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

  // 执行搜索
  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const query = SEARCH_QUERIES[i];
    onProgress?.(`正在搜索 (${i + 1}/${SEARCH_QUERIES.length}): ${query}`);

    try {
      let results: SearchedArticle[];
      if (apiUsed === 'kimi') {
        results = await searchWithKimi(query, activeKey!);
      } else {
        results = await searchWithDeepSeek(query, activeKey!);
      }

      searchDetails[`query_${i + 1}`] = {
        query,
        count: results.length,
        status: 'success',
      };

      allArticles.push(...results);
    } catch (error) {
      searchDetails[`query_${i + 1}`] = {
        query,
        count: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : '未知错误',
      };

      // 如果主 API 失败，尝试备用 API
      if (fallbackKey && apiUsed !== fallbackApi) {
        onProgress?.(`${apiUsed} 搜索失败，尝试 ${fallbackApi}...`);
        try {
          let results: SearchedArticle[];
          if (fallbackApi === 'kimi') {
            results = await searchWithKimi(query, fallbackKey);
          } else {
            results = await searchWithDeepSeek(query, fallbackKey);
          }
          allArticles.push(...results);
          searchDetails[`query_${i + 1}_fallback`] = {
            api: fallbackApi,
            count: results.length,
            status: 'success',
          };
        } catch {
          // 备用也失败，继续下一个查询
        }
      }
    }

    // 添加延迟避免限流
    if (i < SEARCH_QUERIES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 步骤2: 百度搜索（通过 Kimi 搜索指定网站）
  if (kimiApiKey) {
    onProgress?.('正在进行百度搜索（人民网/新华网/求是网）...');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 避免限流
      const baiduResults = await searchBaiduViaKimi(kimiApiKey);
      searchDetails['baidu_search'] = {
        count: baiduResults.length,
        status: 'success',
        sites: BAIDU_SEARCH_SITES,
      };
      allArticles.push(...baiduResults);
    } catch (error) {
      searchDetails['baidu_search'] = {
        count: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : '百度搜索失败',
      };
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

  const duration = (Date.now() - startTime) / 1000;

  // 写入待审核表
  if (newArticles.length > 0) {
    onProgress?.(`正在保存 ${newArticles.length} 篇新文章...`);
    await savePendingArticles(newArticles);
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
  
  const log: SearchLog = {
    executed_at: new Date().toISOString(),
    search_type: searchType,
    api_used: finalApiUsed,
    queries: SEARCH_QUERIES,
    crawl_count: allArticles.length,
    new_count: newArticles.length,
    status: logStatus,
    details: searchDetails,
    duration_seconds: Math.round(duration),
  };
  await saveSearchLog(log);

  onProgress?.('搜索完成！');

  return {
    success: true,
    articles: newArticles,
    newCount: newArticles.length,
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
