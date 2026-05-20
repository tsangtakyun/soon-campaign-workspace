import { NextResponse } from 'next/server'

import { appUrl, isUuid } from '@/lib/oauth-connections'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID

  if (!appId) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_FACEBOOK_APP_ID' }, { status: 500 })
  }

  if (!isUuid(workspaceId)) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }

  const redirectUri = `${appUrl(req)}/api/auth/callback/facebook`
  const scope = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
  ].join(',')
  const oauthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')

  oauthUrl.searchParams.set('client_id', appId)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('scope', scope)
  oauthUrl.searchParams.set('state', `facebook:${workspaceId}`)
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('auth_type', 'rerequest')
  oauthUrl.searchParams.set('enable_profile_selector', 'true')

  return NextResponse.redirect(oauthUrl.toString())
}
