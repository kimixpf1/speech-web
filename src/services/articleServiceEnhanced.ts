import { supabase } from '@/lib/supabase';
import { speechesData, type Speech } from '@/data/speeches';

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
    categoryname: article.categoryName,
    domain: article.domain || 'economy',
    domain_name: article.domainName || '经济',
    is_zhengjiguan: article.isZhengjiguan || false,
    zhengjiguan_level: article.zhengjiguanLevel || null,
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
    domain: (dbArticle.domain || 'economy') as 'economy' | 'politics' | 'culture' | 'society' | 'ecology' | 'party' | 'defense' | 'diplomacy',
    domainName: (dbArticle.domain_name || dbArticle.domainName || '经济') as string,
    isZhengjiguan: (dbArticle.is_zhengjiguan || false) as boolean,
    zhengjiguanLevel: dbArticle.zhengjiguan_level as 'central' | 'jiangsu' | 'suzhou' | undefined,
    source: dbArticle.source as string,
    location: (dbArticle.location || '') as string,
    summary: dbArticle.summary as string,
    url: (dbArticle.url || '') as string,
  };
}

// 确保文章有默认领域字段
export function ensureDomainField(article: Speech): Speech {
  return {
    ...article,
    domain: article.domain || 'economy',
    domainName: article.domainName || '经济',
    isZhengjiguan: article.isZhengjiguan || false,
  };
}

// 保存到本地缓存
function saveLocalCache(articles: Speech[]): void {
  try {
    localStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify(articles));
    localStorage.setItem('last_sync_time', new Date().toISOString());
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
    const { data, error } = await supabase
      .from(ARTICLES_TABLE)
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }

    if (data && data.length > 0) {
      return data.map(fromDbFormat);
    }

    return [];
  } catch (e) {
    console.error('Fetch from cloud error:', e);
    return [];
  }
}

// 同步静态数据到云端
async function syncStaticDataToCloud(): Promise<void> {
  try {
    console.log('开始同步文章到云端...');
    
    const batchSize = 10;
    for (let i = 0; i < speechesData.length; i += batchSize) {
      const batch = speechesData.slice(i, i + batchSize);
      // 确保每篇文章都有领域字段（默认为经济）
      const articlesWithDomain = batch.map(article => ensureDomainField(article));
      const dbData = articlesWithDomain.map(toDbFormat);
      
      const { error } = await supabase
        .from(ARTICLES_TABLE)
        .upsert(dbData, { onConflict: 'id' });

      if (error) {
        console.error(`同步批次 ${Math.floor(i / batchSize) + 1} 失败:`, error);
      } else {
        console.log(`已同步 ${Math.min(i + batchSize, speechesData.length)}/${speechesData.length} 篇文章`);
      }
    }
    
    console.log('云端同步完成！');
  } catch (e) {
    console.error('Sync error:', e);
  }
}

// 获取所有文章（排除政绩观专题文章）
export async function getArticles(): Promise<Speech[]> {
  try {
    if (navigator.onLine) {
      const cloudArticles = await fetchFromCloud();
      
      // 如果云端数据不完整，同步静态数据
      if (cloudArticles.length < speechesData.length) {
        console.log(`云端文章数(${cloudArticles.length})少于静态数据(${speechesData.length})，正在同步...`);
        await syncStaticDataToCloud();
        const syncedArticles = await fetchFromCloud();
        if (syncedArticles.length >= speechesData.length) {
          saveLocalCache(syncedArticles);
          // 排除政绩观专题文章
          return syncedArticles.filter(a => !a.isZhengjiguan);
        }
      }
      
      if (cloudArticles.length > 0) {
        saveLocalCache(cloudArticles);
        // 排除政绩观专题文章
        return cloudArticles.filter(a => !a.isZhengjiguan);
      }
    }
  } catch (e) {
    console.error('Get articles error:', e);
  }

  // 使用本地缓存或静态数据
  const cached = getLocalCache();
  if (cached.length > 0) {
    return cached.filter(a => !a.isZhengjiguan);
  }

  return [...speechesData].map(ensureDomainField).filter(a => !a.isZhengjiguan);
}

