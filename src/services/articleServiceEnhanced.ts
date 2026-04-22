import { supabase } from '@/lib/supabase';
import { speechesData, type Speech } from '@/data/speeches';
import { zhengjiguanArticles } from '@/data/zhengjiguanArticles';
import {
  clearArticleDetailCache,
  getArticleDetail,
  saveArticleDetail,
  type ArticleDetailContent,
} from '@/services/articleDetailService';
import { normalizeArticleUrl, normalizeSummaryText } from '@/lib/utils';

// 表名
const ARTICLES_TABLE = 'articles';

// 本地缓存键
const ARTICLES_CACHE_KEY = 'site_articles_cloud_cache';
const SCHEMA_CACHE_KEY = 'articles_schema_cache';

// 导出类型
export type { Speech };

// 同步状态类型
export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingChanges: number;
  isSyncing: boolean;
}

// 数据库架构缓存 - 已更新包含新列
let cachedSchema: Set<string> | null = null;

// 清除架构缓存（用于数据库升级后刷新）
export function clearSchemaCache(): void {
  cachedSchema = null;
  localStorage.removeItem(SCHEMA_CACHE_KEY);
  console.log('数据库架构缓存已清除');
}

// 将 Speech 对象转换为数据库格式（完整版，包含所有列）
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
    url: normalizeArticleUrl(article.url || ''),
  };
}

// 将数据库格式转换为 Speech 对象
function fromDbFormat(dbArticle: Record<string, unknown>): Speech {
  const category = (dbArticle.category || 'speech') as 'speech' | 'article' | 'meeting' | 'inspection' | 'call';
  const categoryName = (dbArticle.categoryname || dbArticle.categoryName || (category === 'call' ? '致电' : '重要讲话')) as string;
  const domain = (dbArticle.domain || 'economy') as 'economy' | 'politics' | 'culture' | 'society' | 'ecology' | 'party' | 'defense' | 'diplomacy';

  return {
    id: dbArticle.id as string,
    title: (dbArticle.title || '') as string,
    date: (dbArticle.date || '') as string,
    year: dbArticle.year as number,
    month: dbArticle.month as number,
    day: dbArticle.day as number,
    category,
    categoryName,
    domain,

    domainName: (dbArticle.domain_name || dbArticle.domainName || '经济') as string,
    isZhengjiguan: (dbArticle.is_zhengjiguan || false) as boolean,
    zhengjiguanLevel: dbArticle.zhengjiguan_level as 'central' | 'jiangsu' | 'suzhou' | undefined,
    source: (dbArticle.source || '') as string,
    location: (dbArticle.location || '') as string,
    summary: normalizeSummaryText((dbArticle.summary || '') as string),
    url: normalizeArticleUrl((dbArticle.url || '') as string),
  };
}

// 确保文章有默认领域字段
export function ensureDomainField(article: Speech): Speech {
  return {
    ...article,
    domain: article.domain || 'economy',
    domainName: article.domainName || '经济',
    summary: normalizeSummaryText(article.summary || ''),
    url: normalizeArticleUrl(article.url || ''),
    isZhengjiguan: article.isZhengjiguan || false,
  };
}

let cacheWriteScheduled = false;

function saveLocalCache(articles: Speech[]): void {
  if (cacheWriteScheduled) return;
  cacheWriteScheduled = true;

  const doWrite = () => {
    cacheWriteScheduled = false;
    try {
      localStorage.setItem(
        ARTICLES_CACHE_KEY,
        JSON.stringify(
          articles.map(article => ({
            ...article,
            summary: normalizeSummaryText(article.summary || ''),
            url: normalizeArticleUrl(article.url || ''),
          }))
        )
      );
      localStorage.setItem('last_sync_time', new Date().toISOString());
    } catch (e) {
      console.error('Failed to save local cache:', e);
    }
  };

  const idleWindow = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  };
  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(() => doWrite(), { timeout: 2000 });
  } else {
    setTimeout(doWrite, 100);
  }
}

// 从本地缓存读取（写入时已normalize，无需重复处理）
function getLocalCache(): Speech[] {
  try {
    const cached = localStorage.getItem(ARTICLES_CACHE_KEY);
    return cached ? (JSON.parse(cached) as Speech[]) : [];
  } catch {
    return [];
  }
}

