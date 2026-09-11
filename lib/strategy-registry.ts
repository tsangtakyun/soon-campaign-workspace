import { createAdminSupabase } from '@/lib/server-supabase'

export const STRATEGY_TYPES = [
  'content_strategy', 'angle_pattern', 'objective', 'funnel_stage',
  'format', 'deliverable_recipe', 'success_metric', 'risk_rule',
] as const

export type StrategyType = (typeof STRATEGY_TYPES)[number]
export type StrategyRegistryItem = {
  id: string
  strategyType: StrategyType
  name: string
  nameZh: string
  description: string
  version: number
  versionId: string
  definition: Record<string, unknown>
}

export async function getPublishedStrategies(strategyType?: StrategyType): Promise<StrategyRegistryItem[]> {
  const supabase = createAdminSupabase()
  let query = supabase
    .from('strategy_definitions')
    .select('id,strategy_type,name,name_zh,description,active_version,strategy_versions!inner(id,version,status,definition)')
    .eq('is_active', true)
    .eq('strategy_versions.status', 'published')
  if (strategyType) query = query.eq('strategy_type', strategyType)
  const { data, error } = await query.order('strategy_type').order('id')
  if (error) throw error

  return (data || []).flatMap((row: any) => {
    const versions = Array.isArray(row.strategy_versions) ? row.strategy_versions : []
    const active = versions.find((version: any) => version.version === row.active_version)
      || versions.sort((a: any, b: any) => Number(b.version) - Number(a.version))[0]
    if (!active) return []
    return [{
      id: row.id,
      strategyType: row.strategy_type as StrategyType,
      name: row.name,
      nameZh: row.name_zh || row.name,
      description: row.description || '',
      version: active.version,
      versionId: active.id,
      definition: active.definition && typeof active.definition === 'object' ? active.definition : {},
    }]
  })
}

export async function createStrategyVersion(input: {
  strategyId: string
  strategyType: StrategyType
  name: string
  nameZh?: string
  description?: string
  definition: Record<string, unknown>
  changeNote?: string
  publish: boolean
  userId: string
}) {
  const supabase = createAdminSupabase()
  const now = new Date().toISOString()
  const { error: definitionError } = await supabase.from('strategy_definitions').upsert({
    id: input.strategyId,
    strategy_type: input.strategyType,
    name: input.name,
    name_zh: input.nameZh || input.name,
    description: input.description || '',
    is_active: true,
    updated_by: input.userId,
    updated_at: now,
  }, { onConflict: 'id' })
  if (definitionError) throw definitionError

  const { data: latest, error: latestError } = await supabase
    .from('strategy_versions').select('version').eq('strategy_id', input.strategyId)
    .order('version', { ascending: false }).limit(1).maybeSingle()
  if (latestError) throw latestError
  const version = Number(latest?.version || 0) + 1

  if (input.publish) {
    const { error } = await supabase.from('strategy_versions').update({ status: 'archived' })
      .eq('strategy_id', input.strategyId).eq('status', 'published')
    if (error) throw error
  }
  const { data, error } = await supabase.from('strategy_versions').insert({
    strategy_id: input.strategyId,
    version,
    status: input.publish ? 'published' : 'draft',
    definition: input.definition,
    change_note: input.changeNote || null,
    created_by: input.userId,
    published_by: input.publish ? input.userId : null,
    published_at: input.publish ? now : null,
  }).select('id,version,status,definition,created_at,published_at').single()
  if (error) throw error

  if (input.publish) {
    const { error: activateError } = await supabase.from('strategy_definitions')
      .update({ active_version: version, updated_by: input.userId, updated_at: now })
      .eq('id', input.strategyId)
    if (activateError) throw activateError
  }
  return data
}
