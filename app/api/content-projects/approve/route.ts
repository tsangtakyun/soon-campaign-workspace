import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

function validSchedule(value: unknown) {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''
    const decision = body.decision === 'changes_requested' ? 'changes_requested' : 'approved'
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 4000) : ''

    if (!isUuid(workspaceId) || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access?.canApprove) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: project, error: projectError } = await access.admin
      .from('content_projects')
      .select('id,title,selected_format,production,created_by')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (projectError) throw projectError
    if (!project?.id) return NextResponse.json({ error: 'Content project not found' }, { status: 404 })

    const now = new Date().toISOString()
    const production = project.production && typeof project.production === 'object'
      ? project.production as Record<string, unknown>
      : {}
    const nextProduction = {
      ...production,
      approvalStatus: decision,
      reviewedAt: now,
    }

    if (decision === 'approved') {
      const generatedPages = Array.isArray(production.generatedPages)
        ? production.generatedPages as Array<Record<string, unknown>>
        : []
      const assets = generatedPages
        .map((page, index) => ({
          page: typeof page.page === 'string' ? page.page : `P.${index + 1}`,
          url: typeof page.url === 'string' ? page.url : '',
        }))
        .filter((asset) => asset.url)
      const sourceKey = `content-project-${projectId}`
      const postValues = {
        user_id: project.created_by || user.id,
        workspace_id: workspaceId,
        source_key: sourceKey,
        title: String(project.title || '未命名 Carousel').slice(0, 200),
        body: typeof production.captionDraft === 'string' ? production.captionDraft : '',
        post_type: project.selected_format === 'short_video' ? 'video' : 'carousel',
        scheduled_at: validSchedule(production.scheduledAt),
        image_url: assets[0]?.url || null,
        captions: { assets, contentProjectId: projectId },
        status: 'approved',
        approved_at: now,
        updated_at: now,
      }

      const { data: existingPost, error: existingPostError } = await access.admin
        .from('campaign_posts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('source_key', sourceKey)
        .maybeSingle()
      if (existingPostError) throw existingPostError

      const postResult = existingPost?.id
        ? await access.admin.from('campaign_posts').update(postValues).eq('id', existingPost.id)
        : await access.admin.from('campaign_posts').insert(postValues)
      if (postResult.error) throw postResult.error
    } else {
      const { error: withdrawError } = await access.admin
        .from('campaign_posts')
        .update({ approved_at: null, scheduled_at: null, status: 'draft', updated_at: now })
        .eq('workspace_id', workspaceId)
        .eq('source_key', `content-project-${projectId}`)
      if (withdrawError) throw withdrawError
    }

    const { error: updateError } = await access.admin
      .from('content_projects')
      .update({ production: nextProduction, updated_at: now, updated_by: user.id })
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
    if (updateError) throw updateError
    if (note) {
      const { error: noteError } = await access.admin.from('review_notes').insert({
        workspace_id: workspaceId, project_id: projectId, original_text: note,
        reviewer_id: user.id, reviewer: user.email || null,
      })
      if (noteError) throw noteError
    }

    return NextResponse.json({ success: true, status: decision })
  } catch (error) {
    console.error('[content-projects/approve]', error)
    return NextResponse.json(
      { error: 'Failed to approve content project', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
