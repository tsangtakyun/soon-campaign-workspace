import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''
    const page = typeof body.page === 'string' ? body.page : ''
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
    const canvasJson = body.canvasJson && typeof body.canvasJson === 'object' ? body.canvasJson : null
    if (!isUuid(workspaceId) || !isUuid(projectId) || !page || !imageUrl || !canvasJson) {
      return NextResponse.json({ error: 'Missing design data' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access || (access.role !== 'owner' && access.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: project, error: projectError } = await access.admin
      .from('content_projects')
      .select('id,production')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .single()
    if (projectError) throw projectError
    const production = project.production && typeof project.production === 'object'
      ? project.production as Record<string, unknown>
      : {}
    const generatedPages = Array.isArray(production.generatedPages)
      ? production.generatedPages.map((item) => {
          if (!item || typeof item !== 'object') return item
          const record = item as Record<string, unknown>
          return record.page === page ? { ...record, url: imageUrl } : record
        })
      : []
    const editorDesigns = production.editorDesigns && typeof production.editorDesigns === 'object'
      ? production.editorDesigns as Record<string, unknown>
      : {}
    const nextProduction = {
      ...production,
      editorDesigns: {
        ...editorDesigns,
        [page]: {
          canvasHeight: Math.max(100, Math.round(Number(body.canvasHeight) || 1350)),
          canvasJson,
          canvasWidth: Math.max(100, Math.round(Number(body.canvasWidth) || 1080)),
          imageUrl,
          updatedAt: new Date().toISOString(),
        },
      },
      generatedPages,
    }
    const { error: updateError } = await access.admin
      .from('content_projects')
      .update({ production: nextProduction, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
    if (updateError) throw updateError
    return NextResponse.json({ imageUrl, success: true })
  } catch (error) {
    console.error('[content-projects/save-design]', error)
    return NextResponse.json(
      { error: 'Failed to save design', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
