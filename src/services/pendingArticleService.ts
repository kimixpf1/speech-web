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
  source?: string;
  summary?: string;
  url?: string;
  location?: string;
  status: 'pending' | 'approved' | 'rejected';
  fetched_at?: string;
}

export async function getPendingArticles(): Promise<PendingArticle[]> {
  const { data, error } = await supabase
    .from('pending_articles')
    .select('*')
    .eq('status', 'pending')
    .order('fetched_at', { ascending: false });
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
