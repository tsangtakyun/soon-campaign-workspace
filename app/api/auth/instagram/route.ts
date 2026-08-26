import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { requireWorkspaceUser } from '@/lib/platform-access'

function instagramRedirectUri(req: Request) {
  return new URL('/api/auth/callback/instagram', new URL(req.url).origin).toString()
}

function encodeState(workspaceId: string, redirectUri: string) {
  return Buffer.from(JSON.stringify({ redirectUri, workspaceId }), 'utf8').toString('base64url')
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID

  if (!appId) {
    return NextResponse.json({ error: 'Missing Instagram OAuth app id' }, { status: 500 })
  }

  if (!isUuid(workspaceId)) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }
  const auth = await requireWorkspaceUser(workspaceId, 'canManageWorkspace')
  if (auth.error) return auth.error

  const redirectUri = instagramRedirectUri(req)
  const scope = [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_insights',
    'instagram_business_manage_comments',
  ].join(',')
  const oauthUrl = new URL('https://www.instagram.com/oauth/authorize')

  oauthUrl.searchParams.set('client_id', appId)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('scope', scope)
  oauthUrl.searchParams.set('state', encodeState(workspaceId, redirectUri))
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('enable_fb_login', '0')
  oauthUrl.searchParams.set('force_authentication', '1')

  return NextResponse.redirect(oauthUrl.toString())
}
