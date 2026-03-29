import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, RefreshCw, Trash2, Eye, TrendingUp, Users, CheckSquare, Square } from 'lucide-react';
import { getBaiduStatsUrl } from '@/services/analytics';
import type { VisitStats, VisitRecord } from '@/services/supabaseAnalytics';

interface AdminAnalyticsTabProps {
  visitStats: VisitStats | null;
  visitRecords: VisitRecord[];
  selectedVisits: Set<string>;
  onLoadData: () => void;
  onClearVisits: () => void;
  onClearAllVisits: () => void;
  onToggleSelectAll: () => void;
  onToggleSelectVisit: (timestamp: string) => void;
}

export function AdminAnalyticsTab({
  visitStats,
  visitRecords,
  selectedVisits,
  onLoadData,
  onClearVisits,
  onClearAllVisits,
  onToggleSelectAll,
  onToggleSelectVisit,
}: AdminAnalyticsTabProps) {
  const formatNumber = (num: number) => {
    return num >= 10000 ? (num / 10000).toFixed(1) + 'w' : num.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">访问统计</h2>
          <a 
            href={getBaiduStatsUrl()} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            百度统计后台
          </a>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onLoadData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
          {selectedVisits.size > 0 && (
            <Button variant="outline" size="sm" onClick={onClearVisits} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-1" />
              删除选中 ({selectedVisits.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClearAllVisits} className="text-red-600">
            <Trash2 className="w-4 h-4 mr-1" />
            清空全部
          </Button>
        </div>
      </div>

      {visitStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">总访问量</p>
                  <p className="text-3xl font-bold">{formatNumber(visitStats.totalVisits)}</p>
                </div>
                <Eye className="w-10 h-10 text-red-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">今日访问</p>
                  <p className="text-3xl font-bold">{formatNumber(visitStats.todayVisits)}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">本周访问</p>
                  <p className="text-3xl font-bold">{formatNumber(visitStats.weekVisits)}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">独立访客</p>
                  <p className="text-3xl font-bold">{formatNumber(visitStats.uniqueVisitors)}</p>
                </div>
                <Users className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>最近访问记录</CardTitle>
        </CardHeader>
        <CardContent>
          {visitRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 w-10">
                      <button 
                        onClick={onToggleSelectAll}
                        className="flex items-center justify-center"
                      >
                        {selectedVisits.size === visitRecords.length && visitRecords.length > 0 ? (
                          <CheckSquare className="w-5 h-5 text-red-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">时间</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">设备</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">浏览器</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">系统</th>
                  </tr>
                </thead>
                <tbody>
                  {visitRecords.slice(0, 20).map((record, index) => (
                    <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedVisits.has(record.timestamp) ? 'bg-red-50' : ''}`}>
                      <td className="py-3 px-2">
                        <button 
                          onClick={() => onToggleSelectVisit(record.timestamp)}
                          className="flex items-center justify-center"
                        >
                          {selectedVisits.has(record.timestamp) ? (
                            <CheckSquare className="w-5 h-5 text-red-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-sm">{record.date} {record.time}</td>
                      <td className="py-3 px-4 text-sm">{record.device}</td>
                      <td className="py-3 px-4 text-sm">{record.browser}</td>
                      <td className="py-3 px-4 text-sm">{record.os}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">暂无访问记录</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}