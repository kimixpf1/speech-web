import { useState } from 'react';
import { getDeepSeekApiKey, getPreferredExtractionApi } from '@/services/aiSearchService';
import {
  extractArticleFromText,
  extractArticleWithKimi,
  getKimiApiKey,
  isValidUrl,
} from '@/services/kimiArticleService';
import { normalizeAnalysisText, normalizeSummaryText } from '@/lib/utils';
import { publishAdminArticle } from '@/services/adminArticleWorkflowService';
import { approveArticle, type PendingArticle } from '@/services/pendingArticleService';
import type { Speech } from '@/services/articleServiceEnhanced';

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

function parseArticleDate(date?: string) {
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  let day = new Date().getDate();

  if (!date) return { year, month, day };

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

type CreationPhase = 'idle' | 'prefill' | 'extracting' | 'ready' | 'manual' | 'publishing';

export function useArticleCreationFlow(options: {
  loadData: (opts?: { skipArticlesRefresh?: boolean }) => Promise<void>;
  onSuccess: (message: string, duration?: number) => void;
  setActiveTab: (tab: string) => void;
  setArticles: React.Dispatch<React.SetStateAction<Speech[]>>;
  onMissingApiKey: () => void;
}) {
  const { loadData, onSuccess, setActiveTab, setArticles, onMissingApiKey } = options;

  const [phase, setPhase] = useState<CreationPhase>('idle');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newArticle, setNewArticle] = useState<Partial<Speech>>(createDefaultNewArticle);
  const [pendingToApprove, setPendingToApprove] = useState<string | null>(null);

  const [fetchUrl, setFetchUrl] = useState('');
  const [fetchingArticle, setFetchingArticle] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchedContent, setFetchedContent] = useState('');
  const [fetchedAnalysis, setFetchedAnalysis] = useState('');

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [processingManual, setProcessingManual] = useState(false);

  const extractionProvider = getAvailableExtractionProvider();

  const resetAddDialogAuxState = () => {
    setFetchUrl('');
    setFetchError('');
    setFetchedContent('');
    setFetchedAnalysis('');
    setShowManualInput(false);
    setManualContent('');
    setManualUrl('');
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

    const provider = getAvailableExtractionProvider();
    if (!provider) {
      onMissingApiKey();
      return;
    }

    setFetchingArticle(true);
    setFetchError('');
    setFetchedContent('');
    setFetchedAnalysis('');
    setPhase('extracting');

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
      setPhase('ready');
      onSuccess(`文章内容已精准提取！标题: ${article.title}`, 5000);
    } catch (error) {
      console.error('Fetch article error:', error);
      setFetchError(error instanceof Error ? error.message : '提取文章失败，请手动填写');
      setPhase('manual');
    } finally {
      setFetchingArticle(false);
    }
  };

  const handleProcessManualContent = async () => {
    if (!manualContent.trim()) {
      alert('请粘贴网页内容');
      return;
    }

    const provider = getAvailableExtractionProvider();
    if (!provider) {
      onMissingApiKey();
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
      setPhase('ready');
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

    setPhase('publishing');
    try {
      const result = await publishAdminArticle({
        draft: newArticle,
        detail: { fullText: fetchedContent, analysis: fetchedAnalysis },
        pendingId: pendingToApprove,
      });

      if (!result.success) {
        setFetchError(result.message);
        setPhase('ready');
        return;
      }

      if (result.articleId) {
        const { year, month, day } = parseArticleDate(newArticle.date);
        const article: Speech = {
          id: result.articleId,
          title: newArticle.title,
          date: newArticle.date,
          year: newArticle.year || year,
          month: newArticle.month || month,
          day: newArticle.day || day,
          category: (newArticle.category as Speech['category']) || 'speech',
          categoryName: newArticle.categoryName || '重要讲话',
          domain: newArticle.domain || 'economy',
          domainName: newArticle.domainName || '经济',
          isZhengjiguan: newArticle.isZhengjiguan || false,
          zhengjiguanLevel: newArticle.zhengjiguanLevel,
          source: newArticle.source,
          summary: normalizeExtractedSummary(newArticle.summary, newArticle.title),
          url: newArticle.url || '',
          location: newArticle.location,
        };

        setArticles((prev) => {
          const exists = prev.some((a) => a.id === article.id);
          if (exists) return prev;
          const next = [article, ...prev];
          next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return next;
        });
      }

      setPendingToApprove(null);
      setAddDialogOpen(false);
      setNewArticle(createDefaultNewArticle());
      resetAddDialogAuxState();
      setPhase('idle');

      await loadData({ skipArticlesRefresh: true });
      onSuccess(result.message, 5000);
    } catch (error) {
      console.error('Add article error:', error);
      alert('添加失败：' + (error instanceof Error ? error.message : '未知错误'));
      setPhase('ready');
    }
  };

  const handleFetchFromUrlAuto = async (url: string, title?: string, summary?: string) => {
    if (!url.trim()) return;

    if (!getAvailableExtractionProvider()) {
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
    setPhase('extracting');

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
        summary: normalizeExtractedSummary(
          article.summary || summary || previous.summary,
          article.title || title || previous.title
        ),
        url: article.url || url,
        category: (article.category as Speech['category']) || previous.category,
        categoryName: article.categoryName || previous.categoryName,
        location: article.location || previous.location,
      }));

      setFetchedContent(article.fullText || '');
      setFetchedAnalysis(normalizeAnalysisText(article.analysis || ''));
      setPhase('ready');
      onSuccess(`AI提取成功！标题: ${article.title}`, 5000);
    } catch (error) {
      console.error('Fetch article error:', error);
      setFetchError(error instanceof Error ? error.message : '提取文章失败，请手动填写');
      setPhase('manual');
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
    setPhase('prefill');

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
      domainName: pending.domainName || '政治',
      source: pending.source || '',
      summary: pending.summary || '',
      url: pending.url || '',
      location: pending.location,
    });

    if (pending.url && getAvailableExtractionProvider()) {
      setFetchUrl(pending.url);
      await handleFetchFromUrlAuto(pending.url, pending.title, pending.summary);
    } else if (pending.url) {
      setFetchUrl(pending.url);
      setFetchError('未配置提取 API Key，请手动填写或配置 API Key');
      setPhase('manual');
    } else {
      setPhase('ready');
    }
  };

  const handleAddDialogOpenChange = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      resetAddDialogAuxState();
      setPhase('idle');
    }
  };

  return {
    phase,
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
    hasConfiguredExtractionProvider: Boolean(extractionProvider),
    preferredExtractionProvider: extractionProvider?.provider || null,
    handleFetchFromUrl,
    handleProcessManualContent,
    handleAddArticle,
    handleApprovePending,
    handleAddDialogOpenChange,
  };
}

export type ArticleCreationFlowReturn = ReturnType<typeof useArticleCreationFlow>;
