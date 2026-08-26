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

type FacebookPage = {
  access_token?: string
  id?: string
  instagram_business_account?: {
    id?: string
    profile_picture_url?: string
    username?: string
  }
  name?: string
}

async function readJson(res: Response) {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(JSON.stringify(json))
  }
  return json as Record<string, unknown>
}

function parseState(state: string | null) {
  if (state?.startsWith('facebook:')) {
    return { platform: 'facebook', workspaceId: state.replace(/^facebook:/, '') }
  }

  if (isUuid(state)) {
    return { platform: 'instagram', workspaceId: state || '' }
  }

  try {
    const parsed = JSON.parse(state || '{}') as { platform?: string; workspaceId?: string }
    return {
      platform: parsed.platform === 'facebook' ? 'facebook' : 'instagram',
      workspaceId: parsed.workspaceId || '',
    }
  } catch {
    return { platform: 'instagram', workspaceId: '' }
  }
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const { platform, workspaceId } = parseState(requestUrl.searchParams.get('state'))
  const baseUrl = appUrl(req)

  if (error || !code) {
    console.error('[facebook/callback] OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=oauth_failed`)
  }

  if (!isUuid(workspaceId)) {
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=missing_workspace`)
  }

  try {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    const appSecret = process.env.FACEBOOK_APP_SECRET

    if (!appId || !appSecret) {
      throw new Error('Missing Facebook OAuth environment variables')
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
      requireManagement: true,
      userId: user.id,
      workspaceId,
    })

    const redirectUri = `${baseUrl}/api/auth/callback/facebook`
    const graphVersion = process.env.META_GRAPH_VERSION || 'v23.0'
    const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id', appId)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenData = await readJson(await fetch(tokenUrl.toString()))
    const shortToken = typeof tokenData.access_token === 'string' ? tokenData.access_token : ''
    if (!shortToken) throw new Error(`No Facebook access token: ${JSON.stringify(tokenData)}`)

    const longTokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`)
    longTokenUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longTokenUrl.searchParams.set('client_id', appId)
    longTokenUrl.searchParams.set('client_secret', appSecret)
    longTokenUrl.searchParams.set('fb_exchange_token', shortToken)

    const longTokenData = await readJson(await fetch(longTokenUrl.toString()))
    const longToken =
      typeof longTokenData.access_token === 'string' ? longTokenData.access_token : shortToken
    const expiresAt = expiresAtFromSeconds(longTokenData.expires_in)

    const pagesUrl = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`)
    pagesUrl.searchParams.set(
      'fields',
      'id,name,access_token,instagram_business_account{id,username,profile_picture_url}'
    )
    pagesUrl.searchParams.set('access_token', longToken)
    const pagesData = await readJson(await fetch(pagesUrl.toString()))
    const pages = Array.isArray(pagesData.data) ? (pagesData.data as FacebookPage[]) : []

    if (!pages.length) {
      return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=no_pages`)
    }

    if (platform === 'facebook') {
      const page = pages.find((item) => item.id && item.access_token) || pages[0]
      if (!page.id || !page.access_token) {
        throw new Error('Facebook Page missing id or access token')
      }

      await saveWorkspaceSocialConnection({
        access_token: longToken,
        account_id: page.id,
        account_name: page.name || 'Facebook Page',
        page_access_token: page.access_token,
        page_id: page.id,
        platform: 'facebook',
        token_expires_at: expiresAt,
        user_id: user.id,
        workspace_id: workspaceId,
      })

      return NextResponse.redirect(
        `${baseUrl}/onboarding/integrations?connected=facebook&workspaceId=${encodeURIComponent(workspaceId)}`
      )
    }

    const pageWithInstagram = pages.find(
      (item) => item.id && item.access_token && item.instagram_business_account?.id
    )

    if (!pageWithInstagram?.id || !pageWithInstagram.access_token) {
      return NextResponse.redirect(
        `${baseUrl}/onboarding/integrations?warning=no_instagram_business`
      )
    }

    const instagramAccount = pageWithInstagram.instagram_business_account
    const accountId = instagramAccount?.id || ''
    const accountName = instagramAccount?.username || pageWithInstagram.name || 'Instagram'

    await saveWorkspaceSocialConnection({
      access_token: longToken,
      account_id: accountId,
      account_name: accountName,
      page_access_token: pageWithInstagram.access_token,
      page_id: pageWithInstagram.id,
      platform: 'instagram',
      token_expires_at: expiresAt,
      user_id: user.id,
      workspace_id: workspaceId,
    })

    return NextResponse.redirect(
      `${baseUrl}/onboarding/integrations?connected=instagram&workspaceId=${encodeURIComponent(workspaceId)}`
    )
  } catch (err) {
    console.error('[facebook/callback] error:', err)
    return NextResponse.redirect(`${baseUrl}/onboarding/integrations?error=callback_failed`)
  }
}
