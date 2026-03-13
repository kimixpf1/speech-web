import { supabase, type Speech, type SpeechDetail } from '@/lib/supabase'

// 获取所有文章
export async function getAllSpeeches(): Promise<Speech[]> {
  const { data, error } = await supabase
    .from('speeches')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error('获取文章列表失败:', error)
    throw error
  }

  return data || []
}

// 获取单篇文章
export async function getSpeechById(id: string): Promise<Speech | null> {
  const { data, error } = await supabase
    .from('speeches')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('获取文章失败:', error)
    throw error
  }

  return data
}

// 获取文章详情
export async function getSpeechDetail(speechId: string): Promise<SpeechDetail | null> {
  const { data, error } = await supabase
    .from('speech_details')
    .select('*')
    .eq('speech_id', speechId)
    .single()

  if (error) {
    console.error('获取文章详情失败:', error)
    throw error
  }

  return data
}

// 创建文章
export async function createSpeech(speech: Omit<Speech, 'created_at' | 'updated_at'>): Promise<Speech> {
  const { data, error } = await supabase
    .from('speeches')
    .insert([speech])
    .select()
    .single()

  if (error) {
    console.error('创建文章失败:', error)
    throw error
  }

  return data
}

// 创建文章详情
export async function createSpeechDetail(detail: Omit<SpeechDetail, 'created_at' | 'updated_at'>): Promise<SpeechDetail> {
  const { data, error } = await supabase
    .from('speech_details')
    .insert([detail])
    .select()
    .single()

  if (error) {
    console.error('创建文章详情失败:', error)
    throw error
  }

  return data
}

// 更新文章
export async function updateSpeech(id: string, speech: Partial<Speech>): Promise<Speech> {
  const { data, error } = await supabase
    .from('speeches')
    .update({ ...speech, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('更新文章失败:', error)
    throw error
  }

  return data
}

// 更新文章详情
export async function updateSpeechDetail(speechId: string, detail: Partial<SpeechDetail>): Promise<SpeechDetail> {
  const { data, error } = await supabase
    .from('speech_details')
    .update({ ...detail, updated_at: new Date().toISOString() })
    .eq('speech_id', speechId)
    .select()
    .single()

  if (error) {
    console.error('更新文章详情失败:', error)
    throw error
  }

  return data
}

// 删除文章
export async function deleteSpeech(id: string): Promise<void> {
  // 先删除文章详情
  const { error: detailError } = await supabase
    .from('speech_details')
    .delete()
    .eq('speech_id', id)

  if (detailError) {
    console.error('删除文章详情失败:', detailError)
    throw detailError
  }

  // 再删除文章
  const { error } = await supabase
    .from('speeches')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('删除文章失败:', error)
    throw error
  }
}

// 订阅文章变化（实时同步）
export function subscribeToSpeeches(callback: (payload: any) => void) {
  return supabase
    .channel('speeches-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'speeches'
      },
      callback
    )
    .subscribe()
}

// 初始化数据（将本地数据导入Supabase）
export async function initializeSpeeches(speeches: Speech[], details: Record<string, any>) {
  for (const speech of speeches) {
    try {
      // 检查文章是否已存在
      const existing = await getSpeechById(speech.id)
      if (!existing) {
        await createSpeech(speech)
        
        // 创建文章详情
        const detail = details[speech.id]
        if (detail) {
          await createSpeechDetail({
            id: `${speech.id}-detail`,
            speech_id: speech.id,
            abstract: detail.abstract || '',
            fullText: detail.fullText || '',
            analysis: detail.analysis || ''
          })
        }
      }
    } catch (error) {
      console.error(`初始化文章 ${speech.id} 失败:`, error)
    }
  }
}
