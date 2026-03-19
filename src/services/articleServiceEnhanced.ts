import { speechesData as originalSpeechesData, type Speech } from '@/data/speeches';

// 本地存储键 - 分开存储
const USER_ARTICLES_KEY = 'site_user_articles';  // 用户添加的文章
const DELETED_ARTICLES_KEY = 'site_deleted_articles';

// 导出类型
export type { Speech };

// 同步状态类型
export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingChanges: number;
  isSyncing: boolean;
}

// 获取已删除文章ID列表
function getDeletedIds(): string[] {
  try {
    const deletedStr = localStorage.getItem(DELETED_ARTICLES_KEY);
    return deletedStr ? JSON.parse(deletedStr) : [];
  } catch {
    return [];
  }
}

// 获取用户添加的文章
function getUserArticles(): Speech[] {
  try {
    const stored = localStorage.getItem(USER_ARTICLES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// 保存用户添加的文章
function saveUserArticles(articles: Speech[]): void {
  try {
    localStorage.setItem(USER_ARTICLES_KEY, JSON.stringify(articles));
    console.log('Saved user articles:', articles.length);
  } catch (error) {
    console.error('Error saving user articles:', error);
  }
}

// 获取所有文章（合并静态数据 + 用户添加的文章）
export function getLocalArticlesSync(): Speech[] {
  const deleted = getDeletedIds();
  const userArticles = getUserArticles();

  // 使用 Map 合并
  const merged = new Map<string, Speech>();

  // 先添加静态数据
  originalSpeechesData.forEach(article => {
    if (!deleted.includes(article.id)) {
      merged.set(article.id, article);
    }
  });

  // 添加用户文章（优先级更高，会覆盖同ID的静态数据）
  userArticles.forEach(article => {
    if (!deleted.includes(article.id)) {
      merged.set(article.id, article);
    }
  });

  // 按日期排序
  return Array.from(merged.values()).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// 获取所有文章
export async function getArticles(): Promise<Speech[]> {
  return getLocalArticlesSync();
}

// 添加文章
export async function addArticle(article: Speech): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Adding article:', article.id, article.title);

    // 获取现有用户文章
    const userArticles = getUserArticles();

    // 检查是否已存在
    const existingIndex = userArticles.findIndex(a => a.id === article.id);

    if (existingIndex === -1) {
      // 新文章，添加到开头
      userArticles.unshift(article);
    } else {
      // 更新现有文章
      userArticles[existingIndex] = article;
    }

    // 保存
    saveUserArticles(userArticles);

    // 验证保存成功
    const saved = getUserArticles();
    const found = saved.find(a => a.id === article.id);
    if (found) {
      console.log('Article saved successfully:', found.id, found.title);
    } else {
      console.error('Failed to verify article save!');
      return { success: false, error: '保存验证失败' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding article:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

// 更新文章
export async function updateArticle(updatedArticle: Speech): Promise<boolean> {
  try {
    const userArticles = getUserArticles();
    const index = userArticles.findIndex(a => a.id === updatedArticle.id);

    if (index !== -1) {
      userArticles[index] = updatedArticle;
    } else {
      // 如果不在用户文章中，添加进去
      userArticles.unshift(updatedArticle);
    }

    saveUserArticles(userArticles);
    return true;
  } catch (error) {
    console.error('Error updating article:', error);
    return false;
  }
}

// 删除文章
export async function deleteArticle(id: string): Promise<boolean> {
  try {
    // 从用户文章中删除
    const userArticles = getUserArticles();
    const filtered = userArticles.filter(a => a.id !== id);
    saveUserArticles(filtered);

    // 记录到已删除列表（防止静态数据中的同名文章出现）
    const deleted = getDeletedIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem(DELETED_ARTICLES_KEY, JSON.stringify(deleted));
    }

    return true;
  } catch (error) {
    console.error('Error deleting article:', error);
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

// 重置所有文章
export function resetArticles(): void {
  localStorage.removeItem(USER_ARTICLES_KEY);
  localStorage.removeItem(DELETED_ARTICLES_KEY);
}

// 同步状态相关（简化版）
export function subscribeToSyncStatus(callback: (status: SyncStatus) => void): () => void {
  callback({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    isSyncing: false,
  });
  return () => {};
}

export function getSyncStatus(): SyncStatus {
  return {
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    isSyncing: false,
  };
}

export function checkOnlineStatus(): boolean {
  return navigator.onLine;
}

export async function syncArticles(): Promise<Speech[]> {
  return getLocalArticlesSync();
}

export async function initializeSync(): Promise<void> {
  // 不需要同步，直接返回
}

export function setupRealtimeSubscription(
  onArticleChange?: (article: Speech) => void,
  onArticleDelete?: (id: string) => void
): () => void {
  // 不需要实时订阅
  return () => {};
}