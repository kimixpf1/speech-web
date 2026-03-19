export interface FetchedArticle {
  title: string;
  date: string;
  source: string;
  summary: string;
  content: string;
  url: string;
  author?: string;
  error?: string;
}

/**
 * 从URL抓取文章内容
 */
export async function fetchArticleFromUrl(url: string): Promise<FetchedArticle> {
  try {
    // 验证URL格式
    new URL(url);
    
    // 调用后端API
    const response = await fetch('/api/fetch-article', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error: ${response.status}`);
    }
    
    const article: FetchedArticle = await response.json();
    
    if (article.error) {
      throw new Error(article.error);
    }
    
    return article;
  } catch (error) {
    console.error('Error fetching article:', error);
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