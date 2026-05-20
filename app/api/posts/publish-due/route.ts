import { NextResponse } from 'next/server'

import { appUrl } from '@/lib/oauth-connections'
import { publishPostToConnectedPlatforms } from '@/lib/post-publishing'
import { createAdminSupabase } from '@/lib/server-supabase'

export const maxDuration = 300

function isAuthorizedCronRequest(req: Request) {
  const secret = process.env.CRON_SECRET
  const authorization = req.headers.get('authorization')
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  return Boolean((secret && authorization === `Bearer ${secret}`) || isVercelCron)
}

async function handlePublishDue(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabase()
  const now = new Date().toISOString()

  try {
    const { data: connectionWorkspaces, error: connectionWorkspaceError } = await supabase
      .from('social_connections')
      .select('workspace_id')
      .in('platform', ['instagram', 'facebook'])
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
      .select('id,user_id,title,body,image_url,scheduled_at,workspace_id')
      .eq('status', 'approved')
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
              updated_at: new Date().toISOString(),
            })
            .eq('id', post.id)
            .eq('workspace_id', workspaceId)

          published += 1
          console.log('[cron] Published:', post.id, 'to', publishResult.platforms_published)
        } else {
          failed += 1
          const message = publishResult.errors.map((item) => item.message).join('; ') || 'No platforms published'
          errors.push({ error: message, postId: post.id })
          console.log('[cron] Failed:', post.id, message)
        }
      } catch (error) {
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
