import { supabase } from '@/lib/supabase';

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
  const { data, error } = await supabase
    .from('pending_articles')
    .select('*')
    .eq('status', 'pending')
    .order('date', { ascending: false });
  if (error) {
    console.error('getPendingArticles error:', error);
    return [];
  }
  return data || [];
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
  const { data, error } = await supabase
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
