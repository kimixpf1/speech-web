import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Check, Clock, Copy, ExternalLink, Loader2, RefreshCw, Settings, Sparkles, TrendingUp, X, ArrowRight } from 'lucide-react';
import type { PendingArticle, SearchLog } from '@/services/pendingArticleService';
import type { Speech } from '@/services/articleServiceEnhanced';

interface TodayStats {
  runCount: number;
  totalFound: number;
  totalNew: number;
}

interface AdminPendingTabProps {
  showAutoSearchPrompt: boolean;
  hasApiKey: boolean;
  preferredApi: 'kimi' | 'deepseek';
  searching: boolean;
  searchMessage: string;
  searchStage: 'idle' | 'triggering' | 'queued' | 'running' | 'completed' | 'failed';
  todayStats: TodayStats;
  searchLogs: SearchLog[];
  pendingArticles: PendingArticle[];
  copiedUrl: string | null;
  kimiApiKey: string;
  deepSeekApiKey: string;
  onDismissAutoSearchPrompt: () => void;
  onOpenApiConfig: () => void;
  onLoadData: () => void;
  onSearch: () => void;
  onCopyUrl: (url: string) => void;
  onApprovePending: (article: PendingArticle) => void;
  onRejectPending: (id: string) => void;
}

type SearchLogArticleItem = {
  title?: string;
  url?: string;
  source?: string;
  matched_title?: string;
  reason?: string;
  reasons?: string[];
};

function formatSearchLogItems(items: SearchLogArticleItem[] | undefined) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map((item) => {
    const extras = [
      item.source ? `来源：${item.source}` : '',
      item.matched_title ? `命中：${item.matched_title}` : '',
      item.reason ? item.reason : '',
      Array.isArray(item.reasons) && item.reasons.length > 0 ? item.reasons.join('；') : '',
    ].filter(Boolean);

    return {
      title: item.title || '未提供标题',
      url: item.url || '',
      extraText: extras.join(' ｜ '),
    };
  });
}