// 从云端获取所有文章（分批获取，支持超过1000条）
async function fetchFromCloud(): Promise<Speech[]> {
  try {
    const allArticles: Speech[] = [];
    const batchSize = 1000;
    let from = 0;

    while (true) {
      let data: Record<string, unknown>[] | null = null;
      let error: Error | null = null;

      {
        const result = await supabase
          .from(ARTICLES_TABLE)
          .select('*')
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .order('day', { ascending: false })
          .order('date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, from + batchSize - 1);

        data = result.data as Record<string, unknown>[] | null;
        error = result.error as Error | null;
      }

      if (error) {
        const fallback = await supabase
          .from(ARTICLES_TABLE)
          .select('*')
          .order('date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, from + batchSize - 1);

        data = fallback.data as Record<string, unknown>[] | null;
        error = fallback.error as Error | null;
      }

      if (error) {
        console.error('Supabase fetch error:', error);
        break;
      }

      if (!data || data.length === 0) break;

      allArticles.push(...data.map(fromDbFormat));

      // 如果本批不满，说明已经取完
      if (data.length < batchSize) break;
      from += batchSize;
    }

    return allArticles;
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
      // 使用完整字段格式
      const dbData = batch.map(article => toDbFormat(article));

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
    localStorage.setItem('last_sync_time', new Date().toISOString());
  } catch (e) {
    console.error('Sync error:', e);
  }
}

// 获取所有文章（排除政绩观专题文章）
export async function getArticles(): Promise<Speech[]> {
  try {
    if (navigator.onLine) {
      const cloudArticles = await fetchFromCloud();
      
      // 只有云端完全无数据时才同步静态数据（初始化场景）
      // 注意：不再根据数量比较来触发同步，避免覆盖用户修改
      if (cloudArticles.length === 0) {
        console.log('云端无数据，正在初始化同步...');
        await syncStaticDataToCloud();
        const syncedArticles = await fetchFromCloud();
        if (syncedArticles.length > 0) {
          saveLocalCache(syncedArticles);
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
    // 先尝试从云端获取
    if (navigator.onLine) {
      const { data, error } = await supabase
        .from(ARTICLES_TABLE)
        .select('*')
        .eq('is_zhengjiguan', true)
        .order('date', { ascending: false });

      if (!error && data && data.length > 0) {
        console.log('从云端获取政绩观文章:', data.length, '篇');
        return data.map(fromDbFormat);
      }

      // 云端没有数据，同步静态数据到云端
      if (!error && (!data || data.length === 0)) {
        console.log('云端无政绩观文章，正在同步静态数据...');
        await syncZhengjiguanToCloud();
        // 重新获取
        const { data: newData } = await supabase
          .from(ARTICLES_TABLE)
          .select('*')
          .eq('is_zhengjiguan', true)
          .order('date', { ascending: false });
        if (newData && newData.length > 0) {
          return newData.map(fromDbFormat);
        }
      }
    }
  } catch (e) {
    console.error('Get zhengjiguan articles error:', e);
  }

  // 回退到静态数据
  console.log('返回静态政绩观文章数据');
  return [...zhengjiguanArticles];
}

// 同步政绩观文章到云端
async function syncZhengjiguanToCloud(): Promise<void> {
  try {
    const dbData = zhengjiguanArticles.map(toDbFormat);
    const { error } = await supabase
      .from(ARTICLES_TABLE)
      .upsert(dbData, { onConflict: 'id' });

    if (error) {
      console.error('同步政绩观文章失败:', error);
    } else {
      console.log('已同步', zhengjiguanArticles.length, '篇政绩观文章到云端');
    }
  } catch (e) {
    console.error('Sync zhengjiguan error:', e);
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

// 添加文章（自动上传云端备份）
export async function addArticle(article: Speech): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('新增文章，准备上传云端备份:', article.id, article.title);

    // 先更新本地缓存
    const cached = getLocalCache();
    const index = cached.findIndex(a => a.id === article.id);
    if (index === -1) {
      cached.unshift(article);
    } else {
      cached[index] = article;
    }
    cached.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    saveLocalCache(cached);

    if (navigator.onLine) {
      // 使用完整字段格式（数据库已迁移，支持所有列）
      const dbData = toDbFormat(article);

      // 上传到云端
      const { error } = await supabase
        .from(ARTICLES_TABLE)
        .upsert(dbData, { onConflict: 'id' });

      if (error) {
        console.error('云端上传失败:', error);
        return { success: false, error: `云端上传失败: ${error.message}` };
      }

      console.log('云端备份成功！文章已保存:', article.id);
      localStorage.setItem('last_sync_time', new Date().toISOString());
    } else {
      // 离线时保存到本地，等在线时自动同步
      console.log('当前离线，文章暂存本地，将在联网后同步');
    }

    return { success: true };
  } catch (e) {
    console.error('添加文章错误:', e);
    return { success: false, error: e instanceof Error ? e.message : '未知错误' };
  }
}

// 更新文章（自动同步云端）
export async function updateArticle(article: Speech): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('更新文章，同步云端:', article.id, article.title);

    // 先更新本地缓存，确保本地数据最新
    const cached = getLocalCache();
    const localIndex = cached.findIndex(a => a.id === article.id);
    if (localIndex !== -1) {
      cached[localIndex] = article;
      cached.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      saveLocalCache(cached);
      console.log('本地缓存已先更新');
    }

    if (navigator.onLine) {
      // 检查用户是否已登录
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('用户未登录，无法更新文章');
        return { success: false, error: '请先登录管理员账户' };
      }

      // 使用完整字段格式（数据库已迁移，支持所有列）
      const dbData = toDbFormat(article);
      console.log('准备上传数据:', JSON.stringify(dbData, null, 2));

      const { data, error } = await supabase
        .from(ARTICLES_TABLE)
        .upsert(dbData, { onConflict: 'id' })
        .select();

      if (error) {
        console.error('云端更新失败:', error);
        return { success: false, error: `云端更新失败: ${error.message}` };
      }

      console.log('云端更新成功:', article.id, '返回数据:', data);
      localStorage.setItem('last_sync_time', new Date().toISOString());
      console.log('文章更新完成:', article.id);
    } else {
      console.log('离线模式：已保存到本地缓存');
    }

    return { success: true };
  } catch (e) {
    console.error('更新文章错误:', e);
    return { success: false, error: e instanceof Error ? e.message : '未知错误' };
  }
}

// 删除文章（同步云端，同时删除 article_details 防止孤儿记录）
export async function deleteArticle(id: string): Promise<boolean> {
  try {
    console.log('删除文章，同步云端:', id);

    const cached = getLocalCache();
    const targetArticle = cached.find(a => a.id === id) || null;
    const detailBackup = await getArticleDetail(id, true);

    if (navigator.onLine) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.error('用户未登录，无法删除文章');
        return false;
      }

      const { data: deletedArticles, error: articleDeleteError } = await supabase
        .from(ARTICLES_TABLE)
        .delete()
        .eq('id', id)
        .select('id');

      if (articleDeleteError || !deletedArticles?.length) {
        console.error('云端删除文章失败:', articleDeleteError || new Error('未删除任何文章记录'));
        return false;
      }

      console.log('文章主记录删除成功:', id);

      const { data: deletedDetails, error: detailDeleteError } = await supabase
        .from('article_details')
        .delete()
        .eq('id', id)
        .select('id');

      const hadDetailBackup = Boolean(detailBackup);
      let detailDeleteSucceeded = !detailDeleteError;

      if (detailDeleteSucceeded && hadDetailBackup && !deletedDetails?.length) {
        const { data: remainingDetails, error: remainingDetailError } = await supabase
          .from('article_details')
          .select('id')
          .eq('id', id)
          .limit(1);

        detailDeleteSucceeded = !remainingDetailError && !remainingDetails?.length;

        if (remainingDetailError) {
          console.error('校验文章详情删除状态失败:', remainingDetailError);
        }
      }

      if (!detailDeleteSucceeded) {
        console.error('删除文章详情失败，准备回滚主记录:', detailDeleteError || new Error('未删除任何详情记录'));

        if (targetArticle) {
          const rollbackResult = await addArticle(targetArticle);
          if (!rollbackResult.success) {
            console.error('回滚文章主记录失败:', rollbackResult.error);
          }
        }

        if (detailBackup) {
          await saveArticleDetail(detailBackup as ArticleDetailContent);
        }

        return false;
      }

      console.log('文章详情删除成功:', id);

      const allArticles = await fetchFromCloud();
      saveLocalCache(allArticles);
      clearArticleDetailCache(id);
      console.log('当前云端文章总数:', allArticles.length);
    } else {
      const filtered = cached.filter(a => a.id !== id);
      saveLocalCache(filtered);
      clearArticleDetailCache(id);
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

// 同步文章（仅从云端拉取最新数据，不回写静态数据）
export async function syncArticles(): Promise<Speech[]> {
  return getArticles();
}

// 初始化同步（仅在云端完全为空时才初始化，不会因数量差异误触发）
export async function initializeSync(): Promise<void> {
  const cloudArticles = await fetchFromCloud();
  if (cloudArticles.length === 0) {
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
