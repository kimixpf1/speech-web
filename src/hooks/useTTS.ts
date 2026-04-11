import { useEffect, useState, useRef, useCallback } from 'react';
import type { Progress as PiperProgress, TtsSession as PiperTtsSession } from '@mintplex-labs/piper-tts-web';
import { LOCAL_VOICE_PACK_ID, LOCAL_VOICE_PACK_SIZE_MB } from '@/config/constants';
import {
  getUserAgent,
  isAndroidDevice,
  isHuaweiDevice,
  isWeChatBrowser,
  isMobileDevice,
  supportsSpeechSynthesis as checkSupportsSpeechSynthesis,
  supportsDownloadedVoicePack as checkSupportsDownloadedVoicePack,
  shouldPreferDownloadedVoicePack as checkShouldPreferDownloadedVoicePack,
  canUseLocalTtsApi,
  shouldPreferServerTts,
  shouldAvoidFallbackAudio,
} from '@/utils/deviceDetect';

export interface TTSState {
  isSpeaking: boolean;
  speechRate: number;
  showTtsDialog: boolean;
  ttsError: string;
  isPreparingVoicePack: boolean;
  voicePackReady: boolean;
  voicePackDownloadProgress: number;
  voicePackStatusText: string;
}

export interface TTSActions {
  handleSpeak: (getText: () => string) => void;
  stopSpeaking: () => void;
  setSpeechRate: (rate: number) => void;
  setShowTtsDialog: (show: boolean) => void;
  handleDownloadVoicePack: () => Promise<void>;
}

export type UseTTSReturn = TTSState & TTSActions & {
  supportsDownloadedVoicePack: () => boolean;
};

function splitTextForTTS(text: string, maxLen: number = 300): string[] {
  const chunks: string[] = [];
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
}

