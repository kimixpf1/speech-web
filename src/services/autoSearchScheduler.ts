/**
 * 自动搜索调度器 - 嵌入式定时搜索服务
 * 不依赖 GitHub Actions，在用户访问网站时自动触发搜索
 */

import { searchArticles, getRecentSearchLogs, getLastSearchTime, setLastSearchTime, SearchedArticle } from './aiSearchService';
import { supabase } from '@/lib/supabase';

// 配置
const AUTO_SEARCH_INTERVAL_HOURS = 12; // 每12小时自动搜索一次
const MIN_CHECK_INTERVAL_MS = 60 * 1000; // 最小检查间隔1分钟

// 存储键
const AUTO_SEARCH_CONFIG_KEY = 'auto_search_config';
const LAST_CHECK_TIME_KEY = 'last_auto_search_check';

// 状态
let isSearching = false;
let lastCheckTime = 0;

export interface AutoSearchConfig {
  enabled: boolean;
  intervalHours: number;
  kimiApiKey?: string;
  deepSeekApiKey?: string;
}

export interface AutoSearchStatus {
  enabled: boolean;
  isSearching: boolean;
  lastSearchTime: number | null;
  nextSearchTime: number | null;
  lastResult?: {
    success: boolean;
    newCount: number;
    totalCount: number;
    error?: string;
  };
}

export function getAutoSearchConfig(): AutoSearchConfig {
  const stored = localStorage.getItem(AUTO_SEARCH_CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { enabled: false, intervalHours: AUTO_SEARCH_INTERVAL_HOURS };
    }
  }
  return { enabled: true, intervalHours: AUTO_SEARCH_INTERVAL_HOURS };
}

export function saveAutoSearchConfig(config: Partial<AutoSearchConfig>): void {
  const current = getAutoSearchConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(AUTO_SEARCH_CONFIG_KEY, JSON.stringify(updated));
}

export function shouldRunAutoSearch(): boolean {
  const config = getAutoSearchConfig();
  if (!config.enabled) {
    return false;
  }

  const now = Date.now();
  if (now - lastCheckTime < MIN_CHECK_INTERVAL_MS) {
    return false;
  }
  lastCheckTime = now;

  const lastSearchTime = getLastSearchTime();
  if (!lastSearchTime) {
    return true;
  }

  const intervalMs = (config.intervalHours || AUTO_SEARCH_INTERVAL_HOURS) * 60 * 60 * 1000;
  return now - lastSearchTime >= intervalMs;
}

export async function runAutoSearch(): Promise<{
  success: boolean;
  articles: SearchedArticle[];
  newCount: number;
  error?: string;
}> {
  if (isSearching) {
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
    return { success: false, articles: [], newCount: 0, error: '未配置 API Key' };
  }

  isSearching = true;
  console.log('[自动搜索] 开始执行...');

  try {
    const result = await searchArticles(
      config.kimiApiKey || null,
      config.deepSeekApiKey || null,
      'auto',
      (message) => console.log(`[自动搜索] ${message}`)
    );

    setLastSearchTime(Date.now());
    console.log(`[自动搜索] 完成！新增 ${result.newCount} 篇`);

    return {
      success: result.success,
      articles: result.articles,
      newCount: result.newCount,
      error: result.error,
    };
  } catch (error) {
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
  const lastSearchTime = getLastSearchTime();
  
  let nextSearchTime: number | null = null;
  if (config.enabled && lastSearchTime) {
    const intervalMs = (config.intervalHours || AUTO_SEARCH_INTERVAL_HOURS) * 60 * 60 * 1000;
    nextSearchTime = lastSearchTime + intervalMs;
  }

  return {
    enabled: config.enabled,
    isSearching,
    lastSearchTime,
    nextSearchTime,
  };
}

export function initAutoSearchScheduler(): void {
  console.log('[自动搜索] 初始化调度器');
  
  if (shouldRunAutoSearch()) {
    setTimeout(() => {
      runAutoSearch().catch(e => console.error('[自动搜索] 执行失败:', e));
    }, 5000);
  }

  setInterval(() => {
    if (shouldRunAutoSearch()) {
      runAutoSearch().catch(e => console.error('[自动搜索] 定时执行失败:', e));
    }
  }, 10 * 60 * 1000);
}

export async function triggerManualAutoSearch(): Promise<{
  success: boolean;
  articles: SearchedArticle[];
  newCount: number;
  error?: string;
}> {
  return runAutoSearch();
}