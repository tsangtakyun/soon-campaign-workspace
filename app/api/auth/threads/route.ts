import { NextResponse } from 'next/server'

import { appUrl, isUuid } from '@/lib/oauth-connections'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  const appId = process.env.THREADS_APP_ID

  if (!appId) {
    return NextResponse.json({ error: 'Missing THREADS_APP_ID' }, { status: 500 })
  }

  if (!isUuid(workspaceId)) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }

  const redirectUri = `${appUrl(req)}/api/auth/callback/threads`
  const scope = ['threads_basic', 'threads_content_publish'].join(',')
  const oauthUrl = new URL('https://threads.net/oauth/authorize')

  oauthUrl.searchParams.set('client_id', appId)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('scope', scope)
  oauthUrl.searchParams.set('state', workspaceId)
  oauthUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(oauthUrl.toString())
}
