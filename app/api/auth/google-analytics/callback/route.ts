import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  appUrl,
  assertWorkspaceAccess,
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
    console.error('[google-analytics/callback] OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=google_analytics_auth_failed`)
  }

  if (!isUuid(workspaceId)) {
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=missing_workspace`)
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Missing Google OAuth environment variables')
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
      workspaceId: workspaceId || '',
    })

    const redirectUri = `${baseUrl}/api/auth/google-analytics/callback`
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
    if (!accessToken) throw new Error(`No Google Analytics access token: ${JSON.stringify(tokenData)}`)

    const accountsData = await readJson(
      await fetch('https://analyticsadmin.googleapis.com/v1beta/accounts', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    )
    const accounts = Array.isArray(accountsData.accounts) ? accountsData.accounts : []
    const account = accounts[0] as { displayName?: string; name?: string } | undefined

    if (!account?.name) {
      return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=no_google_analytics_account`)
    }

    await saveWorkspaceSocialConnection({
      access_token: accessToken,
      account_id: account.name,
      account_name: account.displayName || account.name,
      platform: 'google-analytics',
      refresh_token: refreshToken,
      token_expires_at: null,
      user_id: user.id,
      workspace_id: workspaceId || '',
    })

    return NextResponse.redirect(
      `${baseUrl}/onboarding/integrations?connected=google-analytics&workspaceId=${encodeURIComponent(workspaceId)}`
    )
  } catch (err) {
    console.error('[google-analytics/callback] error:', err)
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=google_analytics_auth_failed`)
  }
}
