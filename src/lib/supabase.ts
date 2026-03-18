import { createClient } from '@supabase/supabase-js'

// Supabase 项目配置 - 使用环境变量或默认值
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ejeiuqcmkznfbglvbkbe.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_akyDKiNsa1ZCQcqpTa-3LQ_6SYEfxGg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// 文章类型定义
export interface Speech {
  id: string
  title: string
  date: string
  year: number
  month: number
  day: number
  category: string
  categoryName: string
  source: string
  location: string
  summary: string
  url: string
  created_at?: string
  updated_at?: string
}

export interface SpeechDetail {
  id: string
  speech_id: string
  abstract: string
  fullText: string
  analysis: string
  created_at?: string
  updated_at?: string
}
