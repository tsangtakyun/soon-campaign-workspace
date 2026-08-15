import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { assertWorkspaceAccess, isUuid } from '@/lib/oauth-connections'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

type MetaReviewAction = 'all' | 'insights' | 'profile' | 'publish'

type SocialConnection = {
  account_id: string | null
  account_name: string | null
  access_token: string | null
  page_id: string | null
  page_access_token: string | null
  platform: string
  workspace_id: string | null
}

type CampaignPost = {
  body: string | null
  image_url: string | null
  title: string | null
}

const GRAPH_VERSION = 'v18.0'

function allowedReviewEmails() {
  return (process.env.META_REVIEW_TEST_EMAILS || 'tsangtakyun@gmail.com')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function absoluteUrl(value: string, origin: string) {
  if (/^https?:\/\//i.test(value)) return value
  return new URL(value, origin).toString()
}

function errorMessage(value: unknown) {
  if (value instanceof Error) return value.message
  return typeof value === 'string' ? value : JSON.stringify(value)
}

async function readGraphJson(response: Response, label: string) {
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const graphError =
      json && typeof json === 'object' && 'error' in json
        ? (json as { error?: { message?: unknown } | string }).error
        : undefined
    const message =
      graphError && typeof graphError === 'object' && typeof graphError.message === 'string'
        ? graphError.message
        : typeof graphError === 'string'
          ? graphError
          : JSON.stringify(json)
    throw new Error(`${label}: ${message}`)
  }
  return json as Record<string, unknown>
}

function connectionTokens(connection: SocialConnection) {
  return [
    { label: 'user_access_token', token: connection.access_token },
    { label: 'page_access_token', token: connection.page_access_token },
  ].filter((item, index, items) => item.token && items.findIndex((candidate) => candidate.token === item.token) === index) as {
    label: string
    token: string
  }[]
}

function instagramGraphOrigin(connection: SocialConnection) {
  return connection.page_id ? 'https://graph.facebook.com' : 'https://graph.instagram.com'
}

async function withConnectionToken<T>(
  connection: SocialConnection,
  label: string,
  callback: (token: string, tokenLabel: string) => Promise<T>
) {
  const tokens = connectionTokens(connection)
  if (!connection.account_id || !tokens.length) {
    throw new Error('Instagram connection is missing account id or access token.')
  }

  const errors: string[] = []
  for (const { label: tokenLabel, token } of tokens) {
    try {
      return {
        result: await callback(token, tokenLabel),
        tokenSource: tokenLabel,
      }
    } catch (error) {
      errors.push(`${tokenLabel}: ${errorMessage(error)}`)
    }
  }

  throw new Error(`${label} failed. ${errors.join(' | ')}`)
}

async function graphGet(
  connection: SocialConnection,
  path: string,
  token: string,
  searchParams?: Record<string, string>
) {
  const url = new URL(`${instagramGraphOrigin(connection)}/${GRAPH_VERSION}/${path}`)
  url.searchParams.set('access_token', token)
  Object.entries(searchParams || {}).forEach(([key, value]) => url.searchParams.set(key, value))
  return readGraphJson(await fetch(url.toString(), { cache: 'no-store' }), `GET /${path}`)
}

async function graphPost(
  connection: SocialConnection,
  path: string,
  body: Record<string, string>,
  token: string
) {
  return readGraphJson(
    await fetch(`${instagramGraphOrigin(connection)}/${GRAPH_VERSION}/${path}`, {
      body: new URLSearchParams({ ...body, access_token: token }),
      method: 'POST',
    }),
    `POST /${path}`
  )
}

async function runProfileTest(connection: SocialConnection) {
  return withConnectionToken(connection, 'Profile test', (token) => {
    return graphGet(connection, connection.account_id as string, token, {
      fields: 'id,user_id,username,account_type,profile_picture_url,followers_count,media_count',
    })
  })
}

async function runInsightsTest(connection: SocialConnection) {
  return withConnectionToken(connection, 'Insights test', async (token) => {
    const attempts = [
      { metric: 'reach,profile_views', period: 'day' },
      { metric: 'impressions,reach,profile_views', period: 'day' },
      { metric: 'reach', period: 'day' },
    ]
    const errors: string[] = []

    for (const params of attempts) {
      try {
        return await graphGet(connection, `${connection.account_id}/insights`, token, params)
      } catch (error) {
        errors.push(errorMessage(error))
      }
    }

    throw new Error(errors.join(' | '))
  })
}

async function latestImagePost(workspaceId: string) {
  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('campaign_posts')
    .select('title,body,image_url')
    .eq('workspace_id', workspaceId)
    .not('image_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data || null) as CampaignPost | null
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function runPublishTest(input: {
  caption: string
  connection: SocialConnection
  imageUrl: string
}) {
  return withConnectionToken(input.connection, 'Publish test', async (token) => {
    const container = await graphPost(
      input.connection,
      `${input.connection.account_id}/media`,
      {
        caption: input.caption,
        image_url: input.imageUrl,
      },
      token
    )
    const creationId = typeof container.id === 'string' ? container.id : ''
    if (!creationId) throw new Error('Instagram media container did not return an id.')

    await wait(2500)

    const containerStatus = await graphGet(input.connection, creationId, token, {
      fields: 'id,status,status_code',
    }).catch((error) => ({ warning: errorMessage(error) }))

    const published = await graphPost(
      input.connection,
      `${input.connection.account_id}/media_publish`,
      { creation_id: creationId },
      token
    )

    return {
      container,
      containerStatus,
      published,
    }
  })
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url)
  const workspaceId = requestUrl.searchParams.get('workspaceId') || ''

  if (!isUuid(workspaceId)) {
    return NextResponse.json({ error: 'Invalid workspaceId' }, { status: 400 })
  }

  try {
    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.email?.toLowerCase() || ''
    if (!allowedReviewEmails().includes(email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await assertWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })

    const supabase = createAdminSupabase()
    const [{ data: connection }, post] = await Promise.all([
      supabase
        .from('social_connections')
        .select('platform,workspace_id,account_id,account_name,access_token,page_access_token,page_id')
        .eq('workspace_id', workspaceId)
        .eq('platform', 'instagram')
        .maybeSingle(),
      latestImagePost(workspaceId),
    ])

    return NextResponse.json({
      connection: connection
        ? {
            account_id: connection.account_id,
            account_name: connection.account_name,
            has_access_token: Boolean(connection.access_token),
            has_page_access_token: Boolean(connection.page_access_token),
            login_type: connection.page_id ? 'facebook_login' : 'instagram_login',
            platform: connection.platform,
          }
        : null,
      latestImagePost: post,
    })
  } catch (error) {
    console.error('[meta-review-test] GET failed', error)
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: MetaReviewAction
      caption?: string
      imageUrl?: string
      workspaceId?: string
    }
    const workspaceId = body.workspaceId || ''
    const action = body.action || 'all'

    if (!isUuid(workspaceId)) {
      return NextResponse.json({ error: 'Invalid workspaceId' }, { status: 400 })
    }
    if (!['all', 'insights', 'profile', 'publish'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.email?.toLowerCase() || ''
    if (!allowedReviewEmails().includes(email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await assertWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })

    const supabase = createAdminSupabase()
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('platform,workspace_id,account_id,account_name,access_token,page_access_token,page_id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'instagram')
      .maybeSingle()

    if (connectionError) throw connectionError
    if (!connection) {
      return NextResponse.json({ error: 'No Instagram connection for this workspace.' }, { status: 404 })
    }

    const typedConnection = connection as SocialConnection
    const results: Record<string, unknown> = {}

    if (action === 'all' || action === 'profile') {
      results.profile = await runProfileTest(typedConnection)
    }

    if (action === 'all' || action === 'insights') {
      results.insights = await runInsightsTest(typedConnection)
    }

    if (action === 'all' || action === 'publish') {
      const latestPost = await latestImagePost(workspaceId)
      const rawImageUrl = body.imageUrl?.trim() || latestPost?.image_url || ''
      if (!rawImageUrl) {
        return NextResponse.json(
          { error: 'Publish test needs a public HTTPS image URL.' },
          { status: 400 }
        )
      }

      const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
      const imageUrl = absoluteUrl(rawImageUrl, origin)
      const caption =
        body.caption?.trim() ||
        `SOON Meta Review Test\n\n${latestPost?.title || 'Internal publishing test'}\n${new Date().toISOString()}`

      results.publish = await runPublishTest({
        caption,
        connection: typedConnection,
        imageUrl,
      })
    }

    return NextResponse.json({
      action,
      account: {
        id: typedConnection.account_id,
        name: typedConnection.account_name,
      },
      ok: true,
      results,
      testedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[meta-review-test] POST failed', error)
    return NextResponse.json({ error: errorMessage(error), ok: false }, { status: 500 })
  }
}
