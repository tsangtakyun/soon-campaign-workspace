import { NextResponse } from 'next/server'

import { requirePlatformUser } from '@/lib/platform-access'
import { normalizeContentMoodSelection } from '@/lib/recommend-content-mood'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export async function GET(req: Request) {
  try {
    const platform = await requirePlatformUser()
    if (platform.error) return platform.error

    const workspaceId = new URL(req.url).searchParams.get('workspace_id')?.trim()
    if (!workspaceId) return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })

    const workspaceAccess = await getWorkspaceAccess({
      email: platform.access.user.email,
      userId: platform.access.user.id,
      workspaceId,
    })
    if (!workspaceAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = workspaceAccess.admin
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id,owner_id,logo_url,visual_style,font_style,visual_identity_description,brand_colors')
      .eq('id', workspaceId)
      .maybeSingle()

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    console.log('[brand-data-api] fetched workspace:', JSON.stringify(workspace))
    console.log('[brand-data-api] querying brand_profiles for workspace_id:', workspaceId)

    const [sourcesResult, profileResult, voiceResult, assetsResult, contentMoodResult] = await Promise.all([
      supabase
        .from('brand_sources')
        .select('id,url,type,status,last_scanned_at,created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
      supabase
        .from('brand_profiles')
        .select('business_name,business_overview,market_positioning,competitors,competitive_advantages,customer_segments,workspace_id,updated_at')
        .eq('workspace_id', workspaceId)
        .maybeSingle(),
      supabase
        .from('brand_voices')
        .select('purpose,audience,tone,emotion,character,syntax,language,workspace_id,updated_at')
        .eq('workspace_id', workspaceId)
        .maybeSingle(),
      supabase
        .from('brand_assets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
      supabase
        .from('content_preferences')
        .select('content_mood,updated_at')
        .eq('workspace_id', workspaceId)
        .maybeSingle(),
    ])

    const result = {
      assets: assetsResult.data || [],
      brandProfile: profileResult.data || null,
      brandVoice: voiceResult.data || null,
      contentMood: contentMoodResult.data?.content_mood || null,
      errors: {
        assets: assetsResult.error,
        brandProfile: profileResult.error,
        brandVoice: voiceResult.error,
        contentMood: contentMoodResult.error,
        sources: sourcesResult.error,
      },
      sources: sourcesResult.data || [],
      workspace,
    }

    console.log('[brand-data-api] result:', JSON.stringify({
      workspaceId,
      assetsCount: result.assets.length,
      hasProfile: Boolean(result.brandProfile),
      hasVoice: Boolean(result.brandVoice),
      profileWorkspaceId: (result.brandProfile as any)?.workspace_id || null,
      voiceWorkspaceId: (result.brandVoice as any)?.workspace_id || null,
      sourcesCount: result.sources.length,
      errors: result.errors,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[brand-data-api] failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load brand kit data' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const platform = await requirePlatformUser()
    if (platform.error) return platform.error

    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id.trim() : ''
    const field = typeof body?.field === 'string' ? body.field.trim() : ''
    const value = body?.value

    if (!workspaceId || !field) {
      return NextResponse.json({ error: 'Missing workspace_id or field' }, { status: 400 })
    }

    const allowedFields = new Set([
      'business_name',
      'business_overview',
      'market_positioning',
      'competitors',
      'competitive_advantages',
      'visual_identity_description',
      'purpose',
      'audience',
      'tone',
      'emotion',
      'character',
      'syntax',
      'language',
      'content_mood',
    ])
    if (!allowedFields.has(field)) {
      return NextResponse.json({ error: 'Unsupported brand profile field' }, { status: 400 })
    }

    const workspaceAccess = await getWorkspaceAccess({
      email: platform.access.user.email,
      userId: platform.access.user.id,
      workspaceId,
    })
    if (!workspaceAccess?.canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = workspaceAccess.admin

    if (field === 'content_mood') {
      const normalizedMood = normalizeContentMoodSelection(value)
      if (!normalizedMood.selectedMoods.length) {
        return NextResponse.json({ error: '請至少選擇一種內容感覺' }, { status: 400 })
      }

      const { data: contentPreference, error: contentMoodError } = await supabase
        .from('content_preferences')
        .upsert(
          {
            content_mood: normalizedMood,
            updated_at: new Date().toISOString(),
            workspace_id: workspaceId,
          },
          { onConflict: 'workspace_id' }
        )
        .select('content_mood')
        .single()

      if (contentMoodError) throw contentMoodError
      return NextResponse.json({ contentMood: contentPreference.content_mood, success: true })
    }

    if (field === 'visual_identity_description') {
      const { data: updatedWorkspace, error: workspaceError } = await supabase
        .from('workspaces')
        .update({ visual_identity_description: typeof value === 'string' ? value.trim() : '' })
        .eq('id', workspaceId)
        .select('logo_url,visual_style,font_style,visual_identity_description,brand_colors')
        .single()

      if (workspaceError) throw workspaceError
      return NextResponse.json({ success: true, workspace: updatedWorkspace })
    }

    if (['purpose', 'audience', 'tone', 'emotion', 'character', 'syntax', 'language'].includes(field)) {
      const normalizedVoiceValue = normalizeBrandVoicePatchValue(field, value)
      const { data: brandVoice, error: voiceError } = await supabase
        .from('brand_voices')
        .upsert(
          {
            [field]: normalizedVoiceValue,
            updated_at: new Date().toISOString(),
            workspace_id: workspaceId,
          },
          { onConflict: 'workspace_id' }
        )
        .select('purpose,audience,tone,emotion,character,syntax,language')
        .single()

      if (voiceError) throw voiceError
      return NextResponse.json({ brandVoice, success: true })
    }

    const normalizedValue = normalizeBrandProfilePatchValue(field, value)
    const { data: brandProfile, error } = await supabase
      .from('brand_profiles')
      .upsert(
        {
          [field]: normalizedValue,
          updated_at: new Date().toISOString(),
          workspace_id: workspaceId,
        },
        { onConflict: 'workspace_id' }
      )
      .select('business_name,business_overview,market_positioning,competitors,competitive_advantages,customer_segments')
      .single()

    if (error) throw error

    return NextResponse.json({ brandProfile, success: true })
  } catch (error) {
    console.error('[brand-data-api] patch failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update brand profile' },
      { status: 500 }
    )
  }
}

function normalizeBrandVoicePatchValue(field: string, value: unknown) {
  if (field === 'purpose' || field === 'audience') {
    return typeof value === 'string' ? value.trim() : ''
  }
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : []
}

function normalizeBrandProfilePatchValue(field: string, value: unknown) {
  if (field === 'business_name' || field === 'business_overview') {
    return typeof value === 'string' ? value.trim() : ''
  }
  if (field === 'market_positioning' || field === 'competitive_advantages') {
    return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : []
  }
  if (field === 'competitors') {
    const record = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
    return {
      international: Array.isArray(record.international)
        ? record.international.map(String).map((item) => item.trim()).filter(Boolean)
        : [],
      local: Array.isArray(record.local)
        ? record.local.map(String).map((item) => item.trim()).filter(Boolean)
        : [],
    }
  }
  return value
}
