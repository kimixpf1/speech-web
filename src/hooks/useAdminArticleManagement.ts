import { useMemo, useState } from 'react';
import { getDeepSeekApiKey, getPreferredExtractionApi } from '@/services/aiSearchService';
import {
  getArticleDetail,
  saveArticleDetail,
  type ArticleDetailContent,
} from '@/services/articleDetailService';
import {
  addArticle,
  deleteArticle,
  generateArticleId,
  updateArticle,
  type Speech,
} from '@/services/articleServiceEnhanced';
import {
  clearKimiApiKey,
  extractArticleFromText,
  extractArticleWithKimi,
  getKimiApiKey,
  isValidUrl,
  saveKimiApiKey,
  validateKimiApiKey,
} from '@/services/kimiArticleService';
import { approveArticle, type PendingArticle } from '@/services/pendingArticleService';
import { normalizeAnalysisText, normalizeSummaryText } from '@/lib/utils';

interface UseAdminArticleManagementOptions {
  articles: Speech[];
  loadData: () => Promise<void>;
  onSuccess: (message: string, duration?: number) => void;
  setActiveTab: (tab: string) => void;
}

function createDefaultNewArticle(): Partial<Speech> {
  return {
    category: 'speech',
    categoryName: '重要讲话',
    domain: 'economy',
    domainName: '经济',
    isZhengjiguan: false,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
  };
}

function createEmptyDetail(article: Speech): ArticleDetailContent {
  return {
    id: article.id,
    abstract: article.summary || '',
    fullText: '',
    analysis: '',
  };
}

function parseArticleDate(date?: string) {
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  let day = new Date().getDate();

  if (!date) {
    return { year, month, day };
  }

  const dateMatch = date.match(/(\d{4})[-年](\d{1,2})[-月](\d{1,2})/);
  if (dateMatch) {
    return {
      year: parseInt(dateMatch[1]),
      month: parseInt(dateMatch[2]),
      day: parseInt(dateMatch[3]),
    };
  }

  const parts = date.split('-');
  if (parts.length === 3) {
    return {
      year: parseInt(parts[0]),
      month: parseInt(parts[1]),
      day: parseInt(parts[2]),
    };
  }

  return { year, month, day };
}

function normalizeExtractedSummary(summary: string | undefined, title: string | undefined) {
  return normalizeSummaryText(summary || title || '', { maxLength: 220, minLength: 90, maxSentences: 3 });
}

function getAvailableExtractionProvider() {
  const kimiApiKey = getKimiApiKey();
  const deepSeekApiKey = getDeepSeekApiKey();
  const preferredApi = getPreferredExtractionApi();

  if (preferredApi === 'deepseek' && deepSeekApiKey) {
    return { provider: 'deepseek' as const, apiKey: deepSeekApiKey };
  }

  if (preferredApi === 'kimi' && kimiApiKey) {
    return { provider: 'kimi' as const, apiKey: kimiApiKey };
  }

  if (kimiApiKey) {
    return { provider: 'kimi' as const, apiKey: kimiApiKey };
  }

  if (deepSeekApiKey) {
    return { provider: 'deepseek' as const, apiKey: deepSeekApiKey };
  }

  return null;
}

