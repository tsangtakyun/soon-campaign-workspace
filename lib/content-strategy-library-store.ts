import { createAdminSupabase } from '@/lib/server-supabase'
import {
  defaultContentStrategyLibrary,
  normalizeContentStrategyLibrary,
  type ContentStrategyLibraryItem,
} from '@/lib/content-strategy-library'
import { getPublishedStrategies } from '@/lib/strategy-registry'

const CONTENT_STRATEGY_LIBRARY_KEY = 'default'

export async function getContentStrategyLibrary(): Promise<ContentStrategyLibraryItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return defaultContentStrategyLibrary
  }

  try {
    try {
      const registryItems = await getPublishedStrategies('content_strategy')
      if (registryItems.length) {
        const defaultsById = new Map(defaultContentStrategyLibrary.map((item) => [item.id, item]))
        return normalizeContentStrategyLibrary(registryItems.map((item, index) => {
          const fallback = defaultsById.get(item.id)
          return {
            ...fallback,
            id: item.id,
            name: item.name,
            nameZh: item.nameZh,
            description: item.description || String(item.definition.description || fallback?.description || ''),
            purpose: String(item.definition.purpose || fallback?.purpose || ''),
            funnelStage: item.definition.funnelStage || fallback?.funnelStage || 'middle',
            fitFor: String(item.definition.fitFor || fallback?.fitFor || ''),
            priority: Number(item.definition.priority || fallback?.priority || (index + 1) * 10),
            isActive: item.definition.isActive !== false,
          }
        }))
      }
    } catch (registryError) {
      console.warn('[content-strategy-library] registry unavailable; using legacy library', registryError)
    }

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
