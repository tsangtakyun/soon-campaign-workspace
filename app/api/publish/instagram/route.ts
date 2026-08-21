import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { assertWorkspaceAccess, isUuid } from '@/lib/oauth-connections'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

function readGraphError(value: unknown) {
  if (!value || typeof value !== 'object' || !('error' in value)) return JSON.stringify(value)
  const error = (value as { error?: { message?: unknown } | string }).error
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && typeof error.message === 'string') return error.message
  return JSON.stringify(value)
}

export async function POST(req: Request) {
  try {
    const { caption, imageUrl, postId, sessionId, workspaceId } = (await req.json()) as {
      caption?: string
      imageUrl?: string
      postId?: string
      sessionId?: string
      workspaceId?: string
    }

    if (!imageUrl || !caption || (sessionId ? !isUuid(sessionId) || !isUuid(postId || '') : !isUuid(workspaceId || ''))) {
      return NextResponse.json({ error: 'Missing imageUrl, caption or workspaceId' }, { status: 400 })
    }

    const supabase = createAdminSupabase()
    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()
    let connectionQuery = supabase
      .from('social_connections')
      .select('account_id,access_token,page_access_token,page_id,account_name')
      .eq('platform', 'instagram')

    if (sessionId) {
      const { data: anonymousConnection } = await supabase
        .from('social_connections')
        .select('id,user_id,connected_at')
        .eq('platform', 'instagram')
        .eq('onboarding_session_id', sessionId)
        .is('user_id', null)
        .maybeSingle()
      const connectedAt = anonymousConnection?.connected_at ? new Date(anonymousConnection.connected_at).getTime() : 0
      if (!anonymousConnection?.id || !connectedAt || Date.now() - connectedAt > 24 * 60 * 60 * 1000) {
        return NextResponse.json({ error: 'Invalid or expired onboarding session' }, { status: 401 })
      }
      const { data: sessionPost } = await supabase
        .from('campaign_posts')
        .select('id')
        .eq('id', postId)
        .eq('onboarding_session_id', sessionId)
        .is('user_id', null)
        .maybeSingle()
      if (!sessionPost?.id) return NextResponse.json({ error: 'Post does not belong to onboarding session' }, { status: 401 })
      const { count: publishCount } = await supabase
        .from('campaign_posts')
        .select('id', { count: 'exact', head: true })
        .eq('onboarding_session_id', sessionId)
        .in('status', ['posted', 'published'])
      if ((publishCount || 0) >= 3) return NextResponse.json({ error: 'Onboarding publish limit reached' }, { status: 429 })
      connectionQuery = connectionQuery.eq('onboarding_session_id', sessionId).is('user_id', null)
    } else if (user?.id && workspaceId) {
      await assertWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
      connectionQuery = connectionQuery.eq('workspace_id', workspaceId)
    } else {
      return NextResponse.json({ error: 'Missing onboarding session' }, { status: 400 })
    }

    const { data: connection, error: connectionError } = await connectionQuery.maybeSingle()

    if (connectionError) throw connectionError
    const tokens = [
      { label: 'user_access_token', token: connection?.access_token as string | null | undefined },
      { label: 'page_access_token', token: connection?.page_access_token as string | null | undefined },
    ].filter((item, index, items) => {
      return item.token && items.findIndex((candidate) => candidate.token === item.token) === index
    }) as { label: string; token: string }[]

    if (!connection?.account_id || !tokens.length) {
      return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })
    }

    const igAccountId = connection.account_id as string
    if (connection.page_id && connection.page_id === igAccountId) {
      return NextResponse.json(
        {
          error: 'Instagram Business Account not connected',
          detail: 'Facebook Page is connected, but no linked Instagram Business Account was found.',
        },
        { status: 400 }
      )
    }

    const graphOrigin = connection.page_id ? 'https://graph.facebook.com/v19.0' : 'https://graph.instagram.com/v19.0'
    const errors: string[] = []
    let publishData: Record<string, unknown> | null = null

    for (const { label, token } of tokens) {
      try {
        const containerUrl = new URL(`${graphOrigin}/${igAccountId}/media`)
        const containerBody = new URLSearchParams({
          access_token: token,
          caption,
          image_url: imageUrl,
        })

        const containerRes = await fetch(containerUrl.toString(), {
          body: containerBody,
          method: 'POST',
        })
        const containerData = await containerRes.json().catch(() => ({}))

        if (!containerRes.ok || !containerData.id) {
          throw new Error(`Failed to create media container: ${readGraphError(containerData)}`)
        }

        await new Promise((resolve) => setTimeout(resolve, 2000))

        const publishUrl = new URL(`${graphOrigin}/${igAccountId}/media_publish`)
        const publishBody = new URLSearchParams({
          access_token: token,
          creation_id: containerData.id,
        })
        const publishRes = await fetch(publishUrl.toString(), {
          body: publishBody,
          method: 'POST',
        })
        const nextPublishData = await publishRes.json().catch(() => ({}))

        if (!publishRes.ok || !nextPublishData.id) {
          throw new Error(`Failed to publish: ${readGraphError(nextPublishData)}`)
        }

        publishData = nextPublishData
        break
      } catch (error) {
        errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    if (!publishData?.id) {
      throw new Error(`Failed to publish. ${errors.join(' | ')}`)
    }

    if (postId) {
      const publishedAt = new Date().toISOString()
      const { data: existingPost } = await supabase
        .from('campaign_posts')
        .select('captions')
        .eq('id', postId)
        .eq('workspace_id', workspaceId)
        .maybeSingle()
      const captions =
        existingPost?.captions && typeof existingPost.captions === 'object' && !Array.isArray(existingPost.captions)
          ? (existingPost.captions as Record<string, unknown>)
          : {}
      const publishStatus =
        captions.publish_status && typeof captions.publish_status === 'object' && !Array.isArray(captions.publish_status)
          ? (captions.publish_status as Record<string, unknown>)
          : {}

      await supabase
        .from('campaign_posts')
        .update({
          captions: {
            ...captions,
            publish_status: {
              ...publishStatus,
              instagram: {
                at: publishedAt,
                media_id: String(publishData.id),
                status: 'published',
              },
            },
          },
          posted_at: publishedAt,
          status: 'posted',
        })
        .eq('id', postId)
        .eq('workspace_id', workspaceId)
    }

    return NextResponse.json({
      instagramPostId: publishData.id,
      success: true,
    })
  } catch (err) {
    console.error('[publish/instagram]', err)
    return NextResponse.json(
      { detail: String(err), error: 'Failed to publish' },
      { status: 500 }
    )
  }
}
