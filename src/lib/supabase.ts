import { createClient } from '@supabase/supabase-js'

// Supabase 项目配置 - 使用环境变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
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