import { createAdminSupabase } from '@/lib/server-supabase'
import { defaultStrategyLibrary, normalizeStrategyLibrary, type StrategyLibraryState } from '@/lib/strategy-library'

const STRATEGY_LIBRARY_KEY = 'default'

export async function getStrategyLibrary(): Promise<StrategyLibraryState> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return defaultStrategyLibrary
  }

  try {
    const supabase = createAdminSupabase()
    const { data, error } = await supabase
      .from('strategy_library')
      .select('library')
      .eq('id', STRATEGY_LIBRARY_KEY)
      .maybeSingle()

    if (error || !data?.library) {
      return defaultStrategyLibrary
    }

    return normalizeStrategyLibrary(data.library)
  } catch {
    return defaultStrategyLibrary
  }
}

export async function saveStrategyLibrary(library: StrategyLibraryState) {
  const supabase = createAdminSupabase()
  const normalized = normalizeStrategyLibrary(library)
  const { data, error } = await supabase
    .from('strategy_library')
    .upsert({
      id: STRATEGY_LIBRARY_KEY,
      library: normalized,
      updated_at: new Date().toISOString(),
    })
    .select('library, updated_at')
    .single()

  if (error) throw error

  return {
    library: normalizeStrategyLibrary(data.library),
    updatedAt: data.updated_at as string,
  }
}
