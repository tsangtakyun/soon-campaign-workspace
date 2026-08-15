import crypto from 'node:crypto'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  appUrl,
  assertWorkspaceAccess,
  expiresAtFromSeconds,
  isUuid,
  saveWorkspaceSocialConnection,
} from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'

type InstagramTokenResponse = {
  access_token?: string
  expires_in?: number
  user_id?: number | string
}

async function readJson(res: Response) {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(JSON.stringify(json))
  }
  return json as Record<string, unknown>
}

function instagramAppId() {
  return process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || ''
}

function instagramAppSecret() {
  return process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET || ''
}

function shortHash(value: string) {
  return value ? crypto.createHash('sha256').update(value).digest('hex').slice(0, 12) : ''
}

function instagramRedirectUri(req: Request) {
  return new URL('/api/auth/callback/instagram', new URL(req.url).origin).toString()
}

function parseState(state: string) {
  if (isUuid(state)) return { redirectUri: '', workspaceId: state }

  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
      redirectUri?: unknown
      workspaceId?: unknown
    }

    return {
      redirectUri: typeof parsed.redirectUri === 'string' ? parsed.redirectUri : '',
      workspaceId: typeof parsed.workspaceId === 'string' ? parsed.workspaceId : '',
    }
  } catch {
    return { redirectUri: '', workspaceId: '' }
  }
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const state = parseState(requestUrl.searchParams.get('state') || '')
  const workspaceId = state.workspaceId
  const baseUrl = appUrl(req)

  if (error || !code) {
    console.error('[instagram/callback] OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=oauth_failed`)
  }

  if (!isUuid(workspaceId)) {
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=missing_workspace`)
  }

  try {
    const appId = instagramAppId()
    const appSecret = instagramAppSecret()

    if (!appId || !appSecret) {
      throw new Error('Missing Instagram OAuth environment variables')
    }

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=auth_required`)
    }

    await assertWorkspaceAccess({
      email: user.email,
      userId: user.id,
      workspaceId,
    })

    const redirectUri = state.redirectUri || instagramRedirectUri(req)
    console.info('[instagram/callback] token exchange', {
      appId,
      redirectUri,
      secretHash: shortHash(appSecret),
      stateRedirectUri: state.redirectUri,
    })
    const shortTokenData = (await readJson(
      await fetch('https://api.instagram.com/oauth/access_token', {
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
        method: 'POST',
      })
    )) as InstagramTokenResponse

    const shortToken = typeof shortTokenData.access_token === 'string' ? shortTokenData.access_token : ''
    if (!shortToken) throw new Error(`No Instagram access token: ${JSON.stringify(shortTokenData)}`)

    const longTokenUrl = new URL('https://graph.instagram.com/access_token')
    longTokenUrl.searchParams.set('grant_type', 'ig_exchange_token')
    longTokenUrl.searchParams.set('client_secret', appSecret)
    longTokenUrl.searchParams.set('access_token', shortToken)

    const longTokenData = (await readJson(await fetch(longTokenUrl.toString()))) as InstagramTokenResponse
    const accessToken =
      typeof longTokenData.access_token === 'string' ? longTokenData.access_token : shortToken
    const expiresAt = expiresAtFromSeconds(longTokenData.expires_in)

    const profileUrl = new URL('https://graph.instagram.com/v18.0/me')
    profileUrl.searchParams.set(
      'fields',
      'id,user_id,username,account_type,profile_picture_url,followers_count,media_count'
    )
    profileUrl.searchParams.set('access_token', accessToken)

    const profile = await readJson(await fetch(profileUrl.toString()))
    const accountId =
      typeof profile.id === 'string'
        ? profile.id
        : typeof profile.user_id === 'string'
          ? profile.user_id
          : typeof shortTokenData.user_id === 'number'
            ? String(shortTokenData.user_id)
            : typeof shortTokenData.user_id === 'string'
              ? shortTokenData.user_id
              : ''

    if (!accountId) throw new Error(`No Instagram account id: ${JSON.stringify(profile)}`)

    const accountName = typeof profile.username === 'string' ? profile.username : 'Instagram'

    await saveWorkspaceSocialConnection({
      access_token: accessToken,
      account_id: accountId,
      account_name: accountName,
      page_access_token: null,
      page_id: null,
      platform: 'instagram',
      token_expires_at: expiresAt,
      user_id: user.id,
      workspace_id: workspaceId,
    })

    return NextResponse.redirect(
      `${baseUrl}/onboarding/integrations?connected=instagram&workspaceId=${encodeURIComponent(workspaceId)}`
    )
  } catch (err) {
    console.error('[instagram/callback] error:', err)
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=callback_failed`)
  }
}