export function useTTS(): UseTTSReturn {
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

  const speechRateRef = useRef(speechRate);
  speechRateRef.current = speechRate;

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
      stopAudioQueueInternal();
      void audioContextRef.current?.close().catch(() => {});
    };
  }, []);

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
    if (!voices.length) return null;
    if (isAndroidDevice() || isHuaweiDevice()) return null;
    return (
      voices.find(v => /zh|cmn|CN/i.test(v.lang) && /xiaoxiao|xiaoyi|yunxi|xiaomo|zh/i.test(v.name)) ||
      voices.find(v => /zh|cmn|CN/i.test(v.lang)) ||
      voices[0]
    );
  };

  const stopAudioQueueInternal = () => {
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
    stopAudioQueueInternal();
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
    if (!checkSupportsDownloadedVoicePack()) {
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
    if (typeof window === 'undefined') return null;
    const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;
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
    if (runId !== voicePackRunIdRef.current || !isAudioPlayingRef.current) return;

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

  const getTtsCandidateUrls = (chunk: string) => {
    const normalizedSpeed = Math.min(Math.max(Math.round(speechRateRef.current * 5), 1), 9);
    const encodedText = encodeURIComponent(chunk);
    const candidates: string[] = [];

    if (canUseLocalTtsApi()) {
      const params = new URLSearchParams({ text: chunk, speed: String(normalizedSpeed) });
      candidates.push(`/api/tts?${params.toString()}`);
    }

    candidates.push(`https://fanyi.baidu.com/gettts?lan=zh&text=${encodedText}&spd=${normalizedSpeed}&source=web`);
    candidates.push(`https://dict.youdao.com/dictvoice?audio=${encodedText}&type=2&rate=${Math.min(Math.max(Math.round(speechRateRef.current * 3), 1), 5)}`);
    candidates.push(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=zh-CN&client=tw-ob`);
    return candidates;
  };

  const playWithAudioFallback = (text: string) => {
    setTtsError('');
    stopAudioQueueInternal();

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
          audio.play().catch(() => { tryNextSource(); });
          return;
        }
        console.warn(`TTS音频片段 ${idx + 1}/${audioElements.length} 全部语音源加载失败`);
        setTtsError(shouldPreferServerTts() ? '当前语音包加载失败，请重试或换系统浏览器打开' : '当前浏览器语音播放失败，请重试或换系统浏览器打开');
        setIsSpeaking(false);
        isAudioPlayingRef.current = false;
        stopAudioQueueInternal();
      };

      audio.onended = () => {
        currentAudioIndexRef.current++;
        playNext();
      };
      audio.onerror = () => { tryNextSource(); };
      audio.play().catch(() => { tryNextSource(); });
    };

    playNext();
  };

  const playWithNativeTTS = (text: string, options?: { chunkSize?: number; attempt?: number }) => {
    if (!checkSupportsSpeechSynthesis()) { playWithAudioFallback(text); return; }
    if (!synthRef.current) { synthRef.current = window.speechSynthesis; }
    const synth = synthRef.current;
    if (!synth) { playWithAudioFallback(text); return; }

    const isAndroidLikeDevice = isAndroidDevice() || isHuaweiDevice();
    const isMobileLikeDevice = isMobileDevice() || isWeChatBrowser();
    const chunkSize = options?.chunkSize ?? (isAndroidLikeDevice ? 80 : isMobileLikeDevice ? 100 : 180);
    const attempt = options?.attempt ?? 0;
    const chunks = splitTextForTTS(text, chunkSize);
    if (chunks.length === 0) { setTtsError('暂无可播报内容'); return; }

    if (synth.speaking || synth.pending) { synth.cancel(); }
    utteranceQueueRef.current = [];
    nativeTtsActiveRef.current = true;
    setIsSpeaking(true);
    startResumeInterval();

    const selectedVoice = getPreferredVoice();
    let index = 0;
    let hasStarted = false;

    const speakNext = () => {
      if (!nativeTtsActiveRef.current) return;
      if (index >= chunks.length) {
        clearSpeakStartTimeout();
        clearResumeInterval();
        nativeTtsActiveRef.current = false;
        utteranceQueueRef.current = [];
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.rate = speechRateRef.current;
      utterance.pitch = 1;
      utterance.lang = selectedVoice?.lang || 'zh-CN';
      if (selectedVoice && !isAndroidLikeDevice) { utterance.voice = selectedVoice; }

      utterance.onstart = () => {
        hasStarted = true;
        clearSpeakStartTimeout();
        startResumeInterval();
      };
      utterance.onend = () => {
        if (!nativeTtsActiveRef.current) return;
        index += 1;
        window.setTimeout(speakNext, 60);
      };
      utterance.onerror = (e) => {
        const errorType = (e as SpeechSynthesisErrorEvent & { error?: string }).error;
        if (errorType === 'canceled' || errorType === 'interrupted' || errorType === 'aborted') return;
        clearSpeakStartTimeout();
        clearResumeInterval();
        nativeTtsActiveRef.current = false;
        utteranceQueueRef.current = [];
        setIsSpeaking(false);
        if (!hasStarted) {
          if (attempt < 2) {
            window.setTimeout(() => { playWithNativeTTS(text, { chunkSize: Math.max(40, Math.floor(chunkSize * 0.75)), attempt: attempt + 1 }); }, 150);
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
          window.setTimeout(() => { playWithNativeTTS(text, { chunkSize: Math.max(40, Math.floor(chunkSize * 0.75)), attempt: attempt + 1 }); }, 150);
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
          playWithNativeTTS(text, { chunkSize: Math.max(40, Math.floor(chunkSize * 0.75)), attempt: attempt + 1 });
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

  const playWithDownloadedVoicePack = async (text: string) => {
    const chunks = splitTextForTTS(text, 90);
    if (chunks.length === 0) { setTtsError('暂无可播报内容'); return; }

    setTtsError('');
    stopAudioQueueInternal();
    await ensureAudioContextReady();

    const runId = voicePackRunIdRef.current;
    isAudioPlayingRef.current = true;
    setIsSpeaking(true);
    setIsPreparingVoicePack(true);

    try {
      const session = await ensureLocalVoicePackReady();
      if (runId !== voicePackRunIdRef.current || !isAudioPlayingRef.current) return;

      setIsPreparingVoicePack(false);
      for (let idx = 0; idx < chunks.length; idx += 1) {
        if (runId !== voicePackRunIdRef.current || !isAudioPlayingRef.current) return;
        currentAudioIndexRef.current = idx;
        setVoicePackStatusText(`离线语音包播报中 ${idx + 1}/${chunks.length}`);
        const voiceBlob = await session.predict(chunks[idx]);
        if (runId !== voicePackRunIdRef.current || !isAudioPlayingRef.current) return;
        await playGeneratedVoiceBlob(voiceBlob, runId);
      }

      if (runId !== voicePackRunIdRef.current) return;
      setIsSpeaking(false);
      isAudioPlayingRef.current = false;
      setVoicePackStatusText('离线语音包已就绪');
    } catch (error) {
      console.error('离线语音包播放失败:', error);
      if (runId !== voicePackRunIdRef.current) return;
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

  const handleSpeak = useCallback((getText: () => string) => {
    setTtsError('');
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    const text = getText();

    if (checkShouldPreferDownloadedVoicePack()) {
      void playWithDownloadedVoicePack(text);
    } else if (checkSupportsSpeechSynthesis()) {
      playWithNativeTTS(text);
    } else if (checkSupportsDownloadedVoicePack()) {
      void playWithDownloadedVoicePack(text);
    } else {
      playWithAudioFallback(text);
    }
  }, [isSpeaking, stopSpeaking]);

  return {
    isSpeaking,
    speechRate,
    showTtsDialog,
    ttsError,
    isPreparingVoicePack,
    voicePackReady,
    voicePackDownloadProgress,
    voicePackStatusText,
    handleSpeak,
    stopSpeaking,
    setSpeechRate,
    setShowTtsDialog,
    handleDownloadVoicePack,
    supportsDownloadedVoicePack: checkSupportsDownloadedVoicePack,
  };
}
