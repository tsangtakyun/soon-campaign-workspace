import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { appUrl, assertWorkspaceAccess, isUuid } from '@/lib/oauth-connections'
import { publishPostToConnectedPlatforms, shouldPublishNow } from '@/lib/post-publishing'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export const maxDuration = 60

export async function POST(req: Request) {
  const baseUrl = appUrl(req)

  try {
    const body = await req.json().catch(() => ({}))
    const postId = typeof body.postId === 'string' ? body.postId : ''
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const platform =
      body.platform === 'instagram' || body.platform === 'facebook' || body.platform === 'threads'
        ? body.platform
        : null
    console.log('Starting publish for post:', postId)
    console.log('[posts/publish] request workspace:', { postId, workspaceId })

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
    const { data: post, error: postError } = await supabase
      .from('campaign_posts')
      .select('id,user_id,title,body,image_url,scheduled_at,workspace_id')
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (postError) throw postError
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const now = new Date().toISOString()
    const dueNow = shouldPublishNow(post.scheduled_at)
    console.log('[posts/publish] post loaded:', {
      hasImageUrl: Boolean(post.image_url),
      imageUrl: post.image_url,
      postId,
      scheduledAt: post.scheduled_at,
      workspaceId,
    })
    console.log('[posts/publish] timing decision:', {
      dueNow,
      now,
      scheduledAt: post.scheduled_at,
      window: 'now + 30 minutes',
    })

    await supabase
      .from('campaign_posts')
      .update({
        approved_at: now,
        status: dueNow ? 'approved' : 'scheduled',
        updated_at: now,
      })
      .eq('id', postId)
      .eq('workspace_id', workspaceId)

    if (!dueNow) {
      return NextResponse.json({
        errors: [],
        platforms_published: [],
        scheduled_at: post.scheduled_at,
        status: 'scheduled',
        success: true,
      })
    }

    const publishResult = await publishPostToConnectedPlatforms({
      baseUrl,
      platforms: platform ? [platform] : undefined,
      post,
      userId: user.id,
      workspaceId,
    })

    if (publishResult.errors.length) {
      return NextResponse.json(
        {
          ...publishResult,
          status: 'approved',
          success: false,
        },
        { status: 207 }
      )
    }

    if (!publishResult.platforms_published.length) {
      return NextResponse.json({
        ...publishResult,
        message: '貼文已批准，但目前沒有已連接的發布平台。',
        status: 'approved',
        success: true,
      })
    }

    await supabase
      .from('campaign_posts')
      .update({
        posted_at: new Date().toISOString(),
        status: 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('workspace_id', workspaceId)

    return NextResponse.json({
      ...publishResult,
      status: 'published',
      success: true,
    })
  } catch (error) {
    console.error('[posts/publish]', error)
    return NextResponse.json(
      { error: 'Failed to publish post', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
