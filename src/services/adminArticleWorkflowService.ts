import {
  addArticle,
  deleteArticle,
  generateArticleId,
  type Speech,
} from '@/services/articleServiceEnhanced';
import {
  saveArticleDetail,
  type ArticleDetailContent,
} from '@/services/articleDetailService';
import { approveArticle } from '@/services/pendingArticleService';
import { normalizeSummaryText } from '@/lib/utils';

export interface PublishDraft {
  title: string;
  date: string;
  year: number;
  month: number;
  day: number;
  category: Speech['category'];
  categoryName: string;
  domain: string;
  domainName: string;
  isZhengjiguan: boolean;
  zhengjiguanLevel?: string;
  source: string;
  summary: string;
  url: string;
  location?: string;
}

export interface PublishDetail {
  fullText: string;
  analysis: string;
}

export interface PublishResult {
  success: boolean;
  message: string;
  articleId?: string;
}

export function buildArticleFromDraft(
  draft: Partial<Speech>,
  articleId: string
): Speech {
  return {
    id: articleId,
    title: draft.title || '',
    date: draft.date || '',
    year: draft.year || new Date().getFullYear(),
    month: draft.month || new Date().getMonth() + 1,
    day: draft.day || new Date().getDate(),
    category: (draft.category as Speech['category']) || 'speech',
    categoryName:
      draft.categoryName ||
      (draft.category === 'call' ? '致电回信' : '重要讲话'),
    domain: draft.domain || 'economy',
    domainName: draft.domainName || '经济',
    isZhengjiguan: draft.isZhengjiguan || false,
    zhengjiguanLevel: draft.zhengjiguanLevel,
    source: draft.source || '',
    summary: normalizeSummaryText(draft.summary || draft.title || '', {
      maxLength: 220,
      minLength: 90,
      maxSentences: 3,
    }),
    url: draft.url || '',
    location: draft.location,
  };
}

export async function publishAdminArticle(params: {
  draft: Partial<Speech>;
  detail: PublishDetail;
  pendingId?: string | null;
}): Promise<PublishResult> {
  const { draft, detail, pendingId } = params;

  if (!draft.title || !draft.date || !draft.source || !draft.summary) {
    return { success: false, message: '请填写完整信息' };
  }

  let year = draft.year || new Date().getFullYear();
  let month = draft.month || new Date().getMonth() + 1;
  let day = draft.day || new Date().getDate();

  if (draft.year && !Number.isNaN(draft.year)) year = draft.year;
  if (draft.month && !Number.isNaN(draft.month)) month = draft.month;
  if (draft.day && !Number.isNaN(draft.day)) day = draft.day;

  const articleId = await generateArticleId(year);
  const article = buildArticleFromDraft(
    { ...draft, year, month, day },
    articleId
  );

  const result = await addArticle(article);
  if (!result.success) {
    return { success: false, message: '添加失败：' + (result.error || '未知错误') };
  }

  const articleDetail: ArticleDetailContent = {
    id: articleId,
    abstract: normalizeSummaryText(draft.summary || draft.title || '', {
      maxLength: 220,
      minLength: 90,
      maxSentences: 3,
    }),
    fullText: detail.fullText || '',
    analysis: detail.analysis.trim() || '解读分析正在整理中...',
  };

  const detailSaved = await saveArticleDetail(articleDetail);
  if (!detailSaved) {
    await deleteArticle(articleId);
    return {
      success: false,
      message: '添加失败：文章详情保存失败，已自动回滚主记录，请重试',
    };
  }

  const wasApproval = !!pendingId;
  if (pendingId) {
    await approveArticle(pendingId);
  }

  if (result.error) {
    return {
      success: true,
      message: `添加成功（警告：${result.error}）`,
      articleId,
    };
  }

  return {
    success: true,
    message: wasApproval ? '已发布！' : '添加成功！',
    articleId,
  };
}
