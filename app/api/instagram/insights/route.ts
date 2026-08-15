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
const MEDIA_FIELDS = 'id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count'

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

function rowMetricValue(row: Record<string, unknown>) {
  const totalValue = row.total_value
  if (totalValue && typeof totalValue === 'object' && !Array.isArray(totalValue)) {
    const value = (totalValue as { value?: unknown }).value
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }

  return metricValue(row.values)
}

function followMetricValue(row: Record<string, unknown>) {
  const totalValue = row.total_value
  if (!totalValue || typeof totalValue !== 'object' || Array.isArray(totalValue)) {
    return rowMetricValue(row)
  }

  const breakdowns = (totalValue as { breakdowns?: unknown }).breakdowns
  if (!Array.isArray(breakdowns)) return rowMetricValue(row)

  for (const breakdown of breakdowns) {
    if (!breakdown || typeof breakdown !== 'object') continue
    const results = (breakdown as { results?: unknown }).results
    if (!Array.isArray(results)) continue

    const followResult = results.find((item) => {
      if (!item || typeof item !== 'object') return false
      const dimensionValues = (item as { dimension_values?: unknown }).dimension_values
      return Array.isArray(dimensionValues)
        ? dimensionValues.some((value) => String(value).toLowerCase().includes('follow'))
        : false
    })

    if (followResult && typeof (followResult as { value?: unknown }).value === 'number') {
      return (followResult as { value: number }).value
    }
  }

  return rowMetricValue(row)
}

function numericField(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
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

async function fetchAccountInsightMetrics(connection: SocialConnection) {
  const now = new Date()
  const since = new Date(now)
  since.setDate(since.getDate() - 29)
  since.setHours(0, 0, 0, 0)

  const baseParams = {
    since: String(Math.floor(since.getTime() / 1000)),
    until: String(Math.floor(now.getTime() / 1000)),
  }
  const metrics: Record<string, number> = {}
  const tokenSources: string[] = []
  const errors: string[] = []

  const attempts = [
    { key: 'basic', metric: 'reach,profile_views,follower_count', period: 'day' },
    { key: 'views', metric: 'views', metric_type: 'total_value', period: 'day' },
    { key: 'follows_and_unfollows', metric: 'follows_and_unfollows', metric_type: 'total_value', period: 'day' },
    { key: 'fallback_impressions', metric: 'impressions,reach,profile_views,follower_count', period: 'day' },
  ]

  for (const attempt of attempts) {
    try {
      const result = await withToken(connection, (token) =>
        graphGet(connection, `${connection.account_id}/insights`, token, {
          ...baseParams,
          metric: attempt.metric,
          ...(attempt.metric_type ? { metric_type: attempt.metric_type } : {}),
          period: attempt.period,
        })
      )
      tokenSources.push(result.tokenSource)

      const rows = Array.isArray(result.data.data) ? result.data.data : []
      rows.forEach((row) => {
        if (!row || typeof row !== 'object') return
        const typedRow = row as Record<string, unknown>
        const name = typedRow.name
        if (typeof name !== 'string') return
        metrics[name] = name === 'follows_and_unfollows' ? followMetricValue(typedRow) : rowMetricValue(typedRow)
      })
    } catch (error) {
      errors.push(`${attempt.key}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (!Object.keys(metrics).length) throw new Error(errors.join(' | '))

  if (!metrics.views && metrics.impressions) metrics.views = metrics.impressions
  if (!metrics.follower_count && metrics.follows_and_unfollows) {
    metrics.follower_count = metrics.follows_and_unfollows
  }

  return {
    metrics,
    tokenSource: tokenSources[0] || null,
  }
}

async function fetchMediaInsights(connection: SocialConnection, mediaId: string, token: string) {
  const attempts = [
    { metric: 'views,reach,saved,shares,total_interactions' },
    { metric: 'impressions,reach,saved,engagement' },
    { metric: 'saved' },
  ]
  const errors: string[] = []

  for (const params of attempts) {
    try {
      const data = await graphGet(connection, `${mediaId}/insights`, token, params)
      const rows = Array.isArray(data.data) ? data.data : []
      return rows.reduce<Record<string, number>>((acc, row) => {
        if (!row || typeof row !== 'object') return acc
        const name = (row as { name?: unknown }).name
        if (typeof name !== 'string') return acc
        acc[name] = metricValue((row as { values?: unknown }).values)
        return acc
      }, {})
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  console.warn('[instagram/insights] media insight failed', { errors, mediaId })
  return {}
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

    const insightResult = await fetchAccountInsightMetrics(typedConnection)
    const metrics = insightResult.metrics

    const mediaResult = await withToken(typedConnection, (token) =>
      graphGet(typedConnection, `${typedConnection.account_id}/media`, token, {
        fields: MEDIA_FIELDS,
        limit: '25',
      })
    ).catch((error) => {
      console.warn('[instagram/insights] media list failed', error)
      return null
    })
    const mediaRows = mediaResult?.data && Array.isArray(mediaResult.data.data) ? mediaResult.data.data : []
    const mediaToken = mediaResult?.tokenSource
      ? connectionTokens(typedConnection).find((item) => item.label === mediaResult.tokenSource)?.token
      : null
    const media = await Promise.all(
      mediaRows
        .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object' && !Array.isArray(row)))
        .map(async (row) => {
          const id = typeof row.id === 'string' ? row.id : ''
          const postMetrics = id && mediaToken ? await fetchMediaInsights(typedConnection, id, mediaToken) : {}
          const views = postMetrics.views || postMetrics.impressions || postMetrics.reach || 0
          const saves = postMetrics.saved || postMetrics.saves || 0
          const shares = postMetrics.shares || 0

          return {
            caption: typeof row.caption === 'string' ? row.caption : '',
            comments: numericField(row.comments_count),
            id,
            image: typeof row.thumbnail_url === 'string'
              ? row.thumbnail_url
              : typeof row.media_url === 'string'
                ? row.media_url
                : '',
            likes: numericField(row.like_count),
            media_product_type: typeof row.media_product_type === 'string' ? row.media_product_type : '',
            media_type: typeof row.media_type === 'string' ? row.media_type : '',
            metrics: postMetrics,
            permalink: typeof row.permalink === 'string' ? row.permalink : '',
            saves,
            shares,
            timestamp: typeof row.timestamp === 'string' ? row.timestamp : '',
            views,
          }
        })
    )

    return NextResponse.json({
      account: {
        id: typedConnection.account_id,
        login_type: typedConnection.page_id ? 'facebook_login' : 'instagram_login',
        name: typedConnection.account_name,
        profile: profileResult.data,
      },
      media,
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
