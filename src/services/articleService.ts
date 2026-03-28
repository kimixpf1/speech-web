import { speechesData as originalSpeechesData } from '@/data/speeches';
import type { Speech } from '@/data/speeches';

export type { Speech };

const ARTICLES_KEY = 'site_articles';
const DELETED_KEY = 'site_deleted_articles';

const SUPABASE_URL = 'https://ejeiuqcmkznfbglvbkbe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_akyDKiNsa1ZCQcqpTa-3LQ_6SYEfxGg';
const ARTICLES_TABLE = 'articles';

async function supabaseRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  
  const headers: Record<string, string> = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function getArticles(): Promise<Speech[]> {
  try {
    const response = await supabaseRequest(
      `${ARTICLES_TABLE}?select=*&order=date.desc`
    );

    if (response.ok) {
      const cloudArticles: Speech[] = await response.json();
      
      const deletedStr = localStorage.getItem(DELETED_KEY);
      const deleted: string[] = deletedStr ? JSON.parse(deletedStr) : [];
      
      let merged = [...originalSpeechesData];
      merged = merged.filter(a => !deleted.includes(a.id));
      
      cloudArticles.forEach((cloudArticle: Speech) => {
        if (!deleted.includes(cloudArticle.id)) {
          const existingIndex = merged.findIndex(a => a.id === cloudArticle.id);
          if (existingIndex !== -1) {
            merged[existingIndex] = cloudArticle;
          } else {
            merged.push(cloudArticle);
          }
        }
      });
      
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(merged));
      
      return merged;
    }
  } catch (error) {
    console.error('Failed to fetch from cloud, using local:', error);
  }
  
  return getLocalArticles();
}

function getLocalArticles(): Speech[] {
  try {
    const stored = localStorage.getItem(ARTICLES_KEY);
    let storedArticles: Speech[] = [];
    
    if (stored) {
      storedArticles = JSON.parse(stored);
    }
    
    const deletedStr = localStorage.getItem(DELETED_KEY);
    const deleted: string[] = deletedStr ? JSON.parse(deletedStr) : [];
    
    let merged = [...originalSpeechesData];
    merged = merged.filter(a => !deleted.includes(a.id));
    
    storedArticles.forEach((stored: Speech) => {
      const exists = merged.find(a => a.id === stored.id);
      if (!exists) {
        merged.push(stored);
      }
    });
    
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return merged;
  } catch {
    return [...originalSpeechesData];
  }
}

export async function saveArticles(articles: Speech[]): Promise<void> {
  try {
    localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
    
    for (const article of articles) {
      await supabaseRequest(ARTICLES_TABLE, {
        method: 'POST',
        body: JSON.stringify(article),
        headers: {
          'Prefer': 'return=minimal',
        },
      });
    }
  } catch (error) {
    console.error('保存文章失败:', error);
  }
}

function isOriginalArticle(id: string): boolean {
  return originalSpeechesData.some(a => a.id === id);
}

export async function updateArticle(updatedArticle: Speech): Promise<boolean> {
  try {
    const response = await supabaseRequest(
      `${ARTICLES_TABLE}?id=eq.${updatedArticle.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updatedArticle),
        headers: {
          'Prefer': 'return=minimal',
        },
      }
    );

    let cloudSuccess = response.ok;
    
    if (!response.ok) {
      const insertResponse = await supabaseRequest(ARTICLES_TABLE, {
        method: 'POST',
        body: JSON.stringify(updatedArticle),
        headers: {
          'Prefer': 'return=minimal',
        },
      });
      cloudSuccess = insertResponse.ok;
      if (!insertResponse.ok) {
        console.error('云端更新和插入都失败:', insertResponse.status);
      }
    }

    if (cloudSuccess) {
      const stored = localStorage.getItem(ARTICLES_KEY);
      let storedArticles: Speech[] = stored ? JSON.parse(stored) : [];
      const index = storedArticles.findIndex(a => a.id === updatedArticle.id);
      if (index !== -1) {
        storedArticles[index] = updatedArticle;
      } else {
        storedArticles.unshift(updatedArticle);
      }
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(storedArticles));
      return true;
    }
    console.error('云端更新失败，不更新本地缓存');
    return false;
  } catch (error) {
    console.error('更新文章失败:', error);
    return false;
  }
}

export async function deleteArticle(id: string): Promise<boolean> {
  try {
    await supabaseRequest(
      `${ARTICLES_TABLE}?id=eq.${id}`,
      {
        method: 'DELETE',
        headers: {
          'Prefer': 'return=minimal',
        },
      }
    );

    if (isOriginalArticle(id)) {
      const deletedStr = localStorage.getItem(DELETED_KEY);
      let deleted: string[] = deletedStr ? JSON.parse(deletedStr) : [];
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
      }
    }

    const stored = localStorage.getItem(ARTICLES_KEY);
    if (stored) {
      let storedArticles: Speech[] = JSON.parse(stored);
      storedArticles = storedArticles.filter(a => a.id !== id);
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(storedArticles));
    }

    return true;
  } catch (error) {
    console.error('删除文章失败:', error);
    return false;
  }
}

export async function addArticle(article: Speech): Promise<boolean> {
  try {
    const allArticles = await getArticles();
    
    if (allArticles.find(a => a.id === article.id)) {
      return false;
    }

    const response = await supabaseRequest(ARTICLES_TABLE, {
      method: 'POST',
      body: JSON.stringify(article),
      headers: {
        'Prefer': 'return=minimal',
      },
    });

    if (!response.ok) {
      console.error('Failed to add article to cloud');
    }

    const stored = localStorage.getItem(ARTICLES_KEY);
    let storedArticles: Speech[] = [];
    
    if (stored) {
      storedArticles = JSON.parse(stored);
    }
    
    storedArticles.unshift(article);
    localStorage.setItem(ARTICLES_KEY, JSON.stringify(storedArticles));
    
    return true;
  } catch (error) {
    console.error('添加文章失败:', error);
    return false;
  }
}

export function generateArticleId(year: number): string {
  const cached = localStorage.getItem(ARTICLES_KEY);
  const articles: Speech[] = cached ? JSON.parse(cached) : originalSpeechesData;
  const yearArticles = articles.filter(a => a.year === year);
  const maxNum = yearArticles.reduce((max, a) => {
    const num = parseInt(a.id.split('-')[1]);
    return num > max ? num : max;
  }, 0);
  return `${year}-${String(maxNum + 1).padStart(2, '0')}`;
}

export function resetArticles(): void {
  localStorage.removeItem(ARTICLES_KEY);
  localStorage.removeItem(DELETED_KEY);
}

export { getLocalArticles };