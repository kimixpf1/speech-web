// 建议信箱服务
// 使用 Supabase 实现跨设备实时同步

import { supabase } from '@/lib/supabase';

// Suggestion 类型定义
export interface Suggestion {
  id: string;
  created_at: string;
  name: string;
  email: string;
  message: string;
  content: string;  // 兼容前端显示
  status: 'read' | 'unread';
  date?: string;    // 前端显示日期
  time?: string;    // 前端显示时间
}

/**
 * 获取所有建议
 */
export async function getSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('获取建议失败:', error);
    return [];
  }
  
  // 处理数据，添加 date, time, content 字段
  return (data || []).map(item => {
    const createdAt = new Date(item.created_at);
    return {
      ...item,
      content: item.message || item.content || '',
      date: createdAt.toLocaleDateString('zh-CN'),
      time: createdAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
  });
}

/**
 * 提交新建议
 */
export async function submitSuggestion(name: string, message: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('suggestions')
    .insert({
      id: crypto.randomUUID(),
      name,
      message,
      email: '',
      status: 'unread',
      created_at: new Date().toISOString(),
    });
  
  if (error) {
    console.error('提交建议失败:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
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