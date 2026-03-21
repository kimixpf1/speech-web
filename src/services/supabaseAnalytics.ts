// Supabase 实时统计服务
// 使用 Supabase 免费数据库存储和展示访问数据
// 官网：https://supabase.com/

// ============================================
// 配置 - 请修改为你的 Supabase 项目信息
// ============================================

// Supabase 项目 URL
const SUPABASE_URL = 'https://ejeiuqcmkznfbglvbkbe.supabase.co';

// Supabase 匿名密钥（Anon Key）
const SUPABASE_ANON_KEY = 'sb_publishable_akyDKiNsa1ZCQcqpTa-3LQ_6SYEfxGg';

// 访问统计表名
const VISITS_TABLE = 'New%20table';

// ============================================
// 类型定义
// ============================================

export interface VisitRecord {
  timestamp: string;
  date: string;
  time: string;
  page: string;
  browser: string;
  os: string;
  device: string;
  screenSize?: string;
  referrer: string;
}

export interface RealtimeStats {
  totalVisits: number;
  todayVisits: number;
  weekVisits: number;
  monthVisits: number;
  uniqueVisitors: number;
  onlineUsers: number;
  browsers: Record<string, number>;
  os: Record<string, number>;
  devices: Record<string, number>;
  pages: Record<string, number>;
  hourlyStats: number[];
  dailyStats: { date: string; count: number }[];
  recentVisits: VisitRecord[];
}

// ============================================
// 工具函数
// ============================================

/**
 * 检查 Supabase 是否已配置
 */
export function isSupabaseConfigured(): boolean {
  return true; // 已配置
}

/**
 * 获取浏览器信息
 */
function getBrowserInfo(): { browser: string; os: string; device: string } {
  const ua = navigator.userAgent;
  let browser = '未知浏览器';
  let os = '未知系统';
  let device = '桌面设备';

  // 检测浏览器
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // 检测操作系统
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // 检测设备类型
  if (/(iPhone|Android.*Mobile)/.test(ua)) device = '手机';
  else if (/(iPad|Android(?!.*Mobile))/.test(ua)) device = '平板';

  return { browser, os, device };
}

/**
 * 生成稳定的访客ID（用于统计独立访客）
 * 基于设备指纹，同一设备始终生成相同的ID
 * 不包含任何时间因素，确保同一设备多次访问不会被计为多个访客
 */
function generateVisitorId(): string {
  // 优先使用已持久化的访客ID
  const storedId = localStorage.getItem('stable_visitor_id');
  if (storedId) {
    return storedId;
  }

  // 基于稳定的设备特征生成指纹
  const components = [
    navigator.userAgent,
    navigator.language,
    `${window.screen.width}x${window.screen.height}`,
    String(screen.colorDepth),
    String(new Date().getTimezoneOffset()),
    String(navigator.hardwareConcurrency || 'unknown'),
  ];

  const fingerprint = components.join('::');
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const visitorId = Math.abs(hash).toString(16).padStart(8, '0');

  // 持久化到 localStorage，确保同一浏览器始终使用相同ID
  try {
    localStorage.setItem('stable_visitor_id', visitorId);
  } catch {
    // localStorage 不可用时忽略
  }

  return visitorId;
}

// ============================================
// API 调用
// ============================================

/**
 * 记录访问到 Supabase
 */
export async function recordSupabaseVisit(page: string = '首页'): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { browser, os, device } = getBrowserInfo();
    const now = new Date();
    
    // 构建与 Supabase 表结构匹配的 payload
    const payload = {
      timestamp: now.toISOString(),
      date: now.toLocaleDateString('zh-CN'),
      time: now.toLocaleTimeString('zh-CN'),
      page,
      browser,
      os,
      device,
      screen_size: `${window.screen.width}x${window.screen.height}`,
      referrer: document.referrer || '直接访问',
      ip_hash: generateVisitorId(),
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${VISITS_TABLE}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase 记录访问失败:', errorText);
    }

    return response.ok;
  } catch (error) {
    console.error('记录访问到 Supabase 失败:', error);
    return false;
  }
}

/**
 * 获取实时统计数据
 */
