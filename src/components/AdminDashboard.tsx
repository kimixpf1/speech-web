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
  Check,
  RefreshCw,
  MessageSquare,
  ExternalLink,
  CheckSquare,
  Square,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
  Bell,
  X,
  Sparkles,
  Settings,
  Loader2,
  Copy,
  Clock,
  ArrowRight,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { logoutAdmin, isAdminLoggedIn, isAdminLoggedInSync } from '@/services/adminAuth';
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
  syncArticles,
  type Speech
} from '@/services/articleServiceEnhanced';
import {
  getPendingArticles,
  rejectArticle,
  getSearchLogs,
  type PendingArticle,
  type SearchLog
} from '@/services/pendingArticleService';
import {
  saveGitHubToken,
  getGitHubToken,
  clearGitHubToken,
  triggerFetchArticles,
  validateGitHubToken,
  getWorkflowRuns,
  getWorkflowRunStatus,
  type TriggerResult,
  type WorkflowRun
} from '@/services/githubActionsService';
import {
  triggerSearchWorkflow as triggerBackendSearch,
  waitForWorkflowCompletion,
  hasGitHubToken,
} from '@/services/githubActionsTrigger';
import {
  searchArticles,
  saveDeepSeekApiKey,
  getDeepSeekApiKey,
  clearDeepSeekApiKey,
  validateDeepSeekApiKey,
  setPreferredApi,
  getPreferredApi,
  setPreferredExtractionApi,
  getPreferredExtractionApi,
  shouldAutoSearch,
  setLastSearchTime,
  getLastSearchTime,
  getTodaySearchStats,
  getRecentSearchLogs,
  type SearchResult,
  type SearchLog as AISearchLog,
} from '@/services/aiSearchService';
import {
  generateSummaryAndAnalysis,
  isApiKeyConfigured,
  getCurrentAIProvider,
} from '@/services/aiSummaryService';

