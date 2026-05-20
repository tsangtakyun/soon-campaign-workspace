// Reminder: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local and Vercel,
// and YouTube Data API v3 must be enabled in Google Cloud Console.

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

function appUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
}

function normalizeSessionId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : ''
}

async function readJson(res: Response) {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(JSON.stringify(json))
  }
  return json as Record<string, unknown>
}

async function saveYouTubeConnection({
  accountId,
  accountName,
  accessToken,
  refreshToken,
  sessionId,
  userId,
}: {
  accountId: string
  accountName: string
  accessToken: string
  refreshToken: string | null
  sessionId: string
  userId: string | null
}) {
  const supabase = createAdminSupabase()
  const connection = {
    access_token: accessToken,
    account_id: accountId,
    account_name: accountName,
    connected_at: new Date().toISOString(),
    onboarding_session_id: sessionId || null,
    platform: 'youtube',
    refresh_token: refreshToken,
    user_id: userId,
  }
  const onConflict = userId ? 'user_id,platform' : 'onboarding_session_id,platform'
  const { error } = await supabase.from('social_connections').upsert(connection, { onConflict })
  if (!error) return

  console.warn('[youtube/callback] connection upsert failed, falling back:', error.message)

  let lookup = supabase.from('social_connections').select('id').eq('platform', 'youtube').limit(1)
  lookup = userId ? lookup.eq('user_id', userId) : lookup.eq('onboarding_session_id', sessionId)
  const { data: existing } = await lookup.maybeSingle()

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('social_connections')
      .update(connection)
      .eq('id', existing.id)
    if (updateError) throw updateError
    return
  }

  const { error: insertError } = await supabase.from('social_connections').insert(connection)
  if (insertError) throw insertError
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const stateRaw = requestUrl.searchParams.get('state')
  const error = requestUrl.searchParams.get('error')
  const baseUrl = appUrl(req)

  if (error || !code) {
    console.error('[youtube/callback] OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=youtube_auth_failed`)
  }

  let sessionId = ''
  try {
    const state = JSON.parse(stateRaw || '{}') as { sessionId?: string }
    sessionId = normalizeSessionId(state.sessionId || '')
  } catch {
    sessionId = ''
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Missing Google OAuth environment variables')
    }

    const redirectUri = `${baseUrl}/api/auth/youtube/callback`
    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()
    const userId = user?.id || null

    const tokenData = await readJson(
      await fetch('https://oauth2.googleapis.com/token', {
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      })
    )
    const accessToken = typeof tokenData.access_token === 'string' ? tokenData.access_token : ''
    const refreshToken = typeof tokenData.refresh_token === 'string' ? tokenData.refresh_token : null
    if (!accessToken) throw new Error(`No YouTube access token: ${JSON.stringify(tokenData)}`)

    const channelsUrl = new URL('https://www.googleapis.com/youtube/v3/channels')
    channelsUrl.searchParams.set('part', 'snippet')
    channelsUrl.searchParams.set('mine', 'true')
    const channelsData = await readJson(
      await fetch(channelsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    )
    const channels = Array.isArray(channelsData.items) ? channelsData.items : []
    const channel = channels[0] as
      | { id?: string; snippet?: { title?: string } }
      | undefined

    if (!channel?.id) {
      return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=no_youtube_channel`)
    }

    await saveYouTubeConnection({
      accessToken,
      accountId: channel.id,
      accountName: channel.snippet?.title || 'YouTube Channel',
      refreshToken,
      sessionId,
      userId,
    })

    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?connected=youtube`)
  } catch (err) {
    console.error('[youtube/callback] error:', err)
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=youtube_auth_failed`)
  }
}