export async function getSupabaseStats(): Promise<RealtimeStats | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    // 获取所有访问记录（限制最近 1000 条，按时间倒序）
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${VISITS_TABLE}?select=*&order=timestamp.desc&limit=1000`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const rawVisits = await response.json();
    // 映射 Supabase 字段到前端字段
    const visits: VisitRecord[] = rawVisits.map((item: any) => ({
      timestamp: item.timestamp,
      date: item.date,
      time: item.time,
      page: item.page || '首页',
      browser: item.browser || '未知浏览器',
      os: item.os || '未知系统',
      device: item.device || '桌面设备',
      screenSize: item.screen_size || '',
      referrer: item.referrer || '直接访问',
      ip_hash: item.ip_hash || '',
    }));
    
    if (visits.length === 0) {
      return {
        totalVisits: 0,
        todayVisits: 0,
        weekVisits: 0,
        monthVisits: 0,
        uniqueVisitors: 0,
        onlineUsers: 0,
        browsers: {},
        os: {},
        devices: {},
        pages: {},
        hourlyStats: new Array(24).fill(0),
        dailyStats: [],
        recentVisits: [],
      };
    }

    // 计算统计数据
    const now = new Date();
    const today = now.toLocaleDateString('zh-CN');
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // 统计独立访客（基于 ip_hash 去重，排除 null 和空字符串）
    const uniqueIpHashes = new Set(
      rawVisits
        .map((v: any) => v.ip_hash)
        .filter((ip: any) => ip && ip !== null && ip !== '' && ip !== 'null')
    );

    const stats: RealtimeStats = {
      totalVisits: visits.length,
      todayVisits: 0,
      weekVisits: 0,
      monthVisits: 0,
      uniqueVisitors: uniqueIpHashes.size,
      onlineUsers: 0,
      browsers: {},
      os: {},
      devices: {},
      pages: {},
      hourlyStats: new Array(24).fill(0),
      dailyStats: [],
      recentVisits: visits.slice(0, 50),
    };

    // 统计
    const dailyCounts: Record<string, number> = {};
    
    visits.forEach(visit => {
      const visitDate = new Date(visit.timestamp);
      const dateStr = visit.date;

      // 今日访问
      if (dateStr === today) {
        stats.todayVisits++;
      }

      // 本周访问
      if (visitDate > weekAgo) {
        stats.weekVisits++;
      }

      // 本月访问
      if (visitDate > monthAgo) {
        stats.monthVisits++;
      }

      // 在线用户（5分钟内）
      if (visitDate > fiveMinutesAgo) {
        stats.onlineUsers++;
      }

      // 浏览器统计
      stats.browsers[visit.browser] = (stats.browsers[visit.browser] || 0) + 1;

      // 系统统计
      stats.os[visit.os] = (stats.os[visit.os] || 0) + 1;

      // 设备统计
      stats.devices[visit.device] = (stats.devices[visit.device] || 0) + 1;

      // 页面统计
      stats.pages[visit.page] = (stats.pages[visit.page] || 0) + 1;

      // 时段统计
      const hour = visitDate.getHours();
      stats.hourlyStats[hour]++;

      // 每日统计
      dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
    });

    // 转换每日统计为数组（最近7天）
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString('zh-CN');
      stats.dailyStats.push({
        date: dateStr,
        count: dailyCounts[dateStr] || 0,
      });
    }

    return stats;
  } catch (error) {
    console.error('获取 Supabase 统计失败:', error);
    return null;
  }
}

/**
 * 获取最近访问记录
 */
export async function getSupabaseRecentVisits(limit: number = 50): Promise<VisitRecord[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${VISITS_TABLE}?select=*&order=timestamp.desc&limit=1000`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch recent visits');
    }

    const data = await response.json();
    // 映射 Supabase 字段到前端字段
    const mappedData = data.map((item: any) => ({
      timestamp: item.timestamp,
      date: item.date,
      time: item.time,
      page: item.page || '首页',
      browser: item.browser || '未知浏览器',
      os: item.os || '未知系统',
      device: item.device || '桌面设备',
      screenSize: item.screen_size || '',
      referrer: item.referrer || '直接访问',
      ip_hash: item.ip_hash || '',
    }));
    
    // 去重：基于 ip_hash 去重，只保留每个访客的最新记录（排除空 ip_hash）
    const ipHashMap = new Map<string, any>();
    mappedData.forEach((item: any) => {
      // 跳过空 ip_hash
      if (!item.ip_hash || item.ip_hash === '' || item.ip_hash === 'null') {
        return;
      }
      const existing = ipHashMap.get(item.ip_hash);
      // 只保留该 ip_hash 的最新记录（timestamp 更大）
      if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
        ipHashMap.set(item.ip_hash, item);
      }
    });
    
    // 转换为数组并按时间倒序排序
    const uniqueData = Array.from(ipHashMap.values()).sort((a: any, b: any) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    return uniqueData.slice(0, limit);
  } catch (error) {
    console.error('获取 Supabase 最近访问失败:', error);
    return [];
  }
}

/**
 * 初始化 Supabase 统计
 * 同一会话只记录一次访问
 */
export function initSupabaseAnalytics(): void {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase Analytics] 未配置，跳过初始化');
    return;
  }

  // 检查当前会话是否已记录
  const sessionKey = 'supabase_session_visited';
  if (sessionStorage.getItem(sessionKey) === 'true') {
    console.log('[Supabase Analytics] 当前会话已记录，跳过');
    return;
  }

  // 延迟记录访问，确保页面加载完成
  setTimeout(() => {
    recordSupabaseVisit('首页');
    sessionStorage.setItem(sessionKey, 'true');
  }, 1000);

  console.log('[Supabase Analytics] 已初始化');
}
