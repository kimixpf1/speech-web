// 访问统计服务
// 支持：百度统计、Google Analytics、Supabase、本地统计（作为备份）

// ============================================
// 配置 - 请修改为你的 tracking ID
// ============================================

// 百度统计 Tracking ID（从百度统计后台获取）
// 格式如：1234567890abcdef1234567890abcdef
const BAIDU_TRACKING_ID = 'fde2c5ee85e02a961caa756c4a6e2c88';

// Google Analytics Tracking ID（从 Google Analytics 后台获取）
// 格式如：G-XXXXXXXXXX
const GA_TRACKING_ID = 'YOUR_GA_TRACKING_ID';

// Supabase 配置
const SUPABASE_URL = 'https://ejeiuqcmkznfbglvbkbe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_akyDKiNsa1ZCQcqpTa-3LQ_6SYEfxGg';
const USE_SUPABASE_ANALYTICS = true; // 已配置 Supabase
const VISITS_TABLE = 'New%20table'; // 访问统计表名（URL编码）

// ============================================
// 类型定义
// ============================================

export interface VisitRecord {
  id: string;
  timestamp: number;
  date: string;
  time: string;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  screenSize: string;
  language: string;
  referrer: string;
  page: string;
  ip_hash?: string;
}

export interface VisitStats {
  totalVisits: number;
  todayVisits: number;
  weekVisits: number;
  monthVisits: number;
  uniqueVisitors: number;
  browserStats: Record<string, number>;
  osStats: Record<string, number>;
  deviceStats: Record<string, number>;
  hourlyStats: number[];
  dailyStats: { date: string; count: number }[];
}

// ============================================
// 百度统计 API
// ============================================

// 声明百度统计全局变量
declare global {
  interface Window {
    _hmt: any[];
  }
}

/**
 * 发送百度统计页面访问
 */
export function trackBaiduPageView(): void {
  if (typeof window !== 'undefined' && window._hmt) {
    window._hmt.push(['_trackPageview']);
  }
}

/**
 * 发送百度统计自定义事件
 * @param category 事件分类
 * @param action 事件操作
 * @param label 事件标签（可选）
 * @param value 事件值（可选）
 */
export function trackBaiduEvent(category: string, action: string, label?: string, value?: number): void {
  if (typeof window !== 'undefined' && window._hmt) {
    const params: any[] = ['_trackEvent', category, action];
    if (label !== undefined) params.push(label);
    if (value !== undefined) params.push(value);
    window._hmt.push(params);
  }
}

/**
 * 设置百度统计自定义变量
 * @param index 变量索引 (1-5)
 * @param name 变量名称
 * @param value 变量值
 * @param scope 作用域 (1=访客级别, 2=访次级别, 3=页面级别)
 */
export function setBaiduCustomVar(index: number, name: string, value: string, scope: 1 | 2 | 3 = 1): void {
  if (typeof window !== 'undefined' && window._hmt) {
    window._hmt.push(['_setCustomVar', index, name, value, scope]);
  }
}

// ============================================
// Google Analytics API
// ============================================

// 声明 Google Analytics 全局变量
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

/**
 * 发送 Google Analytics 事件
 * @param eventName 事件名称
 * @param params 事件参数
 */
export function trackGAEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

/**
 * 设置 Google Analytics 用户属性
 * @param params 用户属性
 */
export function setGAUserProperties(params: Record<string, any>): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('set', 'user_properties', params);
  }
}

// ============================================
// Supabase 统计
// ============================================

/**
 * 生成稳定的设备指纹作为 ip_hash
 * 同一设备/浏览器始终返回相同的ID，不包含时间因素
 */
function generateDeviceFingerprint(): string {
  // 优先使用已持久化的访客ID
  const storedId = localStorage.getItem('stable_visitor_id');
  if (storedId) {
    return storedId;
  }

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
  ];
  
  const fingerprint = components.join('::');
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const visitorId = Math.abs(hash).toString(16).padStart(8, '0');

  // 持久化
  try {
    localStorage.setItem('stable_visitor_id', visitorId);
  } catch {
    // ignore
  }

  return visitorId;
}

/**
 * 提交访问记录到 Supabase
 */