// 获取政绩观专题文章
export async function getZhengjiguanArticles(): Promise<Speech[]> {
  try {
    const { data, error } = await supabase
      .from(ARTICLES_TABLE)
      .select('*')
      .eq('is_zhengjiguan', true)
      .order('date', { ascending: false });

    if (error) {
      console.error('获取政绩观文章失败:', error);
      return [];
    }

    return data ? data.map(fromDbFormat) : [];
  } catch (e) {
    console.error('Get zhengjiguan articles error:', e);
    return [];
  }
}

// 同步获取文章（用于首屏快速加载）
export function getLocalArticlesSync(): Speech[] {
  const cached = getLocalCache();
  if (cached.length > 0) {
    return cached.filter(a => !a.isZhengjiguan);
  }
  return [...speechesData].map(ensureDomainField).filter(a => !a.isZhengjiguan);
}
}

// 添加文章（自动上传云端备份）
export async function addArticle(article: Speech): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('新增文章，准备上传云端备份:', article.id, article.title);
    
    if (navigator.onLine) {
      // 上传到云端
      const { error } = await supabase
        .from(ARTICLES_TABLE)
        .upsert(toDbFormat(article), { onConflict: 'id' });

      if (error) {
        console.error('云端上传失败:', error);
        return { success: false, error: `云端上传失败: ${error.message}` };
      }

      console.log('云端备份成功！文章已保存:', article.id);
      
      // 更新本地缓存
      const allArticles = await fetchFromCloud();
      saveLocalCache(allArticles);
      console.log('当前云端文章总数:', allArticles.length);
    } else {
      // 离线时保存到本地，等在线时自动同步
      console.log('当前离线，文章暂存本地，将在联网后同步');
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
    console.error('添加文章错误:', e);
    return { success: false, error: e instanceof Error ? e.message : '未知错误' };
  }
}

// 更新文章（自动同步云端）
export async function updateArticle(article: Speech): Promise<boolean> {
  try {
    console.log('更新文章，同步云端:', article.id);
    
    if (navigator.onLine) {
      const { error } = await supabase
        .from(ARTICLES_TABLE)
        .upsert(toDbFormat(article), { onConflict: 'id' });

      if (error) {
        console.error('云端更新失败:', error);
        return false;
      }

      console.log('云端更新成功:', article.id);

      const allArticles = await fetchFromCloud();
      saveLocalCache(allArticles);
    } else {
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
    console.error('更新文章错误:', e);
    return false;
  }
}

// 删除文章（同步云端）
export async function deleteArticle(id: string): Promise<boolean> {
  try {
    console.log('删除文章，同步云端:', id);
    
    if (navigator.onLine) {
      const { error } = await supabase
        .from(ARTICLES_TABLE)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('云端删除失败:', error);
        return false;
      }

      console.log('云端删除成功:', id);

      const allArticles = await fetchFromCloud();
      saveLocalCache(allArticles);
      console.log('当前云端文章总数:', allArticles.length);
    } else {
      const cached = getLocalCache();
      const filtered = cached.filter(a => a.id !== id);
      saveLocalCache(filtered);
    }

    return true;
  } catch (e) {
    console.error('删除文章错误:', e);
    return false;
  }
}

// 生成文章ID
export function generateArticleId(year: number): string {
  const allArticles = getLocalArticlesSync();
  const yearArticles = allArticles.filter(a => a.year === year);
  const maxNum = yearArticles.reduce((max, a) => {
    const match = a.id.match(new RegExp(`^${year}-(\\d+)$`));
    const num = match ? parseInt(match[1]) : 0;
    return num > max ? num : max;
  }, 0);
  return `${year}-${String(maxNum + 1).padStart(2, '0')}`;
}

// 同步文章
export async function syncArticles(): Promise<Speech[]> {
  await syncStaticDataToCloud();
  return getArticles();
}

// 初始化同步
export async function initializeSync(): Promise<void> {
  const cloudArticles = await fetchFromCloud();
  if (cloudArticles.length < speechesData.length) {
    await syncStaticDataToCloud();
  }
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