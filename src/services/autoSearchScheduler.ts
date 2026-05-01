/**
 * 自动搜索调度器 - 嵌入式定时搜索服务
 * 早8点搜索昨日内容，晚8点搜索今日内容
 */

import { searchArticles, setLastSearchTime } from './aiSearchService';
import type { SearchedArticle } from './aiSearchService';

// 存储键
const AUTO_SEARCH_CONFIG_KEY = 'auto_search_config';
const LAST_SEARCH_SLOT_KEY = 'last_search_slot'; // 记录上次搜索时段

// 时段定义
type SearchSlot = 'morning' | 'evening' | null;

// 状态
let isSearching = false;
let lastCheckTime = 0;

export interface AutoSearchConfig {
  enabled: boolean;
  kimiApiKey?: string;
  deepSeekApiKey?: string;
}

export interface AutoSearchStatus {
  enabled: boolean;
  isSearching: boolean;
  currentSlot: SearchSlot;
  lastSearchSlot: SearchSlot;
  nextSearchTime: string;
}

/**
 * 获取当前北京时间时段
 */
function getCurrentSlot(): SearchSlot {
  const hour = new Date().getUTCHours() + 8;
  const bjHour = hour >= 24 ? hour - 24 : hour;
  
  if (bjHour >= 7 && bjHour < 10) {
    return 'morning';
  }
  if (bjHour >= 19 && bjHour < 22) {
    return 'evening';
  }
  return null;
}

/**
 * 获取上次搜索时段
 */
function getLastSearchSlot(): SearchSlot {
  return (localStorage.getItem(LAST_SEARCH_SLOT_KEY) as SearchSlot) || null;
}

/**
 * 设置上次搜索时段
 */
function setLastSearchSlot(slot: SearchSlot): void {
  if (slot) {
    localStorage.setItem(LAST_SEARCH_SLOT_KEY, slot);
  }
}

/**
 * 获取下次搜索时间描述
 */
function getNextSearchTimeDesc(): string {
  const bjHour = (new Date().getUTCHours() + 8) % 24;
  
  if (bjHour < 7) {
    return `今天早8点 (约${7 - bjHour}小时后)`;
  } else if (bjHour < 19) {
    return `今天晚8点 (约${19 - bjHour}小时后)`;
  } else {
    return `明天早8点 (约${31 - bjHour}小时后)`;
  }
}

export function getAutoSearchConfig(): AutoSearchConfig {
  const stored = localStorage.getItem(AUTO_SEARCH_CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { enabled: true };
    }
  }
  return { enabled: true };
}

export function saveAutoSearchConfig(config: Partial<AutoSearchConfig>): void {
  const current = getAutoSearchConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(AUTO_SEARCH_CONFIG_KEY, JSON.stringify(updated));
}

/**
 * 判断是否应该执行自动搜索
 * 规则：当前在搜索时段 且 上次搜索不是同一时段
 */
export function shouldRunAutoSearch(): boolean {
  const config = getAutoSearchConfig();
  if (!config.enabled) {
    return false;
  }

  // 避免频繁检查
  const now = Date.now();
  if (now - lastCheckTime < 60 * 1000) {
    return false;
  }
  lastCheckTime = now;

  const currentSlot = getCurrentSlot();
  if (!currentSlot) {
    // 不在搜索时段
    return false;
  }

  const lastSlot = getLastSearchSlot();
  if (lastSlot === currentSlot) {
    // 本时段已搜索过
    console.log(`[自动搜索] ${currentSlot === 'morning' ? '早间' : '晚间'}时段已搜索过`);
    return false;
  }

  console.log(`[自动搜索] 进入${currentSlot === 'morning' ? '早间' : '晚间'}搜索时段，准备执行`);
  return true;
}

/**
 * 执行自动搜索
 */
export async function runAutoSearch(): Promise<{
  success: boolean;
  articles: SearchedArticle[];
  newCount: number;
  error?: string;
}> {
  if (isSearching) {
    console.log('[自动搜索] 搜索进行中，跳过');
    return { success: false, articles: [], newCount: 0, error: '搜索进行中' };
  }

  const config = getAutoSearchConfig();
  
  // 从 localStorage 获取 API Key
  if (!config.kimiApiKey) {
    config.kimiApiKey = localStorage.getItem('kimi_api_key') || undefined;
  }
  if (!config.deepSeekApiKey) {
    config.deepSeekApiKey = localStorage.getItem('deepseek_api_key') || undefined;
  }

  if (!config.kimiApiKey && !config.deepSeekApiKey) {
    console.log('[自动搜索] 未配置 API Key');
    return { success: false, articles: [], newCount: 0, error: '未配置 API Key' };
  }

  isSearching = true;
  const currentSlot = getCurrentSlot();
  const slotName = currentSlot === 'morning' ? '早间' : '晚间';
  
  console.log(`[自动搜索] ========== ${slotName}搜索开始 ==========`);
  console.log(`[自动搜索] 时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log(`[自动搜索] 目标: ${currentSlot === 'morning' ? '昨日' : '今日'}内容`);

  try {
    const result = await searchArticles(
      config.kimiApiKey || null,
      config.deepSeekApiKey || null,
      'auto',
      (message) => console.log(`[自动搜索] ${message}`)
    );

    // 更新搜索时间
    setLastSearchTime(Date.now());
    setLastSearchSlot(currentSlot);
    
    console.log(`[自动搜索] ${slotName}搜索完成！找到 ${result.totalCount} 篇，新增 ${result.newCount} 篇`);
    console.log(`[自动搜索] ========== ${slotName}搜索结束 ==========`);

    return {
      success: result.success,
      articles: result.articles,
      newCount: result.newCount,
      error: result.error,
    };
  } catch (error) {
    console.error(`[自动搜索] ${slotName}搜索失败:`, error);
    return {
      success: false,
      articles: [],
      newCount: 0,
      error: error instanceof Error ? error.message : '未知错误',
    };
  } finally {
    isSearching = false;
  }
}

export function getAutoSearchStatus(): AutoSearchStatus {
  const config = getAutoSearchConfig();
  const currentSlot = getCurrentSlot();
  const lastSlot = getLastSearchSlot();
  
  return {
    enabled: config.enabled,
    isSearching,
    currentSlot,
    lastSearchSlot: lastSlot,
    nextSearchTime: getNextSearchTimeDesc(),
  };
}

/**
 * 初始化自动搜索调度器
 * 每5分钟检查一次是否需要搜索
 */
export function initAutoSearchScheduler(): void {
  const bjHour = (new Date().getUTCHours() + 8) % 24;
  
  console.log('[自动搜索] 调度器初始化');
  console.log(`[自动搜索] 北京时间: ${bjHour}点`);
  console.log(`[自动搜索] 当前时段: ${getCurrentSlot() || '非搜索时段'}`);
  console.log(`[自动搜索] 搜索计划: 早8点(搜昨日) / 晚8点(搜今日)`);

  setTimeout(() => {
    if (shouldRunAutoSearch()) {
      runAutoSearch().catch(e => console.error('[自动搜索] 执行失败:', e));
    }
  }, 5000);

  setInterval(() => {
    if (shouldRunAutoSearch()) {
      runAutoSearch().catch(e => console.error('[自动搜索] 定时执行失败:', e));
    }
  }, 5 * 60 * 1000);
}

export async function triggerManualAutoSearch(): Promise<{
  success: boolean;
  articles: SearchedArticle[];
  newCount: number;
  error?: string;
}> {
  console.log('[自动搜索] 手动触发');
  return runAutoSearch();
}
