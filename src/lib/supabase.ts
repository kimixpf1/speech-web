import { createClient } from '@supabase/supabase-js'

// Supabase 项目配置 - 使用环境变量或默认值
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ejeiuqcmkznfbglvbkbe.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
