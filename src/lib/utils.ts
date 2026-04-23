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
  const maxLength = options?.maxLength ?? 220
  const minLength = options?.minLength ?? 90
  const maxSentences = options?.maxSentences ?? 3

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

export function normalizeArticleUrl(url?: string): string {
  const trimmed = (url || '').trim()

  if (!trimmed) {
    return ''
  }

  const replacementMap: Record<string, string> = {
    'http://paper.people.com.cn/rmrb/pc/content/202603/08/content_30143971.html':
      'https://paper.people.com.cn/rmrb/pc/content/202603/08/content_30143971.html',
    'http://paper.people.com.cn/rmrb/pc/content/202603/18/content_30145794.html':
      'https://paper.people.com.cn/rmrb/pc/content/202603/18/content_30145794.html',
    'http://www.news.cn/politics/leaders/20240424/84305235338744fd833e447a002574e4/c.html':
      'https://www.news.cn/politics/leaders/20240424/84305235338744fd833e447a002574e4/c.html',
    'http://www.news.cn/politics/20240321/c280965c8ddd41ff9659dbeb0d9e51b6/c.html':
      'https://www.news.cn/politics/20240321/c280965c8ddd41ff9659dbeb0d9e51b6/c.html',
    'http://www.news.cn/20240908/53d07ce1b0ba47e8a45bb75022109cc9/c.html':
      'https://www.news.cn/20240908/53d07ce1b0ba47e8a45bb75022109cc9/c.html',
    'http://www.cppcc.gov.cn/zxww/2025/12/31/ARTI1767168160430186.shtml':
      'https://www.cppcc.gov.cn/zxww/2025/12/31/ARTI1767168160430186.shtml',
    'https://js.people.com.cn/n2/2026/0306/c358232-41516244.html':
      'http://jhsjk.people.cn/article/40675966',
    'http://js.people.com.cn/n2/2026/0306/c358232-41516244.html':
      'http://jhsjk.people.cn/article/40675966',
    'https://cpc.people.com.cn/n1/2026/0306/c435113-40676004.html':
      'http://jhsjk.people.cn/article/40675966',
    'http://cpc.people.com.cn/n1/2026/0306/c435113-40676004.html':
      'http://jhsjk.people.cn/article/40675966',
    'https://lianghui.people.com.cn/2026/n1/2026/0306/c461827-40675801.html':
      'http://jhsjk.people.cn/article/40675966',
    'http://lianghui.people.com.cn/2026/n1/2026/0306/c461827-40675801.html':
      'http://jhsjk.people.cn/article/40675966',
    'http://paper.people.com.cn/rmrb/pc/content/20260306/content_30143971.html':
      'http://jhsjk.people.cn/article/40675966',
  }

  const replaced = replacementMap[trimmed]
  if (replaced) {
    return replaced
  }

  const keepHttpPrefixes = [
    'http://lianghui.people.com.cn/',
    'http://politics.people.com.cn/',
    'http://opinion.people.com.cn/',
    'http://cpc.people.com.cn/',
    'http://js.people.com.cn/',
    'http://jhsjk.people.cn/',
    'http://mrdx.cn/'
  ]

  if (keepHttpPrefixes.some(prefix => trimmed.startsWith(prefix))) {
    return trimmed
  }

  const downgradePrefixes = [
    'https://politics.people.com.cn/',
    'https://opinion.people.com.cn/',
    'https://cpc.people.com.cn/',
    'https://js.people.com.cn/'
  ]

  const downgradeMatch = downgradePrefixes.find(prefix => trimmed.startsWith(prefix))
  if (downgradeMatch) {
    return `http://${trimmed.slice('https://'.length)}`
  }


  if (trimmed.startsWith('http://')) {
    return `https://${trimmed.slice('http://'.length)}`
  }

  return trimmed
}

export function openExternalUrl(url?: string): void {
  const normalizedUrl = normalizeArticleUrl(url)

  if (!normalizedUrl || typeof window === 'undefined') {
    return
  }

  const openedWindow = window.open(normalizedUrl, '_blank', 'noopener,noreferrer')
  if (!openedWindow) {
    window.location.href = normalizedUrl
  }
}

const SITE_URL = 'https://kimixpf1.github.io/speech-web'

function getOrCreateMeta(attr: string, attrValue: string, content: string): HTMLMetaElement {
  let el = document.querySelector(`meta[${attr}="${attrValue}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, attrValue)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
  return el
}

export function updatePageMeta(title: string, description: string, path?: string): void {
  if (typeof document === 'undefined') return

  const fullTitle = `${title} - 重要讲话学习平台`
  document.title = fullTitle

  getOrCreateMeta('name', 'description', description)
  getOrCreateMeta('property', 'og:title', fullTitle)
  getOrCreateMeta('property', 'og:description', description)
  getOrCreateMeta('property', 'og:type', 'article')
  getOrCreateMeta('property', 'og:url', `${SITE_URL}${path ?? '/#'}`)
  getOrCreateMeta('property', 'og:image', `${SITE_URL}/share-cover.svg`)
  getOrCreateMeta('name', 'twitter:title', fullTitle)
  getOrCreateMeta('name', 'twitter:description', description)
}

export function resetPageMeta(): void {
  if (typeof document === 'undefined') return

  document.title = '习近平总书记重要讲话学习平台'
  getOrCreateMeta('name', 'description', '汇集人民日报、新华社、求是杂志等权威媒体发布的重要讲话、发表文章、重要会议和考察调研动态')
  getOrCreateMeta('property', 'og:title', '习近平总书记重要讲话学习平台')
  getOrCreateMeta('property', 'og:description', '汇集人民日报、新华社、求是杂志等权威媒体发布的重要讲话、发表文章、重要会议和考察调研动态')
  getOrCreateMeta('property', 'og:type', 'website')
  getOrCreateMeta('property', 'og:url', `${SITE_URL}/`)
  getOrCreateMeta('name', 'twitter:title', '习近平总书记重要讲话学习平台')
}

export function injectArticleJsonLd(title: string, date: string, description: string, url?: string): void {
  if (typeof document === 'undefined') return

  removeJsonLd()

  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.id = 'article-jsonld'
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    datePublished: date,
    url: url || `${SITE_URL}/`,
    publisher: {
      '@type': 'Organization',
      name: '重要讲话学习平台',
    },
  })
  document.head.appendChild(script)
}

export function removeJsonLd(): void {
  if (typeof document === 'undefined') return
  document.getElementById('article-jsonld')?.remove()
}
