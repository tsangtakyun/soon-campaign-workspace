import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export async function POST(req: Request) {
  try {
    const { caption, imageUrl, postId, sessionId } = (await req.json()) as {
      caption?: string
      imageUrl?: string
      postId?: string
      sessionId?: string
    }

    if (!imageUrl || !caption) {
      return NextResponse.json({ error: 'Missing imageUrl or caption' }, { status: 400 })
    }

    const supabase = createAdminSupabase()
    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()
    let connectionQuery = supabase
      .from('social_connections')
      .select('account_id,page_access_token,page_id,account_name')
      .eq('platform', 'instagram')

    if (sessionId) {
      connectionQuery = connectionQuery.eq('onboarding_session_id', sessionId)
    } else if (user?.id) {
      connectionQuery = connectionQuery.eq('user_id', user.id)
    } else {
      return NextResponse.json({ error: 'Missing onboarding session' }, { status: 400 })
    }

    const { data: connection, error: connectionError } = await connectionQuery.maybeSingle()

    if (connectionError) throw connectionError
    if (!connection?.account_id || !connection.page_access_token) {
      return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })
    }

    const igAccountId = connection.account_id as string
    const accessToken = connection.page_access_token as string
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
    const containerUrl = new URL(`${graphOrigin}/${igAccountId}/media`)
    const containerBody = new URLSearchParams({
      access_token: accessToken,
      caption,
      image_url: imageUrl,
    })

    const containerRes = await fetch(containerUrl.toString(), {
      body: containerBody,
      method: 'POST',
    })
    const containerData = await containerRes.json()

    if (!containerRes.ok || !containerData.id) {
      throw new Error(`Failed to create media container: ${JSON.stringify(containerData)}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const publishUrl = new URL(`${graphOrigin}/${igAccountId}/media_publish`)
    const publishBody = new URLSearchParams({
      access_token: accessToken,
      creation_id: containerData.id,
    })
    const publishRes = await fetch(publishUrl.toString(), {
      body: publishBody,
      method: 'POST',
    })
    const publishData = await publishRes.json()

    if (!publishRes.ok || !publishData.id) {
      throw new Error(`Failed to publish: ${JSON.stringify(publishData)}`)
    }

    if (postId) {
      await supabase
        .from('campaign_posts')
        .update({
          posted_at: new Date().toISOString(),
          status: 'posted',
        })
        .eq('id', postId)
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
