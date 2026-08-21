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
    const scheduledAt = typeof body.scheduledAt === 'string' ? body.scheduledAt : ''

    if (!isUuid(postId) || !isUuid(workspaceId)) {
      return NextResponse.json({ error: 'Missing postId or workspaceId' }, { status: 400 })
    }

    const nextScheduledAt = new Date(scheduledAt)
    if (Number.isNaN(nextScheduledAt.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduled time' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authorized = await withWorkspaceAuth({ email: user.email, userId: user.id, workspaceId }, { require: 'canEdit' }, async () => 'authorized' as const)
    if (authorized !== 'authorized') return authorized

    const supabase = createAdminSupabase()
    const { data: post, error: postError } = await supabase
      .from('campaign_posts')
      .select('id,status')
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (postError) throw postError
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const status = post.status === 'published' || post.status === 'posted' ? post.status : 'approved'
    const { error } = await supabase
      .from('campaign_posts')
      .update({
        scheduled_at: nextScheduledAt.toISOString(),
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('workspace_id', workspaceId)

    if (error) throw error

    return NextResponse.json({
      scheduled_at: nextScheduledAt.toISOString(),
      status,
      success: true,
    })
  } catch (error) {
    console.error('[posts/update-schedule]', error)
    return NextResponse.json(
      { error: 'Failed to update schedule', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
