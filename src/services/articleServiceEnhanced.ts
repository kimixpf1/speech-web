import { type RealtimeChannel } from '@supabase/supabase-js'
import { speechesData as originalSpeechesData, type Speech } from '@/data/speeches';
import { supabase } from '@/lib/supabase';

// 复用 lib/supabase.ts 中的客户端配置

// 表名
const ARTICLES_TABLE = 'articles';
const ARTICLE_DETAILS_TABLE = 'article_details';

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
  const { categoryname, categoryName, ...rest } = dbArticle as Record<string, unknown>;
  return {
    ...rest,
    categoryName: categoryname || categoryName,
  } as Speech;
}

// 本地存储键
const ARTICLES_CACHE_KEY = 'site_articles_cache_v2';
const DELETED_ARTICLES_KEY = 'site_deleted_articles_v2';
const LAST_SYNC_KEY = 'articles_last_sync_v2';
const PENDING_CHANGES_KEY = 'articles_pending_changes_v2';

// 导出类型
export type { Speech };

// 文章详情类型
export interface SpeechDetail {
  id: string;
  speech_id: string;
  abstract: string;
  fullText: string;
  analysis: string;
  created_at?: string;
  updated_at?: string;
}

// 同步状态类型
export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingChanges: number;
  isSyncing: boolean;
}

// 待处理变更类型
interface PendingChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  data?: Speech;
  timestamp: number;
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
    syncPendingChanges();
  });
  window.addEventListener('offline', () => {
    updateSyncStatus({ isOnline: false });
  });
}

// 获取本地缓存的文章
function getLocalArticles(): Speech[] {
  try {
    const cached = localStorage.getItem(ARTICLES_CACHE_KEY);
    const deletedStr = localStorage.getItem(DELETED_ARTICLES_KEY);
    const deleted: string[] = deletedStr ? JSON.parse(deletedStr) : [];
    
    let articles: Speech[] = cached ? JSON.parse(cached) : [...originalSpeechesData];
    
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

// 保存文章到本地缓存
function saveLocalArticles(articles: Speech[]): void {
  try {
    localStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify(articles));
  } catch (error) {
    console.error('Error saving local articles:', error);
  }
}

// 获取待处理变更
function getPendingChanges(): PendingChange[] {
  try {
    const pending = localStorage.getItem(PENDING_CHANGES_KEY);
    return pending ? JSON.parse(pending) : [];
  } catch {
    return [];
  }
}

// 保存待处理变更
function savePendingChanges(changes: PendingChange[]): void {
  try {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));
    updateSyncStatus({ pendingChanges: changes.length });
  } catch (error) {
    console.error('Error saving pending changes:', error);
  }
}

// 添加待处理变更
function addPendingChange(change: PendingChange): void {
  const pending = getPendingChanges();
  // 移除同一文章的重复变更
  const filtered = pending.filter(p => p.id !== change.id);
  filtered.push(change);
  savePendingChanges(filtered);
}

// 移除已处理的变更
function removePendingChange(id: string): void {
  const pending = getPendingChanges();
  const filtered = pending.filter(p => p.id !== id);
  savePendingChanges(filtered);
}

// 同步待处理变更到云端
async function syncPendingChanges(): Promise<void> {
  const pending = getPendingChanges();
  if (pending.length === 0 || !navigator.onLine) return;
  
  updateSyncStatus({ isSyncing: true });
  
  for (const change of pending) {
    try {
      switch (change.type) {
        case 'create':
          if (change.data) {
            await supabase.from(ARTICLES_TABLE).insert(toDbFormat(change.data));
          }
          break;
        case 'update':
          if (change.data) {
            await supabase.from(ARTICLES_TABLE).update(toDbFormat(change.data)).eq('id', change.data.id);
          }
          break;
        case 'delete':
          await supabase.from(ARTICLES_TABLE).delete().eq('id', change.id);
          break;
      }
      removePendingChange(change.id);
    } catch (error) {
      console.error(`Error syncing change ${change.id}:`, error);
    }
  }
  
  updateSyncStatus({ isSyncing: false });
}

// 从云端获取所有文章
async function fetchCloudArticles(): Promise<Speech[]> {
  const { data, error } = await supabase
    .from(ARTICLES_TABLE)
    .select('*')
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching cloud articles:', error);
    throw error;
  }
  
  // 映射字段名（数据库使用小写 categoryname）
  return (data || []).map(fromDbFormat);
}

