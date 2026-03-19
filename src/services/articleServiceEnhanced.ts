import { supabase } from '@/lib/supabase';
import type { Speech } from '@/data/speeches';

// 表名
const ARTICLES_TABLE = 'articles';

// 本地缓存键
const ARTICLES_CACHE_KEY = 'site_articles_cloud_cache';

// 导出类型
export type { Speech };

// 同步状态类型
export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingChanges: number;
  isSyncing: boolean;
}

// 将 Speech 对象转换为数据库格式
function toDbFormat(article: Speech): Record<string, unknown> {
  return {
    id: article.id,
    title: article.title,
    date: article.date,
    year: article.year,
    month: article.month,
    day: article.day,
    category: article.category,
    categoryname: article.categoryName,  // 数据库字段名
    source: article.source,
    location: article.location || '',
    summary: article.summary,
    url: article.url || '',
  };
}

// 将数据库格式转换为 Speech 对象
function fromDbFormat(dbArticle: Record<string, unknown>): Speech {
  return {
    id: dbArticle.id as string,
    title: dbArticle.title as string,
    date: dbArticle.date as string,
    year: dbArticle.year as number,
    month: dbArticle.month as number,
    day: dbArticle.day as number,
    category: dbArticle.category as 'speech' | 'article' | 'meeting' | 'inspection',
    categoryName: (dbArticle.categoryname || dbArticle.categoryName || '重要讲话') as string,
    source: dbArticle.source as string,
    location: (dbArticle.location || '') as string,
    summary: dbArticle.summary as string,
    url: (dbArticle.url || '') as string,
  };
}

// 保存到本地缓存
function saveLocalCache(articles: Speech[]): void {
  try {
    localStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify(articles));
    localStorage.setItem('last_sync_time', new Date().toISOString());
    console.log('Saved to local cache:', articles.length, 'articles');
  } catch (e) {
    console.error('Failed to save local cache:', e);
  }
}

// 从本地缓存读取
function getLocalCache(): Speech[] {
  try {
    const cached = localStorage.getItem(ARTICLES_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

// 从云端获取所有文章
async function fetchFromCloud(): Promise<Speech[]> {
  try {
    console.log('Fetching articles from Supabase...');
    
    const { data, error } = await supabase
      .from(ARTICLES_TABLE)
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }

    console.log('Fetched from Supabase:', data?.length || 0, 'articles');
    
    if (data && data.length > 0) {
      // 打印第一条数据的结构，便于调试
      console.log('First article from DB:', data[0]);
      return data.map(fromDbFormat);
    }

    return [];
  } catch (e) {
    console.error('Fetch from cloud error:', e);
    return [];
  }
}

// 获取所有文章（优先从云端）
export async function getArticles(): Promise<Speech[]> {
  try {
    if (navigator.onLine) {
      const cloudArticles = await fetchFromCloud();
      if (cloudArticles.length > 0) {
        saveLocalCache(cloudArticles);
        return cloudArticles;
      }
    }
  } catch (e) {
    console.error('Get articles error:', e);
  }

  // 离线或云端失败时，使用本地缓存
  const cached = getLocalCache();
  console.log('Using local cache:', cached.length, 'articles');
  return cached;
}

// 同步获取文章（用于首屏快速加载）
export function getLocalArticlesSync(): Speech[] {
  return getLocalCache();
}

// 添加文章（同步到云端）
export async function addArticle(article: Speech): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Adding article to cloud:', article.id, article.title);

    if (navigator.onLine) {
      const dbData = toDbFormat(article);
      console.log('Data to save:', dbData);
      
      const { error } = await supabase
        .from(ARTICLES_TABLE)
        .upsert(dbData, { onConflict: 'id' });

      if (error) {
        console.error('Failed to add to cloud:', error);
        return { success: false, error: error.message };
      }

      console.log('Article saved to cloud successfully');

      // 重新从云端获取最新数据
      const allArticles = await fetchFromCloud();
      saveLocalCache(allArticles);
    } else {
      // 离线时保存到本地
      const cached = getLocalCache();
      const index = cached.findIndex(a => a.id === article.id);
      if (index === -1) {
        cached.unshift(article);
      } else {
        cached[index] = article;
      }
      cached.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      saveLocalCache(cached);
    }

    return { success: true };
  } catch (e) {
    console.error('Add article error:', e);
    return { success: false, error: e instanceof Error ? e.message : '未知错误' };
  }
}

