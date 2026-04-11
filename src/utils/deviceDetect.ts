export function getUserAgent(): string {
  if (typeof navigator === 'undefined') {
    return '';
  }
  return navigator.userAgent.toLowerCase();
}

export function isAndroidDevice(): boolean {
  return /android/.test(getUserAgent());
}

export function isHuaweiDevice(): boolean {
  return /huawei|honor/.test(getUserAgent());
}

export function isIOSDevice(): boolean {
  return /iphone|ipad|ipod/.test(getUserAgent());
}

export function isWeChatBrowser(): boolean {
  return /micromessenger|wechat/.test(getUserAgent());
}

export function isMobileDevice(): boolean {
  return isAndroidDevice() || isIOSDevice();
}

export function supportsSpeechSynthesis(): boolean {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function supportsDownloadedVoicePack(): boolean {
  return isMobileDevice() || isWeChatBrowser();
}

export function shouldPreferDownloadedVoicePack(): boolean {
  return isHuaweiDevice() || isWeChatBrowser();
}

export function canUseLocalTtsApi(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (import.meta.env.DEV) {
    return true;
  }

  return import.meta.env.VITE_ENABLE_TTS_PROXY === 'true';
}

export function shouldPreferServerTts(): boolean {
  return canUseLocalTtsApi() && (isMobileDevice() || isWeChatBrowser());
}

export function shouldAvoidFallbackAudio(): boolean {
  return canUseLocalTtsApi() && (isMobileDevice() || isWeChatBrowser());
}