// 合并本地和云端文章
function mergeArticles(localArticles: Speech[], cloudArticles: Speech[]): Speech[] {
  const deletedStr = localStorage.getItem(DELETED_ARTICLES_KEY);
  const deleted: string[] = deletedStr ? JSON.parse(deletedStr) : [];
  
  const merged = new Map<string, Speech>();
  
  // 先添加原始数据
  originalSpeechesData.forEach(article => {
    if (!deleted.includes(article.id)) {
      merged.set(article.id, article);
    }
  });
  
  // 合并云端文章
  cloudArticles.forEach(article => {
    if (!deleted.includes(article.id)) {
      merged.set(article.id, article);
    }
  });
  
  // 合并本地文章
  localArticles.forEach(article => {
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
    const localArticles = getLocalArticles();
    
    if (!navigator.onLine) {
      updateSyncStatus({ isSyncing: false });
      return localArticles;
    }
    
    // 先同步待处理的变更
    await syncPendingChanges();
    
    // 从云端获取文章
    const cloudArticles = await fetchCloudArticles();
    
    // 合并文章
    const merged = mergeArticles(localArticles, cloudArticles);
    
    // 保存到本地
    saveLocalArticles(merged);
    
    // 更新最后同步时间
    const now = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_KEY, now);
    updateSyncStatus({ lastSync: now, isSyncing: false });
    
    return merged;
  } catch (error) {
    console.error('Error syncing articles:', error);
    updateSyncStatus({ isSyncing: false });
    return getLocalArticles();
  }
}

// 获取所有文章（优先返回本地，后台同步）
export async function getArticles(): Promise<Speech[]> {
  const localArticles = getLocalArticles();
  
  // 后台同步
  if (navigator.onLine) {
    syncArticles().catch(console.error);
  }
  
  return localArticles;
}

// 添加文章
export async function addArticle(article: Speech): Promise<boolean> {
  try {
    // 检查是否已存在
    const existing = getLocalArticles();
    if (existing.find(a => a.id === article.id)) {
      return false;
    }
    
    // 添加到本地
    existing.unshift(article);
    saveLocalArticles(existing);
    
    // 添加到待处理变更
    addPendingChange({
      id: article.id,
      type: 'create',
      data: article,
      timestamp: Date.now(),
    });
    
    // 如果在线，立即同步
    if (navigator.onLine) {
      const { error } = await supabase.from(ARTICLES_TABLE).insert(toDbFormat(article));
      if (!error) {
        removePendingChange(article.id);
        console.log('Article synced to cloud:', article.id);
      } else {
        console.error('Failed to sync article:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error adding article:', error);
    return false;
  }
}

// 更新文章
export async function updateArticle(updatedArticle: Speech): Promise<boolean> {
  try {
    // 更新本地
    const articles = getLocalArticles();
    const index = articles.findIndex(a => a.id === updatedArticle.id);
    
    if (index !== -1) {
      articles[index] = updatedArticle;
    } else {
      articles.unshift(updatedArticle);
    }
    
    saveLocalArticles(articles);
    
    // 添加到待处理变更
    addPendingChange({
      id: updatedArticle.id,
      type: 'update',
      data: updatedArticle,
      timestamp: Date.now(),
    });
    
    // 如果在线，立即同步
    if (navigator.onLine) {
      const { error } = await supabase
        .from(ARTICLES_TABLE)
        .update(toDbFormat(updatedArticle))
        .eq('id', updatedArticle.id);
      
      if (!error) {
        removePendingChange(updatedArticle.id);
        console.log('Article update synced to cloud:', updatedArticle.id);
      } else {
        console.error('Failed to sync article update:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating article:', error);
    return false;
  }
}

// 删除文章
export async function deleteArticle(id: string): Promise<boolean> {
  try {
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
    
    // 添加到待处理变更
    addPendingChange({
      id,
      type: 'delete',
      timestamp: Date.now(),
    });
    
    // 如果在线，立即同步
    if (navigator.onLine) {
      const { error } = await supabase.from(ARTICLES_TABLE).delete().eq('id', id);
      if (!error) {
        removePendingChange(id);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting article:', error);
    return false;
  }
}

// 获取文章详情
export async function getArticleDetail(speechId: string): Promise<SpeechDetail | null> {
  try {
    // 先尝试从云端获取
    if (navigator.onLine) {
      const { data, error } = await supabase
        .from(ARTICLE_DETAILS_TABLE)
        .select('*')
        .eq('speech_id', speechId)
        .single();
      
      if (!error && data) {
        return data;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching article detail:', error);
    return null;
  }
}

// 保存文章详情
export async function saveArticleDetail(detail: SpeechDetail): Promise<boolean> {
  try {
    if (navigator.onLine) {
      const { error } = await supabase
        .from(ARTICLE_DETAILS_TABLE)
        .upsert(detail);
      
      if (error) {
        console.error('Error saving article detail:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error saving article detail:', error);
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
  localStorage.removeItem(LAST_SYNC_KEY);
  localStorage.removeItem(PENDING_CHANGES_KEY);
  updateSyncStatus({ lastSync: null, pendingChanges: 0 });
}

// 获取最后同步时间
export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
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
    .channel('articles_changes')
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
              // 转换数据库格式为Speech格式
              const article = fromDbFormat(payload.new);
              onArticleChange(article);
            }
            // 更新本地缓存
            syncArticles().catch(console.error);
            break;
          case 'DELETE':
            if (onArticleDelete && payload.old) {
              onArticleDelete((payload.old as { id: string }).id);
            }
            // 更新本地缓存
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
  await syncArticles();
  
  // 设置实时订阅
  setupRealtimeSubscription();
  
  // 定期同步（每30秒）
  setInterval(() => {
    if (navigator.onLine) {
      syncArticles().catch(console.error);
    }
  }, 30000);
}

// 导出 Supabase 客户端
export { supabase };
