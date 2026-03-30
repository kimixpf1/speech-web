// 建议信箱服务
// 使用 Supabase 实现跨设备实时同步

import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// 创建一个专门用于公共提交的、不携带管理员登录状态的 Supabase 客户端
// 这是为了防止管理员登录后（身份变为 authenticated）提交时，触发只允许 anon 身份插入的 RLS 策略而被拒绝
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ejeiuqcmkznfbglvbkbe.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg';

const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Suggestion 类型定义
export interface Suggestion {
  id: string;
  created_at?: string;
  timestamp?: string;
  name: string;
  email?: string;
  message?: string;
  content: string;
  status: 'read' | 'unread';
  date?: string;
  time?: string;
  user_agent?: string;
}

/**
 * 获取所有建议
 */
export async function getSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await publicSupabase
    .from('suggestions')
    .select('*')
    .order('timestamp', { ascending: false, nullsFirst: false });
  
  if (error) {
    console.error('获取建议失败:', error);
    return [];
  }
  
  return (data || []).map(item => {
    const rawDate = item.date || '';
    const rawTime = item.time || '';
    const fallbackTimestamp = item.timestamp || item.created_at || null;
    const fallbackDate = fallbackTimestamp
      ? new Date(fallbackTimestamp).toLocaleDateString('zh-CN')
      : '';
    const fallbackTime = fallbackTimestamp
      ? new Date(fallbackTimestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      : '';

    return {
      ...item,
      content: item.content || item.message || '', // 确保优先读取 content 字段
      date: rawDate || fallbackDate,
      time: rawTime || fallbackTime,
    };
  });
}

/**
 * 安全的 UUID 生成器
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 提交新建议
 */
export async function submitSuggestion(name: string, message: string): Promise<{success: boolean, error?: string}> {
  try {
    const now = new Date();
    const payload = {
      id: generateUUID(),
      name,
      content: message,
      status: 'unread' as const,
      timestamp: now.toISOString(),
      date: now.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Shanghai' }),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    const { error } = await publicSupabase
      .from('suggestions')
      .insert(payload);

    if (error) {
      console.error('提交建议失败(Supabase Error):', error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    return { success: true };
  } catch (err: any) {
    console.error('提交建议异常:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * 获取未读建议数量
 */
export async function getUnreadCount(): Promise<number> {
  const { count, error } = await publicSupabase
    .from('suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unread');
  
  if (error) {
    console.error('获取未读数量失败:', error);
    return 0;
  }
  
  return count || 0;
}

/**
 * 标记建议为已读
 */
export async function markAsRead(id: string): Promise<boolean> {
  const { data, error } = await publicSupabase
    .from('suggestions')
    .update({ status: 'read' })
    .eq('id', id)
    .select('id');
  
  if (error) {
    console.error('标记已读失败:', error);
    return false;
  }
  
  return (data?.length || 0) > 0;
}

/**
 * 批量标记建议为已读
 */
export async function markMultipleAsRead(ids: string[]): Promise<boolean> {
  const { data, error } = await publicSupabase
    .from('suggestions')
    .update({ status: 'read' })
    .in('id', ids)
    .select('id');
  
  if (error) {
    console.error('批量标记已读失败:', error);
    return false;
  }
  
  return (data?.length || 0) === ids.length;
}

/**
 * 删除建议
 */
export async function deleteSuggestion(id: string): Promise<boolean> {
  const { data, error } = await publicSupabase
    .from('suggestions')
    .delete()
    .eq('id', id)
    .select('id');
  
  if (error) {
    console.error('删除建议失败:', error);
    return false;
  }
  
  return (data?.length || 0) > 0;
}

/**
 * 批量删除建议
 */
export async function deleteMultipleSuggestions(ids: string[]): Promise<boolean> {
  const { data, error } = await publicSupabase
    .from('suggestions')
    .delete()
    .in('id', ids)
    .select('id');
  
  if (error) {
    console.error('批量删除建议失败:', error);
    return false;
  }
  
  return (data?.length || 0) === ids.length;
}

/**
 * 清空所有建议
 */
export async function clearAllSuggestions(): Promise<boolean> {
  const { error } = await publicSupabase
    .from('suggestions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录的技巧
  
  if (error) {
    console.error('清空建议失败:', error);
    return false;
  }
  
  return true;
}

/**
 * 设置建议实时监听器
 * 返回清理函数
 */
export function setupSuggestionListener(
  callback: (suggestions: Suggestion[]) => void
): () => void {
  const channel = publicSupabase
    .channel('suggestions-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'suggestions'
      },
      async () => {
        // 当有变化时，重新获取所有建议
        const suggestions = await getSuggestions();
        callback(suggestions);
      }
    )
    .subscribe();
  
  // 返回清理函数
  return () => {
    publicSupabase.removeChannel(channel);
  };
}
