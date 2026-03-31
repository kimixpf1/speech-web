// 访问统计服务
// 支持：百度统计、Google Analytics、Supabase、本地统计（作为备份）

import { supabase } from '@/lib/supabase';

// 百度统计 Tracking ID
const BAIDU_TRACKING_ID = 'fde2c5ee85e02a961caa756c4a6e2c88';

const TABLE_NAMES_TO_TRY = ['New table', 'new_table', 'NewTable', 'newtable'];
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
        correctTableName = tableName;
        saveCachedTableName(tableName);
        return tableName;
      }
    } catch (e) {
    }
  }

  correctTableName = TABLE_NAMES_TO_TRY[0];
  saveCachedTableName(correctTableName);
  return correctTableName;
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
 * 简单的浏览器指纹生成器，用于替代真实的 IP，更准确地统计独立访客
 */
function generateBrowserFingerprint(): string {
  if (typeof window === 'undefined') return `hash_${Date.now()}`;
  
  const screen = window.screen;
  const nav = navigator;
  
  // 收集相对稳定的浏览器特征
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
  
  // 简单的字符串哈希函数 (djb2)
  let hash = 5381;
  for (let i = 0; i < fingerprintString.length; i++) {
    hash = ((hash << 5) + hash) + fingerprintString.charCodeAt(i);
  }
  
  // 返回正整数的十六进制字符串
  return `fp_${Math.abs(hash).toString(16)}`;
}

/**
 * 初始化访问统计
 */
export function initAnalytics(): void {
  // 记录访问
  recordVisit();
}

/**
 * 记录访问 - 增强版（收集更多信息）
 */
async function recordVisit(): Promise<void> {
  try {
    const tableName = await findCorrectTableName();
    
    // 优先使用长期存储的 localStorage，其次使用指纹，如果都不行再生成随机数
    let ipHash = localStorage.getItem('visitor_id');
    
    if (!ipHash) {
      // 尝试获取旧版本的 ip_hash
      const oldHash = localStorage.getItem('ip_hash');
      if (oldHash && oldHash.startsWith('fp_')) {
        ipHash = oldHash;
      } else {
        // 生成基于浏览器特征的伪指纹
        ipHash = generateBrowserFingerprint();
      }
      localStorage.setItem('visitor_id', ipHash);
      // 同步更新旧的 key，防止其他地方依赖
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
      path: window.location.pathname || '/',
      referrer: document.referrer || '直接访问',
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
