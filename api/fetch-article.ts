import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ArticleContent {
  title: string;
  date: string;
  source: string;
  summary: string;
  content: string;
  url: string;
  author?: string;
  error?: string;
}

// 从URL中提取来源名称
function extractSourceFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const sourceMap: Record<string, string> = {
      'qstheory.cn': '求是杂志',
      'people.com.cn': '人民网',
      'xinhuanet.com': '新华网',
      'news.cn': '新华网',
      'gov.cn': '中国政府网',
      'cctv.com': '央视网',
      'china.com.cn': '中国网',
      'gmw.cn': '光明网',
      'cnr.cn': '央广网',
      'china_daily.com.cn': '中国日报',
      'chinadaily.com.cn': '中国日报',
      'youth.cn': '中国青年网',
      'wenming.cn': '中国文明网',
      'zgyd.gov.cn': '中国邮政网',
    };
    
    for (const [domain, source] of Object.entries(sourceMap)) {
      if (hostname.includes(domain)) {
        return source;
      }
    }
    
    return hostname.replace('www.', '');
  } catch {
    return '未知来源';
  }
}

// 清理文本
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '-')
    .replace(/&hellip;/g, '…')
    .replace(/<[^>]+>/g, '')
    .trim();
}

// 从HTML中提取日期
function extractDateFromHtml(html: string, url: string): string {
  // 尝试从URL中提取日期
  const urlDateMatch = url.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  if (urlDateMatch) {
    return `${urlDateMatch[1]}-${urlDateMatch[2]}-${urlDateMatch[3]}`;
  }
  
  // 尝试从URL中提取日期 (格式: 20260314)
  const urlDateMatch2 = url.match(/(\d{4})(\d{2})(\d{2})/);
  if (urlDateMatch2) {
    return `${urlDateMatch2[1]}-${urlDateMatch2[2]}-${urlDateMatch2[3]}`;
  }
  
  // 常见日期格式正则
  const datePatterns = [
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,
  ];
  
  for (const pattern of datePatterns) {
    const match = html.match(pattern);
    if (match) {
      if (pattern === datePatterns[2]) {
        // MM/DD/YYYY 格式
        return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
      }
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
  }
  
  // 默认返回今天日期
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// 从HTML中提取标题
function extractTitleFromHtml(html: string): string {
  // 尝试从 og:title 或 title 标签提取
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitleMatch) {
    return cleanText(ogTitleMatch[1]);
  }
  
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    let title = cleanText(titleMatch[1]);
    // 移除常见的网站后缀
    title = title.replace(/\s*[-_|]\s*.*$/, '').trim();
    return title;
  }
  
  // 尝试从 h1 标签提取
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    return cleanText(h1Match[1]);
  }
  
  return '';
}

// 从HTML中提取正文内容
function extractContentFromHtml(html: string): string {
  // 移除脚本、样式、导航等
  let cleanedHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  
  // 尝试找到文章主体内容区域
  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*article[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id=["'][^"']*article[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];
  
  let contentHtml = '';
  for (const pattern of contentPatterns) {
    const match = cleanedHtml.match(pattern);
    if (match) {
      contentHtml = match[1];
      break;
    }
  }
  
  if (!contentHtml) {
    // 如果没找到特定区域，使用 body
    const bodyMatch = cleanedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    contentHtml = bodyMatch ? bodyMatch[1] : cleanedHtml;
  }
  
  // 提取段落文本
  const paragraphs: string[] = [];
  const pMatches = contentHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  for (const match of pMatches) {
    const text = cleanText(match[1]);
    if (text.length > 20) { // 过滤太短的段落
      paragraphs.push(text);
    }
  }
  
  // 如果没找到段落，尝试从 div 中提取
  if (paragraphs.length === 0) {
    const divMatches = contentHtml.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi);
    for (const match of divMatches) {
      const text = cleanText(match[1]);
      if (text.length > 50) {
        paragraphs.push(text);
      }
    }
  }
  
  return paragraphs.join('\n\n');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    // 验证 URL
    new URL(url);
    
    // 抓取网页
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // 提取内容
    const title = extractTitleFromHtml(html);
    const date = extractDateFromHtml(html, url);
    const source = extractSourceFromUrl(url);
    const content = extractContentFromHtml(html);
    
    // 生成摘要（取前300字）
    const summary = content.length > 300 ? content.substring(0, 300) + '...' : content;
    
    const article: ArticleContent = {
      title,
      date,
      source,
      summary,
      content,
      url,
    };
    
    return res.status(200).json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch article',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}