// 更新文章（同步到云端）
export async function updateArticle(article: Speech): Promise<boolean> {
  try {
    if (navigator.onLine) {
      const { error } = await supabase
        .from(ARTICLES_TABLE)
        .upsert(toDbFormat(article), { onConflict: 'id' });

      if (error) {
        console.error('Failed to update in cloud:', error);
        return false;
      }

      // 重新从云端获取最新数据
      const allArticles = await fetchFromCloud();
      saveLocalCache(allArticles);
    } else {
      // 离线时更新本地
      const cached = getLocalCache();
      const index = cached.findIndex(a => a.id === article.id);
      if (index !== -1) {
        cached[index] = article;
        cached.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        saveLocalCache(cached);
      }
    }

    return true;
  } catch (e) {
    console.error('Update article error:', e);
    return false;
  }
}

// 删除文章（从云端删除）
export async function deleteArticle(id: string): Promise<boolean> {
  try {
    if (navigator.onLine) {
      const { error } = await supabase
        .from(ARTICLES_TABLE)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete from cloud:', error);
        return false;
      }

      // 重新从云端获取最新数据
      const allArticles = await fetchFromCloud();
      saveLocalCache(allArticles);
    } else {
      // 离线时删除本地
      const cached = getLocalCache();
      const filtered = cached.filter(a => a.id !== id);
      saveLocalCache(filtered);
    }

    return true;
  } catch (e) {
    console.error('Delete article error:', e);
    return false;
  }
}

// 生成文章ID
export function generateArticleId(year: number): string {
  const cached = getLocalCache();
  const yearArticles = cached.filter(a => a.year === year);
  const maxNum = yearArticles.reduce((max, a) => {
    const match = a.id.match(new RegExp(`^${year}-(\\d+)$`));
    const num = match ? parseInt(match[1]) : 0;
    return num > max ? num : max;
  }, 0);
  return `${year}-${String(maxNum + 1).padStart(2, '0')}`;
}

// 同步文章（从云端获取最新数据）
export async function syncArticles(): Promise<Speech[]> {
  console.log('Syncing articles from cloud...');
  const articles = await getArticles();
  console.log('Sync complete:', articles.length, 'articles');
  return articles;
}

// 初始化同步
export async function initializeSync(): Promise<void> {
  const articles = await getArticles();
  saveLocalCache(articles);
}

// 设置实时订阅
export function setupRealtimeSubscription(
  onArticleChange?: (article: Speech) => void,
  onArticleDelete?: (id: string) => void
): () => void {
  const channel = supabase
    .channel('articles_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: ARTICLES_TABLE },
      (payload) => {
        console.log('Realtime event:', payload);
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          if (onArticleChange && payload.new) {
            onArticleChange(fromDbFormat(payload.new as Record<string, unknown>));
          }
        } else if (payload.eventType === 'DELETE') {
          if (onArticleDelete && payload.old) {
            onArticleDelete((payload.old as { id: string }).id);
          }
        }
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

// 同步状态相关
export function subscribeToSyncStatus(callback: (status: SyncStatus) => void): () => void {
  const lastSync = localStorage.getItem('last_sync_time');
  callback({
    isOnline: navigator.onLine,
    lastSync,
    pendingChanges: 0,
    isSyncing: false,
  });
  return () => {};
}

export function getSyncStatus(): SyncStatus {
  return {
    isOnline: navigator.onLine,
    lastSync: localStorage.getItem('last_sync_time'),
    pendingChanges: 0,
    isSyncing: false,
  };
}

export function checkOnlineStatus(): boolean {
  return navigator.onLine;
}