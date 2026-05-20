import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { assertWorkspaceAccess, isUuid } from '@/lib/oauth-connections'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const postId = typeof body.postId === 'string' ? body.postId : ''
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''

    if (!isUuid(postId) || !isUuid(workspaceId) || !imageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    const updatePayload = {
      image_url: imageUrl,
      status: 'ready',
      updated_at: new Date().toISOString(),
    }

    const supabase = createAdminSupabase()
    const { data, error } = await supabase
      .from('campaign_posts')
      .update(updatePayload)
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
      .select('id')

    if (error) throw error

    if (!data || data.length === 0) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('campaign_posts')
        .update(updatePayload)
        .eq('id', postId)
        .select('id')

      if (fallbackError) throw fallbackError

      return NextResponse.json({
        success: true,
        fallback: true,
        updatedRows: fallbackData?.length ?? 0,
      })
    }

    return NextResponse.json({ success: true, fallback: false, updatedRows: data.length })
  } catch (error) {
    console.error('[posts/update-image]', error)
    return NextResponse.json(
      { error: 'Failed to update image', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
