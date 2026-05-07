import { createAdminSupabase } from '@/lib/server-supabase'
import {
  defaultContentStrategyLibrary,
  normalizeContentStrategyLibrary,
  type ContentStrategyLibraryItem,
} from '@/lib/content-strategy-library'

const CONTENT_STRATEGY_LIBRARY_KEY = 'default'

export async function getContentStrategyLibrary(): Promise<ContentStrategyLibraryItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return defaultContentStrategyLibrary
  }

  try {
    const supabase = createAdminSupabase()
    const { data, error } = await supabase
      .from('content_strategy_library')
      .select('items')
      .eq('id', CONTENT_STRATEGY_LIBRARY_KEY)
      .maybeSingle()

    if (error || !data?.items) {
      return defaultContentStrategyLibrary
    }

    return normalizeContentStrategyLibrary(data.items)
  } catch {
    return defaultContentStrategyLibrary
  }
}

export async function saveContentStrategyLibrary(items: ContentStrategyLibraryItem[]) {
  const supabase = createAdminSupabase()
  const normalized = normalizeContentStrategyLibrary(items)
  const { data, error } = await supabase
    .from('content_strategy_library')
    .upsert({
      id: CONTENT_STRATEGY_LIBRARY_KEY,
      items: normalized,
      updated_at: new Date().toISOString(),
    })
    .select('items, updated_at')
    .single()

  if (error) throw error

  return {
    items: normalizeContentStrategyLibrary(data.items),
    updatedAt: data.updated_at as string,
  }
}
