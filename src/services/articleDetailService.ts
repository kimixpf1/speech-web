import { supabase } from '@/lib/supabase';
import { normalizeAnalysisText, normalizeSummaryText } from '@/lib/utils';

// 表名
const ARTICLE_DETAILS_TABLE = 'article_details';

// 本地存储键
const DETAILS_CACHE_KEY = 'site_article_details_cache';

// 静态详情缓存（按年份懒加载）
const staticDetailsCache = new Map<number, Record<string, ArticleDetailContent>>();

async function loadStaticDetailsForYear(year: number): Promise<Record<string, ArticleDetailContent> | null> {
  if (staticDetailsCache.has(year)) return staticDetailsCache.get(year)!;

  try {
    let data: Record<string, { id: string; abstract: string; fullText: string; analysis: string }>;
    switch (year) {
      case 2024: data = (await import('@/data/details-2024.json')).default; break;
      case 2025: data = (await import('@/data/details-2025.json')).default; break;
      case 2026: data = (await import('@/data/details-2026.json')).default; break;
      default: return null;
    }
    const normalized: Record<string, ArticleDetailContent> = {};
    for (const [id, d] of Object.entries(data)) {
      normalized[id] = {
        id: d.id,
        abstract: normalizeSummaryText(d.abstract || ''),
        fullText: d.fullText || '',
        analysis: normalizeAnalysisText(d.analysis || ''),
      };
    }
    staticDetailsCache.set(year, normalized);
    return normalized;
  } catch {
    return null;
  }
}

async function getStaticDetail(id: string): Promise<ArticleDetailContent | null> {
  // 从 id 推断年份（格式如 "P2024-0264" 或 "2024-01"）
  const yearMatch = id.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1]);
  const details = await loadStaticDetailsForYear(year);
  return details?.[id] ?? null;
}

export interface ArticleDetailContent {
  id: string;
  abstract: string;
  fullText: string;
  analysis: string;
}

function normalizeAbstractText(abstract: string): string {
  return normalizeSummaryText(abstract);
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

// 获取文章详情（静态数据优先，不查 Supabase 节省带宽）
export async function getArticleDetail(id: string, forceRefresh: boolean = false): Promise<ArticleDetailContent | null> {
  // 强制刷新时跳过静态数据（管理员场景）
  if (!forceRefresh) {
    // 优先查静态数据
    const staticDetail = await getStaticDetail(id);
    if (staticDetail) return staticDetail;

    // 再查本地缓存
    const localDetails = getLocalDetails();
    if (localDetails[id]) {
      return {
        ...localDetails[id],
        abstract: normalizeAbstractText(localDetails[id].abstract),
        analysis: normalizeAnalysisText(localDetails[id].analysis),
      };
    }
  }

  // 最后查 Supabase（管理员操作或新文章）
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

      // 详情摘要变更时，同步主表 summary，避免列表摘要与详情页摘要分叉
      if (normalizedDetail.abstract) {
        const { error: articleSummaryError } = await supabase
          .from('articles')
          .update({ summary: normalizedDetail.abstract })
          .eq('id', normalizedDetail.id);

        if (articleSummaryError) {
          console.error('Failed to sync article summary to cloud:', articleSummaryError);
        }
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
