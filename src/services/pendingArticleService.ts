import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { normalizeSummaryText } from '@/lib/utils';

const GITHUB_REPO = 'kimixpf1/speech-web';
const BATCH_FILE_PATH = '.github/scripts/batches/pending_articles_batch.json';
const GITHUB_TOKEN_KEY = 'github_workflow_token';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ejeiuqcmkznfbglvbkbe.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg';

const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

/** 临时 fallback：通过 GitHub API 读取 batch 文件中的文章（2026-05-20 后移除） */
function decodeBase64Utf8(base64: string): string {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function getBatchArticles(): Promise<PendingArticle[]> {
  const token = localStorage.getItem(GITHUB_TOKEN_KEY);
  if (!token) return [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${BATCH_FILE_PATH}?ref=main`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timer));

    if (response.status === 404) return [];
    if (!response.ok) {
      console.warn('getBatchArticles: GitHub API 返回', response.status);
      return [];
    }
    const data = await response.json();
    const content = decodeBase64Utf8(data.content.replace(/\n/g, ''));
    const articles = JSON.parse(content);
    if (!Array.isArray(articles)) return [];
    return articles.map((a: any, index: number) => ({
      id: a.id || `batch-${index}`,
      title: a.title || '',
      date: a.date || '',
      category: a.category,
      categoryName: a.categoryName,
      domain: a.domain,
      domainName: a.domainName,
      source: a.source,
      summary: normalizeSummaryText(a.summary || a.title || '', {
        maxLength: 220, minLength: 90, maxSentences: 3,
      }),
      url: a.url,
      location: a.location,
      status: 'pending' as const,
      fetched_at: a.fetched_at,
      discovered_by: a.discovered_by,
      _isBatch: true,
    }));
  } catch (err) {
    console.warn('getBatchArticles: 失败', err);
    return [];
  }
}

/** 检查是否来自 batch 文件（临时，2026-05-20 后移除） */
export function isBatchArticle(article: PendingArticle): boolean {
  return article._isBatch === true;
}

export interface PendingArticle {
  id: string;
  title: string;
  date: string;
  year?: number;
  month?: number;
  day?: number;
  category?: string;
  categoryName?: string;
  domain?: string;
  domainName?: string;
  source?: string;
  summary?: string;
  url?: string;
  location?: string;
  status: 'pending' | 'approved' | 'rejected';
  fetched_at?: string;
  discovered_by?: string;
  _isBatch?: boolean;
}

export interface SearchLog {
  id: string;
  executed_at: string;
  crawl_count: number;
  search_count: number;
  new_count: number;
  status: 'success' | 'partial_fail' | 'failed';
  details: Record<string, any>;
  duration_seconds: number;
}

export async function getPendingArticles(): Promise<PendingArticle[]> {
  // 使用带 session 的 supabase 客户端，避免 RLS 策略导致 anon 无法读取
  const { data, error } = await supabase
    .from('pending_articles')
    .select('*')
    .eq('status', 'pending')
    .order('date', { ascending: false });

  if (!error) {
    return (data || []).map((article) => ({
      ...article,
      summary: normalizeSummaryText(article.summary || article.title || '', {
        maxLength: 220,
        minLength: 90,
        maxSentences: 3,
      }),
    }));
  }

  // 仅 Supabase 报错时 fallback 到 batch 文件（临时，2026-05-20 后移除）
  console.warn('getPendingArticles: Supabase 查询失败，尝试 batch fallback:', error.message);
  const batchArticles = await getBatchArticles();
  if (batchArticles.length > 0) {
    console.log(`getPendingArticles: 从 batch 文件加载了 ${batchArticles.length} 篇文章`);
  }
  return batchArticles;
}

export async function approveArticle(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('pending_articles')
    .update({ status: 'approved' })
    .eq('id', id);
  return !error;
}

export async function rejectArticle(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('pending_articles')
    .update({ status: 'rejected' })
    .eq('id', id);
  return !error;
}

export async function deletePendingArticle(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('pending_articles')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('deletePendingArticle error:', error);
    return false;
  }
  return true;
}

export async function getSearchLogs(limit = 5): Promise<SearchLog[]> {
  const { data, error } = await publicSupabase
    .from('search_logs')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getSearchLogs error:', error);
    return [];
  }
  return data || [];
}
