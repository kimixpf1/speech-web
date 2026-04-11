import { normalizeSummaryText } from '@/lib/utils';
import type { Speech } from '@/services/articleServiceEnhanced';

export function cleanFullText(text: string): string {
  if (!text) return text;

  let lines = text.split('\n');

  const noisePatterns = [
    /^(首页|要闻|时政|国际|社会|军事|财经|观点|评论|图片|视频|热点)\s*[|｜>/]/,
    /^(人民网|新华网|央视网|光明网|中国网|中新网)\s*>>/,
    /^(来源|编辑|责编|责任编辑|记者|发稿|稿件|审核|校对)[:：]/,
    /^分享到[:：]?\s*(微信|微博|QQ|朋友圈)/,
    /^(上一篇|下一篇|相关新闻|相关阅读|推荐阅读|延伸阅读|热门推荐)[:：]?/,
    /^\s*(返回|回到顶部|版权所有|Copyright|©|All rights)/i,
    /^(评论|留言|登录|注册|关注|订阅|扫码|二维码|APP下载)/,
    /^\s*\[.*\]\s*$/,
    /^(打印|收藏|关闭窗口|字号|大中小)/,
    /^\s*(转发|点赞|在看|收藏)\s*\d*\s*$/,
    /^(央广网|中国共产党新闻网|中国政府网|求是网)$/,
    /^\d{4}年\d{1,2}月\d{1,2}日\d{1,2}:\d{2}\s*$/,
    /^http[s]?:\/\//,
    /^(原标题|分享|纠错|举报)[:：]/,
    /^\s*\(\s*\d+\s*\)\s*$/,
  ];

  lines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return true;
    return !noisePatterns.some(pattern => pattern.test(trimmed));
  });

  while (lines.length > 0) {
    const trimmed = lines[0].trim();
    if (trimmed.length === 0) {
      lines.shift();
      continue;
    }
    if (trimmed.length < 5 && !/^[（【"']/.test(trimmed)) {
      lines.shift();
      continue;
    }
    break;
  }

  while (lines.length > 0) {
    const trimmed = lines[lines.length - 1].trim();
    if (trimmed.length === 0) {
      lines.pop();
      continue;
    }
    if (trimmed.length < 5) {
      lines.pop();
      continue;
    }
    break;
  }

  let result = lines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

export function normalizeAbstractPreview(text: string): string {
  return normalizeSummaryText(text);
}

export function hasMeaningfulText(text?: string): boolean {
  const trimmed = text?.trim() || '';
  return Boolean(trimmed) && !trimmed.includes('加载中') && !trimmed.includes('整理中');
}

export function getPreferredAbstract(primaryText: string | undefined, fallbackText: string | undefined): string {
  const normalizedPrimary = normalizeAbstractPreview(primaryText || '');
  if (normalizedPrimary && normalizedPrimary.length >= 20 && !normalizedPrimary.includes('整理中')) {
    return normalizedPrimary;
  }

  const normalizedFallback = normalizeAbstractPreview(fallbackText || '');
  if (normalizedFallback) {
    return normalizedFallback;
  }

  return '摘要正在整理中...';
}

export function getFallbackFullText(speech: Speech): string {
  return speech.fullText?.trim() || '暂未收录全文，请点击上方原文链接查看。';
}

export function getFallbackAnalysis(speech: Speech): string {
  return speech.analysis?.trim() || '解读内容正在补充中，可先结合摘要和原文阅读。';
}
