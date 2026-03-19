import { supabase } from '@/lib/supabase';

// 表名
const ARTICLE_DETAILS_TABLE = 'article_details';

// 本地存储键
const DETAILS_CACHE_KEY = 'site_article_details_cache';

export interface ArticleDetailContent {
  id: string;
  abstract: string;
  fullText: string;
  analysis: string;
}

// 获取本地缓存的详情
function getLocalDetails(): Record<string, ArticleDetailContent> {
  try {
    const cached = localStorage.getItem(DETAILS_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.error('Error reading local details:', error);
    return {};
  }
}

// 保存详情到本地
function saveLocalDetails(details: Record<string, ArticleDetailContent>): void {
  try {
    localStorage.setItem(DETAILS_CACHE_KEY, JSON.stringify(details));
  } catch (error) {
    console.error('Error saving local details:', error);
  }
}

// 获取文章详情
export async function getArticleDetail(id: string): Promise<ArticleDetailContent | null> {
  // 先检查本地缓存
  const localDetails = getLocalDetails();
  if (localDetails[id]) {
    return localDetails[id];
  }

  // 从云端获取
  try {
    if (navigator.onLine) {
      const { data, error } = await supabase
        .from(ARTICLE_DETAILS_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (data && !error) {
        const detail: ArticleDetailContent = {
          id: data.id,
          abstract: data.abstract || '',
          fullText: data.full_text || '',
          analysis: data.analysis || '',
        };
        
        // 更新本地缓存
        localDetails[id] = detail;
        saveLocalDetails(localDetails);
        
        return detail;
      }
    }
  } catch (error) {
    console.error('Error fetching article detail:', error);
  }

  return null;
}

// 保存文章详情
export async function saveArticleDetail(detail: ArticleDetailContent): Promise<boolean> {
  try {
    // 保存到云端
    if (navigator.onLine) {
      const { error } = await supabase
        .from(ARTICLE_DETAILS_TABLE)
        .upsert({
          id: detail.id,
          abstract: detail.abstract,
          full_text: detail.fullText,
          analysis: detail.analysis,
        }, { onConflict: 'id' });

      if (error) {
        console.error('Failed to save article detail to cloud:', error);
        // 继续保存到本地
      }
    }

    // 更新本地缓存
    const localDetails = getLocalDetails();
    localDetails[detail.id] = detail;
    saveLocalDetails(localDetails);

    return true;
  } catch (error) {
    console.error('Error saving article detail:', error);
    return false;
  }
}

// 删除文章详情
export async function deleteArticleDetail(id: string): Promise<boolean> {
  try {
    // 从云端删除
    if (navigator.onLine) {
      await supabase
        .from(ARTICLE_DETAILS_TABLE)
        .delete()
        .eq('id', id);
    }

    // 从本地删除
    const localDetails = getLocalDetails();
    delete localDetails[id];
    saveLocalDetails(localDetails);

    return true;
  } catch (error) {
    console.error('Error deleting article detail:', error);
    return false;
  }
}

// 同步详情数据
export async function syncArticleDetails(): Promise<void> {
  if (!navigator.onLine) return;

  try {
    const { data, error } = await supabase
      .from(ARTICLE_DETAILS_TABLE)
      .select('*');

    if (data && !error) {
      const details: Record<string, ArticleDetailContent> = {};
      data.forEach(item => {
        details[item.id] = {
          id: item.id,
          abstract: item.abstract || '',
          fullText: item.full_text || '',
          analysis: item.analysis || '',
        };
      });
      saveLocalDetails(details);
    }
  } catch (error) {
    console.error('Error syncing article details:', error);
  }
}

// 获取本地详情（同步方法，用于详情页快速加载）
export function getLocalArticleDetail(id: string): ArticleDetailContent | null {
  const localDetails = getLocalDetails();
  return localDetails[id] || null;
}