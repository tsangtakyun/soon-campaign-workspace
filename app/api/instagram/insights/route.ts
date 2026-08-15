import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { assertWorkspaceAccess, isUuid } from '@/lib/oauth-connections'
import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

type SocialConnection = {
  account_id: string | null
  account_name: string | null
  access_token: string | null
  page_access_token: string | null
  page_id: string | null
}

const GRAPH_VERSION = 'v18.0'

function graphOrigin(connection: SocialConnection) {
  return connection.page_id ? 'https://graph.facebook.com' : 'https://graph.instagram.com'
}

function connectionTokens(connection: SocialConnection) {
  return [
    { label: 'user_access_token', token: connection.access_token },
    { label: 'page_access_token', token: connection.page_access_token },
  ].filter((item, index, items) => {
    return item.token && items.findIndex((candidate) => candidate.token === item.token) === index
  }) as { label: string; token: string }[]
}

function metricValue(value: unknown) {
  if (!Array.isArray(value)) return 0
  return value.reduce((sum, item) => {
    if (!item || typeof item !== 'object') return sum
    const candidate = (item as { value?: unknown }).value
    return sum + (typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0)
  }, 0)
}

async function graphGet(connection: SocialConnection, path: string, token: string, params: Record<string, string>) {
  const url = new URL(`${graphOrigin(connection)}/${GRAPH_VERSION}/${path}`)
  url.searchParams.set('access_token', token)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))

  const response = await fetch(url.toString(), { cache: 'no-store' })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof json?.error?.message === 'string'
        ? json.error.message
        : typeof json?.error === 'string'
          ? json.error
          : JSON.stringify(json)
    throw new Error(message)
  }
  return json as Record<string, unknown>
}

async function withToken(connection: SocialConnection, callback: (token: string, tokenLabel: string) => Promise<Record<string, unknown>>) {
  const errors: string[] = []

  for (const { label, token } of connectionTokens(connection)) {
    try {
      return {
        data: await callback(token, label),
        tokenSource: label,
      }
    } catch (error) {
      errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  throw new Error(errors.join(' | ') || 'No usable Instagram token')
}

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url)
    const workspaceId = requestUrl.searchParams.get('workspace_id')?.trim() || ''

    if (!isUuid(workspaceId)) {
      return NextResponse.json({ error: 'Invalid workspace_id' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })

    const supabase = createAdminSupabase()
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('account_id,account_name,access_token,page_access_token,page_id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'instagram')
      .maybeSingle()

    if (connectionError) throw connectionError
    if (!connection?.account_id) {
      return NextResponse.json({ error: 'Instagram is not connected' }, { status: 404 })
    }

    const typedConnection = connection as SocialConnection
    const profileResult = await withToken(typedConnection, (token) =>
      graphGet(typedConnection, typedConnection.account_id as string, token, {
        fields: 'id,user_id,username,account_type,followers_count,media_count,profile_picture_url',
      })
    )

    const insightResult = await withToken(typedConnection, async (token) => {
      const attempts = [
        { metric: 'reach,profile_views', period: 'day' },
        { metric: 'impressions,reach,profile_views', period: 'day' },
        { metric: 'reach', period: 'day' },
      ]
      const errors: string[] = []

      for (const params of attempts) {
        try {
          return await graphGet(typedConnection, `${typedConnection.account_id}/insights`, token, params)
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error))
        }
      }

      throw new Error(errors.join(' | '))
    })

    const insightRows = Array.isArray(insightResult.data.data) ? insightResult.data.data : []
    const metrics = insightRows.reduce<Record<string, number>>((acc, row) => {
      if (!row || typeof row !== 'object') return acc
      const name = (row as { name?: unknown }).name
      if (typeof name !== 'string') return acc
      acc[name] = metricValue((row as { values?: unknown }).values)
      return acc
    }, {})

    return NextResponse.json({
      account: {
        id: typedConnection.account_id,
        login_type: typedConnection.page_id ? 'facebook_login' : 'instagram_login',
        name: typedConnection.account_name,
        profile: profileResult.data,
      },
      metrics,
      ok: true,
      token_source: insightResult.tokenSource,
      updated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[instagram/insights] failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load Instagram insights', ok: false },
      { status: 500 }
    )
  }
}
