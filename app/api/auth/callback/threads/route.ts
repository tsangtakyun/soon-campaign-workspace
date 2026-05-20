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

async function readJson(res: Response) {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(JSON.stringify(json))
  }
  return json as Record<string, unknown>
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const workspaceId = requestUrl.searchParams.get('state')
  const error = requestUrl.searchParams.get('error')
  const baseUrl = appUrl(req)

  if (error || !code) {
    console.error('[threads/callback] OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=threads_auth_failed`)
  }

  if (!isUuid(workspaceId)) {
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=missing_workspace`)
  }

  try {
    const appId = process.env.THREADS_APP_ID
    const appSecret = process.env.THREADS_APP_SECRET

    if (!appId || !appSecret) {
      throw new Error('Missing Threads OAuth environment variables')
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

    const redirectUri = `${baseUrl}/api/auth/callback/threads`
    const tokenData = await readJson(
      await fetch('https://graph.threads.net/oauth/access_token', {
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
        method: 'POST',
      })
    )
    const accessToken = typeof tokenData.access_token === 'string' ? tokenData.access_token : ''
    if (!accessToken) throw new Error(`No Threads access token: ${JSON.stringify(tokenData)}`)

    const profileUrl = new URL('https://graph.threads.net/v1.0/me')
    profileUrl.searchParams.set('fields', 'id,username,name,threads_profile_picture_url')
    profileUrl.searchParams.set('access_token', accessToken)
    const profileData = await readJson(await fetch(profileUrl.toString()))
    const accountId = typeof profileData.id === 'string' ? profileData.id : ''
    const accountName =
      typeof profileData.username === 'string'
        ? profileData.username
        : typeof profileData.name === 'string'
          ? profileData.name
          : 'Threads'

    if (!accountId) throw new Error(`No Threads profile id: ${JSON.stringify(profileData)}`)

    await saveWorkspaceSocialConnection({
      access_token: accessToken,
      account_id: accountId,
      account_name: accountName,
      platform: 'threads',
      token_expires_at: expiresAtFromSeconds(tokenData.expires_in),
      user_id: user.id,
      workspace_id: workspaceId,
    })

    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?connected=threads`)
  } catch (err) {
    console.error('[threads/callback] error:', err)
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=threads_auth_failed`)
  }
}