function SearchLogArticleGroup({
  title,
  items,
  emptyText,
}: {
  title: string;
  items?: SearchLogArticleItem[];
  emptyText?: string;
}) {
  const formattedItems = formatSearchLogItems(items);

  return (
    <div className="rounded border border-gray-200 bg-white p-3">
      <div className="text-xs font-medium text-gray-700 mb-2">{title}</div>
      {formattedItems.length === 0 ? (
        <div className="text-xs text-gray-400">{emptyText || '无'}</div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {formattedItems.map((item, index) => (
            <div key={`${title}-${index}`} className="text-xs text-gray-600">
              <div className="font-medium text-gray-700">{item.title}</div>
              {item.extraText && <div className="mt-0.5">{item.extraText}</div>}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex text-blue-600 hover:text-blue-700 break-all"
                >
                  {item.url}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminPendingTab({
  showAutoSearchPrompt,
  hasApiKey,
  preferredApi,
  searching,
  searchMessage,
  searchStage,
  todayStats,
  searchLogs,
  pendingArticles,
  copiedUrl,
  kimiApiKey,
  deepSeekApiKey,
  onDismissAutoSearchPrompt,
  onOpenApiConfig,
  onLoadData,
  onSearch,
  onCopyUrl,
  onApprovePending,
  onRejectPending,
}: AdminPendingTabProps) {
  return (
    <div className="space-y-6">
      {showAutoSearchPrompt && hasApiKey && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800">距离上次搜索已超过 12 小时，是否立即搜索最新文章？</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onDismissAutoSearchPrompt}>
                  稍后
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={onSearch}>
                  立即搜索
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">AI 文章搜索</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onOpenApiConfig} title="配置 AI API Key">
            <Settings className="w-4 h-4 mr-1" />
            API配置
          </Button>
          <Button variant="outline" size="sm" onClick={onLoadData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
            onClick={onSearch}
            disabled={searching}
            title="触发 GitHub Actions 工作流搜索最新文章"
          >
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                搜索中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1" />
                AI搜索
              </>
            )}
          </Button>
        </div>
      </div>

      {searching && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-blue-800 font-medium mb-1">{searchMessage}</p>
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <span>使用 {preferredApi === 'kimi' ? 'Kimi' : 'DeepSeek'} API 搜索中...</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(searchStage === 'completed' || searchStage === 'failed') && !searching && (
        <Card className={searchStage === 'completed' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {searchStage === 'completed' ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
              <p className={searchStage === 'completed' ? 'text-green-700' : 'text-red-700'}>{searchMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">自动定时搜索</span>
            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
              每日 8:00 / 20:00
            </Badge>
          </div>
          <div className="text-xs text-green-700 space-y-1">
            <p>• <strong>GitHub Actions</strong> 每日 8:00 搜昨日、20:00 搜今日</p>
            <p>• <strong>直抓来源</strong> 人民网讲话数据库、新华社/新华网、求是网</p>
            <p>• <strong>Kimi 联网</strong> 作为补漏来源，统一去重后再与文章库比对</p>
            <p>• 最终仅把真正新增的总书记原文放入待审核</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            今日运行总结
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {todayStats.runCount === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">今日暂无搜索记录，点击"立即搜索"开始</div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-700">{todayStats.runCount}</div>
                <div className="text-xs text-blue-600">运行次数</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">{todayStats.totalFound}</div>
                <div className="text-xs text-green-600">搜索到文章</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-700">{todayStats.totalNew}</div>
                <div className="text-xs text-purple-600">新增待审核</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {searchLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              自动搜索执行记录（最近5次）
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {searchLogs.map((log) => (
                <div key={log.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          log.status === 'success' ? 'bg-green-500' : log.status === 'partial_fail' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(log.executed_at).toLocaleString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Shanghai',
                        })}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : log.status === 'partial_fail'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {log.status === 'success' ? '成功' : log.status === 'partial_fail' ? '部分失败' : '失败'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{log.duration_seconds}秒</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white rounded p-2 text-center">
                      <div className="text-gray-500">爬取</div>
                      <div className="font-bold text-gray-700">{log.crawl_count}条</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <div className="text-gray-500">搜索</div>
                      <div className="font-bold text-gray-700">{log.search_count}条</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <div className="text-gray-500">新增</div>
                      <div className="font-bold text-green-600">{log.new_count}条</div>
                    </div>
                  </div>
                  {log.details?.crawler_results && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">爬虫详情：</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(log.details.crawler_results).map(([key, value]: [string, any]) => (
                          <span
                            key={key}
                            className={`text-xs px-2 py-0.5 rounded ${
                              value.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {value.name || key}: {value.count}条
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(log.details?.kimi !== undefined || log.details?.baidu !== undefined) && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">搜索来源：</div>
                      <div className="flex flex-wrap gap-1">
                        {log.details?.kimi !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded ${log.details.kimi > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            Kimi: {log.details.kimi}条
                          </span>
                        )}
                        {log.details?.baidu !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded ${log.details.baidu > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            百度: {log.details.baidu}条
                          </span>
                        )}
                        {log.details?.search_date && (
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                            {log.details.search_date === 'yesterday' ? '搜昨日' : '搜今日'}
                          </span>
                        )}
                        {log.details?.api_used && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {log.details.api_used}
                          </span>
                        )}
                        {log.details?.search_type && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              log.details.search_type === 'auto' ? 'bg-orange-50 text-orange-700' : 'bg-cyan-50 text-cyan-700'
                            }`}
                          >
                            {log.details.search_type === 'auto' ? '定时任务' : '手动搜索'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {(log.details?.source_breakdown || log.details?.merge_summary || log.details?.final_new_articles) && (
                    <details className="mt-2 pt-2 border-t border-gray-200 group">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-gray-500 hover:text-gray-700">
                        <span>筛选说明</span>
                        <span className="text-[11px] text-gray-400 group-open:hidden">展开</span>
                        <span className="text-[11px] text-gray-400 hidden group-open:inline">收起</span>
                      </summary>
                      <div className="mt-2 space-y-2">
                      {log.details?.source_breakdown && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">来源命中：</div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(log.details.source_breakdown).map(([key, value]: [string, any]) => (
                              <span key={key} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {key}: {value}条
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {log.details?.merge_summary && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">筛选说明：</div>
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                              原始候选 {log.details.merge_summary.input_total ?? 0}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700">
                              去重保留 {log.details.merge_summary.kept_count ?? 0}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                              非原文过滤 {log.details.merge_summary.normalized_rejected_count ?? 0}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-700">
                              库内标题重复 {log.details.merge_summary.duplicate_existing_title_count ?? 0}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-700">
                              本轮标题重复 {log.details.merge_summary.duplicate_seen_title_count ?? 0}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-700">
                              本轮链接重复 {log.details.merge_summary.duplicate_seen_url_count ?? 0}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                              校验淘汰 {log.details.merge_summary.validation_rejected_count ?? 0}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                              库内链接过滤 {log.details.existing_url_filtered_count ?? 0}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="grid gap-2 md:grid-cols-2">
                        <SearchLogArticleGroup
                          title="去重保留"
                          items={log.details?.merge_details?.kept_articles}
                          emptyText="没有保留下来的候选"
                        />
                        <SearchLogArticleGroup
                          title="最终新增待审核"
                          items={log.details?.final_new_articles}
                          emptyText="没有新增待审核文章"
                        />
                        <SearchLogArticleGroup
                          title="库内标题重复"
                          items={log.details?.merge_details?.duplicate_existing_title}
                          emptyText="没有因为库内标题重复被过滤的文章"
                        />
                        <SearchLogArticleGroup
                          title="库内链接过滤"
                          items={log.details?.existing_url_filtered}
                          emptyText="没有因为库内已有链接被过滤的文章"
                        />
                        <SearchLogArticleGroup
                          title="非原文/评论过滤"
                          items={log.details?.merge_details?.normalized_rejected}
                          emptyText="没有命中过滤规则"
                        />
                        <SearchLogArticleGroup
                          title="本轮重复或校验淘汰"
                          items={[
                            ...(log.details?.merge_details?.duplicate_seen_title || []),
                            ...(log.details?.merge_details?.duplicate_seen_url || []),
                            ...(log.details?.merge_details?.validation_rejected || []),
                          ]}
                          emptyText="没有本轮重复或校验淘汰的文章"
                        />
                      </div>
                      {log.details?.save_result && (
                        <div className="text-xs text-gray-500">
                          保存结果：尝试写入 {log.details.save_result.attempted_count ?? 0} 条，成功 {log.details.save_result.saved_count ?? 0} 条
                          {log.details.save_result.error ? `，失败原因：${log.details.save_result.error}` : ''}
                        </div>
                      )}
                      </div>
                    </details>
                  )}
                  {log.details?.search_results && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">搜索详情：</div>
                      <div className="text-xs text-gray-600">
                        {log.details.search_results.overall_status === 'skipped'
                          ? '跳过（Playwright未安装）'
                          : log.details.search_results.overall_status === 'failed'
                            ? `失败: ${log.details.search_results.error || '未知错误'}`
                            : `状态: ${log.details.search_results.overall_status || '完成'}`}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!kimiApiKey && !deepSeekApiKey && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-yellow-700 text-sm">
              未配置 AI API Key，点击"API配置"按钮设置 Kimi 或 DeepSeek API Key 以使用 AI 搜索功能。
            </p>
            <Button size="sm" className="mt-2" onClick={onOpenApiConfig}>
              <Settings className="w-4 h-4 mr-1" />
              立即配置
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-800">AI API 状态</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${kimiApiKey ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">Kimi {kimiApiKey ? '已配置' : '未配置'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${deepSeekApiKey ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">DeepSeek {deepSeekApiKey ? '已配置' : '未配置'}</span>
              </div>
              {(kimiApiKey || deepSeekApiKey) && (
                <Badge variant="outline" className="text-xs">
                  优先: {preferredApi === 'kimi' ? 'Kimi' : 'DeepSeek'}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {pendingArticles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无新发现的文章</p>
            <p className="text-gray-400 text-sm mt-1">点击"立即搜索"使用 AI 搜索最新文章</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">共 {pendingArticles.length} 篇待处理</p>
          {pendingArticles.map((article) => (
            <Card key={article.id} className="border-l-4 border-l-purple-400 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-600">{article.date}</span>
                      <Badge variant="outline" className="text-xs">{article.categoryName || '重要讲话'}</Badge>
                      <Badge variant="secondary" className="text-xs">{article.source || '官方媒体'}</Badge>
                      {article.discovered_by && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                          {article.discovered_by === 'crawl' ? '自动爬取' : '搜索发现'}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{article.title}</h3>
                    {article.summary && article.summary !== article.title && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-1">{article.summary}</p>
                    )}
                    {article.url && (
                      <div className="flex items-center gap-2 mt-1">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1 truncate max-w-md"
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          {article.url}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {article.url && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => onCopyUrl(article.url!)}>
                        <Copy className="w-3 h-3 mr-1" />
                        {copiedUrl === article.url ? '已复制' : '复制URL'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                      onClick={() => onApprovePending(article)}
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      新增到系统
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-gray-400 hover:text-red-600"
                      onClick={() => onRejectPending(article.id)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      忽略
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
