import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'
import { withWorkspaceAuth } from '@/lib/workspace-access'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const postId = typeof body.postId === 'string' ? body.postId : ''
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 4000) : ''

    if (!isUuid(postId) || !isUuid(workspaceId)) {
      return NextResponse.json({ error: 'Missing postId or workspaceId' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authorized = await withWorkspaceAuth({ email: user.email, userId: user.id, workspaceId }, { require: 'canApprove' }, async () => 'authorized' as const)
    if (authorized !== 'authorized') return authorized

    const now = new Date().toISOString()
    const supabase = createAdminSupabase()
    const { error } = await supabase
      .from('campaign_posts')
      .update({ approved_at: now, status: 'approved', updated_at: now })
      .eq('id', postId)
      .eq('workspace_id', workspaceId)

    if (error) throw error
    if (note) {
      const { data: existingNote, error: existingNoteError } = await supabase
        .from('review_notes')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('post_id', postId)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (existingNoteError) throw existingNoteError
      const noteValues = { original_text: note, reviewer_id: user.id, reviewer: user.email || null }
      const noteResult = existingNote?.id
        ? await supabase.from('review_notes').update(noteValues).eq('id', existingNote.id)
        : await supabase.from('review_notes').insert({ workspace_id: workspaceId, post_id: postId, ...noteValues })
      const noteError = noteResult.error
      if (noteError) throw noteError
    }

    return NextResponse.json({ success: true, status: 'approved' })
  } catch (error) {
    console.error('[posts/approve]', error)
    return NextResponse.json(
      { error: 'Failed to approve post', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
