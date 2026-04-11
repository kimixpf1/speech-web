import { useEffect, useState, useRef, useCallback, startTransition } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, ExternalLink, Share2, Mic, FileText, Users, MapPin as MapPinIcon, BookOpen, FileText as FileTextIcon, TrendingUp, Copy, Check, MessageCircle, Volume2, Download, Play, Pause, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { generateSummaryAndAnalysis, isApiKeyConfigured, type GeneratedContent } from '@/services/aiSummaryService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { speechesData } from '@/data/speeches';
import { zhengjiguanArticles } from '@/data/zhengjiguanArticles';
export interface SpeechDetail extends Speech {
  abstract?: string;
  fullText?: string;
  analysis?: string;
}
import { getArticles, getLocalArticlesSync, getZhengjiguanArticles, type Speech } from '@/services/articleServiceEnhanced';
import { getArticleDetail, saveArticleDetail } from '@/services/articleDetailService';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';

import { normalizeArticleUrl, normalizeSummaryText, updatePageMeta, resetPageMeta, injectArticleJsonLd, removeJsonLd } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { Progress as PiperProgress, TtsSession as PiperTtsSession } from '@mintplex-labs/piper-tts-web';

const categoryConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; borderColor: string; label: string }> = {
  speech: { icon: Mic, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', label: '重要讲话' },
  article: { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', label: '发表文章' },
  meeting: { icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', label: '重要会议' },
  inspection: { icon: MapPinIcon, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', label: '考察调研' },
};

// 领域配置
const domainConfig: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  economy: { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', label: '经济' },
  politics: { color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200', label: '政治' },
  culture: { color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', label: '文化' },
  society: { color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', label: '社会' },
  ecology: { color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', label: '生态' },
  party: { color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', label: '党建' },
  defense: { color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200', label: '国防' },
  diplomacy: { color: 'text-cyan-600', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', label: '外交' },
};

/**
 * 清洗文章正文 - 去除从网页提取时混入的无关内容
 * 适用于人民网、新华网等官方网站的文章
 */
function cleanFullText(text: string): string {
  if (!text) return text;

  // 按行分割
  let lines = text.split('\n');

  // 常见的无关行模式（导航栏、版权、分享按钮等）
  const noisePatterns = [
    /^(首页|要闻|时政|国际|社会|军事|财经|观点|评论|图片|视频|热点)\s*[|｜>/]/,
    /^(人民网|新华网|央视网|光明网|中国网|中新网)\s*>>/,
    /^(来源|编辑|责编|责任编辑|记者|发稿|稿件|审核|校对)[:：]/,
    /^分享到[:：]?\s*(微信|微博|QQ|朋友圈)/,
    /^(上一篇|下一篇|相关新闻|相关阅读|推荐阅读|延伸阅读|热门推荐)[:：]?/,
    /^\s*(返回|回到顶部|版权所有|Copyright|©|All rights)/i,
    /^(评论|留言|登录|注册|关注|订阅|扫码|二维码|APP下载)/,
    /^\s*\[.*\]\s*$/,                  // [分享] [打印] 等按钮
    /^(打印|收藏|关闭窗口|字号|大中小)/,
    /^\s*(转发|点赞|在看|收藏)\s*\d*\s*$/,
    /^(央广网|中国共产党新闻网|中国政府网|求是网)$/,
    /^\d{4}年\d{1,2}月\d{1,2}日\d{1,2}:\d{2}\s*$/,  // 纯时间行
    /^http[s]?:\/\//,                  // 纯URL行
    /^(原标题|分享|纠错|举报)[:：]/,
    /^\s*\(\s*\d+\s*\)\s*$/,           // 纯页码 (1) (2) 
  ];

  // 过滤无关行
  lines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return true; // 保留空行
    return !noisePatterns.some(pattern => pattern.test(trimmed));
  });

  // 去掉开头连续的短行（通常是导航碎片）
  while (lines.length > 0) {
    const trimmed = lines[0].trim();
    // 空行跳过
    if (trimmed.length === 0) {
      lines.shift();
      continue;
    }
    // 短于5个字符且不像正文开头的行去掉
    if (trimmed.length < 5 && !/^[（【"']/.test(trimmed)) {
      lines.shift();
      continue;
    }
    break;
  }

  // 去掉末尾的无关内容
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

  // 合并多余空行
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

function normalizeAbstractPreview(text: string): string {
  return normalizeSummaryText(text);
}

function hasMeaningfulText(text?: string): boolean {
  const trimmed = text?.trim() || '';
  return Boolean(trimmed) && !trimmed.includes('加载中') && !trimmed.includes('整理中');
}

function getPreferredAbstract(primaryText: string | undefined, fallbackText: string | undefined): string {
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

function getFallbackFullText(speech: Speech): string {
  return speech.fullText?.trim() || '暂未收录全文，请点击上方原文链接查看。';
}

function getFallbackAnalysis(speech: Speech): string {
  return speech.analysis?.trim() || '解读内容正在补充中，可先结合摘要和原文阅读。';
}

const LOCAL_VOICE_PACK_ID = 'zh_CN-huayan-x_low';
const LOCAL_VOICE_PACK_SIZE_MB = 20;

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [speech, setSpeech] = useState<SpeechDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // 语音播报状态
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [showTtsDialog, setShowTtsDialog] = useState(false);
  const [ttsError, setTtsError] = useState('');
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const utteranceQueueRef = useRef<SpeechSynthesisUtterance[]>([]);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioIndexRef = useRef(0);
  const isAudioPlayingRef = useRef(false);
  const nativeTtsActiveRef = useRef(false);
  const startTimeoutRef = useRef<number | null>(null);
  const resumeIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const voicePackRunIdRef = useRef(0);
  const localVoicePackSessionRef = useRef<PiperTtsSession | null>(null);
  const localVoicePackModuleRef = useRef<typeof import('@mintplex-labs/piper-tts-web') | null>(null);
  const [isPreparingVoicePack, setIsPreparingVoicePack] = useState(false);
  const [voicePackReady, setVoicePackReady] = useState(false);
  const [voicePackDownloadProgress, setVoicePackDownloadProgress] = useState(0);
  const [voicePackStatusText, setVoicePackStatusText] = useState('');

  // AI生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false);
  const normalizedSpeechUrl = normalizeArticleUrl(speech?.url);

  useEffect(() => {
    // 进入详情页时直接跳转到顶部（无动画）
    window.scrollTo({ top: 0, behavior: 'auto' });
    setIsLoading(true);
    setSpeech(null); // 重置 speech 状态
    
    if (id) {
      // 异步加载详情数据的辅助函数
      const loadDetailAndSet = async (baseSpeech: Speech) => {
        // 获取云端详情数据
        try {
          const cloudDetail = await getArticleDetail(id, true); // 强制刷新，获取最新数据
          if (cloudDetail && (cloudDetail.abstract || cloudDetail.analysis || cloudDetail.fullText)) {
            // 一次性更新状态，避免中间状态
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
        
        // 云端没有数据，显示占位符
        setSpeech({
          ...baseSpeech,
          abstract: normalizeAbstractPreview(baseSpeech.summary || '摘要正在整理中...'),
          fullText: getFallbackFullText(baseSpeech),
          analysis: getFallbackAnalysis(baseSpeech),
        } as SpeechDetail);
        setIsLoading(false);
      };

      // 先从静态数据查找（包括主列表和政绩观专题）
      let baseSpeech = speechesData.find(s => s.id === id)
        || zhengjiguanArticles.find(s => s.id === id);
      
      // 如果静态数据中没有，从本地缓存同步查找
      if (!baseSpeech) {
        const localArticles = getLocalArticlesSync();
        baseSpeech = localArticles.find(s => s.id === id);
      }
      
      // 如果找到了，加载详情
      if (baseSpeech) {
        loadDetailAndSet(baseSpeech);
      } else {
        // 本地也没有，从云端获取（同时查主文章和政绩观文章）
        const loadFromCloud = async () => {
          try {
            const cloudArticles = await getArticles();
            let cloudSpeech = cloudArticles.find(s => s.id === id);
            
            // 主列表没找到，查政绩观专题
            if (!cloudSpeech) {
              const zjgArticles = await getZhengjiguanArticles();
              cloudSpeech = zjgArticles.find(s => s.id === id);
            }
            
            if (cloudSpeech) {
              await loadDetailAndSet(cloudSpeech);
            } else {
              // 确保在找不到内容时，先设置 speech 为 null，再设置 isLoading
              setSpeech(null);
              setIsLoading(false);
            }
          } catch (err) {
            console.error('从云端加载文章失败:', err);
            setSpeech(null);
            setIsLoading(false);
          }
        };
        loadFromCloud();
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

  // AI生成摘要和解读
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
        hasGeneratedContent // 如果已生成过，强制重新生成
      );

      // 更新speech状态
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

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShareToWeChat = () => {
    alert('请使用微信扫一扫功能分享此页面');
  };

  const handleBack = () => {
    const isZhengjiguanDetail = window.location.hash.includes('/zhengjiguan/');
    const targetPath = isZhengjiguanDetail ? '/zhengjiguan' : '/';
    startTransition(() => {
      navigate(targetPath, { replace: true });
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      window.speechSynthesis.onvoiceschanged = () => {
        synthRef.current = window.speechSynthesis;
      };
    }
    
    return () => {
      if (startTimeoutRef.current) {
        window.clearTimeout(startTimeoutRef.current);
      }
      if (resumeIntervalRef.current) {
        window.clearInterval(resumeIntervalRef.current);
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      utteranceQueueRef.current = [];
      nativeTtsActiveRef.current = false;
      stopAudioQueue();
      void audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  const supportsSpeechSynthesis = () => {
    return typeof window !== 'undefined' 
      && 'speechSynthesis' in window 
      && typeof SpeechSynthesisUtterance !== 'undefined';
  };

  const getUserAgent = () => {
    if (typeof navigator === 'undefined') {
      return '';
    }
    return navigator.userAgent.toLowerCase();
  };

  const isAndroidDevice = () => /android/.test(getUserAgent());

  const isHuaweiDevice = () => /huawei|honor/.test(getUserAgent());

  const isIOSDevice = () => /iphone|ipad|ipod/.test(getUserAgent());

  const isWeChatBrowser = () => /micromessenger|wechat/.test(getUserAgent());

  const isMobileDevice = () => isAndroidDevice() || isIOSDevice();

  const supportsDownloadedVoicePack = () => isMobileDevice() || isWeChatBrowser();

  const shouldPreferDownloadedVoicePack = () => isHuaweiDevice() || isWeChatBrowser();

  const canUseLocalTtsApi = () => {
    if (typeof window === 'undefined') {
      return false;
    }

    if (import.meta.env.DEV) {
      return true;
    }

    return import.meta.env.VITE_ENABLE_TTS_PROXY === 'true';
  };

  const shouldPreferServerTts = () => canUseLocalTtsApi() && (isMobileDevice() || isWeChatBrowser());

  const shouldAvoidFallbackAudio = () => canUseLocalTtsApi() && (isMobileDevice() || isWeChatBrowser());

  const splitTextForTTS = (text: string, maxLen: number = 300): string[] => {
    const chunks: string[] = [];
    // 按句号、问号、感叹号、换行分割
    const sentences = text.split(/(?<=[。！？\n])/);
    let current = '';
    for (const sentence of sentences) {
      if ((current + sentence).length > maxLen && current.length > 0) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) {
      chunks.push(current.trim());
    }
    return chunks.filter(c => c.length > 0);
  };

  const clearSpeakStartTimeout = () => {
    if (startTimeoutRef.current) {
      window.clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
  };

  const clearResumeInterval = () => {
    if (resumeIntervalRef.current) {
      window.clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }
  };

  const startResumeInterval = () => {
    clearResumeInterval();
    if (!isMobileDevice() && !isWeChatBrowser()) {
      return;
    }
    resumeIntervalRef.current = window.setInterval(() => {
      try {
        synthRef.current?.resume();
      } catch {}
    }, 700);
  };

  const getPreferredVoice = () => {
    const voices = synthRef.current?.getVoices() || [];
    if (!voices.length) {
      return null;
    }

    if (isAndroidDevice() || isHuaweiDevice()) {
      return null;
    }

    return (
      voices.find(v => /zh|cmn|CN/i.test(v.lang) && /xiaoxiao|xiaoyi|yunxi|xiaomo|zh/i.test(v.name)) ||
      voices.find(v => /zh|cmn|CN/i.test(v.lang)) ||
      voices[0]
    );
  };

  const stopAudioQueue = () => {
    voicePackRunIdRef.current += 1;
    isAudioPlayingRef.current = false;
    if (currentBufferSourceRef.current) {
      try {
        currentBufferSourceRef.current.stop();
      } catch {}
      currentBufferSourceRef.current.disconnect();
      currentBufferSourceRef.current = null;
    }
    audioQueueRef.current.forEach(audio => {
      audio.pause();
      if (audio.dataset.objectUrl) {
        URL.revokeObjectURL(audio.dataset.objectUrl);
      }
      audio.src = '';
    });
    audioQueueRef.current = [];
    currentAudioIndexRef.current = 0;
  };

  const stopSpeaking = useCallback(() => {
    clearSpeakStartTimeout();
    clearResumeInterval();
    nativeTtsActiveRef.current = false;
    utteranceQueueRef.current = [];
    setIsPreparingVoicePack(false);
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    stopAudioQueue();
    setIsSpeaking(false);
  }, []);

  const loadLocalVoicePackModule = async () => {
    if (!localVoicePackModuleRef.current) {
      localVoicePackModuleRef.current = await import('@mintplex-labs/piper-tts-web');
    }

    return localVoicePackModuleRef.current;
  };

  const updateVoicePackProgress = (progress: PiperProgress, fallbackText: string) => {
    const total = progress.total || 0;
    const loaded = progress.loaded || 0;
    const percent = total > 0 ? Math.max(1, Math.min(100, Math.round((loaded * 100) / total))) : 0;
    setVoicePackDownloadProgress(percent);
    setVoicePackStatusText(total > 0 ? `${fallbackText} ${percent}%` : fallbackText);
  };

  const refreshVoicePackState = useCallback(async () => {
    if (!supportsDownloadedVoicePack()) {
      setVoicePackReady(false);
      setVoicePackDownloadProgress(0);
      setVoicePackStatusText('');
      return;
    }

    try {
      const voicePackModule = await loadLocalVoicePackModule();
      const storedVoices = await voicePackModule.stored();
      const hasDownloadedVoicePack = storedVoices.includes(LOCAL_VOICE_PACK_ID);
      setVoicePackReady(hasDownloadedVoicePack);
      setVoicePackDownloadProgress(hasDownloadedVoicePack ? 100 : 0);
      setVoicePackStatusText(
        hasDownloadedVoicePack
          ? '离线语音包已就绪，华为和微信环境会优先使用本地播报'
          : `可下载约 ${LOCAL_VOICE_PACK_SIZE_MB}MB 的中文离线语音包，下载后保存在当前浏览器里`
      );
    } catch (error) {
      console.error('检查离线语音包状态失败:', error);
      setVoicePackReady(false);
      setVoicePackDownloadProgress(0);
      setVoicePackStatusText(`可下载约 ${LOCAL_VOICE_PACK_SIZE_MB}MB 的中文离线语音包，下载后保存在当前浏览器里`);
    }
  }, []);

  useEffect(() => {
    if (showTtsDialog) {
      void refreshVoicePackState();
    }
  }, [refreshVoicePackState, showTtsDialog]);

  const ensureAudioContextReady = async () => {
    if (typeof window === 'undefined') {
      return null;
    }

    const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  };

  const ensureLocalVoicePackReady = async () => {
    if (localVoicePackSessionRef.current) {
      setVoicePackReady(true);
      setVoicePackDownloadProgress(100);
      setVoicePackStatusText('离线语音包已就绪');
      return localVoicePackSessionRef.current;
    }

    const voicePackModule = await loadLocalVoicePackModule();
    const storedVoices = await voicePackModule.stored();
    const hasDownloadedVoicePack = storedVoices.includes(LOCAL_VOICE_PACK_ID);

    setIsPreparingVoicePack(true);

    if (!hasDownloadedVoicePack) {
      setVoicePackDownloadProgress(0);
      setVoicePackStatusText(`正在下载离线语音包（约 ${LOCAL_VOICE_PACK_SIZE_MB}MB）`);
      await voicePackModule.download(LOCAL_VOICE_PACK_ID, (progress) => {
        updateVoicePackProgress(progress, '正在下载离线语音包');
      });
    }

    setVoicePackStatusText('正在加载离线语音包');
    const session = await voicePackModule.TtsSession.create({
      voiceId: LOCAL_VOICE_PACK_ID,
      progress: (progress) => {
        updateVoicePackProgress(progress, '正在初始化离线语音包');
      },
    });

    localVoicePackSessionRef.current = session;
    setVoicePackReady(true);
    setVoicePackDownloadProgress(100);
    setVoicePackStatusText('离线语音包已就绪');
    setIsPreparingVoicePack(false);
    return session;
  };

  const playGeneratedVoiceBlob = async (blob: Blob, runId: number) => {
    if (runId !== voicePackRunIdRef.current || !isAudioPlayingRef.current) {
      return;
    }

    const audioContext = await ensureAudioContextReady();
    if (audioContext) {
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

      await new Promise<void>((resolve, reject) => {
        if (runId !== voicePackRunIdRef.current || !isAudioPlayingRef.current) {
          resolve();
          return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        currentBufferSourceRef.current = source;
        source.onended = () => {
          if (currentBufferSourceRef.current === source) {
            currentBufferSourceRef.current = null;
          }
          resolve();
        };

        try {
          source.start(0);
        } catch (error) {
          reject(error);
        }
      });
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio();
      audio.dataset.objectUrl = objectUrl;
      audio.src = objectUrl;
      audio.preload = 'auto';
      audio.playsInline = true;
      audioQueueRef.current = [audio];

      audio.onended = () => {
        URL.revokeObjectURL(objectUrl);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('离线语音片段播放失败'));
      };
      audio.play().catch((error) => {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      });
    });
  };

  const handleDownloadVoicePack = async () => {
    setTtsError('');

    try {
      await ensureLocalVoicePackReady();
    } catch (error) {
      console.error('离线语音包下载失败:', error);
      setIsPreparingVoicePack(false);
      setVoicePackReady(false);
      setVoicePackDownloadProgress(0);
      setVoicePackStatusText(`离线语音包下载失败，可稍后在网络更稳定时重试`);
      setTtsError('离线语音包下载失败，请稍后重试');
    }
  };

  const playWithDownloadedVoicePack = async (text: string) => {
    const chunks = splitTextForTTS(text, 90);
    if (chunks.length === 0) {
      setTtsError('暂无可播报内容');
      return;
    }

    setTtsError('');
    stopAudioQueue();
    await ensureAudioContextReady();

    const runId = voicePackRunIdRef.current;
    isAudioPlayingRef.current = true;
    setIsSpeaking(true);
    setIsPreparingVoicePack(true);

    try {
      const session = await ensureLocalVoicePackReady();
      if (runId !== voicePackRunIdRef.current || !isAudioPlayingRef.current) {
        return;
      }

      setIsPreparingVoicePack(false);
      for (let idx = 0; idx < chunks.length; idx += 1) {
        if (runId !== voicePackRunIdRef.current || !isAudioPlayingRef.current) {
          return;
        }

        currentAudioIndexRef.current = idx;
        setVoicePackStatusText(`离线语音包播报中 ${idx + 1}/${chunks.length}`);
        const voiceBlob = await session.predict(chunks[idx]);
        if (runId !== voicePackRunIdRef.current || !isAudioPlayingRef.current) {
          return;
        }
        await playGeneratedVoiceBlob(voiceBlob, runId);
      }

      if (runId !== voicePackRunIdRef.current) {
        return;
      }

      setIsSpeaking(false);
      isAudioPlayingRef.current = false;
      setVoicePackStatusText('离线语音包已就绪');
    } catch (error) {
      console.error('离线语音包播放失败:', error);
      if (runId !== voicePackRunIdRef.current) {
        return;
      }

      setIsPreparingVoicePack(false);
      setIsSpeaking(false);
      isAudioPlayingRef.current = false;
      setTtsError('离线语音包暂时不可用，已切换备用语音源');
      playWithAudioFallback(text);
    } finally {
      if (runId === voicePackRunIdRef.current) {
        setIsPreparingVoicePack(false);
      }
    }
  };

  const getTtsCandidateUrls = (chunk: string) => {
    const normalizedSpeed = Math.min(Math.max(Math.round(speechRate * 5), 1), 9);
    const encodedText = encodeURIComponent(chunk);
    const candidates: string[] = [];

    if (canUseLocalTtsApi()) {
      const params = new URLSearchParams({
        text: chunk,
        speed: String(normalizedSpeed),
      });
      candidates.push(`/api/tts?${params.toString()}`);
    }

    candidates.push(`https://fanyi.baidu.com/gettts?lan=zh&text=${encodedText}&spd=${normalizedSpeed}&source=web`);
    candidates.push(`https://dict.youdao.com/dictvoice?audio=${encodedText}&type=2&rate=${Math.min(Math.max(Math.round(speechRate * 3), 1), 5)}`);
    candidates.push(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=zh-CN&client=tw-ob`);

    return candidates;
  };

  const playWithAudioFallback = (text: string) => {
    setTtsError('');
    stopAudioQueue();

    const chunks = splitTextForTTS(text, shouldPreferServerTts() ? 120 : 220);
    if (chunks.length === 0) return;

    const audioElements: HTMLAudioElement[] = chunks.map(chunk => {
      const audio = new Audio();
      const candidates = getTtsCandidateUrls(chunk);
      audio.dataset.ttsCandidates = JSON.stringify(candidates);
      audio.dataset.ttsIndex = '0';
      audio.src = candidates[0];
      audio.preload = 'auto';
      audio.playsInline = true;
      return audio;
    });

    audioQueueRef.current = audioElements;
    currentAudioIndexRef.current = 0;
    isAudioPlayingRef.current = true;
    setIsSpeaking(true);

    // 顺序播放音频队列
    const playNext = () => {
      if (!isAudioPlayingRef.current) return;
      const idx = currentAudioIndexRef.current;
      if (idx >= audioElements.length) {
        setIsSpeaking(false);
        isAudioPlayingRef.current = false;
        return;
      }

      const audio = audioElements[idx];
      const tryNextSource = () => {
        const candidates = JSON.parse(audio.dataset.ttsCandidates || '[]') as string[];
        const nextIndex = Number(audio.dataset.ttsIndex || '0') + 1;

        if (nextIndex < candidates.length) {
          audio.dataset.ttsIndex = String(nextIndex);
          audio.src = candidates[nextIndex];
          audio.load();
          audio.play().catch(() => {
            tryNextSource();
          });
          return;
        }

        console.warn(`TTS音频片段 ${idx + 1}/${audioElements.length} 全部语音源加载失败`);
        setTtsError(shouldPreferServerTts() ? '当前语音包加载失败，请重试或换系统浏览器打开' : '当前浏览器语音播放失败，请重试或换系统浏览器打开');
        setIsSpeaking(false);
        isAudioPlayingRef.current = false;
        stopAudioQueue();
      };

      audio.onended = () => {
        currentAudioIndexRef.current++;
        playNext();
      };
      audio.onerror = () => {
        tryNextSource();
      };
      audio.play().catch(err => {
        console.error('音频播放失败:', err);
        tryNextSource();
      });
    };

    playNext();
  };

  const playWithNativeTTS = (text: string, options?: { chunkSize?: number; attempt?: number }) => {
    if (!supportsSpeechSynthesis()) {
      playWithAudioFallback(text);
      return;
    }

    if (!synthRef.current) {
      synthRef.current = window.speechSynthesis;
    }

    const synth = synthRef.current;
    if (!synth) {
      playWithAudioFallback(text);
      return;
    }

    const isAndroidLikeDevice = isAndroidDevice() || isHuaweiDevice();
    const isMobileLikeDevice = isMobileDevice() || isWeChatBrowser();
    const chunkSize = options?.chunkSize ?? (isAndroidLikeDevice ? 80 : isMobileLikeDevice ? 100 : 180);
    const attempt = options?.attempt ?? 0;
    const chunks = splitTextForTTS(text, chunkSize);
    if (chunks.length === 0) {
      setTtsError('暂无可播报内容');
      return;
    }

    if (synth.speaking || synth.pending) {
      synth.cancel();
    }
    utteranceQueueRef.current = [];
    nativeTtsActiveRef.current = true;
    setIsSpeaking(true);
    startResumeInterval();

    const selectedVoice = getPreferredVoice();
    let index = 0;
    let hasStarted = false;

    const speakNext = () => {
      if (!nativeTtsActiveRef.current) {
        return;
      }

      if (index >= chunks.length) {
        clearSpeakStartTimeout();
        clearResumeInterval();
        nativeTtsActiveRef.current = false;
        utteranceQueueRef.current = [];
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.rate = speechRate;
      utterance.pitch = 1;
      utterance.lang = selectedVoice?.lang || 'zh-CN';

      if (selectedVoice && !isAndroidLikeDevice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        hasStarted = true;
        clearSpeakStartTimeout();
        startResumeInterval();
      };
      utterance.onend = () => {
        if (!nativeTtsActiveRef.current) {
          return;
        }
        index += 1;
        window.setTimeout(speakNext, 60);
      };
      utterance.onerror = (e) => {
        const errorType = (e as SpeechSynthesisErrorEvent & { error?: string }).error;
        if (errorType === 'canceled' || errorType === 'interrupted' || errorType === 'aborted') {
          return;
        }
        clearSpeakStartTimeout();
        clearResumeInterval();
        nativeTtsActiveRef.current = false;
        utteranceQueueRef.current = [];
        setIsSpeaking(false);
        if (!hasStarted) {
          if (attempt < 2) {
            window.setTimeout(() => {
              playWithNativeTTS(text, {
                chunkSize: Math.max(40, Math.floor(chunkSize * 0.75)),
                attempt: attempt + 1,
              });
            }, 150);
            return;
          }
          if (shouldAvoidFallbackAudio()) {
            setTtsError(isWeChatBrowser() ? '当前微信环境语音启动失败，请先保持页面前台后重试' : '当前手机浏览器原生语音未成功启动，请稍后重试');
            return;
          }
          playWithAudioFallback(text);
          return;
        }
        setTtsError('当前浏览器语音播报中断，请重试');
      };

      utteranceQueueRef.current = [utterance];
      utteranceRef.current = utterance;

      try {
        synth.resume();
        synth.speak(utterance);
        synth.resume();
      } catch {
        clearSpeakStartTimeout();
        clearResumeInterval();
        nativeTtsActiveRef.current = false;
        utteranceQueueRef.current = [];
        setIsSpeaking(false);
        if (attempt < 2) {
          window.setTimeout(() => {
            playWithNativeTTS(text, {
              chunkSize: Math.max(40, Math.floor(chunkSize * 0.75)),
              attempt: attempt + 1,
            });
          }, 150);
          return;
        }
        if (shouldAvoidFallbackAudio()) {
          setTtsError(isWeChatBrowser() ? '当前微信环境语音启动失败，请先保持页面前台后重试' : '当前手机浏览器原生语音未成功启动，请稍后重试');
          return;
        }
        playWithAudioFallback(text);
      }
    };

    clearSpeakStartTimeout();
    startTimeoutRef.current = window.setTimeout(() => {
      if (nativeTtsActiveRef.current && !hasStarted && !synth.speaking && !synth.pending) {
        synth.cancel();
        clearResumeInterval();
        nativeTtsActiveRef.current = false;
        utteranceQueueRef.current = [];
        setIsSpeaking(false);
        if (attempt < 2) {
          playWithNativeTTS(text, {
            chunkSize: Math.max(40, Math.floor(chunkSize * 0.75)),
            attempt: attempt + 1,
          });
          return;
        }
        if (shouldAvoidFallbackAudio()) {
          setTtsError(isWeChatBrowser() ? '当前微信环境语音启动失败，请先保持页面前台后重试' : '当前手机浏览器原生语音未成功启动，请稍后重试');
          return;
        }
        playWithAudioFallback(text);
      }
    }, isAndroidLikeDevice ? 4200 : isMobileLikeDevice ? 3200 : 1800);

    if (isAndroidLikeDevice) {
      window.setTimeout(speakNext, 120);
      return;
    }

    speakNext();
  };

  const handleSpeak = () => {
    if (!speech) return;
    setTtsError('');
    
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    
    let text = `${speech.title}。${speech.abstract}`;
    if (speech.fullText && !speech.fullText.includes('正在整理中')) {
      text += `。${speech.fullText.substring(0, isMobileDevice() || isWeChatBrowser() ? 900 : 2400)}`;
    }
    if (speech.analysis && !speech.analysis.includes('正在整理中') && !isMobileDevice() && !isWeChatBrowser()) {
      text += `。${speech.analysis.substring(0, 1600)}`;
    }
    text = text.replace(/\s+/g, ' ').replace(/\n+/g, '。').trim();
    const maxLength = isMobileDevice() || isWeChatBrowser() ? 1400 : 4200;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '。后续内容省略。';
    }

    if (shouldPreferDownloadedVoicePack()) {
      void playWithDownloadedVoicePack(text);
    } else if (supportsSpeechSynthesis()) {
      playWithNativeTTS(text);
    } else if (supportsDownloadedVoicePack()) {
      void playWithDownloadedVoicePack(text);
    } else {
      playWithAudioFallback(text);
    }
  };

  // 导出Word功能
  const handleExportWord = async () => {
    if (!speech) return;

    const { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, Packer } = await import('docx');
    const { saveAs } = await import('file-saver');

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 1440 twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          // 标题
          new Paragraph({
            text: speech.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // 来源和日期
          new Paragraph({
            children: [
              new TextRun({
                text: `来源：${speech.source}`,
                size: 24, // 12pt
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `日期：${speech.date}${speech.location ? `  地点：${speech.location}` : ''}`,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // 分隔线
          new Paragraph({
            border: {
              bottom: {
                color: '000000',
                space: 1,
                style: 'single',
                size: 6,
              },
            },
            spacing: { after: 400 },
          }),
          
          // 摘要标题
          new Paragraph({
            text: '【摘要】',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
          }),
          
          // 摘要内容
          new Paragraph({
            text: speech.abstract,
            spacing: { after: 400 },
            indent: { firstLine: 480 }, // 首行缩进2字符
          }),
          
          // 原文标题
          new Paragraph({
            text: '【原文】',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
          }),
          
          // 原文内容（分段）
          ...speech.fullText.split('\n').filter(p => p.trim()).map(paragraph => 
            new Paragraph({
              text: paragraph.trim(),
              spacing: { after: 200 },
              indent: { firstLine: 480 },
            })
          ),
          
          // 解读标题
          new Paragraph({
            text: '【解读】',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          
          // 解读内容（分段）
          ...speech.analysis.split('\n').filter(p => p.trim()).map(paragraph => 
            new Paragraph({
              text: paragraph.trim(),
              spacing: { after: 200 },
              indent: { firstLine: 480 },
            })
          ),
          
          // 页脚
          new Paragraph({
            text: '',
            spacing: { before: 600 },
          }),
          new Paragraph({
            border: {
              top: {
                color: '000000',
                space: 1,
                style: 'single',
                size: 6,
              },
            },
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `本文档由「习近平总书记重要讲话学习平台」生成`,
                size: 18,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `生成时间：${new Date().toLocaleString('zh-CN')}`,
                size: 18,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }],
    });
    
    // 生成并下载文件
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${speech.title}.docx`);
  };

  // 加载中时显示骨架屏
  if (isLoading && !speech) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 返回按钮骨架 */}
          <div className="w-24 h-6 bg-gray-200 rounded animate-pulse mb-8"></div>
          
          {/* 标题区骨架 */}
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 space-y-4">
            <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            
            <div className="flex gap-4 pt-4 border-t border-gray-100 mt-6">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
          
          {/* 内容区骨架 */}
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 space-y-8">
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
            </div>
            
            <div className="space-y-3 pt-6 border-t border-gray-100">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 只有加载完成后仍未找到内容，才显示"内容未找到"
  if (!speech && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">内容未找到</h2>
          <p className="text-gray-500 mb-4 text-lg">该文章可能已被删除或不存在</p>
          <Button onClick={handleBack} className="bg-red-600 hover:bg-red-700 text-lg px-6 py-3">
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  const config = categoryConfig[speech.category] || categoryConfig.speech;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-gray-200">
          <div className="h-full bg-red-600 transition-all duration-300" style={{ width: '60%' }}></div>
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="lg"
              onClick={handleBack}
              className="text-gray-600 hover:text-red-600 text-lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              返回
            </Button>
            <div className="flex items-center gap-3">
              {/* 语音播报按钮 */}
              <Button
                variant="outline"
                onClick={() => setShowTtsDialog(true)}
                className="text-gray-700 hover:text-red-600 hover:border-red-300 px-4 py-2 h-auto flex items-center gap-2"
                title="语音播报"
              >
                <Volume2 className="w-5 h-5" />
                <span className="text-sm font-medium">语音播报</span>
              </Button>
              
              {/* 导出Word按钮 */}
              <Button
                variant="outline"
                onClick={handleExportWord}
                className="text-gray-700 hover:text-red-600 hover:border-red-300 px-4 py-2 h-auto flex items-center gap-2"
                title="导出Word"
              >
                <Download className="w-5 h-5" />
                <span className="text-sm font-medium">下载文本</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleShare}
                className="text-gray-700 hover:text-red-600 hover:border-red-300 px-4 py-2 h-auto flex items-center gap-2"
                title="分享"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-sm font-medium">分享链接</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-10 pb-6 border-b-2 border-red-100">
            <h1 className="text-3xl lg:text-4xl font-bold text-red-700 mb-3">
              习近平总书记重要讲话精神
            </h1>
            <p className="text-xl text-gray-500">学习平台</p>
          </div>

          {/* Title Section */}
          <div className="mb-10">
            {/* 分类标签 */}
            <div className="flex items-center gap-3 mb-5">
              {/* 领域标签 */}
              {speech.domain && speech.domainName && (
                <Badge className={`${domainConfig[speech.domain]?.bgColor || 'bg-gray-50'} ${domainConfig[speech.domain]?.color || 'text-gray-600'} border ${domainConfig[speech.domain]?.borderColor || 'border-gray-200'} text-lg px-4 py-1.5`}>
                  {speech.domainName}
                </Badge>
              )}
              {/* 类型标签 */}
              <Badge className={`${config.bgColor} ${config.color} border ${config.borderColor} text-lg px-4 py-1.5`}>
                <Icon className="w-5 h-5 mr-2" />
                {speech.categoryName}
              </Badge>
            </div>

            {/* 标题 */}
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
              {speech.title}
            </h1>

            {/* 来源 */}
            <div className="flex items-center gap-2 text-xl text-gray-600 mb-4">
              <span className="font-medium">来源：</span>
              <span>{speech.source}</span>
            </div>

            {/* 原文链接 */}
            {normalizedSpeechUrl && normalizedSpeechUrl !== 'https://www.news.cn/' && normalizedSpeechUrl !== 'https://www.qstheory.cn/' ? (
              <div className="flex items-center gap-2 text-xl mb-5">
                <span className="font-medium text-gray-600">原文链接：</span>
                <a
                  href={normalizedSpeechUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 flex items-center gap-2 underline"
                >
                  点击阅读原文
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xl text-gray-400 mb-5">
                <span className="font-medium">原文链接：</span>
                <span>暂无原文链接</span>
              </div>
            )}

            {/* 日期和地点 */}
            <div className="flex items-center gap-6 text-lg text-gray-500 flex-wrap">
              <span className="flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                {speech.date}
              </span>
              {speech.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="w-6 h-6" />
                  {speech.location}
                </span>
              )}
            </div>
          </div>

          {/* 摘要 */}
          <Card className="mb-10 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
            <CardHeader className="pb-5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl text-gray-900">
                  <FileTextIcon className="w-8 h-8 text-yellow-600" />
                  摘要
                </CardTitle>
                <Button
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  variant="outline"
                  size="sm"
                  className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  {hasGeneratedContent ? '重新生成' : 'AI生成'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-xl">
                {speech.abstract}
              </p>
              {generateError && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-3 bg-red-50 p-2 rounded">
                  <AlertCircle className="w-4 h-4" />
                  {generateError}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-yellow-200">摘要由AI生成，仅供参考</p>
            </CardContent>
          </Card>

          {/* 原文 */}
          <Card className="mb-10">
            <CardHeader className="pb-5">
              <CardTitle className="flex items-center gap-3 text-2xl text-gray-900">
                <BookOpen className="w-8 h-8 text-blue-600" />
                原文
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {normalizedSpeechUrl && normalizedSpeechUrl !== 'https://www.news.cn/' && normalizedSpeechUrl !== 'https://www.qstheory.cn/' ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-blue-500" />
                  <p className="text-gray-600 mb-4">点击下方按钮在新窗口中阅读官方原文</p>
                  <a
                    href={normalizedSpeechUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    新窗口打开原文
                  </a>
                  <p className="text-xs text-gray-400 mt-3">{speech.source}</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p>暂无原文链接</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-200">原文内容来自官方网站</p>
            </CardContent>
          </Card>

          {/* 解读 */}
          <Card className="mb-10 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-5">
              <CardTitle className="flex items-center gap-3 text-2xl text-gray-900">
                <TrendingUp className="w-8 h-8 text-green-600" />
                解读
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-gray-700 leading-loose whitespace-pre-line text-xl">
                {speech.analysis}
              </div>
              <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-green-200">解读由AI生成，仅供参考</p>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="flex justify-center pt-8">
            <Button
              onClick={handleBack}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 text-lg px-8 py-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              返回首页
            </Button>
          </div>
        </div>
      </main>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Header with image */}
          <div className="bg-gradient-to-br from-red-700 to-red-800 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                <span className="text-2xl font-bold">习</span>
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold">分享给同事学习</DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-1">
                  习近平总书记重要讲话精神
                </DialogDescription>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {/* Article info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">当前文章</p>
              <p className="font-medium text-gray-900 line-clamp-2">{speech.title}</p>
              <p className="text-xs text-gray-400 mt-1">{speech.date} · {speech.source}</p>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Button
                onClick={handleShareToWeChat}
                className="flex flex-col items-center gap-2 h-auto py-4 bg-green-500 hover:bg-green-600"
              >
                <MessageCircle className="w-8 h-8" />
                <span className="text-sm">微信分享</span>
              </Button>
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                {copied ? <Check className="w-8 h-8 text-green-500" /> : <Copy className="w-8 h-8" />}
                <span className="text-sm">{copied ? '已复制' : '复制链接'}</span>
              </Button>
            </div>

            {/* QR Code hint */}
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2">或使用微信扫一扫分享</p>
              <div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg mx-auto flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded mx-auto mb-1 flex items-center justify-center">
                    <span className="text-xs text-gray-400">二维码</span>
                  </div>
                  <span className="text-xs text-gray-400">扫码分享</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 语音播报对话框 */}
      <Dialog open={showTtsDialog} onOpenChange={setShowTtsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              语音播报设置
            </DialogTitle>
            <DialogDescription>
              选择语音和语速，开始收听文章内容
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* 语速选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">语速: {speechRate}x</label>
              <div className="flex gap-2">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <Button
                    key={rate}
                    variant={speechRate === rate ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSpeechRate(rate)}
                    className={speechRate === rate ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {rate}x
                  </Button>
                ))}
              </div>
            </div>

            {supportsDownloadedVoicePack() && (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-900">中文离线语音包</p>
                    <p className="text-xs text-amber-800">
                      适合华为手机和微信环境，首次下载约 {LOCAL_VOICE_PACK_SIZE_MB}MB，之后会保存在当前浏览器里
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-700 bg-white">
                    {voicePackReady ? '已就绪' : '未下载'}
                  </Badge>
                </div>

                {voicePackStatusText && (
                  <p className="text-xs text-amber-900">{voicePackStatusText}</p>
                )}

                {(isPreparingVoicePack || voicePackDownloadProgress > 0) && (
                  <div className="space-y-1">
                    <Progress value={voicePackDownloadProgress} className="h-2 bg-amber-100" />
                    <p className="text-[11px] text-amber-700 text-right">{voicePackDownloadProgress}%</p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void handleDownloadVoicePack();
                  }}
                  disabled={isPreparingVoicePack || voicePackReady}
                  className="w-full border-amber-300 text-amber-900 hover:bg-amber-100"
                >
                  {isPreparingVoicePack ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      正在准备语音包
                    </>
                  ) : voicePackReady ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      语音包已下载
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      下载语音包
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* 播放控制 */}
            <div className="flex gap-2">
              <Button
                onClick={handleSpeak}
                disabled={isPreparingVoicePack && !isSpeaking}
                className={`flex-1 ${isSpeaking ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isSpeaking ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    停止播放
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    开始播放
                  </>
                )}
              </Button>
            </div>
            
            {/* 提示 */}
            {ttsError && (
              <p className="text-xs text-red-500 text-center bg-red-50 rounded p-2">
                {ttsError}
              </p>
            )}
            <p className="text-xs text-gray-500 text-center">
              华为和微信环境会优先尝试离线语音包，其余环境优先尝试浏览器内置语音，先播放标题和摘要，再继续正文
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
