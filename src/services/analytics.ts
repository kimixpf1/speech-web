// 访问统计服务
// 支持：百度统计、Google Analytics、Supabase、本地统计（作为备份）

// 百度统计 Tracking ID
const BAIDU_TRACKING_ID = 'fde2c5ee85e02a961caa756c4a6e2c88';

/**
 * 获取百度统计 URL
 */
export function getBaiduStatsUrl(): string {
  return `https://tongji.baidu.com/web/10000404390/homepage/index/index.html`;
}

/**
 * 清除访问记录
 * 这个函数已在 supabaseAnalytics.ts 中实现，这里只是重新导出
 */
export async function clearVisitRecords(ids?: string[]): Promise<boolean> {
  // 从 supabaseAnalytics 导入
  const { clearVisitRecords: clearRecords } = await import('./supabaseAnalytics');
  return clearRecords(ids || []);
}