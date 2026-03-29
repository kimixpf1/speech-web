// 访问统计服务
// 支持：百度统计、Google Analytics、Supabase、本地统计（作为备份）

import { supabase } from '@/lib/supabase';

// 百度统计 Tracking ID
const BAIDU_TRACKING_ID = 'fde2c5ee85e02a961caa756c4a6e2c88';

// 尝试多种表名格式
const TABLE_NAMES_TO_TRY = ['new_table', 'New table', 'NewTable', 'newtable'];
let correctTableName: string | null = null;

async function findCorrectTableName(): Promise<string> {
  if (correctTableName) return correctTableName;
  
  for (const tableName of TABLE_NAMES_TO_TRY) {
    try {
      const result = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!result.error && result.count !== null && result.count > 0) {
        correctTableName = tableName;
        return tableName;
      }
    } catch (e) {
      // 继续尝试下一个
    }
  }
  return 'new_table';
}

// 访问记录类型
export interface VisitRecord {
  id: string;
  path: string;
  referrer: string;
  timestamp: string;
  ip_hash: string;  // 数据库实际字段名是 ip_hash
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
    const tableName = await findCorrectTableName();
    const ipHash = localStorage.getItem('ip_hash') || 
      `hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    localStorage.setItem('ip_hash', ipHash);
    
    await supabase.from(tableName).insert({
      id: crypto.randomUUID(),
      path: window.location.pathname,
      referrer: document.referrer || '',
      timestamp: new Date().toISOString(),
      ip_hash: ipHash,
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
    const tableName = await findCorrectTableName();
    const { data, error } = await supabase
      .from(tableName)
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
    const tableName = await findCorrectTableName();
    
    // 使用北京时间（UTC+8）计算今日开始
    const now = new Date();
    const beijingOffset = 8 * 60;
    const localOffset = now.getTimezoneOffset();
    const beijingTodayStart = new Date(now.getTime() + (beijingOffset + localOffset) * 60000);
    beijingTodayStart.setHours(0, 0, 0, 0);
    const todayStartUTC = new Date(beijingTodayStart.getTime() - beijingOffset * 60000);
    const todayStartStr = todayStartUTC.toISOString();
    
    // 获取总访问量
    const { count: totalVisits } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    // 获取今日访问量
    const { count: todayVisits } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', todayStartStr);
    
    // 获取今日独立访客数（只查询今天的记录，使用 ip_hash 字段）
    const { data: todayRecords } = await supabase
      .from(tableName)
      .select('ip_hash')
      .gte('timestamp', todayStartStr);
    
    const uniqueCount = new Set(todayRecords?.filter(v => v.ip_hash).map(v => v.ip_hash) || []).size;
    
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
    const tableName = await findCorrectTableName();
    if (ids && ids.length > 0) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .in('id', ids);
      return !error;
    } else {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      return !error;
    }
  } catch (error) {
    console.error('清除访问记录失败:', error);
    return false;
  }
}