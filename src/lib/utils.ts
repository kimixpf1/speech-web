import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeAnalysisText(analysis: string): string {
  return (analysis || '')
    .replace(/^[ \t]*一[、，,.\s]*政治高度[：:]/m, '一、政治高度：')
    .replace(/^[ \t]*二[、，,.\s]*理论深度[：:]/m, '二、理论深度：')
    .replace(/^[ \t]*三[、，,.\s]*(历史贯通与实践|历史贯通|实践要求|实践指向)[：:]/m, '三、历史贯通与实践：')
    .replace(/^(一、政治高度：)\s*结合习近平新时代中国特色社会主义思想，阐述讲话在党和国家事业全局中的重大意义。?\s*/m, '$1')
    .replace(/^(二、理论深度：)\s*阐释核心要义、精神实质，分析其中蕴含的马克思主义立场观点方法。?\s*/m, '$1')
    .replace(/^(三、历史贯通与实践：)\s*联系习近平总书记历次相关重要讲话，分析一脉相承的思想脉络，指出对推动中国式现代化的实践指导意义。?\s*/m, '$1')
    .replace(/^(一、政治高度：)\s*(政治高度(?:主要)?(?:是指|就是|意味着)|所谓政治高度|这里的政治高度(?:主要)?(?:是指|体现在)?|从政治高度来看，?)/m, '$1')
    .replace(/^(二、理论深度：)\s*(理论深度(?:主要)?(?:是指|就是|意味着)|所谓理论深度|这里的理论深度(?:主要)?(?:是指|体现在)?|从理论深度来看，?)/m, '$1')
    .replace(/^(三、历史贯通与实践：)\s*((历史贯通与实践|历史贯通|实践要求)(?:主要)?(?:是指|就是|意味着)|所谓历史贯通与实践|这里的历史贯通与实践(?:主要)?(?:是指|体现在)?|从历史贯通与实践来看，?)/m, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function normalizeSummaryText(
  summary: string,
  options?: {
    maxLength?: number
    minLength?: number
    maxSentences?: number
  }
) {
  const maxLength = options?.maxLength ?? 120
  const minLength = options?.minLength ?? 70
  const maxSentences = options?.maxSentences ?? 2

  const cleaned = (summary || '')
    .replace(/^【摘要】[\s：:]*/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned || cleaned.length <= maxLength) {
    return cleaned
  }

  const sentences = cleaned
    .split(/(?<=[。！？；])/)
    .map(sentence => sentence.trim())
    .filter(Boolean)

  if (sentences.length === 0) {
    return cleaned.slice(0, maxLength).trim()
  }

  const selected: string[] = []
  let currentLength = 0

  for (const sentence of sentences) {
    const remaining = maxLength - currentLength

    if (remaining <= 0) {
      break
    }

    if (sentence.length > remaining) {
      if (selected.length === 0) {
        selected.push(sentence.slice(0, remaining).trim())
      }
      break
    }

    selected.push(sentence)
    currentLength += sentence.length

    if (currentLength >= minLength || selected.length >= maxSentences) {
      break
    }
  }

  return (selected.join('') || cleaned.slice(0, maxLength)).trim()
}

type StorageType = 'local' | 'session'

function getStorage(storageType: StorageType): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return storageType === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function safeGetStorageItem(storageType: StorageType, key: string): string | null {
  try {
    return getStorage(storageType)?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function safeSetStorageItem(storageType: StorageType, key: string, value: string): void {
  try {
    getStorage(storageType)?.setItem(key, value)
  } catch {
  }
}
