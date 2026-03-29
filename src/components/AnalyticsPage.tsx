import { useEffect, useState, useCallback } from 'react';
import { 
  BarChart3, 
  Users, 
  Eye, 
  Calendar, 
  Monitor, 
  Smartphone, 
  Tablet,
  Globe,
  Clock,
  TrendingUp,
  Trash2,
  RefreshCw,
  ArrowLeft,
  BarChart,
  PieChart,
  ExternalLink,
  AlertCircle,
  Radio,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  getVisitRecords, 
  getVisitStats, 
  clearVisitRecords,
  getBaiduStatsUrl,
  type VisitRecord as LocalVisitRecord,
  type VisitStats as LocalVisitStats 
} from '@/services/analytics';
import {
  getSupabaseStats,
  getSupabaseRecentVisits,
  isSupabaseConfigured,
  type RealtimeStats,
  type VisitRecord as SupabaseVisitRecord
} from '@/services/supabaseAnalytics';

interface AnalyticsPageProps {
  onBack: () => void;
}

export function AnalyticsPage({ onBack }: AnalyticsPageProps) {
  // 本地统计数据
  const [localRecords, setLocalRecords] = useState<LocalVisitRecord[]>([]);
  const [localStats, setLocalStats] = useState<LocalVisitStats | null>(null);
  
  // Supabase 实时统计数据
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [realtimeVisits, setRealtimeVisits] = useState<SupabaseVisitRecord[]>([]);
  const [isLoadingRealtime, setIsLoadingRealtime] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'records'>('overview');
  const [dataSource, setDataSource] = useState<'realtime' | 'local'>('realtime');
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 加载本地数据
  const loadLocalData = useCallback(async () => {
    const records = await getVisitRecords();
    const stats = await getVisitStats();
    setLocalRecords(records);
    setLocalStats(stats);
  }, []);

  // 加载实时数据
  const loadRealtimeData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return;
    }
    
    setIsLoadingRealtime(true);
    try {
      const [stats, visits] = await Promise.all([
        getSupabaseStats(),
        getSupabaseRecentVisits(50)
      ]);
      
      if (stats) {
        setRealtimeStats(stats);
        setLastUpdate(new Date());
      }
      if (visits) {
        setRealtimeVisits(visits);
      }
    } catch (error) {
      console.error('加载实时数据失败:', error);
    } finally {
      setIsLoadingRealtime(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadLocalData();
    setSupabaseConfigured(isSupabaseConfigured());
    
    // 如果有 Supabase 配置，加载实时数据
    if (isSupabaseConfigured()) {
      loadRealtimeData();
    }
  }, [loadLocalData, loadRealtimeData]);

  // 自动刷新实时数据（每30秒）
  useEffect(() => {
    if (!isSupabaseConfigured() || dataSource !== 'realtime') {
      return;
    }

    const interval = setInterval(() => {
      loadRealtimeData();
    }, 30000);

    return () => clearInterval(interval);
  }, [dataSource, loadRealtimeData]);

  const handleClear = () => {
    if (confirm('确定要清空所有本地访问记录吗？此操作不可恢复。')) {
      clearVisitRecords();
      loadLocalData();
    }
  };

  const handleRefresh = () => {
    loadLocalData();
    if (isSupabaseConfigured()) {
      loadRealtimeData();
    }
  };

  // 获取设备图标
  const getDeviceIcon = (device: string) => {
    if (device === '手机') return <Smartphone className="w-4 h-4" />;
    if (device === '平板') return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN');
  };

  // 确定要显示的数据
  const displayStats = dataSource === 'realtime' && realtimeStats ? realtimeStats : localStats;
  const displayRecords = dataSource === 'realtime' ? realtimeVisits : localRecords;
  const isRealtime = dataSource === 'realtime' && isSupabaseConfigured();

  if (!localStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="lg"
              onClick={onBack}
              className="text-gray-600 hover:text-red-600"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              返回首页
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">访问统计</h1>
              {isRealtime && (
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  <Radio className="w-3 h-3 mr-1 animate-pulse" />
                  实时
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://tongji.baidu.com/main/overview/10000713217/overview/index?siteId=22905415', '_blank')}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                百度统计
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="text-gray-600 hover:text-red-600"
                disabled={isLoadingRealtime}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingRealtime ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              {dataSource === 'local' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  清空
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 数据源切换 */}
          {supabaseConfigured && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-500">数据来源：</span>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={dataSource === 'realtime' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDataSource('realtime')}
                  className={dataSource === 'realtime' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  <Activity className="w-4 h-4 mr-1" />
                  实时数据
                </Button>
                <Button
                  variant={dataSource === 'local' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDataSource('local')}
                  className={dataSource === 'local' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  <Monitor className="w-4 h-4 mr-1" />
                  本地数据
                </Button>
              </div>
              {lastUpdate && dataSource === 'realtime' && (
                <span className="text-xs text-gray-400">
                  更新于 {lastUpdate.toLocaleTimeString('zh-CN')}
                </span>
              )}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant={activeTab === 'overview' ? 'default' : 'outline'}
              onClick={() => setActiveTab('overview')}
              className={activeTab === 'overview' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <BarChart className="w-4 h-4 mr-2" />
              数据概览
            </Button>
            <Button
              variant={activeTab === 'records' ? 'default' : 'outline'}
              onClick={() => setActiveTab('records')}
              className={activeTab === 'records' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <Eye className="w-4 h-4 mr-2" />
              访问记录
              <Badge variant="secondary" className="ml-2">
                {displayRecords?.length || 0}
              </Badge>
            </Button>
          </div>

          {/* 配置状态提示 */}
          {!supabaseConfigured && (
            <Alert className="mb-6 bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  当前显示的是本地数据。如需查看所有访客的实时数据，请配置 Supabase（免费）。
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* 百度统计入口 */}
          <Card 
            className="mb-6 hover:shadow-md transition-shadow cursor-pointer" 
            onClick={() => window.open(getBaiduStatsUrl(), '_blank')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">百度统计后台</p>
                  <p className="text-sm text-gray-500">查看更详细的访问数据和分析报告</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>

          {activeTab === 'overview' && displayStats && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-100 text-sm">总访问量</p>
                        <p className="text-3xl font-bold">
                          {formatNumber((displayStats as any).totalVisits || 0)}
                        </p>
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
                        <p className="text-3xl font-bold">
                          {formatNumber((displayStats as any).todayVisits || 0)}
                        </p>
                      </div>
                      <Calendar className="w-10 h-10 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">本周访问</p>
                        <p className="text-3xl font-bold">
                          {formatNumber((displayStats as any).weekVisits || 0)}
                        </p>
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
                        <p className="text-3xl font-bold">
                          {formatNumber('uniqueVisitors' in displayStats ? displayStats.uniqueVisitors : 0)}
                        </p>
                      </div>
                      <Users className="w-10 h-10 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 在线人数（仅实时数据） */}
              {isRealtime && 'onlineUsers' in displayStats && displayStats.onlineUsers > 0 && (
                <Card className="mb-8 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <Radio className="w-8 h-8 animate-pulse" />
                      </div>
                      <div className="text-center">
                        <p className="text-white/80 text-sm">当前在线</p>
                        <p className="text-5xl font-bold">{displayStats.onlineUsers}</p>
                        <p className="text-white/60 text-xs">人</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Daily Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-red-600" />
                      近7天访问趋势
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {displayStats.dailyStats && displayStats.dailyStats.length > 0 ? (
                      <div className="space-y-3">
                        {displayStats.dailyStats.map((day, index) => {
                          const maxCount = Math.max(...displayStats.dailyStats.map((d: any) => d.count), 1);
                          const percentage = (day.count / maxCount) * 100;
                          return (
                            <div key={index} className="flex items-center gap-3">
                              <span className="text-sm text-gray-500 w-24 flex-shrink-0">
                                {day.date}
                              </span>
                              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-10 text-right">
                                {day.count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">暂无数据</p>
                    )}
                  </CardContent>
                </Card>

                {/* Hourly Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      24小时访问分布
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {displayStats.hourlyStats && displayStats.hourlyStats.length > 0 ? (
                      <div className="grid grid-cols-6 gap-1">
                        {displayStats.hourlyStats.map((count: number, hour: number) => {
                          const maxCount = Math.max(...displayStats.hourlyStats, 1);
                          const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                          return (
                            <div key={hour} className="flex flex-col items-center">
                              <div 
                                className="w-full bg-blue-500 rounded-t transition-all duration-300"
                                style={{ height: `${Math.max(height, 4)}px` }}
                                title={`${hour}:00 - ${count}次访问`}
                              />
                              <span className="text-xs text-gray-500 mt-1">
                                {hour}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">暂无数据</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Device & Browser Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Device Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-green-600" />
                      设备分布
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(displayStats as any).devices && Object.keys((displayStats as any).devices).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries((displayStats as any).devices)
                          .sort(([,a], [,b]) => (b as number) - (a as number))
                          .map(([device, count]) => (
                            <div key={device} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getDeviceIcon(device)}
                                <span className="text-sm">{device}</span>
                              </div>
                              <Badge variant="secondary">{count as number}</Badge>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">暂无数据</p>
                    )}
                  </CardContent>
                </Card>

                {/* Browser Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      浏览器分布
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(displayStats as any).browsers && Object.keys((displayStats as any).browsers).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries((displayStats as any).browsers)
                          .sort(([,a], [,b]) => (b as number) - (a as number))
                          .map(([browser, count]) => (
                            <div key={browser} className="flex items-center justify-between">
                              <span className="text-sm">{browser}</span>
                              <Badge variant="secondary">{count as number}</Badge>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">暂无数据</p>
                    )}
                  </CardContent>
                </Card>

                {/* OS Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-purple-600" />
                      操作系统分布
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(displayStats as any).os && Object.keys((displayStats as any).os).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries((displayStats as any).os)
                          .sort(([,a], [,b]) => (b as number) - (a as number))
                          .map(([os, count]) => (
                            <div key={os} className="flex items-center justify-between">
                              <span className="text-sm">{os}</span>
                              <Badge variant="secondary">{count as number}</Badge>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">暂无数据</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeTab === 'records' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-red-600" />
                  访问记录详情
                </CardTitle>
              </CardHeader>
              <CardContent>
                {displayRecords && displayRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">时间</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">页面</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">设备</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">浏览器</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">系统</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">来源</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayRecords.slice(0, 100).map((record: any, index: number) => (
                          <tr key={record.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm">
                              <div className="font-medium">{record.date || record.date}</div>
                              <div className="text-gray-500 text-xs">{record.time || record.time}</div>
                            </td>
                            <td className="py-3 px-4 text-sm">{record.page || record.page || '-'}</td>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex items-center gap-1">
                                {getDeviceIcon(record.device || record.device)}
                                <span>{record.device || record.device}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm">{record.browser || record.browser}</td>
                            <td className="py-3 px-4 text-sm">{record.os || record.os}</td>
                            <td className="py-3 px-4 text-sm text-gray-500 truncate max-w-xs">
                              {(record.referrer || record.referrer) === '直接访问' ? '直接访问' : '外部链接'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {displayRecords.length > 100 && (
                      <p className="text-center text-gray-500 text-sm py-4">
                        还有 {displayRecords.length - 100} 条记录未显示
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Eye className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">暂无访问记录</h3>
                    <p className="text-gray-500 text-sm">当有人访问网站时，记录会显示在这里</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
