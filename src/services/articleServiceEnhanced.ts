import { type RealtimeChannel } from '@supabase/supabase-js'
import { speechesData as originalSpeechesData, type Speech } from '@/data/speeches';
import { supabase } from '@/lib/supabase';

// 表名
const ARTICLES_TABLE = 'articles';

// 本地存储键
const ARTICLES_CACHE_KEY = 'site_articles_cache_v3';
const DELETED_ARTICLES_KEY = 'site_deleted_articles_v3';

// 导出类型
export type { Speech };

// 同步状态类型
export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingChanges: number;
  isSyncing: boolean;
}

// 同步状态监听器
let syncStatusListeners: ((status: SyncStatus) => void)[] = [];
let realtimeChannel: RealtimeChannel | null = null;
let currentSyncStatus: SyncStatus = {
  isOnline: navigator.onLine,
  lastSync: null,
  pendingChanges: 0,
  isSyncing: false,
};

// 更新同步状态
function updateSyncStatus(updates: Partial<SyncStatus>) {
  currentSyncStatus = { ...currentSyncStatus, ...updates };
  syncStatusListeners.forEach(listener => listener(currentSyncStatus));
}

// 订阅同步状态变化
export function subscribeToSyncStatus(callback: (status: SyncStatus) => void): () => void {
  syncStatusListeners.push(callback);
  callback(currentSyncStatus);
  return () => {
    syncStatusListeners = syncStatusListeners.filter(l => l !== callback);
  };
}

// 获取当前同步状态
export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

// 检查网络状态
export function checkOnlineStatus(): boolean {
  const isOnline = navigator.onLine;
  updateSyncStatus({ isOnline });
  return isOnline;
}

// 监听网络状态变化
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    updateSyncStatus({ isOnline: true });
  });
  window.addEventListener('offline', () => {
    updateSyncStatus({ isOnline: false });
  });
}

// 将 Speech 对象转换为数据库格式（字段名映射）
function toDbFormat(article: Speech): Record<string, unknown> {
  const { categoryName, ...rest } = article;
  return {
    ...rest,
    categoryname: categoryName, // 数据库使用小写
  };
}

// 将数据库格式转换为 Speech 对象
function fromDbFormat(dbArticle: Record<string, unknown>): Speech {
  const { categoryname, ...rest } = dbArticle;
  return {
    ...rest,
    categoryName: categoryname as string,
  } as Speech;
}

// 获取本地缓存的文章（同步方法，导出供详情页使用）
export function getLocalArticlesSync(): Speech[] {
  try {
    const cached = localStorage.getItem(ARTICLES_CACHE_KEY);
    const deletedStr = localStorage.getItem(DELETED_ARTICLES_KEY);
    const deleted: string[] = deletedStr ? JSON.parse(deletedStr) : [];

    let articles: Speech[] = cached ? JSON.parse(cached) : [];

    // 如果本地缓存为空，使用原始数据
    if (articles.length === 0) {
      articles = [...originalSpeechesData];
    }

    // 过滤掉已删除的文章
    articles = articles.filter(a => !deleted.includes(a.id));

    // 按日期排序
    articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return articles;
  } catch (error) {
    console.error('Error reading local articles:', error);
    return [...originalSpeechesData];
  }
}

// 获取本地缓存的文章（内部使用）
function getLocalArticles(): Speech[] {
  return getLocalArticlesSync();
}

// 保存文章到本地缓存
function saveLocalArticles(articles: Speech[]): void {
  try {
    localStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify(articles));
  } catch (error) {
    console.error('Error saving local articles:', error);
  }
}

// 从云端获取所有文章
async function fetchCloudArticles(): Promise<Speech[]> {
  try {
    const { data, error } = await supabase
      .from(ARTICLES_TABLE)
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching cloud articles:', error);
      return [];
    }

    // 映射字段名
    return (data || []).map(fromDbFormat);
  } catch (error) {
    console.error('Error in fetchCloudArticles:', error);
    return [];
  }
}