async function submitVisitToSupabase(visit: VisitRecord): Promise<boolean> {
  try {
    // 生成设备指纹作为 ip_hash
    const ipHash = generateDeviceFingerprint();
    
    // 只使用确认存在的字段
    const payload: any = {
      timestamp: new Date(visit.timestamp).toISOString(),
      date: visit.date,
      time: visit.time,
      browser: visit.browser,
      os: visit.os,
      ip_hash: ipHash, // 添加 ip_hash
    };
    
    // 可选字段（如果表中有这些列）
    if (visit.device) payload.device = visit.device;
    if (visit.referrer) payload.referrer = visit.referrer;
    if (visit.page) payload.page = visit.page;
    
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
      console.error('Supabase 访问统计错误:', errorText);
    }
    return response.ok;
  } catch (error) {
    console.error('提交访问到 Supabase 失败:', error);
    return false;
  }
}

/**
 * 从 Supabase 获取访问记录
 */
async function getVisitsFromSupabase(): Promise<VisitRecord[]> {
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
    if (response.ok) {
      const data = await response.json();
      console.log('[Supabase] 获取到访问记录:', data.length, '条');
      return data.map((item: any) => ({
        id: item.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
        date: item.date || '',
        time: item.time || '',
        userAgent: item.useragent || item.user_agent || '',
        browser: item.browser || '未知浏览器',
        os: item.os || '未知系统',
        device: item.device || '桌面设备',
        screenSize: item.screensize || item.screen_size || '',
        language: item.language || '',
        referrer: item.referrer || '直接访问',
        page: item.page || '首页',
        ip_hash: item.ip_hash || '',
      }));
    } else {
      console.error('[Supabase] 获取访问记录失败:', response.status, await response.text());
    }
    return [];
  } catch (error) {
    console.error('从 Supabase 获取访问失败:', error);
    return [];
  }
}

// ============================================
// 本地统计（作为备份）
// ============================================

// 获取浏览器信息
function getBrowserInfo(): { browser: string; os: string; device: string } {
  const ua = navigator.userAgent;
  let browser = '未知浏览器';
  let os = '未知系统';
  let device = '桌面设备';

  // 检测浏览器
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    browser = 'Opera';
  }

  // 检测操作系统
  if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Mac')) {
    os = 'macOS';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  }

  // 检测设备类型
  if (/(iPhone|Android.*Mobile)/.test(ua)) {
    device = '手机';
  } else if (/(iPad|Android(?!.*Mobile))/.test(ua)) {
    device = '平板';
  }

  return { browser, os, device };
}

// 记录访问到本地
async function recordLocalVisit(page: string = '首页'): Promise<void> {
  try {
    const { browser, os, device } = getBrowserInfo();
    const now = new Date();
    
    const visit: VisitRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now.getTime(),
      date: now.toLocaleDateString('zh-CN'),
      time: now.toLocaleTimeString('zh-CN'),
      userAgent: navigator.userAgent,
      browser,
      os,
      device,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      referrer: document.referrer || '直接访问',
      page,
    };

    // 如果配置了 Supabase，优先提交到 Supabase
    if (USE_SUPABASE_ANALYTICS) {
      const success = await submitVisitToSupabase(visit);
      if (success) {
        // 同步更新本地缓存
        const existingRecordsStr = localStorage.getItem('site_visit_records');
        const existingRecords: VisitRecord[] = existingRecordsStr ? JSON.parse(existingRecordsStr) : [];
        const updatedRecords = [visit, ...existingRecords].slice(0, 500);
        localStorage.setItem('site_visit_records', JSON.stringify(updatedRecords));
        updateVisitStats();
        return;
      }
    }

    // 回退到本地存储
    const existingRecordsStr = localStorage.getItem('site_visit_records');
    const existingRecords: VisitRecord[] = existingRecordsStr ? JSON.parse(existingRecordsStr) : [];
    const updatedRecords = [visit, ...existingRecords].slice(0, 500);
    localStorage.setItem('site_visit_records', JSON.stringify(updatedRecords));
    updateVisitStats();
  } catch (error) {
    console.error('记录本地访问失败:', error);
  }
}

// 获取所有访问记录
export async function getVisitRecords(): Promise<VisitRecord[]> {
  // 如果配置了 Supabase，优先从 Supabase 获取
  if (USE_SUPABASE_ANALYTICS) {
    const supabaseData = await getVisitsFromSupabase();
    if (supabaseData.length > 0) {
      // 同步到 localStorage 以便离线使用
      localStorage.setItem('site_visit_records', JSON.stringify(supabaseData.slice(0, 500)));
      return supabaseData;
    }
  }

  // 回退到 localStorage
  try {
    const records = localStorage.getItem('site_visit_records');
    return records ? JSON.parse(records) : [];
  } catch {
    return [];
  }
}

