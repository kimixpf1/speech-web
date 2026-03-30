// Supabase 实时统计服务
// 使用 Supabase 免费数据库存储和展示访问数据

import { supabase } from '@/lib/supabase';

const TABLE_NAMES_TO_TRY = ['new_table', 'New table', 'NewTable', 'newtable'];
const TABLE_NAME_CACHE_KEY = 'supabase_analytics_table_name';

let correctTableName: string | null = null;

function getCachedTableName() {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(TABLE_NAME_CACHE_KEY);
}

function saveCachedTableName(tableName: string) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(TABLE_NAME_CACHE_KEY, tableName);
}

async function findCorrectTableName(): Promise<string> {
  if (correctTableName) return correctTableName;

  const cachedTableName = getCachedTableName();
  const tableNames = cachedTableName
    ? [cachedTableName, ...TABLE_NAMES_TO_TRY.filter(name => name !== cachedTableName)]
    : TABLE_NAMES_TO_TRY;

  for (const tableName of tableNames) {
    try {
      const result = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!result.error && result.count !== null) {
        console.log(`[Analytics] 找到正确的表名: ${tableName}, 记录数: ${result.count}`);
        correctTableName = tableName;
        saveCachedTableName(tableName);
        return tableName;
      }
    } catch (e) {
      console.log(`[Analytics] 表名 ${tableName} 尝试失败`);
    }
  }
  
  console.log(`[Analytics] 未找到有数据的表，默认使用 new_table`);
  saveCachedTableName('new_table');
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

function getBeijingDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  const day = Number(parts.find(part => part.type === 'day')?.value);
  return { year, month, day };
}

function getBeijingDateString(date = new Date()) {
  const { year, month, day } = getBeijingDateParts(date);
  return `${year}/${month}/${day}`;
}

function getBeijingBoundaryIso(type: 'day' | 'week' | 'month', date = new Date()) {
  const { year, month, day } = getBeijingDateParts(date);
  const beijingDate = new Date(Date.UTC(year, month - 1, day));

  if (type === 'week') {
    const dayOfWeek = beijingDate.getUTCDay() || 7;
    beijingDate.setUTCDate(beijingDate.getUTCDate() - (dayOfWeek - 1));
  }

  if (type === 'month') {
    beijingDate.setUTCDate(1);
  }

  return new Date(Date.UTC(
    beijingDate.getUTCFullYear(),
    beijingDate.getUTCMonth(),
    beijingDate.getUTCDate(),
    -8,
    0,
    0,
    0
  )).toISOString();
}

/**
 * 获取统计信息
 */
export async function getSupabaseStats(): Promise<RealtimeStats | null> {
  try {
    const tableName = await findCorrectTableName();

    const beijingDateString = getBeijingDateString();
    const weekStartIso = getBeijingBoundaryIso('week');
    const monthStartIso = getBeijingBoundaryIso('month');

    const totalResult = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (totalResult.error) {
      console.error(`[Analytics] 查询失败:`, totalResult.error);
      return null;
    }

    const totalVisits = totalResult.count || 0;

    const todayResult = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('date', beijingDateString);

    const uniqueResult = await supabase
      .from(tableName)
      .select('ip_hash')
      .eq('date', beijingDateString);

    const weekResult = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', weekStartIso);

    const monthResult = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', monthStartIso);

    const todayRecords = uniqueResult.data;

    if (uniqueResult.error) {
      console.error(`[Analytics] 独立访客查询失败:`, uniqueResult.error);
    }

    const validIpHashes = todayRecords?.filter(v => v.ip_hash).map(v => v.ip_hash) || [];
    const uniqueCount = new Set(validIpHashes).size;

    const monthVisits = monthResult.count || 0;
    const currentDayOfMonth = getBeijingDateParts().day;

    return {
      totalVisits,
      todayVisits: todayResult.count || 0,
      weekVisits: weekResult.count || 0,
      monthVisits,
      uniqueVisitors: uniqueCount,
      avgVisitsPerDay: currentDayOfMonth > 0 ? Math.round(monthVisits / currentDayOfMonth) : 0,
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
        date: item.date || ts.toLocaleDateString('zh-CN'),
        time: item.time || ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        device: item.device || 'Unknown',
        browser: item.browser || 'Unknown',
        os: item.os || 'Unknown',
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
 * 简单的浏览器指纹生成器，用于替代真实的 IP，更准确地统计独立访客
 */
function generateBrowserFingerprint(): string {
  if (typeof window === 'undefined') return `hash_${Date.now()}`;
  
  const screen = window.screen;
  const nav = navigator;
  
  const components = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || 'unknown',
    nav.deviceMemory || 'unknown',
  ];
  
  const fingerprintString = components.join('|||');
  
  let hash = 5381;
  for (let i = 0; i < fingerprintString.length; i++) {
    hash = ((hash << 5) + hash) + fingerprintString.charCodeAt(i);
  }
  
  return `fp_${Math.abs(hash).toString(16)}`;
}

/**
 * 记录访问 - 增强版（收集更多信息）
 */
export async function logVisit(path: string, referrer?: string): Promise<void> {
  try {
    const tableName = await findCorrectTableName();
    
    // 优先使用长期存储的 localStorage，其次使用指纹，如果都不行再生成随机数
    let ipHash = localStorage.getItem('visitor_id');
    
    if (!ipHash) {
      const oldHash = localStorage.getItem('ip_hash');
      if (oldHash && oldHash.startsWith('fp_')) {
        ipHash = oldHash;
      } else {
        ipHash = generateBrowserFingerprint();
      }
      localStorage.setItem('visitor_id', ipHash);
      localStorage.setItem('ip_hash', ipHash);
    }
    
    const now = new Date();
    
    // 解析 user agent
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Safari/')) browser = 'Safari';
    
    let os = 'Unknown';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'MacOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';
    
    let device = 'Desktop';
    if (/Mobi|Android/i.test(ua)) device = 'Mobile';

    const insertData = {
      path,
      referrer: referrer || document.referrer || '直接访问',
      timestamp: now.toISOString(),
      ip_hash: ipHash,
      date: now.toLocaleDateString('zh-CN'),
      time: now.toLocaleTimeString('zh-CN'),
      page: document.title || '首页',
      browser,
      os,
      device,
      screen_size: `${window.innerWidth}x${window.innerHeight}`
    };

    const { error } = await supabase.from(tableName).insert(insertData);
    if (error) {
      console.error('记录访问失败:', error);
    }
  } catch (error) {
    console.error('记录访问异常:', error);
  }
}