// 合并本地和云端文章
function mergeArticles(cloudArticles: Speech[]): Speech[] {
  const deletedStr = localStorage.getItem(DELETED_ARTICLES_KEY);
  const deleted: string[] = deletedStr ? JSON.parse(deletedStr) : [];

  const merged = new Map<string, Speech>();

  // 先添加原始数据
  originalSpeechesData.forEach(article => {
    if (!deleted.includes(article.id)) {
      merged.set(article.id, article);
    }
  });

  // 合并云端文章（云端数据优先级更高）
  cloudArticles.forEach(article => {
    if (!deleted.includes(article.id)) {
      merged.set(article.id, article);
    }
  });

  return Array.from(merged.values()).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// 同步文章（从云端获取并合并）
export async function syncArticles(): Promise<Speech[]> {
  updateSyncStatus({ isSyncing: true });

  try {
    if (!navigator.onLine) {
      updateSyncStatus({ isSyncing: false });
      return getLocalArticles();
    }

    // 从云端获取文章
    const cloudArticles = await fetchCloudArticles();

    // 合并文章
    const merged = mergeArticles(cloudArticles);

    // 保存到本地
    saveLocalArticles(merged);

    // 更新最后同步时间
    const now = new Date().toISOString();
    localStorage.setItem('articles_last_sync', now);
    updateSyncStatus({ lastSync: now, isSyncing: false });

    return merged;
  } catch (error) {
    console.error('Error syncing articles:', error);
    updateSyncStatus({ isSyncing: false });
    return getLocalArticles();
  }
}

// 获取所有文章
export async function getArticles(): Promise<Speech[]> {
  // 如果在线，先同步云端数据
  if (navigator.onLine) {
    try {
      return await syncArticles();
    } catch (error) {
      console.error('Failed to sync articles:', error);
    }
  }

  // 离线或同步失败时，返回本地缓存
  return getLocalArticles();
}

// 添加文章
export async function addArticle(article: Speech): Promise<boolean> {
  try {
    // 保存到云端（使用 upsert）
    if (navigator.onLine) {
      const { error } = await supabase
        .from(ARTICLES_TABLE)
        .upsert(toDbFormat(article), { onConflict: 'id' });

      if (error) {
        console.error('Failed to add article to cloud:', error);
        return false;
      }
      console.log('Article added to cloud:', article.id);
    }

    // 更新本地缓存
    const articles = getLocalArticles();
    const existingIndex = articles.findIndex(a => a.id === article.id);
    if (existingIndex === -1) {
      articles.unshift(article);
    } else {
      articles[existingIndex] = article;
    }
    saveLocalArticles(articles);

    return true;
  } catch (error) {
    console.error('Error adding article:', error);
    return false;
  }
}

// 更新文章
export async function updateArticle(updatedArticle: Speech): Promise<boolean> {
  try {
    // 更新云端（使用 upsert）
    if (navigator.onLine) {
      const { error } = await supabase
        .from(ARTICLES_TABLE)
        .upsert(toDbFormat(updatedArticle), { onConflict: 'id' });

      if (error) {
        console.error('Failed to update article in cloud:', error);
        return false;
      }
      console.log('Article updated in cloud:', updatedArticle.id);
    }

    // 更新本地缓存
    const articles = getLocalArticles();
    const index = articles.findIndex(a => a.id === updatedArticle.id);

    if (index !== -1) {
      articles[index] = updatedArticle;
    } else {
      articles.unshift(updatedArticle);
    }

    saveLocalArticles(articles);

    return true;
  } catch (error) {
    console.error('Error updating article:', error);
    return false;
  }
}

// 删除文章
export async function deleteArticle(id: string): Promise<boolean> {
  try {
    // 从云端删除
    if (navigator.onLine) {
      const { error } = await supabase
        .from(ARTICLES_TABLE)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete article from cloud:', error);
        // 继续删除本地，即使云端删除失败
      } else {
        console.log('Article deleted from cloud:', id);
      }
    }

    // 记录已删除
    const deletedStr = localStorage.getItem(DELETED_ARTICLES_KEY);
    const deleted: string[] = deletedStr ? JSON.parse(deletedStr) : [];

    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem(DELETED_ARTICLES_KEY, JSON.stringify(deleted));
    }

    // 更新本地缓存
    const articles = getLocalArticles();
    const filtered = articles.filter(a => a.id !== id);
    saveLocalArticles(filtered);

    return true;
  } catch (error) {
    console.error('Error deleting article:', error);
    return false;
  }
}

// 生成文章ID
export function generateArticleId(year: number): string {
  const articles = getLocalArticles();
  const yearArticles = articles.filter(a => a.year === year);
  const maxNum = yearArticles.reduce((max, a) => {
    const match = a.id.match(new RegExp(`^${year}-(\\d+)$`));
    const num = match ? parseInt(match[1]) : 0;
    return num > max ? num : max;
  }, 0);
  return `${year}-${String(maxNum + 1).padStart(2, '0')}`;
}

// 重置所有文章
export function resetArticles(): void {
  localStorage.removeItem(ARTICLES_CACHE_KEY);
  localStorage.removeItem(DELETED_ARTICLES_KEY);
  localStorage.removeItem('articles_last_sync');
  updateSyncStatus({ lastSync: null, pendingChanges: 0 });
}

// 获取最后同步时间
export function getLastSyncTime(): string | null {
  return localStorage.getItem('articles_last_sync');
}

// 设置实时订阅
export function setupRealtimeSubscription(
  onArticleChange?: (article: Speech) => void,
  onArticleDelete?: (id: string) => void
): () => void {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
  }

  realtimeChannel = supabase
    .channel('articles_changes_v3')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: ARTICLES_TABLE,
      },
      (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
        console.log('Realtime change received:', payload);

        switch (payload.eventType) {
          case 'INSERT':
          case 'UPDATE':
            if (onArticleChange && payload.new) {
              const article = fromDbFormat(payload.new);
              onArticleChange(article);
            }
            // 重新同步
            syncArticles().catch(console.error);
            break;
          case 'DELETE':
            if (onArticleDelete && payload.old) {
              onArticleDelete((payload.old as { id: string }).id);
            }
            // 重新同步
            syncArticles().catch(console.error);
            break;
        }
      }
    )
    .subscribe((status: string) => {
      console.log('Realtime subscription status:', status);
    });

  // 返回取消订阅函数
  return () => {
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
      realtimeChannel = null;
    }
  };
}

// 初始化同步
export async function initializeSync(): Promise<void> {
  // 检查网络状态
  checkOnlineStatus();

  // 初始同步
  try {
    await syncArticles();
  } catch (error) {
    console.error('Initial sync failed:', error);
  }

  // 设置实时订阅
  setupRealtimeSubscription();
}

// 导出 Supabase 客户端
export { supabase };
