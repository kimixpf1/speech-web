import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  Mail,
  LogOut,
  Users,
  Eye,
  TrendingUp,
  Trash2,
  Check,
  RefreshCw,
  Plus,
  Edit,
  Search,
  MessageSquare,
  ExternalLink,
  CheckSquare,
  Square,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
  Bell,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { logoutAdmin, isAdminLoggedIn } from '@/services/adminAuth';
import { 
  getSuggestions, 
  getUnreadCount, 
  markAsRead, 
  markMultipleAsRead,
  deleteSuggestion,
  deleteMultipleSuggestions,
  clearAllSuggestions,
  setupSuggestionListener,
  type Suggestion 
} from '@/services/suggestionService';
import { 
  clearVisitRecords,
  getBaiduStatsUrl,
} from '@/services/analytics';
import {
  getSupabaseStats,
  getSupabaseRecentVisits,
  isSupabaseConfigured,
  type RealtimeStats,
  type VisitRecord as SupabaseVisitRecord
} from '@/services/supabaseAnalytics';
import {
  getArticles,
  updateArticle,
  deleteArticle,
  addArticle,
  generateArticleId,
  syncArticles,
  initializeSync,
  subscribeToSyncStatus,
  setupRealtimeSubscription,
  type Speech,
  type SyncStatus
} from '@/services/articleServiceEnhanced';
import {
  getPendingArticles,
  approveArticle,
  rejectArticle,
  type PendingArticle
} from '@/services/pendingArticleService';

interface AdminDashboardProps {
  onLogout: () => void;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');
  const [visitStats, setVisitStats] = useState<RealtimeStats | null>(null);
  const [visitRecords, setVisitRecords] = useState<SupabaseVisitRecord[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [articles, setArticles] = useState<Speech[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 编辑文章对话框
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Speech | null>(null);
  
  // 新增文章对话框
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newArticle, setNewArticle] = useState<Partial<Speech>>({
    category: 'speech',
    categoryName: '重要讲话',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
  });
  
  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingArticle, setDeletingArticle] = useState<Speech | null>(null);
  
  // 操作成功提示
  const [successMessage, setSuccessMessage] = useState('');
  
  // 建议多选状态
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  
  // 访客记录多选状态
  const [selectedVisits, setSelectedVisits] = useState<Set<string>>(new Set());
  
