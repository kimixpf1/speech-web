// 访问统计服务
// 支持：百度统计、Google Analytics、Supabase、本地统计（作为备份）

import { supabase } from '@/lib/supabase';

// 百度统计 Tracking ID
const BAIDU_TRACKING_ID = 'fde2c5ee85e02a961caa756c4a6e2c88';

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
  return `https://tongji.baidu.com/web/10000404390/homepage/index/index.html`;
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
