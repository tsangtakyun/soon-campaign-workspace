import { NextResponse } from 'next/server'

import { normalizeBrandSourceUrl } from '@/lib/brand-source-analysis'
import { requirePlatformUser } from '@/lib/platform-access'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export const maxDuration = 10

export async function POST(req: Request) {
  try {
    const platform = await requirePlatformUser()
    if (platform.error) return platform.error

    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id.trim() : ''
    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : ''

    if (!workspaceId || !rawUrl) {
      return NextResponse.json({ error: 'Missing workspace_id or url' }, { status: 400 })
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

    const url = normalizeBrandSourceUrl(rawUrl)
    console.log('[analyze-brand-source] saving brand_source', {
      requestWorkspaceId: workspaceId,
      url,
      userId: platform.access.user.id,
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
