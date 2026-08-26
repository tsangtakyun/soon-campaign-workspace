// Reminder: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local and Vercel,
// and YouTube Data API v3 must be enabled in Google Cloud Console.

import { NextResponse } from 'next/server'
import { requireWorkspaceUser } from '@/lib/platform-access'

function appUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
}

function normalizeSessionId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : crypto.randomUUID()
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionId = normalizeSessionId(searchParams.get('sessionId') || '')
  const workspaceId = searchParams.get('workspaceId') || ''
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    return NextResponse.redirect(`${appUrl(req)}/onboarding/integrations?error=youtube_auth_failed`)
  }
  const auth = await requireWorkspaceUser(workspaceId, 'canManageWorkspace')
  if (auth.error) return auth.error

  const redirectUri = `${appUrl(req)}/api/auth/youtube/callback`
  const state = JSON.stringify({ platform: 'youtube', sessionId, workspaceId })
  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')

  oauthUrl.searchParams.set('client_id', clientId)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set(
    'scope',
    [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ].join(' ')
  )
  oauthUrl.searchParams.set('state', state)
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('access_type', 'offline')
  oauthUrl.searchParams.set('prompt', 'consent')

  return NextResponse.redirect(oauthUrl.toString())
}
