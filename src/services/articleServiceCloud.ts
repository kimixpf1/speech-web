import { speechesData as originalSpeechesData, type Speech } from '@/data/speeches';

const SUPABASE_URL = 'https://ejeiuqcmkznfbglvbkbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczODI0MzEsImV4cCI6MjA1Mjk1ODQzMX0.8qDzSVmZ9X0TRHz4OW8dE8J3CpJWR9rcU9x1_GwicX0';
const ARTICLES_TABLE = 'articles';

export type { Speech };

const ARTICLES_CACHE_KEY = 'site_articles_cache';
const DELETED_KEY = 'site_deleted_articles';
const LAST_SYNC_KEY = 'articles_last_sync';

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

export async function syncArticlesFromCloud(): Promise<Speech[]> {
  try {
    const response = await supabaseRequest(
      `${ARTICLES_TABLE}?select=*&order=date.desc`
    );

    if (!response.ok) {
      console.error('Failed to sync articles from cloud');
      return getLocalArticles();
    }

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
    
    localStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify(merged));
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    
    return merged;
  } catch (error) {
    console.error('Error syncing articles:', error);
    return getLocalArticles();
  }
}

function getLocalArticles(): Speech[] {
  try {
    const cached = localStorage.getItem(ARTICLES_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore
  }
  
  const deletedStr = localStorage.getItem(DELETED_KEY);
  const deleted: string[] = deletedStr ? JSON.parse(deletedStr) : [];
  
  return originalSpeechesData.filter(a => !deleted.includes(a.id));
}

export async function getArticles(): Promise<Speech[]> {
  const localArticles = getLocalArticles();
  
  syncArticlesFromCloud().catch(console.error);
  
  return localArticles;
}

export async function addArticle(article: Speech): Promise<boolean> {
  try {
    const existingArticles = await getArticles();
    if (existingArticles.find(a => a.id === article.id)) {
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

    const cached = localStorage.getItem(ARTICLES_CACHE_KEY);
    let cachedArticles: Speech[] = cached ? JSON.parse(cached) : [];
    cachedArticles.unshift(article);
    localStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify(cachedArticles));

    return true;
  } catch (error) {
    console.error('Error adding article:', error);
    return false;
  }
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

    if (!response.ok) {
      const insertResponse = await supabaseRequest(ARTICLES_TABLE, {
        method: 'POST',
        body: JSON.stringify(updatedArticle),
        headers: {
          'Prefer': 'return=minimal',
        },
      });
      
      if (!insertResponse.ok) {
        console.error('Failed to update or insert article');
      }
    }

    const cached = localStorage.getItem(ARTICLES_CACHE_KEY);
    let cachedArticles: Speech[] = cached ? JSON.parse(cached) : [];
    
    const index = cachedArticles.findIndex(a => a.id === updatedArticle.id);
    if (index !== -1) {
      cachedArticles[index] = updatedArticle;
    } else {
      cachedArticles.unshift(updatedArticle);
    }
    
    localStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify(cachedArticles));

    return true;
  } catch (error) {
    console.error('Error updating article:', error);
    return false;
  }
}

export async function deleteArticle(id: string): Promise<boolean> {
  try {
    const response = await supabaseRequest(
      `${ARTICLES_TABLE}?id=eq.${id}`,
      {
        method: 'DELETE',
        headers: {
          'Prefer': 'return=minimal',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to delete article from cloud');
    }

    const deletedStr = localStorage.getItem(DELETED_KEY);
    let deleted: string[] = deletedStr ? JSON.parse(deletedStr) : [];
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
    }

    const cached = localStorage.getItem(ARTICLES_CACHE_KEY);
    if (cached) {
      let cachedArticles: Speech[] = JSON.parse(cached);
      cachedArticles = cachedArticles.filter(a => a.id !== id);
      localStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify(cachedArticles));
    }

    return true;
  } catch (error) {
    console.error('Error deleting article:', error);
    return false;
  }
}

export function generateArticleId(year: number): string {
  const cached = localStorage.getItem(ARTICLES_CACHE_KEY);
  const articles: Speech[] = cached ? JSON.parse(cached) : originalSpeechesData;
  const yearArticles = articles.filter(a => a.year === year);
  const maxNum = yearArticles.reduce((max, a) => {
    const num = parseInt(a.id.split('-')[1]);
    return num > max ? num : max;
  }, 0);
  return `${year}-${String(maxNum + 1).padStart(2, '0')}`;
}

export function resetArticles(): void {
  localStorage.removeItem(ARTICLES_CACHE_KEY);
  localStorage.removeItem(DELETED_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}