  // 同步状态
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    isSyncing: false,
  });

  // 待审核文章
  const [pendingArticles, setPendingArticles] = useState<PendingArticle[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate('/admin/login');
      return;
    }
    loadData();
    
    // 初始化文章同步
    initializeSync().catch(console.error);
    
    // 订阅同步状态变化
    const unsubscribeSync = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    
    // 设置文章实时订阅
    const unsubscribeRealtime = setupRealtimeSubscription(
      (updatedArticle) => {
        // 实时更新文章列表
        setArticles(prev => {
          const index = prev.findIndex(a => a.id === updatedArticle.id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = updatedArticle;
            return updated;
          } else {
            return [updatedArticle, ...prev];
          }
        });
      },
      (deletedId) => {
        // 实时删除文章
        setArticles(prev => prev.filter(a => a.id !== deletedId));
      }
    );
    
    // 设置建议实时监听器
    const cleanup = setupSuggestionListener((updatedSuggestions) => {
      setSuggestions(updatedSuggestions);
      setUnreadCount(updatedSuggestions.filter(s => s.status === 'unread').length);
    });
    
    // 每5秒自动刷新一次建议和访问统计
    const interval = setInterval(async () => {
      const suggestions = await getSuggestions();
      const unread = await getUnreadCount();
      setSuggestions(suggestions);
      setUnreadCount(unread);
      
      // 刷新访问统计（从 Supabase）
      if (isSupabaseConfigured()) {
        const stats = await getSupabaseStats();
        const records = await getSupabaseRecentVisits(100);
        setVisitStats(stats);
        setVisitRecords(records);
      }
      
      // 刷新文章列表（获取最新同步数据）
      const refreshedArticles = await getArticles();
      setArticles(refreshedArticles);
    }, 5000);
    
    return () => {
      cleanup();
      unsubscribeSync();
      unsubscribeRealtime();
      clearInterval(interval);
    };
  }, [navigate]);

  const loadData = async () => {
    try {
      // 从 Supabase 获取访问统计
      if (isSupabaseConfigured()) {
        const stats = await getSupabaseStats();
        const records = await getSupabaseRecentVisits(100);
        setVisitStats(stats);
        setVisitRecords(records);
      }
      setSuggestions(await getSuggestions());
      setUnreadCount(await getUnreadCount());
      const articles = await getArticles();
      setArticles(articles);
      const pending = await getPendingArticles();
      setPendingArticles(pending);
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };
  
  // 手动同步
  const handleManualSync = async () => {
    const refreshedArticles = await syncArticles();
    setArticles(refreshedArticles);
    setSuccessMessage('同步成功');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleLogout = () => {
    logoutAdmin();
    onLogout();
    navigate('/');
  };

  const handleMarkSuggestionRead = async (id: string) => {
    if (id) {
      await markAsRead(id);
      await loadData();
      setSuccessMessage('标记已读成功');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (id && confirm('确定要删除这条建议吗？')) {
      await deleteSuggestion(id);
      await loadData();
      setSuccessMessage('删除成功');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleClearSuggestions = async () => {
    if (confirm('确定要清空所有建议吗？此操作不可恢复！')) {
      await clearAllSuggestions();
      setSelectedSuggestions(new Set());
      await loadData();
      setSuccessMessage('清空成功');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // 多选相关函数
  const toggleSelectSuggestion = (id: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSuggestions(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedSuggestions.size === suggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(suggestions.map(s => s.id)));
    }
  };

  const handleBatchMarkAsRead = async () => {
    if (selectedSuggestions.size === 0) {
      alert('请先选择要标记的建议');
      return;
    }
    const ids = Array.from(selectedSuggestions);
    await markMultipleAsRead(ids);
    setSelectedSuggestions(new Set());
    await loadData();
    setSuccessMessage(`已标记 ${ids.length} 条建议为已读`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleBatchDelete = async () => {
    if (selectedSuggestions.size === 0) {
      alert('请先选择要删除的建议');
      return;
    }
    if (confirm(`确定要删除选中的 ${selectedSuggestions.size} 条建议吗？`)) {
      const ids = Array.from(selectedSuggestions);
      await deleteMultipleSuggestions(ids);
      setSelectedSuggestions(new Set());
      await loadData();
      setSuccessMessage(`已删除 ${ids.length} 条建议`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // 访客记录多选处理
  const toggleSelectVisit = (timestamp: string) => {
    const newSelected = new Set(selectedVisits);
    if (newSelected.has(timestamp)) {
      newSelected.delete(timestamp);
    } else {
      newSelected.add(timestamp);
    }
    setSelectedVisits(newSelected);
  };

  const toggleSelectAllVisits = () => {
    if (selectedVisits.size === visitRecords.length) {
      setSelectedVisits(new Set());
    } else {
      setSelectedVisits(new Set(visitRecords.map(r => r.timestamp)));
    }
  };

  const handleClearVisits = async () => {
    if (selectedVisits.size === 0) {
      alert('请先选择要删除的访客记录');
      return;
    }
    if (confirm(`确定要删除选中的 ${selectedVisits.size} 条访问记录吗？`)) {
      const timestamps = Array.from(selectedVisits);
      await clearVisitRecords(timestamps);
      setSelectedVisits(new Set());
      await loadData();
      setSuccessMessage(`已删除 ${timestamps.length} 条访问记录`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };
  
  const handleClearAllVisits = async () => {
    if (confirm('确定要清空所有访问记录吗？此操作不可恢复！')) {
      const success = await clearVisitRecords([]); // 空数组表示删除所有
      if (success) {
        // 清空 localStorage 缓存
        localStorage.removeItem('site_visit_records');
        localStorage.removeItem('site_visit_stats');
        
        setSelectedVisits(new Set());
        
        // 立即重新加载数据
        const stats = await getSupabaseStats();
        const records = await getSupabaseRecentVisits(100);
        setVisitStats(stats || {
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
        });
        setVisitRecords(records);
        
        setSuccessMessage('已清空所有访问记录');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('清空记录失败，请重试');
      }
    }
  };

  const handleEditArticle = (article: Speech) => {
    // 创建深拷贝以避免引用问题
    setEditingArticle(JSON.parse(JSON.stringify(article)));
    setEditDialogOpen(true);
  };

  const handleSaveArticle = async () => {
    if (!editingArticle) return;

    try {
      const success = await updateArticle(editingArticle);
      if (success) {
        setEditDialogOpen(false);
        setEditingArticle(null);
        await loadData();
        setSuccessMessage('保存成功');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('保存失败，请重试');
      }
    } catch (error) {
      console.error('Save article error:', error);
      alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleDeleteArticle = (article: Speech) => {
    // 创建深拷贝以避免引用问题
    setDeletingArticle(JSON.parse(JSON.stringify(article)));
    setDeleteDialogOpen(true);
  };

  const confirmDeleteArticle = async () => {
    if (!deletingArticle) return;

    try {
      const success = await deleteArticle(deletingArticle.id);
      if (success) {
        setDeleteDialogOpen(false);
        setDeletingArticle(null);
        await loadData();
        setSuccessMessage('删除成功');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('Delete article error:', error);
      alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleAddArticle = async () => {
    if (!newArticle.title || !newArticle.date || !newArticle.source || !newArticle.summary) {
      alert('请填写完整信息');
      return;
    }

    try {
      const dateParts = newArticle.date.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const day = parseInt(dateParts[2]);

      const article: Speech = {
        id: generateArticleId(year),
        title: newArticle.title,
        date: newArticle.date,
        year,
        month,
        day,
        category: newArticle.category as 'speech' | 'article' | 'meeting' | 'inspection',
        categoryName: newArticle.categoryName || '重要讲话',
        source: newArticle.source,
        summary: newArticle.summary,
        url: newArticle.url || '',
        location: newArticle.location,
      };

      const success = await addArticle(article);
      if (success) {
        setAddDialogOpen(false);
        setNewArticle({
          category: 'speech',
          categoryName: '重要讲话',
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          day: new Date().getDate(),
        });
        await loadData();
        setSuccessMessage('添加成功');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('添加失败，ID可能已存在');
      }
    } catch (error) {
      console.error('Add article error:', error);
      alert('添加失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };
    }
  };

  const handleApprovePending = async (pending: PendingArticle) => {
    const article: Speech = {
      id: generateArticleId(pending.year || new Date().getFullYear()),
      title: pending.title,
      date: pending.date,
      year: pending.year || new Date().getFullYear(),
      month: pending.month || new Date().getMonth() + 1,
      day: pending.day || new Date().getDate(),
      category: (pending.category as Speech['category']) || 'speech',
      categoryName: pending.categoryName || '重要讲话',
      source: pending.source || '',
      summary: pending.summary || '',
      url: pending.url || '',
      location: pending.location,
    };
    if (await addArticle(article)) {
      await approveArticle(pending.id);
      await loadData();
      setSuccessMessage('已发布');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleRejectPending = async (id: string) => {
    await rejectArticle(id);
    await loadData();
    setSuccessMessage('已忽略');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatNumber = (num: number) => num.toLocaleString('zh-CN');
  
  // 格式化同步时间
  const formatSyncTime = (time: string | null) => {
    if (!time) return '未同步';
    const date = new Date(time);
    return date.toLocaleString('zh-CN', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">管理员后台</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* 同步状态指示器 */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                {syncStatus.isOnline ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className={syncStatus.isOnline ? 'text-green-600' : 'text-red-600'}>
                  {syncStatus.isOnline ? '在线' : '离线'}
                </span>
                <span className="text-gray-400">|</span>
                {syncStatus.isSyncing ? (
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                ) : syncStatus.pendingChanges > 0 ? (
                  <CloudOff className="w-4 h-4 text-orange-500" />
                ) : (
                  <Cloud className="w-4 h-4 text-blue-500" />
                )}
                <span className="text-gray-600">
                  {syncStatus.isSyncing ? '同步中...' : 
                   syncStatus.pendingChanges > 0 ? `${syncStatus.pendingChanges}个待同步` : 
                   '已同步'}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500 text-xs">
                  {formatSyncTime(syncStatus.lastSync)}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 ml-1"
                  onClick={handleManualSync}
                  disabled={syncStatus.isSyncing || !syncStatus.isOnline}
                >
                  <RefreshCw className={`w-3 h-3 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <Button variant="ghost" onClick={handleLogout} className="text-gray-600 hover:text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                访问统计
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Bell className="w-4 h-4" />
                待审核
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="articles" className="gap-2">
                <FileText className="w-4 h-4" />
                文章管理
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="gap-2">
                <Mail className="w-4 h-4" />
                建议信箱
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* 访问统计 */}
            <TabsContent value="analytics" className="space-y-6">
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
                  <Button variant="outline" size="sm" onClick={loadData}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    刷新
                  </Button>
                  {selectedVisits.size > 0 && (
                    <Button variant="outline" size="sm" onClick={handleClearVisits} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除选中 ({selectedVisits.size})
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleClearAllVisits} className="text-red-600">
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
                                onClick={toggleSelectAllVisits}
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
                                  onClick={() => toggleSelectVisit(record.timestamp)}
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
            </TabsContent>

            {/* 待审核文章 */}
            <TabsContent value="pending" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">待审核文章</h2>
                <Button variant="outline" size="sm" onClick={loadData}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  刷新
                </Button>
              </div>

              {pendingArticles.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">暂无待审核文章</p>
                    <p className="text-gray-400 text-sm mt-1">系统每天 8:00 和 20:00 自动抓取</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingArticles.map((article) => (
                    <Card key={article.id} className="border-l-4 border-l-orange-400">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline">{article.categoryName || '重要讲话'}</Badge>
                              <span className="text-sm text-gray-500">{article.date}</span>
                              <span className="text-sm text-gray-400">{article.source}</span>
                            </div>
                            <h3 className="font-medium text-gray-900 mb-1">{article.title}</h3>
                            {article.summary && article.summary !== article.title && (
                              <p className="text-sm text-gray-600 line-clamp-2">{article.summary}</p>
                            )}
                            {article.url && (
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                查看原文
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleApprovePending(article)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              发布
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => handleRejectPending(article.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              忽略
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 文章管理 */}
            <TabsContent value="articles" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">文章管理</h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="搜索文章..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    新增文章
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">标题</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">日期</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">分类</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">来源</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredArticles.map((article) => (
                          <tr key={article.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm font-medium max-w-md truncate">{article.title}</td>
                            <td className="py-3 px-4 text-sm">{article.date}</td>
                            <td className="py-3 px-4 text-sm">{article.categoryName}</td>
                            <td className="py-3 px-4 text-sm">{article.source}</td>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEditArticle(article)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteArticle(article)} className="text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 建议信箱 */}
            <TabsContent value="suggestions" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">建议信箱</h2>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={loadData}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    刷新
                  </Button>
                  {selectedSuggestions.size > 0 && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleBatchMarkAsRead} className="text-blue-600">
                        <Check className="w-4 h-4 mr-1" />
                        标记已读 ({selectedSuggestions.size})
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleBatchDelete} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除 ({selectedSuggestions.size})
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={handleClearSuggestions} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-1" />
                    清空
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {suggestions.length > 0 ? (
                  <>
                    {/* 全选按钮 */}
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <button 
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        {selectedSuggestions.size === suggestions.length ? (
                          <CheckSquare className="w-5 h-5 text-red-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                        全选 ({selectedSuggestions.size}/{suggestions.length})
                      </button>
                    </div>
                    
                    {suggestions.map((suggestion) => (
                      <Card key={suggestion.id} className={`${suggestion.status === 'unread' ? 'border-l-4 border-l-red-500' : ''} ${selectedSuggestions.has(suggestion.id) ? 'ring-2 ring-red-200' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              {/* 选择框 */}
                              <button 
                                onClick={() => toggleSelectSuggestion(suggestion.id)}
                                className="mt-1 flex-shrink-0"
                              >
                                {selectedSuggestions.has(suggestion.id) ? (
                                  <CheckSquare className="w-5 h-5 text-red-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-400" />
                                )}
                              </button>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="font-medium text-gray-900">{suggestion.name}</span>
                                  <span className="text-sm text-gray-400">{suggestion.date} {suggestion.time}</span>
                                  {suggestion.status === 'unread' && (
                                    <Badge variant="destructive">未读</Badge>
                                  )}
                                  {suggestion.status === 'read' && (
                                    <Badge variant="outline" className="text-gray-500">已读</Badge>
                                  )}
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{suggestion.content}</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-1 ml-2 flex-shrink-0">
                              {suggestion.status === 'unread' && (
                                <Button variant="ghost" size="sm" onClick={() => handleMarkSuggestionRead(suggestion.id)} title="标记为已读">
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteSuggestion(suggestion.id)} className="text-red-600" title="删除">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">暂无建议</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* 编辑文章对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑文章</DialogTitle>
            <DialogDescription>修改文章信息</DialogDescription>
          </DialogHeader>
          {editingArticle && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">标题</label>
                <Input 
                  value={editingArticle.title} 
                  onChange={(e) => setEditingArticle({...editingArticle, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">日期</label>
                <Input 
                  value={editingArticle.date} 
                  onChange={(e) => setEditingArticle({...editingArticle, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">来源</label>
                <Input 
                  value={editingArticle.source} 
                  onChange={(e) => setEditingArticle({...editingArticle, source: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">摘要</label>
                <Textarea 
                  value={editingArticle.summary} 
                  onChange={(e) => setEditingArticle({...editingArticle, summary: e.target.value})}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveArticle} className="bg-red-600 hover:bg-red-700">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>确定要删除这篇文章吗？此操作不可恢复。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button onClick={confirmDeleteArticle} variant="destructive">删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增文章对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增文章</DialogTitle>
            <DialogDescription>添加新文章</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">标题 <span className="text-red-500">*</span></label>
              <Input 
                placeholder="请输入文章标题"
                value={newArticle.title || ''} 
                onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">日期 <span className="text-red-500">*</span></label>
                <Input 
                  type="date"
                  value={newArticle.date || ''} 
                  onChange={(e) => setNewArticle({...newArticle, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">分类 <span className="text-red-500">*</span></label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={newArticle.category}
                  onChange={(e) => {
                    const category = e.target.value as 'speech' | 'article' | 'meeting' | 'inspection';
                    const categoryNames: Record<string, string> = {
                      speech: '重要讲话',
                      article: '发表文章',
                      meeting: '重要会议',
                      inspection: '考察调研'
                    };
                    setNewArticle({...newArticle, category, categoryName: categoryNames[category]});
                  }}
                >
                  <option value="speech">重要讲话</option>
                  <option value="article">发表文章</option>
                  <option value="meeting">重要会议</option>
                  <option value="inspection">考察调研</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">来源 <span className="text-red-500">*</span></label>
              <Input 
                placeholder="如：人民网、求是杂志等"
                value={newArticle.source || ''} 
                onChange={(e) => setNewArticle({...newArticle, source: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">原文链接</label>
              <Input 
                placeholder="请输入原文链接"
                value={newArticle.url || ''} 
                onChange={(e) => setNewArticle({...newArticle, url: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">地点（考察调研类请填写）</label>
              <Input 
                placeholder="如：北京、上海等"
                value={newArticle.location || ''} 
                onChange={(e) => setNewArticle({...newArticle, location: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">摘要 <span className="text-red-500">*</span></label>
              <Textarea 
                placeholder="请输入文章摘要"
                value={newArticle.summary || ''} 
                onChange={(e) => setNewArticle({...newArticle, summary: e.target.value})}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>取消</Button>
            <Button onClick={handleAddArticle} className="bg-red-600 hover:bg-red-700">添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 成功提示 */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {successMessage}
        </div>
      )}
    </div>
  );
}
