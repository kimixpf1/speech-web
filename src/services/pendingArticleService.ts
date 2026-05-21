import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { normalizeSummaryText } from '@/lib/utils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ejeiuqcmkznfbglvbkbe.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg';

const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

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

  if (error) {
    console.error('getPendingArticles: Supabase 查询失败:', error.message);
    return [];
  }

  return (data || []).map((article) => ({
    ...article,
    summary: normalizeSummaryText(article.summary || article.title || '', {
      maxLength: 220,
      minLength: 90,
      maxSentences: 3,
    }),
  }));
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
