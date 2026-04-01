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

  const loadData = async () => {
    const tasks = await Promise.allSettled([
      isSupabaseConfigured()
        ? Promise.all([getSupabaseStats(), getSupabaseRecentVisits(100)])
        : Promise.resolve(null),
      getSuggestions(),
      getUnreadCount(),
      getArticles(),
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
    addDialogOpen,
    confirmDeleteArticle,
    deleteDialogOpen,
    deletingArticle,
    editDialogOpen,
    editingArticle,
    editingDetail,
    fetchedAnalysis,
    fetchedContent,
    fetchError,
    fetchUrl,
    fetchingArticle,
    filteredArticles,
    hasConfiguredExtractionProvider,
    handleAddArticle,
    handleAddDialogOpenChange,
    handleApprovePending,
    handleClearKimiKey,
    handleDeleteArticle,
    handleEditArticle,
    handleFetchFromUrl,
    handleProcessManualContent,
    handleSaveArticle,
    handleSaveKimiKey,
    kimiApiKey,
    kimiKeyInput,
    kimiKeyValidating,
    loadingDetail,
    manualContent,
    manualUrl,
    newArticle,
    processingManual,
    preferredExtractionProvider,
    searchTerm,
    setDeleteDialogOpen,
    setEditingArticle,
    setEditingDetail,
    setEditDialogOpen,
    setFetchUrl,
    setKimiKeyInput,
    setManualContent,
    setManualUrl,
    setNewArticle,
    setShowKimiKeyDialog,
    setShowManualInput,
    showKimiKeyDialog,
    showManualInput,
    setSearchTerm,
  } = useAdminArticleManagement({
    articles,
    loadData,
    onSuccess: showTemporarySuccessMessage,
    setActiveTab,
  });
  
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
        setSearchStage('completed');
        setSearchMessage(`搜索任务已完成（状态：${run.conclusion}）`);
      }
    }
  };

  // 触发搜索
  const handleTriggerSearch = async () => {
    const storedToken = localStorage.getItem('github_workflow_token');
    const token = storedToken || githubToken;
    
    if (!token) {
      setShowApiConfigDialog(true);  // 打开API配置对话框
      return;
    }
    
    // 重置状态
    setSearching(true);
    setSearchResult(null);
    setSearchStage('triggering');
    setSearchMessage('正在触发搜索任务...');
    
    // 清理之前的轮询
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    
    const result = await triggerFetchArticles();
    setSearchResult(result);
    
    if (result.success && result.runId) {
      setCurrentRunId(result.runId);
      setSearchStage('queued');
      setSearchMessage('搜索任务已触发，正在排队等待执行...');
      
      // 开始轮询检查状态（每3秒检查一次）
      const interval = setInterval(() => {
        if (result.runId) {
          checkWorkflowStatus(result.runId);
        }
      }, 3000);
      setPollInterval(interval);
      
      // 立即检查一次
      checkWorkflowStatus(result.runId);
    } else {
      setSearching(false);
      setSearchStage('failed');
      setSearchMessage(result.message || '触发搜索任务失败');
    }
  };

  // ========== AI 搜索功能 ==========
  
  // AI 搜索文章 - 优先使用 GitHub Actions 工作流（更可靠）
  const handleAISearch = async (type: 'manual' | 'auto' = 'manual') => {
    console.log('handleAISearch 被调用，统一使用 GitHub Actions');
    
    // 统一使用 GitHub Actions 后台搜索（与自动搜索完全一致）
    // 如果没有 Token，引导配置，不再 fallback 到前端搜索
    await handleBackendSearch();
    return;

    // 以下代码保留但不会执行（前端搜索已废弃，统一用 GitHub Actions）
    setSearching(true);
    setSearchStage('running');
    setSearchMessage('正在使用 AI 搜索最新文章...');
    setShowAutoSearchPrompt(false);

    try {
      const result = await searchArticles(
        kimiApiKey || null,
        deepSeekApiKey || null,
        type,
        (progress) => {
          setAiSearchProgress(progress);
          setSearchMessage(progress);
        }
      );

      if (result.success) {
        setSearchStage('completed');
        setSearchMessage(`搜索完成！找到 ${result.totalCount} 篇文章，新增 ${result.newCount} 篇待审核`);
        
        // 刷新数据
        await loadData();
      } else {
        setSearchStage('failed');
        setSearchMessage(result.error || '搜索失败');
      }
    } catch (error) {
      setSearchStage('failed');
      setSearchMessage(error instanceof Error ? error.message : '搜索出错');
    } finally {
      setSearching(false);
      setAiSearchProgress('');
    }
  };

  // 后台搜索（使用 GitHub Actions 工作流，最可靠）
  const handleBackendSearch = async () => {
    // 直接从 localStorage 读取，确保获取最新值
    const storedToken = localStorage.getItem('github_workflow_token');
    console.log('handleBackendSearch 被调用');
    console.log('localStorage github_workflow_token:', storedToken ? '已配置' : '未配置');
    console.log('组件状态 githubToken:', githubToken ? '已配置' : '未配置');
    
    // 优先使用 localStorage 的值
    const token = storedToken || githubToken;
    
    if (!token) {
      console.log('没有 GitHub Token，打开API配置对话框');
      setShowApiConfigDialog(true);  // 打开API配置对话框让用户填写
      return;
    }

    console.log('有 GitHub Token，开始后台搜索');
    setSearching(true);
    setSearchStage('running');
    setSearchMessage('正在触发后台搜索任务...');
    setShowAutoSearchPrompt(false);

    try {
      // 触发工作流
      console.log('触发 GitHub Actions 工作流...');
      const triggerResult = await triggerBackendSearch();
      console.log('触发结果:', triggerResult);
      
      if (!triggerResult.success) {
        setSearchStage('failed');
        setSearchMessage(triggerResult.message);
        setSearching(false);
        return;
      }

      setSearchMessage('后台搜索已启动，等待完成（约1-2分钟）...');
      
      // 等待工作流完成
      const result = await waitForWorkflowCompletion(
        (progress) => setSearchMessage(progress),
        180000 // 最多等待3分钟
      );
      
      console.log('工作流完成结果:', result);

      if (result.success) {
        setSearchStage('completed');
        setSearchMessage(
          result.message ||
            (result.newCount > 0
              ? `后台搜索完成！新增 ${result.newCount} 篇待审核文章`
              : '后台搜索完成！暂无新文章（可能已存在或工作流未找到）')
        );
        
        // 刷新数据
        await loadData();
      } else {
        setSearchStage('failed');
        setSearchMessage('后台搜索超时或失败，请稍后在待审核列表查看结果');
      }
    } catch (error) {
      console.error('后台搜索出错:', error);
      setSearchStage('failed');
      setSearchMessage(error instanceof Error ? error.message : '后台搜索出错');
    } finally {
      setSearching(false);
    }
  };

  // 保存 DeepSeek API Key
  const handleSaveDeepSeekKey = async () => {
    if (!deepSeekKeyInput.trim()) return;
    
    setDeepSeekKeyValidating(true);
    const result = await validateDeepSeekApiKey(deepSeekKeyInput.trim());
    setDeepSeekKeyValidating(false);
    
    if (result.valid) {
      saveDeepSeekApiKey(deepSeekKeyInput.trim());
      setDeepSeekApiKeyState(deepSeekKeyInput.trim());
      setDeepSeekKeyInput('');
      setSuccessMessage('DeepSeek API Key 验证成功！');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setSuccessMessage(result.error || 'API Key 验证失败');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // 清除 DeepSeek API Key
  const handleClearDeepSeekKey = () => {
    clearDeepSeekApiKey();
    setDeepSeekApiKeyState('');
    setSuccessMessage('已清除 DeepSeek API Key');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSwitchPreferredApi = (api: 'kimi' | 'deepseek') => {
    setPreferredApi(api);
    setPreferredApiState(api);
  };

  const handleSwitchPreferredExtractionApi = (api: 'kimi' | 'deepseek') => {
    setPreferredExtractionApi(api);
    setPreferredExtractionApiState(api);
  };

  // 加载最近的workflow运行记录
  const loadRecentRuns = async () => {
    const { runs } = await getWorkflowRuns();
    setRecentRuns(runs);
  };

  // 组件挂载时加载最近运行记录
  useEffect(() => {
    if (githubToken) {
      loadRecentRuns();
    }
  }, [githubToken]);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const formatNumber = (num: number) => num.toLocaleString('zh-CN');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-red-600"
                title="返回首页"
              >
                <Home className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">管理员后台</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* 状态指示器 */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                {navigator.onLine ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className={navigator.onLine ? 'text-green-600' : 'text-red-600'}>
                  {navigator.onLine ? '在线' : '离线'}
                </span>
                <span className="text-gray-400">|</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={handleManualSync}
                >
                  <RefreshCw className="w-3 h-3" />
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
                <Sparkles className="w-4 h-4" />
                近期新增
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
              <AdminAnalyticsTab
                visitStats={visitStats as any}
                visitRecords={visitRecords}
                selectedVisits={selectedVisits}
                onLoadData={loadData}
                onClearVisits={handleClearVisits}
                onClearAllVisits={handleClearAllVisits}
                onToggleSelectAll={toggleSelectAllVisits}
                onToggleSelectVisit={toggleSelectVisit}
              />
            </TabsContent>

            <TabsContent value="pending" className="space-y-6">
              <AdminPendingTab
                showAutoSearchPrompt={showAutoSearchPrompt}
                hasApiKey={Boolean(kimiApiKey || deepSeekApiKey)}
                preferredApi={preferredApi}
                searching={searching}
                searchMessage={searchMessage}
                searchStage={searchStage}
                todayStats={todayStats}
                searchLogs={searchLogs}
                pendingArticles={pendingArticles}
                copiedUrl={copiedUrl}
                kimiApiKey={kimiApiKey}
                deepSeekApiKey={deepSeekApiKey}
                onDismissAutoSearchPrompt={() => setShowAutoSearchPrompt(false)}
                onOpenApiConfig={() => setShowApiConfigDialog(true)}
                onLoadData={loadData}
                onSearch={handleBackendSearch}
                onCopyUrl={handleCopyUrl}
                onApprovePending={handleApprovePending}
                onRejectPending={handleRejectPending}
              />
            </TabsContent>

            <TabsContent value="articles" className="space-y-6">
              <AdminArticlesTab
                articles={filteredArticles}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onAddArticle={() => handleAddDialogOpenChange(true)}
                onEditArticle={handleEditArticle}
                onDeleteArticle={handleDeleteArticle}
              />
            </TabsContent>

            {/* 建议信箱 */}
            <TabsContent value="suggestions" className="space-y-6">
              <AdminSuggestionsTab
                suggestions={suggestions}
                selectedSuggestions={selectedSuggestions}
                onLoadData={loadData}
                onBatchMarkAsRead={handleBatchMarkAsRead}
                onBatchDelete={handleBatchDelete}
                onClearSuggestions={handleClearSuggestions}
                onToggleSelectAll={toggleSelectAll}
                onToggleSelectSuggestion={toggleSelectSuggestion}
                onMarkSuggestionRead={handleMarkSuggestionRead}
                onDeleteSuggestion={handleDeleteSuggestion}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <AdminEditArticleDialog
        open={editDialogOpen}
        editingArticle={editingArticle}
        editingDetail={editingDetail}
        loadingDetail={loadingDetail}
        onOpenChange={setEditDialogOpen}
        onEditingArticleChange={setEditingArticle}
        onEditingDetailChange={setEditingDetail}
        onSave={handleSaveArticle}
      />

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

      <AdminAddArticleDialog
        open={addDialogOpen}
        newArticle={newArticle}
        fetchUrl={fetchUrl}
        fetchingArticle={fetchingArticle}
        fetchError={fetchError}
        fetchedContent={fetchedContent}
        fetchedAnalysis={fetchedAnalysis}
        hasConfiguredExtractionProvider={hasConfiguredExtractionProvider}
        preferredExtractionProvider={preferredExtractionProvider}
        showManualInput={showManualInput}
        manualUrl={manualUrl}
        manualContent={manualContent}
        processingManual={processingManual}
        onOpenChange={handleAddDialogOpenChange}
        onNewArticleChange={setNewArticle}
        onFetchUrlChange={setFetchUrl}
        onFetchFromUrl={handleFetchFromUrl}
        onOpenKimiKeyDialog={() => setShowApiConfigDialog(true)}
        onToggleManualInput={() => setShowManualInput(!showManualInput)}
        onManualUrlChange={setManualUrl}
        onManualContentChange={setManualContent}
        onProcessManualContent={handleProcessManualContent}
        onAddArticle={handleAddArticle}
      />

      <AdminApiConfigDialog
        open={showApiConfigDialog}
        kimiApiKey={kimiApiKey}
        kimiKeyInput={kimiKeyInput}
        kimiKeyValidating={kimiKeyValidating}
        deepSeekApiKey={deepSeekApiKey}
        deepSeekKeyInput={deepSeekKeyInput}
        deepSeekKeyValidating={deepSeekKeyValidating}
        githubToken={githubToken}
        tokenInput={tokenInput}
        tokenValidating={tokenValidating}
        preferredSearchApi={preferredApi}
        preferredExtractionApi={preferredExtractionApi}
        onOpenChange={setShowApiConfigDialog}
        onKimiKeyInputChange={setKimiKeyInput}
        onSaveKimiKey={handleSaveKimiKey}
        onClearKimiKey={handleClearKimiKey}
        onDeepSeekKeyInputChange={setDeepSeekKeyInput}
        onSaveDeepSeekKey={handleSaveDeepSeekKey}
        onClearDeepSeekKey={handleClearDeepSeekKey}
        onTokenInputChange={setTokenInput}
        onSaveToken={handleSaveToken}
        onClearToken={handleClearToken}
        onSwitchPreferredSearchApi={handleSwitchPreferredApi}
        onSwitchPreferredExtractionApi={handleSwitchPreferredExtractionApi}
      />

      {/* Kimi API Key 配置对话框 */}
      <Dialog open={showKimiKeyDialog} onOpenChange={setShowKimiKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>配置 Kimi API Key</DialogTitle>
            <DialogDescription>
              输入您的 Kimi API Key 以精准提取文章内容
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kimi API Key</label>
              <Input
                type="password"
                placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                value={kimiKeyInput}
                onChange={(e) => setKimiKeyInput(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                在 Kimi开放平台 (platform.moonshot.cn) 获取 API Key
              </p>
            </div>
            {kimiApiKey && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700">已配置 Kimi API Key</span>
                <Button variant="outline" size="sm" onClick={handleClearKimiKey}>
                  清除
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKimiKeyDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveKimiKey}
              disabled={!kimiKeyInput.trim() || kimiKeyValidating}
              className="bg-red-600 hover:bg-red-700"
            >
              {kimiKeyValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  验证中...
                </>
              ) : (
                '保存并验证'
              )}
            </Button>
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
