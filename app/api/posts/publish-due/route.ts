import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

import { appUrl } from '@/lib/oauth-connections'
import { publishPostToConnectedPlatforms } from '@/lib/post-publishing'
import { createAdminSupabase } from '@/lib/server-supabase'

export const maxDuration = 300

function isAuthorizedCronRequest(req: Request) {
  const secret = process.env.CRON_SECRET
  const authorization = req.headers.get('authorization')
  if (!secret) {
    console.error('[posts/publish-due] CRON_SECRET is not configured; scheduled publishing is disabled')
    return false
  }
  if (!authorization?.startsWith('Bearer ')) return false
  const supplied = Buffer.from(authorization.slice(7))
  const expected = Buffer.from(secret)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

async function handlePublishDue(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabase()
  const now = new Date().toISOString()

  try {
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: recoveredPosts, error: recoveryError } = await supabase
      .from('campaign_posts')
      .update({ status: 'approved', publishing_started_at: null, updated_at: new Date().toISOString() })
      .eq('status', 'publishing')
      .lt('publishing_started_at', staleBefore)
      .is('posted_at', null)
      .select('id')
    if (recoveryError) throw recoveryError
    for (const recovered of recoveredPosts || []) {
      console.warn('[posts/publish-due] recovered stale publishing lease', { postId: recovered.id })
    }

    const { data: connectionWorkspaces, error: connectionWorkspaceError } = await supabase
      .from('social_connections')
      .select('workspace_id')
      .in('platform', ['instagram', 'facebook', 'threads'])
      .not('workspace_id', 'is', null)

    if (connectionWorkspaceError) throw connectionWorkspaceError

    const workspaceIds = Array.from(
      new Set(
        (connectionWorkspaces || [])
          .map((connection: { workspace_id?: string | null }) => connection.workspace_id)
          .filter((workspaceId): workspaceId is string => Boolean(workspaceId))
      )
    )

    if (!workspaceIds.length) {
      console.log('[cron] Processing due posts:', 0)
      return NextResponse.json({ errors: [], failed: 0, published: 0, success: true })
    }

    const { data: posts, error } = await supabase
      .from('campaign_posts')
      .select('id,user_id,title,body,image_url,scheduled_at,workspace_id,captions')
      .in('status', ['approved', 'scheduled'])
      .lte('scheduled_at', now)
      .in('workspace_id', workspaceIds)
      .is('posted_at', null)
      .limit(20)

    if (error) throw error

    console.log('[cron] Processing due posts:', posts?.length || 0)

    let published = 0
    let failed = 0
    const errors: Array<{ error: string; postId: string }> = []

    for (const post of posts || []) {
      const workspaceId = typeof post.workspace_id === 'string' ? post.workspace_id : ''
      if (!workspaceId) continue

      try {
        const { data: claimedPost, error: claimError } = await supabase
          .from('campaign_posts')
          .update({ status: 'publishing', publishing_started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', post.id)
          .eq('workspace_id', workspaceId)
          .in('status', ['approved', 'scheduled'])
          .is('posted_at', null)
          .select('id')
          .maybeSingle()
        if (claimError) throw claimError
        if (!claimedPost?.id) continue

        const publishResult = await publishPostToConnectedPlatforms({
          baseUrl: appUrl(req),
          platforms: ['instagram', 'facebook', 'threads'],
          post,
          userId: typeof post.user_id === 'string' ? post.user_id : null,
          workspaceId,
        })

        if (!publishResult.errors.length && publishResult.platforms_published.length) {
          await supabase
            .from('campaign_posts')
            .update({
              posted_at: new Date().toISOString(),
              status: 'published',
              publishing_started_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', post.id)
            .eq('workspace_id', workspaceId)

          published += 1
          console.log('[cron] Published:', post.id, 'to', publishResult.platforms_published)
        } else {
          await supabase.from('campaign_posts').update({ status: 'approved', publishing_started_at: null, updated_at: new Date().toISOString() }).eq('id', post.id).eq('status', 'publishing')
          failed += 1
          const message = publishResult.errors.map((item) => item.message).join('; ') || 'No platforms published'
          errors.push({ error: message, postId: post.id })
          console.log('[cron] Failed:', post.id, message)
        }
      } catch (error) {
        await supabase.from('campaign_posts').update({ status: 'approved', publishing_started_at: null, updated_at: new Date().toISOString() }).eq('id', post.id).eq('status', 'publishing')
        failed += 1
        const message = error instanceof Error ? error.message : String(error)
        errors.push({ error: message, postId: post.id })
        console.log('[cron] Failed:', post.id, message)
      }
    }

    return NextResponse.json({ errors, failed, published, success: true })
  } catch (error) {
    console.error('[posts/publish-due]', error)
    return NextResponse.json(
      { error: 'Failed to publish due posts', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  return handlePublishDue(req)
}

export async function POST(req: Request) {
  return handlePublishDue(req)
}
