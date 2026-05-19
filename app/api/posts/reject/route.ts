import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { assertWorkspaceAccess, isUuid } from '@/lib/oauth-connections'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const postId = typeof body.postId === 'string' ? body.postId : ''
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''

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

    await assertWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })

    const supabase = createAdminSupabase()
    const { error } = await supabase
      .from('campaign_posts')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('workspace_id', workspaceId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[posts/reject]', error)
    return NextResponse.json(
      { error: 'Failed to reject post', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