export function useAdminArticleManagement({
  articles,
  loadData,
  onSuccess,
  setActiveTab,
}: UseAdminArticleManagementOptions) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Speech | null>(null);
  const [editingDetail, setEditingDetail] = useState<ArticleDetailContent | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newArticle, setNewArticle] = useState<Partial<Speech>>(createDefaultNewArticle);
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetchingArticle, setFetchingArticle] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchedContent, setFetchedContent] = useState('');
  const [fetchedAnalysis, setFetchedAnalysis] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [processingManual, setProcessingManual] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingArticle, setDeletingArticle] = useState<Speech | null>(null);
  const [pendingToApprove, setPendingToApprove] = useState<string | null>(null);
  const [kimiApiKey, setKimiApiKey] = useState(getKimiApiKey() || '');
  const [showKimiKeyDialog, setShowKimiKeyDialog] = useState(false);
  const [kimiKeyInput, setKimiKeyInput] = useState('');
  const [kimiKeyValidating, setKimiKeyValidating] = useState(false);
  const extractionProvider = getAvailableExtractionProvider();

  const filteredArticles = useMemo(
    () =>
      articles.filter(
        (article) =>
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.summary.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [articles, searchTerm]
  );

  const resetAddDialogAuxState = () => {
    setFetchUrl('');
    setFetchError('');
    setFetchedContent('');
    setFetchedAnalysis('');
    setShowManualInput(false);
    setManualContent('');
    setManualUrl('');
  };

  const handleEditArticle = async (article: Speech) => {
    const articleCopy = JSON.parse(JSON.stringify(article)) as Speech;
    setEditingArticle(articleCopy);
    setEditDialogOpen(true);
    setLoadingDetail(true);

    try {
      const detail = await getArticleDetail(article.id);
      setEditingDetail(detail || createEmptyDetail(article));
    } catch (error) {
      console.error('Error loading article detail:', error);
      setEditingDetail(createEmptyDetail(article));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveArticle = async () => {
    if (!editingArticle) return;

    try {
      const result = await updateArticle(editingArticle);
      if (!result.success) {
        alert('保存失败：' + (result.error || '请重试'));
        return;
      }

      if (editingDetail) {
        await saveArticleDetail(editingDetail);
      }

      setEditDialogOpen(false);
      setEditingArticle(null);
      setEditingDetail(null);
      await loadData();
      onSuccess('保存成功');
    } catch (error) {
      console.error('Save article error:', error);
      alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleDeleteArticle = (article: Speech) => {
    setDeletingArticle(JSON.parse(JSON.stringify(article)) as Speech);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteArticle = async () => {
    if (!deletingArticle) return;

    try {
      const success = await deleteArticle(deletingArticle.id);
      if (!success) {
        alert('删除失败，请重试。系统已阻止不完整删除，避免产生孤儿记录。');
        return;
      }

      setDeleteDialogOpen(false);
      setDeletingArticle(null);
      await loadData();
      onSuccess('删除成功');
    } catch (error) {
      console.error('Delete article error:', error);
      alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleFetchFromUrl = async () => {
    const trimmedUrl = fetchUrl.trim();
    if (!trimmedUrl) {
      setFetchError('请输入文章URL');
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setFetchError('请输入有效的URL地址');
      return;
    }

    const extractionProvider = getAvailableExtractionProvider();
    if (!extractionProvider) {
      setShowKimiKeyDialog(true);
      return;
    }

    setFetchingArticle(true);
    setFetchError('');
    setFetchedContent('');
    setFetchedAnalysis('');

    try {
      const article = await extractArticleWithKimi(trimmedUrl);
      const { year, month, day } = parseArticleDate(article.date);

      setNewArticle((previous) => ({
        ...previous,
        title: article.title,
        date: article.date,
        year,
        month,
        day,
        source: article.source,
        summary: normalizeExtractedSummary(article.summary, article.title),
        url: article.url,
        category: article.category || 'speech',
        categoryName: article.categoryName || (article.category === 'call' ? '致电' : '重要讲话'),
        domain: article.domain || previous.domain,
        domainName: article.domainName || previous.domainName,
        location: article.location,
      }));

      setFetchedContent(article.fullText);
      setFetchedAnalysis(normalizeAnalysisText(article.analysis));
      onSuccess(`文章内容已精准提取！标题: ${article.title}`, 5000);
    } catch (error) {
      console.error('Fetch article error:', error);
      setFetchError(error instanceof Error ? error.message : '提取文章失败，请手动填写');
    } finally {
      setFetchingArticle(false);
    }
  };

  const handleSaveKimiKey = async () => {
    if (!kimiKeyInput.trim()) return;

    setKimiKeyValidating(true);
    const result = await validateKimiApiKey(kimiKeyInput.trim());
    setKimiKeyValidating(false);

    if (result.valid) {
      saveKimiApiKey(kimiKeyInput.trim());
      setKimiApiKey(kimiKeyInput.trim());
      setShowKimiKeyDialog(false);
      onSuccess('Kimi API Key 配置成功！');
      return;
    }

    setFetchError(result.error || 'API Key验证失败');
    setTimeout(() => setFetchError(''), 5000);
  };

  const handleClearKimiKey = () => {
    clearKimiApiKey();
    setKimiApiKey('');
    onSuccess('已清除Kimi API Key');
  };

  const handleProcessManualContent = async () => {
    if (!manualContent.trim()) {
      alert('请粘贴网页内容');
      return;
    }

    const extractionProvider = getAvailableExtractionProvider();
    if (!extractionProvider) {
      setShowKimiKeyDialog(true);
      return;
    }

    setProcessingManual(true);
    try {
      const url = manualUrl.trim() || 'https://example.com/article';
      const article = await extractArticleFromText(manualContent, url);

      setNewArticle((previous) => ({
        ...previous,
        title: article.title,
        date: article.date,
        source: article.source,
        summary: normalizeExtractedSummary(article.summary, article.title),
        url: article.url,
        category: article.category || 'speech',
        categoryName: article.categoryName || '重要讲话',
        domain: article.domain || previous.domain,
        domainName: article.domainName || previous.domainName,
        location: article.location,
      }));

      setFetchedContent(article.fullText);
      setFetchedAnalysis(normalizeAnalysisText(article.analysis));
      setShowManualInput(false);
      setManualContent('');
      setManualUrl('');
      onSuccess(`内容提取成功！标题: ${article.title}`, 5000);
    } catch (error) {
      console.error('Process manual content error:', error);
      alert('提取失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setProcessingManual(false);
    }
  };

  const handleAddArticle = async () => {
    if (!newArticle.title || !newArticle.date || !newArticle.source || !newArticle.summary) {
      alert('请填写完整信息');
      return;
    }

    try {
      let { year, month, day } = parseArticleDate(newArticle.date);

      if (newArticle.year && !Number.isNaN(newArticle.year)) year = newArticle.year;
      if (newArticle.month && !Number.isNaN(newArticle.month)) month = newArticle.month;
      if (newArticle.day && !Number.isNaN(newArticle.day)) day = newArticle.day;

      const articleId = generateArticleId(year);
      const article: Speech = {
        id: articleId,
        title: newArticle.title,
        date: newArticle.date,
        year,
        month,
        day,
        category: newArticle.category as Speech['category'],
        categoryName: newArticle.categoryName || (newArticle.category === 'call' ? '致电' : '重要讲话'),
        domain: newArticle.domain || 'economy',
        domainName: newArticle.domainName || '经济',
        isZhengjiguan: newArticle.isZhengjiguan || false,
        zhengjiguanLevel: newArticle.zhengjiguanLevel,
        source: newArticle.source,
        summary: normalizeExtractedSummary(newArticle.summary, newArticle.title),
        url: newArticle.url || '',
        location: newArticle.location,
      };

      const result = await addArticle(article);
      if (!result.success) {
        alert('添加失败：' + (result.error || '未知错误'));
        return;
      }

      const detail: ArticleDetailContent = {
        id: articleId,
        abstract: normalizeExtractedSummary(newArticle.summary, newArticle.title),
        fullText: fetchedContent || '',
        analysis: fetchedAnalysis.trim() || '解读分析正在整理中...',
      };
      const detailSaved = await saveArticleDetail(detail);
      if (!detailSaved) {
        await deleteArticle(articleId);
        alert('添加失败：文章详情保存失败，已自动回滚主记录，请重试');
        return;
      }

      const wasApproval = !!pendingToApprove;
      if (pendingToApprove) {
        await approveArticle(pendingToApprove);
        setPendingToApprove(null);
      }

      setAddDialogOpen(false);
      setNewArticle(createDefaultNewArticle());
      resetAddDialogAuxState();
      await loadData();

      if (result.error) {
        onSuccess(`添加成功（警告：${result.error}）`, 5000);
      } else {
        onSuccess(wasApproval ? '已发布！' : '添加成功！', 5000);
      }
    } catch (error) {
      console.error('Add article error:', error);
      alert('添加失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleFetchFromUrlAuto = async (url: string, title?: string, summary?: string) => {
    if (!url.trim()) {
      return;
    }

    if (!extractionProvider) {
      setFetchUrl(url);
      setNewArticle((previous) => ({
        ...previous,
        title: title || previous.title,
        summary: normalizeExtractedSummary(summary || previous.summary, title || previous.title),
        url,
      }));
      setFetchError('未配置 Kimi/DeepSeek API Key，请手动填写或配置 API Key');
      return;
    }

    setFetchingArticle(true);
    setFetchError('');
    setFetchUrl(url);

    try {
      const article = await extractArticleWithKimi(url);

      setNewArticle((previous) => ({
        ...previous,
        title: article.title || title || previous.title,
        date: article.date || previous.date,
        year: article.date ? parseInt(article.date.split('-')[0]) : previous.year,
        month: article.date ? parseInt(article.date.split('-')[1]) : previous.month,
        day: article.date ? parseInt(article.date.split('-')[2]) : previous.day,
        source: article.source || previous.source,
        summary: normalizeExtractedSummary(article.summary || summary || previous.summary, article.title || title || previous.title),
        url: article.url || url,
        category: (article.category as Speech['category']) || previous.category,
        categoryName: article.categoryName || previous.categoryName,
        location: article.location || previous.location,
      }));

      setFetchedContent(article.fullText || '');
      setFetchedAnalysis(normalizeAnalysisText(article.analysis || ''));
      onSuccess(`AI提取成功！标题: ${article.title}`, 5000);
    } catch (error) {
      console.error('Fetch article error:', error);
      setFetchError(error instanceof Error ? error.message : '提取文章失败，请手动填写');
      setNewArticle((previous) => ({
        ...previous,
        title: title || previous.title,
        summary: normalizeExtractedSummary(summary || previous.summary, title || previous.title),
        url,
      }));
    } finally {
      setFetchingArticle(false);
    }
  };

  const handleApprovePending = async (pending: PendingArticle) => {
    setPendingToApprove(pending.id);

    if (pending.url) {
      setFetchUrl(pending.url);
    }

    setAddDialogOpen(true);
    setActiveTab('articles');

    setNewArticle({
      title: pending.title,
      date: pending.date,
      year: pending.year || new Date().getFullYear(),
      month: pending.month || new Date().getMonth() + 1,
      day: pending.day || new Date().getDate(),
      category: (pending.category as Speech['category']) || 'speech',
      categoryName: pending.categoryName || (pending.category === 'call' ? '致电' : '重要讲话'),
      domain: (pending.domain as Speech['domain']) || 'politics',
      domainName: '政治',
      source: pending.source || '',
      summary: pending.summary || '',
      url: pending.url || '',
      location: pending.location,
    });

    if (pending.url) {
      setTimeout(() => {
        void handleFetchFromUrlAuto(pending.url || '', pending.title, pending.summary);
      }, 300);
    }
  };

  const handleAddDialogOpenChange = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      resetAddDialogAuxState();
    }
  };

  return {
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
    hasConfiguredExtractionProvider: Boolean(extractionProvider),
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
    preferredExtractionProvider: extractionProvider?.provider || null,
    searchTerm,
    setAddDialogOpen,
    setDeleteDialogOpen,
    setEditingArticle,
    setEditingDetail,
    setEditDialogOpen,
    setFetchUrl,
    setFetchedAnalysis,
    setKimiKeyInput,
    setManualContent,
    setManualUrl,
    setNewArticle,
    setShowKimiKeyDialog,
    setShowManualInput,
    showKimiKeyDialog,
    showManualInput,
    setSearchTerm,
  };
}
