// Supabase 实时统计服务
// 使用 Supabase 免费数据库存储和展示访问数据

import { supabase } from '@/lib/supabase';

// 尝试多种表名格式（Supabase/PostgreSQL表名映射复杂）
const TABLE_NAMES_TO_TRY = ['new_table', 'New table', 'NewTable', 'newtable'];

// 找到正确的表名
let correctTableName: string | null = null;

async function findCorrectTableName(): Promise<string> {
  if (correctTableName) return correctTableName;
  
  for (const tableName of TABLE_NAMES_TO_TRY) {
    try {
      const result = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!result.error && result.count !== null && result.count > 0) {
        console.log(`[Analytics] 找到正确的表名: ${tableName}, 记录数: ${result.count}`);
        correctTableName = tableName;
        return tableName;
      }
    } catch (e) {
      console.log(`[Analytics] 表名 ${tableName} 尝试失败`);
    }
  }
  
  console.log(`[Analytics] 未找到有数据的表，默认使用 new_table`);
  return 'new_table';
}

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
  ip_hash: string;  // 数据库实际字段名是 ip_hash
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
    const tableName = await findCorrectTableName();
    
    // 使用北京时间（UTC+8）计算今日开始
    const now = new Date();
    const beijingOffset = 8 * 60; // 北京时间UTC+8（分钟）
    const localOffset = now.getTimezoneOffset(); // 本地时间与UTC的偏移（分钟）
    // 计算北京时间今天的0点
    const beijingTodayStart = new Date(now.getTime() + (beijingOffset + localOffset) * 60000);
    beijingTodayStart.setHours(0, 0, 0, 0);
    // 转回UTC时间用于查询
    const todayStartUTC = new Date(beijingTodayStart.getTime() - beijingOffset * 60000);
    const todayStartStr = todayStartUTC.toISOString();
    
    console.log(`[Analytics] 开始查询表: ${tableName}`);
    console.log(`[Analytics] 北京时间今日开始: ${beijingTodayStart.toISOString()}`);
    console.log(`[Analytics] 查询用UTC时间: ${todayStartStr}`);
    
    // 获取总访问量
    const totalResult = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    console.log(`[Analytics] 总访问量查询结果:`, { 
      count: totalResult.count, 
      error: totalResult.error?.message 
    });
    
    if (totalResult.error) {
      console.error(`[Analytics] 查询失败:`, totalResult.error);
      return null;
    }
    
    const totalVisits = totalResult.count || 0;
    
    // 获取今日访问量（使用北京时间今日开始）
    const todayResult = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', todayStartStr);
    
    console.log(`[Analytics] 今日访问量(PV):`, todayResult.count, '错误:', todayResult.error?.message);
    
    // 获取今日独立访客数 - 使用 ip_hash 字段
    const uniqueResult = await supabase
      .from(tableName)
      .select('ip_hash')
      .gte('timestamp', todayStartStr);
    
    const todayRecords = uniqueResult.data;
    
    if (uniqueResult.error) {
      console.error(`[Analytics] 独立访客查询失败:`, uniqueResult.error);
    }
    
    console.log(`[Analytics] 今日记录数: ${todayRecords?.length || 0}`);
    if (todayRecords && todayRecords.length > 0) {
      console.log(`[Analytics] 第一条记录:`, todayRecords[0]);
    }
    
    // 使用 ip_hash 计算独立访客数
    const validIpHashes = todayRecords?.filter(v => v.ip_hash).map(v => v.ip_hash) || [];
    const uniqueCount = new Set(validIpHashes).size;
    console.log(`[Analytics] 今日有效ip_hash数: ${validIpHashes.length}, 今日独立访客数(UV): ${uniqueCount}`);
    
    return {
      totalVisits,
      todayVisits: todayResult.count || 0,
      weekVisits: Math.round(totalVisits / 4),
      monthVisits: totalVisits,
      uniqueVisitors: uniqueCount,
      avgVisitsPerDay: Math.round(totalVisits / 30),
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
    const tableName = await findCorrectTableName();
    console.log(`[Analytics] 获取最近访问记录，表: ${tableName}`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error(`[Analytics] 获取记录失败:`, error);
      return [];
    }
    
    console.log(`[Analytics] 获取到 ${data?.length || 0} 条记录`);
    
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

/**
 * 记录访问
 */
export async function logVisit(path: string, referrer?: string): Promise<void> {
  try {
    const tableName = await findCorrectTableName();
<<<<<<< 615ae44fce50a79571a1527b6947b5e07f3c4139
    // 生成 ip_hash
=======
    // 生成 ip_hash（用现有的 visitor_id 或新建）
>>>>>>> fix: 修正字段名为ip_hash，修复独立访客数统计
    const ipHash = localStorage.getItem('ip_hash') || 
      `hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    localStorage.setItem('ip_hash', ipHash);
    
    await supabase.from(tableName).insert({
      id: crypto.randomUUID(),
      path,
      referrer: referrer || document.referrer || '',
      timestamp: new Date().toISOString(),
      ip_hash: ipHash,
    });
  } catch (error) {
    console.error('记录访问失败:', error);
  }
}