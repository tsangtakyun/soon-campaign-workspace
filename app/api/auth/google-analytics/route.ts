import { NextResponse } from 'next/server'

import { appUrl, isUuid } from '@/lib/oauth-connections'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    return NextResponse.redirect(`${appUrl(req)}/onboarding/integrations?error=google_analytics_auth_failed`)
  }

  if (!isUuid(workspaceId)) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }

  const redirectUri = `${appUrl(req)}/api/auth/google-analytics/callback`
  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')

  oauthUrl.searchParams.set('client_id', clientId)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/analytics.readonly')
  oauthUrl.searchParams.set('state', workspaceId || '')
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('access_type', 'offline')
  oauthUrl.searchParams.set('prompt', 'consent')

  return NextResponse.redirect(oauthUrl.toString())
}