// 更新访问统计（同步版本，用于本地存储）
function updateVisitStats(): void {
  try {
    const recordsStr = localStorage.getItem('site_visit_records');
    const records: VisitRecord[] = recordsStr ? JSON.parse(recordsStr) : [];
    const stats = calculateStats(records);
    localStorage.setItem('site_visit_stats', JSON.stringify(stats));
  } catch {
    // 忽略错误
  }
}

// 获取访问统计
export async function getVisitStats(): Promise<VisitStats> {
  // 如果配置了 Supabase，从 Supabase 获取数据计算统计
  if (USE_SUPABASE_ANALYTICS) {
    const records = await getVisitsFromSupabase();
    if (records.length > 0) {
      return calculateStats(records);
    }
  }

  // 回退到 localStorage
  try {
    const stats = localStorage.getItem('site_visit_stats');
    if (stats) {
      return JSON.parse(stats);
    }
  } catch {
    // 忽略错误
  }
  
  // 返回默认统计
  return {
    totalVisits: 0,
    todayVisits: 0,
    weekVisits: 0,
    monthVisits: 0,
    uniqueVisitors: 0,
    browserStats: {},
    osStats: {},
    deviceStats: {},
    hourlyStats: new Array(24).fill(0),
    dailyStats: [],
  };
}

// 计算统计数据
function calculateStats(records: VisitRecord[]): VisitStats {
  const now = new Date();
  const today = now.toLocaleDateString('zh-CN');
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const stats: VisitStats = {
    totalVisits: records.length,
    todayVisits: records.filter(r => r.date === today).length,
    weekVisits: records.filter(r => r.timestamp > weekAgo).length,
    monthVisits: records.filter(r => r.timestamp > monthAgo).length,
    uniqueVisitors: new Set(
      records
        .map(r => r.ip_hash || r.userAgent)
        .filter(id => id && id !== '' && id !== 'null')
    ).size,
    browserStats: {},
    osStats: {},
    deviceStats: {},
    hourlyStats: new Array(24).fill(0),
    dailyStats: [],
  };

  // 统计浏览器
  records.forEach(r => {
    stats.browserStats[r.browser] = (stats.browserStats[r.browser] || 0) + 1;
    stats.osStats[r.os] = (stats.osStats[r.os] || 0) + 1;
    stats.deviceStats[r.device] = (stats.deviceStats[r.device] || 0) + 1;
    
    const hour = new Date(r.timestamp).getHours();
    stats.hourlyStats[hour]++;
  });

  // 统计最近 7 天的访问
  const last7Days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toLocaleDateString('zh-CN');
    const count = records.filter(r => r.date === dateStr).length;
    last7Days.push({ date: dateStr, count });
  }
  stats.dailyStats = last7Days;

  return stats;
}

