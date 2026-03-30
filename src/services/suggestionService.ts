// 建议信箱服务
// 使用 Supabase 实现跨设备实时同步

import { supabase } from '@/lib/supabase';

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
  const { data, error } = await supabase
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
      content: item.message || item.content || '',
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

    const { error } = await supabase
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
  const { count, error } = await supabase
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
  const { error } = await supabase
    .from('suggestions')
    .update({ status: 'read' })
    .eq('id', id);
  
  if (error) {
    console.error('标记已读失败:', error);
    return false;
  }
  
  return true;
}

/**
 * 批量标记建议为已读
 */
export async function markMultipleAsRead(ids: string[]): Promise<boolean> {
  const { error } = await supabase
    .from('suggestions')
    .update({ status: 'read' })
    .in('id', ids);
  
  if (error) {
    console.error('批量标记已读失败:', error);
    return false;
  }
  
  return true;
}

/**
 * 删除建议
 */
export async function deleteSuggestion(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('suggestions')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('删除建议失败:', error);
    return false;
  }
  
  return true;
}

/**
 * 批量删除建议
 */
export async function deleteMultipleSuggestions(ids: string[]): Promise<boolean> {
  const { error } = await supabase
    .from('suggestions')
    .delete()
    .in('id', ids);
  
  if (error) {
    console.error('批量删除建议失败:', error);
    return false;
  }
  
  return true;
}

/**
 * 清空所有建议
 */
export async function clearAllSuggestions(): Promise<boolean> {
  const { error } = await supabase
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
  // 创建实时订阅
  const channel = supabase
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
    supabase.removeChannel(channel);
  };
}
