import { createClient } from '@supabase/supabase-js'

// Supabase 项目配置
const supabaseUrl = 'https://ejeiuqcmkznfbglvbkbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NjU4MzEsImV4cCI6MjA1NzE0MTgzMX0.0q8W9IhpXv7Lx4b2G7lRqQqQqQqQqQqQqQqQqQqQqQ'

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