// 清空访问记录
// timestamps: 要删除的记录时间戳数组，如果为空数组则删除所有记录
export async function clearVisitRecords(timestamps?: string[]): Promise<boolean> {
  console.log('开始清空访问记录...');
  
  // 清空 localStorage
  localStorage.removeItem('site_visit_records');
  localStorage.removeItem('site_visit_stats');
  console.log('localStorage 已清空');
  
  // 如果配置了 Supabase，清空 Supabase 表
  if (USE_SUPABASE_ANALYTICS) {
    try {
      // 先获取所有记录
      const records = await getVisitsFromSupabase();
      
      // 确定要删除的记录
      let recordsToDelete = records;
      if (timestamps && timestamps.length > 0) {
        recordsToDelete = records.filter(r => timestamps.includes(String(r.timestamp)));
      }
      
      console.log(`准备删除 ${recordsToDelete.length} 条记录`);
      
      if (recordsToDelete.length === 0) {
        console.log('没有记录需要删除');
        return true;
      }
      
      let successCount = 0;
      let failCount = 0;
      
      // 逐条删除（使用 timestamp 作为唯一标识）
      for (const r of recordsToDelete) {
        try {
          // 使用 timestamp 精确匹配删除
          const timestamp = typeof r.timestamp === 'number' 
            ? new Date(r.timestamp).toISOString() 
            : r.timestamp;
          
          const delResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/${VISITS_TABLE}?timestamp=eq.${encodeURIComponent(timestamp)}`,
            {
              method: 'DELETE',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              },
            }
          );
          
          if (delResponse.ok) {
            successCount++;
          } else {
            failCount++;
            console.error('删除记录失败:', timestamp, await delResponse.text());
          }
        } catch (e) {
          failCount++;
          console.error('删除记录异常:', e);
        }
      }
      
      console.log(`清空完成: 成功 ${successCount} 条, 失败 ${failCount} 条`);
      return successCount > 0;
    } catch (e) {
      console.error('清空 Supabase 失败:', e);
      return false;
    }
  }
  
  return true;
}

// ============================================
// 统一统计接口
// ============================================

/**
 * 记录页面访问
 * 同时发送到百度统计、Google Analytics 和 Supabase/本地存储
 * @param page 页面名称
 * @param pagePath 页面路径（可选）
 */
export async function recordVisit(page: string = '首页', pagePath?: string): Promise<void> {
  const path = pagePath || window.location.pathname;
  
  // 1. 百度统计 - 追踪页面访问
  trackBaiduPageView();
  
  // 2. 百度统计 - 发送自定义事件
  trackBaiduEvent('页面访问', page, path);
  
  // 3. Google Analytics
  trackGAEvent('page_view', { page_title: page, page_location: window.location.href });
  
  // 4. Supabase/本地统计
  await recordLocalVisit(page);
  
  // 5. 设置自定义变量
  const { browser, os, device } = getBrowserInfo();
  setBaiduCustomVar(1, '浏览器', browser);
  setBaiduCustomVar(2, '操作系统', os);
  setBaiduCustomVar(3, '设备类型', device);
  
  // 6. 设置 GA 用户属性
  setGAUserProperties({
    browser,
    os,
    device,
    language: navigator.language,
  });
}

/**
 * 记录自定义事件
 * @param eventName 事件名称
 * @param params 事件参数
 */
export function trackEvent(eventName: string, params?: Record<string, any>): void {
  // 百度统计 - 使用事件分类和操作
  trackBaiduEvent('用户行为', eventName, params ? JSON.stringify(params) : undefined);
  
  // Google Analytics
  trackGAEvent(eventName, params);
  
  console.log('[Analytics]', eventName, params);
}

/**
 * 初始化访问统计
 * 在应用启动时调用 - 同一会话只记录一次访问
 */
export function initAnalytics(): void {
  // 检查是否已经在当前会话中记录过访问
  if (typeof window !== 'undefined') {
    const sessionVisited = sessionStorage.getItem('session_visited');
    if (sessionVisited === 'true') {
      console.log('[Analytics] 当前会话已记录访问，跳过');
      return;
    }
    
    // 延迟执行，确保页面加载完成
    setTimeout(async () => {
      await recordVisit('首页');
      // 标记当前会话已记录访问
      sessionStorage.setItem('session_visited', 'true');
    }, 1000);
  }
}

// ============================================
// 获取第三方统计数据（需要配置 API）
// ============================================

/**
 * 百度统计数据 API
 * 注意：需要后端服务支持，前端无法直接获取
 * 建议：使用百度统计后台查看详细数据
 * 
 * 百度统计后台地址：https://tongji.baidu.com/
 */
export function getBaiduStatsUrl(): string {
  return 'https://tongji.baidu.com/';
}

/**
 * Google Analytics 数据 API
 * 注意：需要后端服务支持，前端无法直接获取
 * 建议：使用 Google Analytics 后台查看详细数据
 * 
 * Google Analytics 后台地址：https://analytics.google.com/
 */
export function getGAStatsUrl(): string {
  return 'https://analytics.google.com/';
}

/**
 * 检查统计服务是否配置完成
 */
export function checkAnalyticsConfig(): { 
  baidu: boolean; 
  ga: boolean; 
  message: string;
} {
  const baiduConfigured = BAIDU_TRACKING_ID.length === 32;
  const gaConfigured = GA_TRACKING_ID.startsWith('G-') && GA_TRACKING_ID.length > 2;
  
  let message = '';
  if (!baiduConfigured && !gaConfigured) {
    message = '请配置百度统计或 Google Analytics 的 tracking ID';
  } else if (baiduConfigured && !gaConfigured) {
    message = '已配置百度统计';
  } else if (!baiduConfigured && gaConfigured) {
    message = '已配置 Google Analytics';
  } else {
    message = '已配置百度统计和 Google Analytics';
  }
  
  return { baidu: baiduConfigured, ga: gaConfigured, message };
}
