import { createClient } from '@supabase/supabase-js'

const SUPABASE_PROJECT_REF = 'ejeiuqcmkznfbglvbkbe'
const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODU4NzIsImV4cCI6MjA4NzE2MTg3Mn0.NfmTSA9DhuP51XKF0qfTuPINtSc7i26u5yIbl69cdAg'

function pickSupabaseUrl(): string {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!envUrl) return DEFAULT_SUPABASE_URL

  try {
    const parsed = new URL(envUrl)
    if (parsed.hostname.startsWith(`${SUPABASE_PROJECT_REF}.`)) {
      return envUrl
    }
  } catch {
  }

  return DEFAULT_SUPABASE_URL
}

function pickSupabaseAnonKey(): string {
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!envKey) return DEFAULT_SUPABASE_ANON_KEY

  try {
    const payload = JSON.parse(atob(envKey.split('.')[1] || '')) as { ref?: string; role?: string }
    if (payload.ref === SUPABASE_PROJECT_REF && payload.role === 'anon') {
      return envKey
    }
  } catch {
  }

  return DEFAULT_SUPABASE_ANON_KEY
}

const supabaseUrl = pickSupabaseUrl()
const supabaseAnonKey = pickSupabaseAnonKey()

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
  category: 'speech' | 'article' | 'meeting' | 'inspection' | 'call'
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