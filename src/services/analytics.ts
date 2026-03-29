// 访问统计服务
// 支持：百度统计、Google Analytics、Supabase、本地统计（作为备份）

import { supabase } from '@/lib/supabase';

// 百度统计 Tracking ID
const BAIDU_TRACKING_ID = 'fde2c5ee85e02a961caa756c4a6e2c88';

// 访问记录类型
export interface VisitRecord {
  id: string;
  path: string;
  referrer: string;
  timestamp: string;
  visitor_id: string;
  date?: string;
  time?: string;
}

// 访问统计类型
export interface VisitStats {
  totalVisits: number;
  todayVisits: number;
  uniqueVisitors: number;
}

/**
 * 初始化访问统计
 */
export function initAnalytics(): void {
  // 记录访问
  recordVisit();
}

/**
 * 记录访问
 */
async function recordVisit(): Promise<void> {
  try {
    const visitorId = localStorage.getItem('visitor_id') || 
      `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    localStorage.setItem('visitor_id', visitorId);
    
    await supabase.from('New table').insert({
      id: crypto.randomUUID(),
      path: window.location.pathname,
      referrer: document.referrer || '',
      timestamp: new Date().toISOString(),
      visitor_id: visitorId,
    });
  } catch (error) {
    console.error('记录访问失败:', error);
  }
}

/**
 * 获取百度统计 URL
 */
export function getBaiduStatsUrl(): string {
  return `https://tongji.baidu.com/main/overview/10000713217/overview/index?siteId=22905415`;
}

/**
 * 获取访问记录
 */
export async function getVisitRecords(): Promise<VisitRecord[]> {
  try {
    const { data, error } = await supabase
      .from('New table')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('获取访问记录失败:', error);
      return [];
    }
    
    return (data || []).map(item => ({
      ...item,
      date: new Date(item.timestamp).toLocaleDateString('zh-CN'),
      time: new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }));
  } catch (error) {
    console.error('获取访问记录失败:', error);
    return [];
  }
}

/**
 * 获取访问统计
 */
export async function getVisitStats(): Promise<VisitStats> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 获取总访问量
    const { count: totalVisits } = await supabase
      .from('New table')
      .select('*', { count: 'exact', head: true });
    
    // 获取今日访问量
    const { count: todayVisits } = await supabase
      .from('New table')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', today.toISOString());
    
    // 获取独立访客数
    const { data: uniqueVisitors } = await supabase
      .from('New table')
      .select('visitor_id');
    
    const uniqueCount = new Set(uniqueVisitors?.map(v => v.visitor_id) || []).size;
    
    return {
      totalVisits: totalVisits || 0,
      todayVisits: todayVisits || 0,
      uniqueVisitors: uniqueCount,
    };
  } catch (error) {
    console.error('获取访问统计失败:', error);
    return { totalVisits: 0, todayVisits: 0, uniqueVisitors: 0 };
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
        .from('New table')
        .delete()
        .in('id', ids);
      return !error;
    } else {
      // 删除所有记录（用 neq 不可能存在的值来匹配所有记录）
      const { error } = await supabase
        .from('New table')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      return !error;
    }
  } catch (error) {
    console.error('清除访问记录失败:', error);
    return false;
  }
}
