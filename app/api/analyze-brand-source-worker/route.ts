import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { normalizeBrandSourceUrl, processBrandSource } from '@/lib/brand-source-analysis'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const brandSourceId = typeof body?.brand_source_id === 'string' ? body.brand_source_id.trim() : ''
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id.trim() : ''
    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : ''

    if (!brandSourceId || !workspaceId || !rawUrl) {
      return NextResponse.json({ error: 'Missing brand_source_id, workspace_id or url' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminSupabase()
    const { data: source } = await supabase
      .from('brand_sources')
      .select('id,workspace_id,url,status')
      .eq('id', brandSourceId)
      .maybeSingle()

    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    const brandSource = { ...source, workspace_id: workspaceId }

    console.log('[analyze-brand-source-worker] workspace debug', {
      brandSourceId,
      requestWorkspaceId: workspaceId,
      sourceWorkspaceId: source.workspace_id,
      sourceStatus: source.status,
      sourceUrl: source.url,
    })
    console.log('[worker] writing brand_profile for workspace_id:', brandSource.workspace_id)
    console.log('[worker] brand_source record:', JSON.stringify(brandSource))

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id,owner_id')
      .eq('id', workspaceId)
      .maybeSingle()

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!workspace || (workspace.owner_id !== user.id && !membership)) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    if (source.workspace_id !== workspaceId) {
      await supabase
        .from('brand_sources')
        .update({ workspace_id: workspaceId })
        .eq('id', brandSourceId)
    }

    const result = await processBrandSource({
      brandSourceId,
      url: source.url || normalizeBrandSourceUrl(rawUrl),
      userId: user.id,
      workspaceId,
    })

    return NextResponse.json({
      success: true,
      id: brandSourceId,
      media_count: result.mediaCount,
      workspace_id: workspaceId,
    })
  } catch (error) {
    console.error('[analyze-brand-source-worker] failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze brand source' },
      { status: 500 }
    )
  }
}
