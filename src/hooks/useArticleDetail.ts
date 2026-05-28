import { useEffect, useState, useCallback } from 'react';
import { getLocalArticlesSync, type Speech } from '@/services/articleServiceEnhanced';
import { getArticleDetail, saveArticleDetail } from '@/services/articleDetailService';
import { generateSummaryAndAnalysis, isApiKeyConfigured } from '@/services/aiSummaryService';
import { normalizeArticleUrl, normalizeSummaryText, updatePageMeta, resetPageMeta, injectArticleJsonLd, removeJsonLd } from '@/lib/utils';
import { getPreferredAbstract, hasMeaningfulText, getFallbackFullText, getFallbackAnalysis, normalizeAbstractPreview } from '@/utils/textUtils';

export interface SpeechDetail extends Speech {
  abstract?: string;
  fullText?: string;
  analysis?: string;
}

export interface UseArticleDetailReturn {
  speech: SpeechDetail | null;
  isLoading: boolean;
  isGenerating: boolean;
  generateError: string;
  hasGeneratedContent: boolean;
  normalizedSpeechUrl: string;
  handleGenerateContent: () => Promise<void>;
}

export function useArticleDetail(id: string | undefined): UseArticleDetailReturn {
  const [speech, setSpeech] = useState<SpeechDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false);
  const normalizedSpeechUrl = normalizeArticleUrl(speech?.url);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setIsLoading(true);
    setSpeech(null);

    if (id) {
      const loadDetailAndSet = async (baseSpeech: Speech) => {
        try {
          const cloudDetail = await getArticleDetail(id, false);
          if (cloudDetail && (cloudDetail.abstract || cloudDetail.analysis || cloudDetail.fullText)) {
            setSpeech({
              ...baseSpeech,
              abstract: getPreferredAbstract(cloudDetail.abstract, baseSpeech.summary),
              fullText: hasMeaningfulText(cloudDetail.fullText) ? cloudDetail.fullText : getFallbackFullText(baseSpeech),
              analysis: hasMeaningfulText(cloudDetail.analysis) ? cloudDetail.analysis : getFallbackAnalysis(baseSpeech),
            } as SpeechDetail);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error('获取云端详情失败:', err);
        }

        setSpeech({
          ...baseSpeech,
          abstract: normalizeAbstractPreview(baseSpeech.summary || '摘要正在整理中...'),
          fullText: getFallbackFullText(baseSpeech),
          analysis: getFallbackAnalysis(baseSpeech),
        } as SpeechDetail);
        setIsLoading(false);
      };

      // 从静态数据查找文章基础信息（getLocalArticlesSync 已返回全部 1173 篇）
      let baseSpeech = getLocalArticlesSync().find(s => s.id === id);

      if (baseSpeech) {
        loadDetailAndSet(baseSpeech);
      } else {
        setSpeech(null);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (speech) {
      const desc = speech.summary || speech.abstract || '重要讲话详情';
      updatePageMeta(speech.title, desc, `/#/detail/${speech.id}`);
      injectArticleJsonLd(speech.title, speech.date, desc, speech.url);
    }
    return () => {
      resetPageMeta();
      removeJsonLd();
    };
  }, [speech]);

  const handleGenerateContent = useCallback(async () => {
    if (!speech || !id) return;

    if (!isApiKeyConfigured()) {
      setGenerateError('请先在管理员后台配置 Kimi 或 DeepSeek API Key');
      return;
    }

    setIsGenerating(true);
    setGenerateError('');

    try {
      const result = await generateSummaryAndAnalysis(
        id,
        speech.url || '',
        speech.title,
        speech.abstract,
        hasGeneratedContent
      );

      setSpeech(prev => prev ? {
        ...prev,
        abstract: result.summary,
        analysis: result.analysis,
      } : null);

      await saveArticleDetail({
        id,
        abstract: result.summary,
        fullText: speech.fullText && !speech.fullText.includes('加载中') ? speech.fullText : '',
        analysis: result.analysis,
      });

      setHasGeneratedContent(true);
    } catch (e) {
      console.error('生成失败:', e);
      setGenerateError(e instanceof Error ? e.message : '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [speech, id, hasGeneratedContent]);

  return {
    speech,
    isLoading,
    isGenerating,
    generateError,
    hasGeneratedContent,
    normalizedSpeechUrl,
    handleGenerateContent,
  };
}
