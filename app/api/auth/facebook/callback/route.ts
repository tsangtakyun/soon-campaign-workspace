// Reminder: FACEBOOK_APP_SECRET must be set in .env.local and Vercel environment variables.
// Redirect URI in Meta must match: https://soon-campaign-workspace.vercel.app/api/auth/facebook/callback

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

type FacebookPage = {
  access_token?: string
  id?: string
  instagram_business_account?: { id?: string }
  name?: string
}

function appUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
}

function normalizeSessionId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value)
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

async function saveFacebookConnection({
  accountId,
  accountName,
  accessToken,
  pageId,
  sessionId,
  userId,
}: {
  accountId: string
  accountName: string
  accessToken: string
  pageId: string
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
    page_access_token: accessToken,
    page_id: pageId,
    platform: 'facebook',
    user_id: userId,
  }
  const onConflict = userId ? 'user_id,platform' : 'onboarding_session_id,platform'
  const { error } = await supabase.from('social_connections').upsert(connection, { onConflict })
  if (!error) return

  console.warn('[facebook-page/callback] connection upsert failed, falling back:', error.message)

  let lookup = supabase.from('social_connections').select('id').eq('platform', 'facebook').limit(1)
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
    console.error('[facebook-page/callback] OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=facebook_auth_failed`)
  }

  let sessionId = ''
  try {
    const state = JSON.parse(stateRaw || '{}') as { sessionId?: string }
    sessionId = normalizeSessionId(state.sessionId || '')
  } catch {
    sessionId = ''
  }

  try {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    const appSecret = process.env.FACEBOOK_APP_SECRET

    if (!appId || !appSecret) {
      throw new Error('Missing Facebook OAuth environment variables')
    }

    const redirectUri = `${baseUrl}/api/auth/facebook/callback`
    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()
    const userId = user?.id || null

    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', appId)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenData = await readJson(await fetch(tokenUrl.toString()))
    const shortToken = typeof tokenData.access_token === 'string' ? tokenData.access_token : ''
    if (!shortToken) throw new Error(`No Facebook access token: ${JSON.stringify(tokenData)}`)

    const longTokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    longTokenUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longTokenUrl.searchParams.set('client_id', appId)
    longTokenUrl.searchParams.set('client_secret', appSecret)
    longTokenUrl.searchParams.set('fb_exchange_token', shortToken)

    const longTokenData = await readJson(await fetch(longTokenUrl.toString()))
    const longToken =
      typeof longTokenData.access_token === 'string' ? longTokenData.access_token : shortToken

    const pagesUrl = new URL('https://graph.facebook.com/v18.0/me/accounts')
    pagesUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account')
    pagesUrl.searchParams.set('access_token', longToken)

    const pagesData = await readJson(await fetch(pagesUrl.toString()))
    const pages = Array.isArray(pagesData.data) ? (pagesData.data as FacebookPage[]) : []

    if (!pages.length) {
      return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=no_pages`)
    }

    const pageWithInstagram = pages.find(
      (page) => page.id && page.access_token && page.instagram_business_account?.id
    )
    const fallbackPage = pages.find((page) => page.id && page.access_token)
    const page = pageWithInstagram || fallbackPage

    if (!page?.id || !page.access_token) {
      return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=no_pages`)
    }

    await saveFacebookConnection({
      accessToken: page.access_token,
      accountId: page.id,
      accountName: page.name || 'Facebook Page',
      pageId: page.id,
      sessionId,
      userId,
    })

    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?connected=facebook`)
  } catch (err) {
    console.error('[facebook-page/callback] error:', err)
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=facebook_auth_failed`)
  }
}
