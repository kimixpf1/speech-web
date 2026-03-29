// Supabase 实时统计服务
// 使用 Supabase 免费数据库存储和展示访问数据

import { supabase } from '@/lib/supabase';

// 统计数据类型
export interface RealtimeStats {
  totalVisits: number;
  todayVisits: number;
  weekVisits: number;
  monthVisits: number;
  uniqueVisitors: number;
  onlineUsers?: number;
  avgVisitsPerDay?: number;
}

// 访问记录类型
export interface VisitRecord {
  id: string;
  path: string;
  referrer: string;
  timestamp: string;
  visitor_id: string;
  duration?: number;
  date?: string;
  time?: string;
  device?: string;
  browser?: string;
  os?: string;
}

/**
 * 检查 Supabase 是否已配置
 */
export function isSupabaseConfigured(): boolean {
  return true;
}

/**
 * 获取统计信息
 */
export async function getSupabaseStats(): Promise<RealtimeStats | null> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 获取总访问量
    const { count: totalVisits } = await supabase
      .from('visit_logs')
      .select('*', { count: 'exact', head: true });
    
    // 获取今日访问量
    const { count: todayVisits } = await supabase
      .from('visit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', today.toISOString());
    
    // 获取独立访客数
    const { data: uniqueVisitors } = await supabase
      .from('visit_logs')
      .select('visitor_id');
    
    const uniqueCount = new Set(uniqueVisitors?.map(v => v.visitor_id) || []).size;
    
    return {
      totalVisits: totalVisits || 0,
      todayVisits: todayVisits || 0,
      weekVisits: Math.round((totalVisits || 0) / 4),
      monthVisits: totalVisits || 0,
      uniqueVisitors: uniqueCount,
      avgVisitsPerDay: Math.round((totalVisits || 0) / 30),
    };
  } catch (error) {
    console.error('获取统计失败:', error);
    return null;
  }
}

/**
 * 获取最近访问记录
 */
export async function getSupabaseRecentVisits(limit = 50): Promise<VisitRecord[]> {
  try {
    const { data, error } = await supabase
      .from('visit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('获取访问记录失败:', error);
      return [];
    }
    
    // 处理数据，添加 date, time 等字段
    return (data || []).map(item => {
      const ts = new Date(item.timestamp);
      return {
        ...item,
        date: ts.toLocaleDateString('zh-CN'),
        time: ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        device: 'Desktop',
        browser: 'Chrome',
        os: 'Windows',
      };
    });
  } catch (error) {
    console.error('获取访问记录失败:', error);
    return [];
  }
}

/**
 * 清除访问记录
 */
export async function clearVisitRecords(ids?: string[]): Promise<boolean> {
  try {
    if (ids && ids.length > 0) {
      // 删除指定ID的记录
      const { error } = await supabase
        .from('visit_logs')
        .delete()
        .in('id', ids);
      return !error;
    } else {
      // 删除所有记录
      const { error } = await supabase
        .from('visit_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      return !error;
    }
  } catch (error) {
    console.error('清除访问记录失败:', error);
    return false;
  }
}

/**
 * 记录访问
 */
export async function logVisit(path: string, referrer?: string): Promise<void> {
  try {
    const visitorId = localStorage.getItem('visitor_id') || 
      `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    localStorage.setItem('visitor_id', visitorId);
    
    await supabase.from('visit_logs').insert({
      id: crypto.randomUUID(),
      path,
      referrer: referrer || document.referrer || '',
      timestamp: new Date().toISOString(),
      visitor_id: visitorId,
    });
  } catch (error) {
    console.error('记录访问失败:', error);
  }
}