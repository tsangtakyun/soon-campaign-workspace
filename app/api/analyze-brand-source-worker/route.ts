import { NextResponse } from 'next/server'

import { normalizeBrandSourceUrl, processBrandSource } from '@/lib/brand-source-analysis'
import { requirePlatformUser } from '@/lib/platform-access'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const platform = await requirePlatformUser()
    if (platform.error) return platform.error

    const body = await req.json().catch(() => ({}))
    const brandSourceId = typeof body?.brand_source_id === 'string' ? body.brand_source_id.trim() : ''
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id.trim() : ''
    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : ''

    if (!brandSourceId || !workspaceId || !rawUrl) {
      return NextResponse.json({ error: 'Missing brand_source_id, workspace_id or url' }, { status: 400 })
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
    const { data: source } = await supabase
      .from('brand_sources')
      .select('id,workspace_id,url,status')
      .eq('id', brandSourceId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    console.log('[analyze-brand-source-worker] workspace debug', {
      brandSourceId,
      requestWorkspaceId: workspaceId,
      sourceWorkspaceId: source.workspace_id,
      sourceStatus: source.status,
      sourceUrl: source.url,
    })
    console.log('[worker] writing brand_profile for workspace_id:', source.workspace_id)
    console.log('[worker] brand_source record:', JSON.stringify(source))

    const result = await processBrandSource({
      brandSourceId,
      url: source.url || normalizeBrandSourceUrl(rawUrl),
      userId: platform.access.user.id,
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
