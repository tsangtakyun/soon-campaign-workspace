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
    const postId = typeof body.postId === 'string' ? body.postId : ''
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 4000) : ''

    if (!isUuid(workspaceId) || (!isUuid(projectId) && !isUuid(postId)) || (projectId && postId) || !note) {
      return NextResponse.json({ error: '請輸入有效的修改意見' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: '請先登入' }, { status: 401 })

    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access?.canApprove) {
      return NextResponse.json({ error: '只有 Admin 或客戶審批人可以儲存意見' }, { status: 403 })
    }

    const target = projectId
      ? await access.admin.from('content_projects').select('id').eq('id', projectId).eq('workspace_id', workspaceId).maybeSingle()
      : await access.admin.from('campaign_posts').select('id').eq('id', postId).eq('workspace_id', workspaceId).maybeSingle()
    if (target.error) throw target.error
    if (!target.data?.id) return NextResponse.json({ error: '找不到相關內容' }, { status: 404 })

    let latestQuery = access.admin
      .from('review_notes')
      .select('id,original_text,reviewer_id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
    latestQuery = projectId ? latestQuery.eq('project_id', projectId) : latestQuery.eq('post_id', postId)
    const { data: latestNote, error: latestError } = await latestQuery.maybeSingle()
    if (latestError) throw latestError

    if (latestNote?.original_text === note && latestNote.reviewer_id === user.id) {
      return NextResponse.json({ success: true, duplicate: true, note: latestNote })
    }

    const { data: savedNote, error: insertError } = await access.admin
      .from('review_notes')
      .insert({
        workspace_id: workspaceId,
        project_id: projectId || null,
        post_id: postId || null,
        original_text: note,
        reviewer_id: user.id,
        reviewer: user.email || '客戶審批人',
        resolved: false,
      })
      .select('id,project_id,post_id,original_text,reviewer,created_at,resolved')
      .single()
    if (insertError) throw insertError

    return NextResponse.json({ success: true, note: savedNote })
  } catch (error) {
    console.error('[review-notes]', error)
    return NextResponse.json(
      { error: '未能儲存修改意見', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
