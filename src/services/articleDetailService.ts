import { supabase } from '@/lib/supabase';
import { normalizeAnalysisText } from '@/lib/utils';

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

function normalizeAbstractText(abstract: string): string {
  const cleaned = (abstract || '')
    .replace(/^【摘要】[\s：:]*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length <= 120) {
    return cleaned;
  }

  const sentences = cleaned
    .split(/(?<=[。！？；])/)
    .map(sentence => sentence.trim())
    .filter(Boolean);

  const selected: string[] = [];
  let currentLength = 0;

  for (const sentence of sentences) {
    if (currentLength > 0 && currentLength + sentence.length > 120) {
      break;
    }

    selected.push(sentence);
    currentLength += sentence.length;

    if (currentLength >= 70 || selected.length >= 2) {
      break;
    }
  }

  return (selected.join('') || cleaned.slice(0, 120)).trim();
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
export async function getArticleDetail(id: string, forceRefresh: boolean = false): Promise<ArticleDetailContent | null> {
  // 如果强制刷新，跳过本地缓存
  if (!forceRefresh) {
    // 先检查本地缓存
    const localDetails = getLocalDetails();
    if (localDetails[id]) {
      return {
        ...localDetails[id],
        abstract: normalizeAbstractText(localDetails[id].abstract),
        analysis: normalizeAnalysisText(localDetails[id].analysis),
      };
    }
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
          abstract: normalizeAbstractText(data.abstract || ''),
          fullText: data.full_text || '',
          analysis: normalizeAnalysisText(data.analysis || ''),
        };
        
        // 更新本地缓存
        const localDetails = getLocalDetails();
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

// 清除本地缓存
export function clearLocalDetailsCache(): void {
  try {
    localStorage.removeItem(DETAILS_CACHE_KEY);
    console.log('Local details cache cleared');
  } catch (error) {
    console.error('Error clearing local details cache:', error);
  }
}

// 清除指定文章的本地缓存
export function clearArticleDetailCache(id: string): void {
  try {
    const localDetails = getLocalDetails();
    delete localDetails[id];
    saveLocalDetails(localDetails);
  } catch (error) {
    console.error('Error clearing article detail cache:', error);
  }
}

// 保存文章详情
export async function saveArticleDetail(detail: ArticleDetailContent): Promise<boolean> {
  try {
    const normalizedDetail: ArticleDetailContent = {
      ...detail,
      abstract: normalizeAbstractText(detail.abstract),
      analysis: normalizeAnalysisText(detail.analysis),
    };

    // 保存到云端
    if (navigator.onLine) {
      const { error } = await supabase
        .from(ARTICLE_DETAILS_TABLE)
        .upsert({
          id: normalizedDetail.id,
          abstract: normalizedDetail.abstract,
          full_text: normalizedDetail.fullText,
          analysis: normalizedDetail.analysis,
        }, { onConflict: 'id' });

      if (error) {
        console.error('Failed to save article detail to cloud:', error);
        // 继续保存到本地
      }
    }

    // 更新本地缓存
    const localDetails = getLocalDetails();
    localDetails[normalizedDetail.id] = normalizedDetail;
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
          abstract: normalizeAbstractText(item.abstract || ''),
          fullText: item.full_text || '',
          analysis: normalizeAnalysisText(item.analysis || ''),
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
  return localDetails[id]
    ? {
        ...localDetails[id],
        abstract: normalizeAbstractText(localDetails[id].abstract),
        analysis: normalizeAnalysisText(localDetails[id].analysis),
      }
    : null;
}