import { AdminAnalyticsTab } from './admin/AdminAnalyticsTab';
import { AdminAddArticleDialog } from './admin/AdminAddArticleDialog';
import { AdminApiConfigDialog } from './admin/AdminApiConfigDialog';
import { AdminArticlesTab } from './admin/AdminArticlesTab';
import { AdminEditArticleDialog } from './admin/AdminEditArticleDialog';
import { AdminSuggestionsTab } from './admin/AdminSuggestionsTab';
import { AdminPendingTab } from './admin/AdminPendingTab';
import { useAdminArticleManagement } from '@/hooks/useAdminArticleManagement';

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
  
  // 操作成功提示
  const [successMessage, setSuccessMessage] = useState('');
  
  // 建议多选状态
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  
  // 访客记录多选状态
  const [selectedVisits, setSelectedVisits] = useState<Set<string>>(new Set());

  // 待审核文章
  const [pendingArticles, setPendingArticles] = useState<PendingArticle[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // 搜索日志
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // GitHub搜索功能状态
  const [githubToken, setGithubTokenState] = useState(getGitHubToken() || '');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenValidating, setTokenValidating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<TriggerResult | null>(null);
  
  // 搜索过程状态
  const [searchStage, setSearchStage] = useState<'idle' | 'triggering' | 'queued' | 'running' | 'completed' | 'failed'>('idle');
  const [searchMessage, setSearchMessage] = useState('');
  const [currentRunId, setCurrentRunId] = useState<number | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);

  // AI 搜索状态（新增）
  const [deepSeekApiKey, setDeepSeekApiKeyState] = useState(getDeepSeekApiKey() || '');
  const [preferredApi, setPreferredApiState] = useState<'kimi' | 'deepseek'>(getPreferredApi());
  const [preferredExtractionApi, setPreferredExtractionApiState] = useState<'kimi' | 'deepseek'>(getPreferredExtractionApi());
  const [showApiConfigDialog, setShowApiConfigDialog] = useState(false);
  const [deepSeekKeyInput, setDeepSeekKeyInput] = useState('');
  const [deepSeekKeyValidating, setDeepSeekKeyValidating] = useState(false);
  const [aiSearchProgress, setAiSearchProgress] = useState('');
  const [showAutoSearchPrompt, setShowAutoSearchPrompt] = useState(false);
  const [todayStats, setTodayStats] = useState({ runCount: 0, totalFound: 0, totalNew: 0 });

  useEffect(() => {
    isAdminLoggedIn().then((isLoggedIn) => {
      if (!isLoggedIn) {
        navigate('/admin/login');
        return;
      }
      loadData();
    });

    // 设置建议实时监听器
    const cleanup = setupSuggestionListener((updatedSuggestions) => {
      setSuggestions(updatedSuggestions);
      setUnreadCount(updatedSuggestions.filter(s => s.status === 'unread').length);
    });

    // 每30秒刷新一次数据
    // 定期刷新已移除，避免冗余网络请求，通过手动刷新或实时订阅获取最新数据

    return () => {
      cleanup();
    };
  }, [navigate]);

  const loadData = async (options?: { skipArticlesRefresh?: boolean }) => {
    const tasks = await Promise.allSettled([
      isSupabaseConfigured()
        ? Promise.all([getSupabaseStats(), getSupabaseRecentVisits(100)])
        : Promise.resolve(null),
      getSuggestions(),
      getUnreadCount(),
      options?.skipArticlesRefresh ? Promise.resolve(articles) : getArticles(),
      getPendingArticles(),
      getSearchLogs(5),
      getTodaySearchStats(),
    ]);

    const [visitTask, suggestionsTask, unreadTask, articlesTask, pendingTask, logsTask, todayStatsTask] = tasks;

    if (visitTask.status === 'fulfilled' && visitTask.value) {
      const [stats, records] = visitTask.value;
      setVisitStats(stats);
      setVisitRecords(records);
    } else if (visitTask.status === 'rejected') {
      console.error('Failed to load visit data:', visitTask.reason);
    }

    if (suggestionsTask.status === 'fulfilled') {
      setSuggestions(suggestionsTask.value);
    } else {
      console.error('Failed to load suggestions:', suggestionsTask.reason);
    }

    if (unreadTask.status === 'fulfilled') {
      setUnreadCount(unreadTask.value);
    } else {
      console.error('Failed to load unread suggestion count:', unreadTask.reason);
    }

    if (articlesTask.status === 'fulfilled') {
      console.log('Loaded articles from cloud:', articlesTask.value.length);
      setArticles(articlesTask.value);
    } else {
      console.error('Failed to load articles:', articlesTask.reason);
    }

    if (pendingTask.status === 'fulfilled') {
      setPendingArticles(pendingTask.value);
      setPendingCount(pendingTask.value.length);
    } else {
      console.error('Failed to load pending articles:', pendingTask.reason);
    }

    if (logsTask.status === 'fulfilled') {
      setSearchLogs(logsTask.value);
    } else {
      console.error('Failed to load search logs:', logsTask.reason);
    }

    if (todayStatsTask.status === 'fulfilled') {
      setTodayStats(todayStatsTask.value);
    } else {
      console.error('Failed to load today search stats:', todayStatsTask.reason);
    }

    setShowAutoSearchPrompt(shouldAutoSearch());
  };

  const showTemporarySuccessMessage = (message: string, duration = 3000) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), duration);
  };

  const {
    filter: articleFilter,
    editor: articleEditor,
    creation: articleCreation,
    configPrompt: articleConfigPrompt,
  } = useAdminArticleManagement({
    articles,
    loadData,
    onSuccess: showTemporarySuccessMessage,
    setActiveTab,
    setArticles,
  });

  const {
    filteredArticles,
    searchTerm,
    setSearchTerm,
  } = articleFilter;

  const {
    editDialogOpen,
    setEditDialogOpen,
    editingArticle,
    setEditingArticle,
    editingDetail,
    setEditingDetail,
    loadingDetail,
    handleEditArticle,
    handleSaveArticle,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deletingArticle,
    handleDeleteArticle,
    confirmDeleteArticle,
  } = articleEditor;

  const {
    addDialogOpen,
    newArticle,
    setNewArticle,
    fetchUrl,
    setFetchUrl,
    fetchingArticle,
    fetchError,
    fetchedContent,
    setFetchedAnalysis,
    fetchedAnalysis,
    showManualInput,
    setShowManualInput,
    manualContent,
    setManualContent,
    manualUrl,
    setManualUrl,
    processingManual,
    hasConfiguredExtractionProvider,
    preferredExtractionProvider,
    handleFetchFromUrl,
    handleProcessManualContent,
    handleAddArticle,
    handleApprovePending,
    handleAddDialogOpenChange,
  } = articleCreation;

  const {
    kimiApiKey,
    showKimiKeyDialog,
    setShowKimiKeyDialog,
    kimiKeyInput,
    setKimiKeyInput,
    kimiKeyValidating,
    handleSaveKimiKey,
    handleClearKimiKey,
  } = articleConfigPrompt;
  
  // 手动刷新
  const handleManualSync = async () => {
    const articles = await syncArticles();
    setArticles(articles);
    setSuccessMessage('同步成功');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleLogout = async () => {
    await logoutAdmin();
    onLogout();
    navigate('/');
  };

  const handleMarkSuggestionRead = async (id: string) => {
    if (id) {
      const success = await markAsRead(id);
      await loadData();
      setSuccessMessage(success ? '标记已读成功' : '标记已读失败');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (id && confirm('确定要删除这条建议吗？')) {
      const success = await deleteSuggestion(id);
      await loadData();
      setSuccessMessage(success ? '删除成功' : '删除失败');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleClearSuggestions = async () => {
    if (confirm('确定要清空所有建议吗？此操作不可恢复！')) {
      const success = await clearAllSuggestions();
      setSelectedSuggestions(new Set());
      await loadData();
      setSuccessMessage(success ? '清空成功' : '清空失败');
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
    const success = await markMultipleAsRead(ids);
    setSelectedSuggestions(new Set());
    await loadData();
    setSuccessMessage(success ? `已标记 ${ids.length} 条建议为已读` : '批量标记已读失败');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleBatchDelete = async () => {
    if (selectedSuggestions.size === 0) {
      alert('请先选择要删除的建议');
      return;
    }
    if (confirm(`确定要删除选中的 ${selectedSuggestions.size} 条建议吗？`)) {
      const ids = Array.from(selectedSuggestions);
      const success = await deleteMultipleSuggestions(ids);
      setSelectedSuggestions(new Set());
      await loadData();
      setSuccessMessage(success ? `已删除 ${ids.length} 条建议` : '批量删除失败');
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
        });
        setVisitRecords(records);
        
        setSuccessMessage('已清空所有访问记录');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('清空记录失败，请重试');
      }
    }
  };

  const handleRejectPending = async (id: string) => {
    await rejectArticle(id);
    await loadData();
    setSuccessMessage('已忽略');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // 复制URL到剪贴板
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  // GitHub Token 配置
  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return;
    
    setTokenValidating(true);
    const result = await validateGitHubToken(tokenInput.trim());
    setTokenValidating(false);
    
    if (result.valid) {
      saveGitHubToken(tokenInput.trim());
      setGithubTokenState(tokenInput.trim());
      setTokenInput('');  // 清空输入框
      setSuccessMessage(`Token验证成功，用户: ${result.username}，正在触发搜索...`);
      setTimeout(() => setSuccessMessage(''), 3000);
      // 保存成功后自动触发搜索
      await handleBackendSearch();
    } else {
      setSuccessMessage(result.error || 'Token验证失败');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleClearToken = () => {
    clearGitHubToken();
    setGithubTokenState('');
    setSuccessMessage('已清除GitHub Token');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // 轮询检查workflow状态
  const checkWorkflowStatus = async (runId: number) => {
    const { run } = await getWorkflowRunStatus(runId);
    
    if (!run) return;
    
    if (run.status === 'queued' || run.status === 'waiting' || run.status === 'pending') {
      setSearchStage('queued');
      setSearchMessage('搜索任务排队中，请稍候...');
    } else if (run.status === 'in_progress' || run.status === 'requested') {
      setSearchStage('running');
      setSearchMessage('正在搜索最新文章，请耐心等待...');
    } else if (run.status === 'completed') {
      // 停止轮询
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
      
      setSearching(false);
      setCurrentRunId(null);
      
      if (run.conclusion === 'success') {
        setSearchStage('completed');
        setSearchMessage('搜索完成！正在加载结果...');
        
        // 刷新文章列表
        setTimeout(async () => {
          await loadData();
          setSearchMessage('搜索完成！已刷新文章列表，请查看近期新增文章。');
        }, 2000);
      } else if (run.conclusion === 'failure') {
        setSearchStage('failed');
        setSearchMessage('搜索任务执行失败，请查看GitHub Actions日志了解详情。');
      } else if (run.conclusion === 'cancelled') {
        setSearchStage('failed');
        setSearchMessage('搜索任务已被取消。');
      } else {
        setSearchStage('failed');
        setSearchMessage(`搜索任务结束，状态: ${run.conclusion}`);
      }
    }
  };
