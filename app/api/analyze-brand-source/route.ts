import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { normalizeBrandSourceUrl } from '@/lib/brand-source-analysis'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export const maxDuration = 10

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id.trim() : ''
    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : ''

    if (!workspaceId || !rawUrl) {
      return NextResponse.json({ error: 'Missing workspace_id or url' }, { status: 400 })
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

    const url = normalizeBrandSourceUrl(rawUrl)
    console.log('[analyze-brand-source] saving brand_source', {
      requestWorkspaceId: workspaceId,
      url,
      userId: user.id,
    })
    const { data: source, error: sourceError } = await supabase
      .from('brand_sources')
      .insert({
        workspace_id: workspaceId,
        url,
        type: 'website',
        status: 'pending',
      })
      .select('id,status,url')
      .single()

    if (sourceError) throw sourceError

    return NextResponse.json({
      id: source.id,
      status: source.status,
      url: source.url,
      workspace_id: workspaceId,
    })
  } catch (error) {
    console.error('[analyze-brand-source] quick save failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save brand source' },
      { status: 500 }
    )
  }
}
