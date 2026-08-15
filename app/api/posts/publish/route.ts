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
    const publishNow = body.publishNow === true
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
      .select('id,user_id,title,body,image_url,scheduled_at,workspace_id,captions')
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (postError) throw postError
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const now = new Date().toISOString()
    const dueNow = publishNow || shouldPublishNow(post.scheduled_at)
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
      publishNow,
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

    if (!publishResult.platforms_published.length) {
      return NextResponse.json(
        {
          ...publishResult,
          message: publishResult.errors.length
            ? publishResult.errors.map((item) => `${item.platform}: ${item.message}`).join('；')
            : '貼文已批准，但目前沒有已連接的發布平台。',
          status: 'approved',
          success: !publishResult.errors.length,
        },
        { status: publishResult.errors.length ? 207 : 200 }
      )
    }

    const captions = post.captions && typeof post.captions === 'object' && !Array.isArray(post.captions)
      ? (post.captions as Record<string, unknown>)
      : {}
    const existingPublishStatus =
      captions.publish_status && typeof captions.publish_status === 'object' && !Array.isArray(captions.publish_status)
        ? (captions.publish_status as Record<string, unknown>)
        : {}
    const publishedAt = new Date().toISOString()
    const nextPublishStatus: Record<string, unknown> = { ...existingPublishStatus }

    publishResult.platforms_published.forEach((item) => {
      nextPublishStatus[item] = { at: publishedAt, status: 'published' }
    })
    publishResult.errors.forEach((item) => {
      nextPublishStatus[item.platform] = {
        at: publishedAt,
        message: item.message,
        status: 'failed',
      }
    })

    const nextCaptions = {
      ...captions,
      publish_status: nextPublishStatus,
    }
    const fullyPublished = publishResult.platforms_published.length > 0 && publishResult.errors.length === 0

    if (fullyPublished) {
      await supabase
        .from('campaign_posts')
        .update({
          captions: nextCaptions,
          posted_at: new Date().toISOString(),
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('workspace_id', workspaceId)
    } else {
      await supabase
        .from('campaign_posts')
        .update({
          approved_at: now,
          captions: nextCaptions,
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('workspace_id', workspaceId)
    }

    return NextResponse.json({
      ...publishResult,
      status: fullyPublished ? 'published' : 'partial_published',
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
