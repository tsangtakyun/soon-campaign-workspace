import { createAdminSupabase } from '@/lib/server-supabase'
import sharp from 'sharp'

export type PublishError = {
  message: string
  platform: string
  reconnect?: boolean
}

export type PublishResult = {
  errors: PublishError[]
  platform_results: Record<string, Record<string, unknown>>
  platforms_published: string[]
}

type CampaignPost = {
  body: string | null
  captions?: Record<string, unknown> | null
  id: string
  image_url: string | null
  scheduled_at: string | null
  title: string | null
  user_id?: string | null
  workspace_id: string | null
}

type SocialConnection = {
  id?: string | null
  access_token: string | null
  account_id: string | null
  account_name: string | null
  page_access_token: string | null
  page_id: string | null
  platform: string
  token_expires_at: string | null
}

type PublishPlatform = 'instagram' | 'facebook' | 'threads'

function tokenPreview(value: string | null) {
  return value ? `${value.slice(0, 20)}...` : null
}

function connectionTokens(connection: SocialConnection) {
  return [
    { label: 'user_access_token', token: connection.access_token },
    { label: 'page_access_token', token: connection.page_access_token },
  ].filter((item, index, items) => {
    return item.token && items.findIndex((candidate) => candidate.token === item.token) === index
  }) as { label: string; token: string }[]
}

function sanitizeConnection(connection: SocialConnection) {
  return {
    id: connection.id,
    platform: connection.platform,
    account_id: connection.account_id,
    account_name: connection.account_name,
    page_id: connection.page_id,
    token_preview: tokenPreview(connection.access_token),
    page_token_preview: tokenPreview(connection.page_access_token),
    token_expires_at: connection.token_expires_at,
    has_access_token: Boolean(connection.access_token),
    has_page_access_token: Boolean(connection.page_access_token),
  }
}

export function shouldPublishNow(scheduledAt: string | null) {
  if (!scheduledAt) return true
  const scheduled = new Date(scheduledAt)
  if (Number.isNaN(scheduled.getTime())) return true
  return scheduled.getTime() <= Date.now() + 30 * 60 * 1000
}

function absoluteUrl(value: string, baseUrl: string) {
  if (/^https?:\/\//i.test(value)) return value
  return new URL(value, baseUrl).toString()
}

function mediaUrlFromAsset(asset: unknown) {
  if (typeof asset === 'string') return asset
  if (!asset || typeof asset !== 'object' || Array.isArray(asset)) return ''

  const item = asset as Record<string, unknown>
  const value = item.url || item.image_url || item.src || item.imageUrl
  return typeof value === 'string' ? value : ''
}

function mediaUrlsForPost(post: CampaignPost, baseUrl: string) {
  const assets = Array.isArray(post.captions?.assets) ? post.captions.assets : []
  const assetUrls = assets.map(mediaUrlFromAsset).filter(Boolean)
  const urls = assetUrls.length ? assetUrls : post.image_url ? [post.image_url] : []

  return Array.from(new Set(urls.map((url) => absoluteUrl(url, baseUrl)))).slice(0, 10)
}

function isVideoUrl(value: string) {
  try {
    return /\.(?:m4v|mov|mp4|webm)$/i.test(new URL(value).pathname)
  } catch {
    return /\.(?:m4v|mov|mp4|webm)(?:[?#]|$)/i.test(value)
  }
}

type InstagramImageInfo = {
  height: number
  ratio: number
  url: string
  width: number
}

async function inspectInstagramImage(url: string): Promise<InstagramImageInfo> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Instagram 無法讀取圖片（HTTP ${response.status}）。`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType && !contentType.startsWith('image/')) {
    throw new Error(`Instagram 素材格式錯誤：預期圖片，實際為 ${contentType}。`)
  }

  const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata()
  const width = metadata.width || 0
  const height = metadata.height || 0
  if (!width || !height) throw new Error('Instagram 無法辨認圖片尺寸。')

  return { height, ratio: width / height, url, width }
}

async function validateInstagramImages(urls: string[]) {
  const imageUrls = urls.filter((url) => !isVideoUrl(url))
  if (!imageUrls.length) return

  const images = await Promise.all(imageUrls.map(inspectInstagramImage))
  for (const image of images) {
    // Instagram Feed accepts portrait images down to 4:5 and landscape images up to 1.91:1.
    // Reject instead of silently allowing Instagram to centre-crop important artwork or text.
    if (image.ratio < 0.8 - 0.001 || image.ratio > 1.91 + 0.001) {
      throw new Error(
        `Instagram 圖片比例不安全：${image.width}×${image.height}。Feed 圖必須介乎 4:5 至 1.91:1，請先轉成 1080×1350。`
      )
    }
  }

  if (urls.length > 1 && images.length > 1) {
    const firstRatio = images[0].ratio
    const mismatch = images.find((image) => Math.abs(image.ratio - firstRatio) > 0.001)
    if (mismatch) {
      throw new Error('Instagram 輪播圖片比例不一致，可能被裁切。請將所有頁統一為 1080×1350。')
    }
  }
}

function instagramGraphOrigin(connection: SocialConnection) {
  return connection.page_id ? 'https://graph.facebook.com/v18.0' : 'https://graph.instagram.com/v18.0'
}

function isTokenExpired(connection: SocialConnection) {
  if (!connection.token_expires_at) return false
  const expiresAt = new Date(connection.token_expires_at).getTime()
  return Number.isFinite(expiresAt) && expiresAt <= Date.now()
}

function tokenExpiredError(platform: string): PublishError {
  return {
    message: platform === 'instagram' ? '請重新連接你的 Instagram 帳戶' : '請重新連接你的 Facebook 帳戶',
    platform,
    reconnect: true,
  }
}

async function readGraphJson(res: Response) {
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
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

async function createInstagramContainer({
  accountId,
  graphOrigin,
  params,
}: {
  accountId: string
  graphOrigin: string
  params: URLSearchParams
}) {
  const container = await readGraphJson(
    await fetch(`${graphOrigin}/${accountId}/media`, {
      body: params,
      method: 'POST',
    })
  )
  const creationId = typeof container.id === 'string' ? container.id : ''
  if (!creationId) throw new Error('Instagram media container 建立失敗。')
  return creationId
}

async function waitForInstagramContainer(graphOrigin: string, creationId: string, accessToken: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const statusUrl = new URL(`${graphOrigin}/${creationId}`)
    statusUrl.searchParams.set('fields', 'status_code')
    statusUrl.searchParams.set('access_token', accessToken)

    const status = await readGraphJson(await fetch(statusUrl.toString()))
    const statusCode = typeof status.status_code === 'string' ? status.status_code : ''
    if (statusCode === 'FINISHED') return
    if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
      throw new Error(`Instagram media container 狀態異常：${statusCode}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
}

async function fetchFacebookPageCredentials(connection: SocialConnection) {
  if (!connection.access_token) return null

  console.log('[posts/publish] fetching Facebook page token from /me/accounts:', {
    accountId: connection.account_id,
    pageId: connection.page_id,
    token_preview: tokenPreview(connection.access_token),
  })

  const accountsUrl = new URL('https://graph.facebook.com/v18.0/me/accounts')
  accountsUrl.searchParams.set('fields', 'id,name,access_token')
  accountsUrl.searchParams.set('access_token', connection.access_token)

  const response = await fetch(accountsUrl.toString())
  const data = await response.json().catch(() => ({}))
  console.log('Facebook /me/accounts response:', {
    ok: response.ok,
    status: response.status,
    pages: Array.isArray(data?.data)
      ? data.data.map((page: { id?: string; name?: string; access_token?: string }) => ({
          id: page.id,
          name: page.name,
          token_preview: tokenPreview(page.access_token || null),
        }))
      : data,
  })

  if (!response.ok || !Array.isArray(data?.data)) return null

  const page = data.data.find((item: { id?: string; name?: string; access_token?: string }) => {
    return (
      item.id &&
      item.access_token &&
      (item.id === connection.page_id ||
        item.id === connection.account_id ||
        item.name === connection.account_name)
    )
  })

  if (!page?.id || !page.access_token) return null
  return { pageAccessToken: page.access_token as string, pageId: page.id as string }
}

async function resolveFacebookPageCredentials(connection: SocialConnection) {
  const initialPageId = connection.page_id || connection.account_id
  if (initialPageId && connection.page_access_token) {
    return { pageAccessToken: connection.page_access_token, pageId: initialPageId }
  }

  const credentials = await fetchFacebookPageCredentials(connection)
  if (!credentials) return null

  if (connection.id) {
    const supabase = createAdminSupabase()
    const { error } = await supabase
      .from('social_connections')
      .update({
        page_access_token: credentials.pageAccessToken,
        page_id: credentials.pageId,
      })
      .eq('id', connection.id)
    if (error) {
      console.error('Facebook API error:', {
        action: 'save_page_token',
        error,
      })
    }
  }

  return credentials
}

async function publishToInstagram(post: CampaignPost, connection: SocialConnection, baseUrl: string) {
  if (isTokenExpired(connection)) throw tokenExpiredError('instagram')
  const tokens = connectionTokens(connection)
  if (!connection.account_id || !tokens.length) {
    throw new Error('請重新連接你的 Instagram 帳戶')
  }
  const mediaUrls = mediaUrlsForPost(post, baseUrl)
  if (!mediaUrls.length) throw new Error('Instagram 發布需要圖片或影片。')
  await validateInstagramImages(mediaUrls)

  const isSingleVideo = mediaUrls.length === 1 && isVideoUrl(mediaUrls[0])

  // Instagram publishing requires Meta approval for the Instagram Business publishing permission.
  if (process.env.INSTAGRAM_PUBLISHING_ENABLED !== 'true') {
    throw new Error('Instagram 自動發布需要 Meta App Review 批准 instagram_business_content_publish 後重新連接。')
  }

  const caption = post.body || post.title || ''
  const errors: string[] = []
  const graphOrigin = instagramGraphOrigin(connection)

  for (const { label, token } of tokens) {
    try {
      console.log('[posts/publish] Instagram publish token attempt:', {
        accountId: connection.account_id,
        mediaCount: mediaUrls.length,
        mediaType: isSingleVideo ? 'REELS' : mediaUrls.length > 1 ? 'CAROUSEL' : 'IMAGE',
        token_source: label,
        token_preview: tokenPreview(token),
      })

      const creationId =
        mediaUrls.length > 1
          ? await createInstagramCarouselContainer({
              accountId: connection.account_id,
              caption,
              graphOrigin,
              mediaUrls,
              token,
            })
          : isSingleVideo
            ? await createInstagramContainer({
                accountId: connection.account_id,
                graphOrigin,
                params: new URLSearchParams({
                  access_token: token,
                  caption,
                  media_type: 'REELS',
                  share_to_feed: 'true',
                  video_url: mediaUrls[0],
                }),
              })
          : await createInstagramContainer({
              accountId: connection.account_id,
              graphOrigin,
              params: new URLSearchParams({
                access_token: token,
                caption,
                image_url: mediaUrls[0],
              }),
            })
      await waitForInstagramContainer(graphOrigin, creationId, token)

      const published = await readGraphJson(
        await fetch(`${graphOrigin}/${connection.account_id}/media_publish`, {
          body: new URLSearchParams({
            access_token: token,
            creation_id: creationId,
          }),
          method: 'POST',
        })
      )
      if (!published.id) throw new Error('Instagram 發布失敗。')
      return {
        media_id: String(published.id),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${label}: ${message}`)
      console.error('[posts/publish] Instagram publish token failed:', {
        error: message,
        token_source: label,
      })
    }
  }

  throw new Error(`Instagram 發布失敗。${errors.join(' | ')}`)
}

async function createInstagramCarouselContainer({
  accountId,
  caption,
  graphOrigin,
  mediaUrls,
  token,
}: {
  accountId: string
  caption: string
  graphOrigin: string
  mediaUrls: string[]
  token: string
}) {
  const childIds: string[] = []

  for (const mediaUrl of mediaUrls) {
    const video = isVideoUrl(mediaUrl)
    const childId = await createInstagramContainer({
      accountId,
      graphOrigin,
      params: new URLSearchParams({
        access_token: token,
        is_carousel_item: 'true',
        ...(video
          ? { media_type: 'VIDEO', video_url: mediaUrl }
          : { image_url: mediaUrl }),
      }),
    })
    await waitForInstagramContainer(graphOrigin, childId, token)
    childIds.push(childId)
  }

  return createInstagramContainer({
    accountId,
    graphOrigin,
    params: new URLSearchParams({
      access_token: token,
      caption,
      children: childIds.join(','),
      media_type: 'CAROUSEL',
    }),
  })
}

async function publishToThreads(post: CampaignPost, connection: SocialConnection, baseUrl: string) {
  if (isTokenExpired(connection)) throw tokenExpiredError('threads')
  if (!connection.account_id || !connection.access_token) {
    throw new Error('請重新連接你的 Threads 帳戶')
  }

  const imageUrl = mediaUrlsForPost(post, baseUrl)[0] || ''
  const text = Array.from(post.body || post.title || '').slice(0, 500).join('')
  if (!imageUrl && !text) throw new Error('Threads 發布需要文字或圖片。')

  const graphOrigin = 'https://graph.threads.net/v1.0'
  const containerParams = new URLSearchParams({
    access_token: connection.access_token,
    media_type: imageUrl ? 'IMAGE' : 'TEXT',
    text,
  })
  if (imageUrl) {
    containerParams.set('image_url', imageUrl)
    containerParams.set('alt_text', post.title || 'SOON content image')
  }

  console.log('[posts/publish] Threads creating container:', {
    accountId: connection.account_id,
    hasImage: Boolean(imageUrl),
    mediaType: imageUrl ? 'IMAGE' : 'TEXT',
  })
  const container = await readGraphJson(
    await fetch(`${graphOrigin}/me/threads`, {
      body: containerParams,
      method: 'POST',
    })
  )
  const creationId = typeof container.id === 'string' ? container.id : ''
  if (!creationId) throw new Error('Threads media container 建立失敗。')

  console.log('[posts/publish] Threads publishing container:', {
    accountId: connection.account_id,
    creationId,
  })
  const published = await readGraphJson(
    await fetch(`${graphOrigin}/me/threads_publish`, {
      body: new URLSearchParams({
        access_token: connection.access_token,
        creation_id: creationId,
      }),
      method: 'POST',
    })
  )
  if (!published.id) throw new Error('Threads 發布失敗。')

  return {
    media_id: String(published.id),
  }
}

async function publishToFacebook(post: CampaignPost, connection: SocialConnection, baseUrl: string) {
  if (isTokenExpired(connection)) throw tokenExpiredError('facebook')
  console.log('Facebook connection found:', sanitizeConnection(connection))

  const credentials = await resolveFacebookPageCredentials(connection)
  if (!credentials?.pageId || !credentials.pageAccessToken) {
    throw new Error('請重新連接你的 Facebook 帳戶：未取得 Facebook Page token')
  }
  if (!post.image_url) throw new Error('Facebook 發布需要圖片。')

  const imageUrl = absoluteUrl(post.image_url, baseUrl)
  const caption = post.body || post.title || ''

  const imageCheck = await fetch(imageUrl, { method: 'HEAD' }).catch((error) => {
    console.log('Facebook API error:', {
      action: 'image_head_check',
      error: error instanceof Error ? error.message : String(error),
      imageUrl,
    })
    return null
  })
  console.log('[posts/publish] Facebook image URL check:', {
    contentType: imageCheck?.headers.get('content-type') || null,
    imageUrl,
    ok: imageCheck?.ok || false,
    status: imageCheck?.status || null,
  })

  console.log('Attempting Facebook publish to page:', credentials.pageId)
  const response = await fetch(`https://graph.facebook.com/v18.0/${credentials.pageId}/photos`, {
    body: new URLSearchParams({
      access_token: credentials.pageAccessToken,
      caption,
      url: imageUrl,
    }),
    method: 'POST',
  })
  const responseData = await response.json().catch(() => ({}))
  console.log('Facebook API response:', {
    ok: response.ok,
    response: responseData,
    status: response.status,
  })

  if (!response.ok) {
    console.log('Facebook API error:', responseData)

    const fallbackCredentials =
      connection.page_access_token && connection.access_token
        ? await fetchFacebookPageCredentials(connection)
        : null

    if (
      fallbackCredentials?.pageId &&
      fallbackCredentials.pageAccessToken &&
      (fallbackCredentials.pageId !== credentials.pageId ||
        fallbackCredentials.pageAccessToken !== credentials.pageAccessToken)
    ) {
      console.log('[posts/publish] retrying Facebook publish with refreshed Page token:', {
        pageId: fallbackCredentials.pageId,
        token_preview: tokenPreview(fallbackCredentials.pageAccessToken),
      })
      const retryResponse = await fetch(`https://graph.facebook.com/v18.0/${fallbackCredentials.pageId}/photos`, {
        body: new URLSearchParams({
          access_token: fallbackCredentials.pageAccessToken,
          caption,
          url: imageUrl,
        }),
        method: 'POST',
      })
      const retryData = await retryResponse.json().catch(() => ({}))
      console.log('Facebook API response:', {
        ok: retryResponse.ok,
        response: retryData,
        status: retryResponse.status,
      })
      if (!retryResponse.ok) {
        console.log('Facebook API error:', retryData)
        const message =
          typeof retryData?.error?.message === 'string'
            ? retryData.error.message
            : JSON.stringify(retryData)
        throw new Error(message)
      }
      if (!retryData.id && !retryData.post_id) throw new Error('Facebook 發布失敗。')
      return {
        media_id: typeof retryData.id === 'string' ? retryData.id : null,
        post_id: typeof retryData.post_id === 'string' ? retryData.post_id : null,
      }
    }

    const message =
      typeof responseData?.error?.message === 'string'
        ? responseData.error.message
        : JSON.stringify(responseData)
    throw new Error(message)
  }

  const published = responseData as Record<string, unknown>
  if (!published.id && !published.post_id) throw new Error('Facebook 發布失敗。')
  return {
    media_id: typeof published.id === 'string' ? published.id : null,
    post_id: typeof published.post_id === 'string' ? published.post_id : null,
  }
}

export async function publishPostToConnectedPlatforms(input: {
  baseUrl: string
  platforms?: PublishPlatform[]
  post: CampaignPost
  userId?: string | null
  workspaceId: string
}) {
  const supabase = createAdminSupabase()
  const platforms = input.platforms?.length ? input.platforms : ['instagram', 'facebook', 'threads']
  const connectionColumns =
    'id,platform,account_id,account_name,access_token,page_access_token,page_id,token_expires_at'
  const { data: directConnections, error } = await supabase
    .from('social_connections')
    .select(connectionColumns)
    .eq('workspace_id', input.workspaceId)
    .in('platform', platforms)

  if (error) throw error

  let connections = (directConnections || []) as SocialConnection[]
  if (!connections.length) {
    console.log('[posts/publish] no direct connections for workspace, checking duplicate brand workspaces:', {
      postId: input.post.id,
      userId: input.userId || input.post.user_id || null,
      workspaceId: input.workspaceId,
    })
    connections = await findDuplicateBrandWorkspaceConnections({
      connectionColumns,
      supabase,
      userId: input.userId || input.post.user_id || null,
      workspaceId: input.workspaceId,
    })
  }

  const result: PublishResult = { errors: [], platform_results: {}, platforms_published: [] }
  const connectionRows = (connections || []) as SocialConnection[]
  console.log('workspace social connections:', connectionRows.map(sanitizeConnection))

  if (!connectionRows.length) {
    console.log('[posts/publish] no connected platforms', {
      postId: input.post.id,
      workspaceId: input.workspaceId,
    })
    return result
  }

  for (const connection of connectionRows) {
    console.log('[posts/publish] attempt', {
      platform: connection.platform,
      postId: input.post.id,
      workspaceId: input.workspaceId,
    })

    try {
      if (connection.platform === 'instagram') {
        result.platform_results.instagram = await publishToInstagram(input.post, connection, input.baseUrl)
      } else if (connection.platform === 'facebook') {
        result.platform_results.facebook = await publishToFacebook(input.post, connection, input.baseUrl)
      } else if (connection.platform === 'threads') {
        result.platform_results.threads = await publishToThreads(input.post, connection, input.baseUrl)
      } else {
        continue
      }
      result.platforms_published.push(connection.platform)
      console.log('[posts/publish] success', {
        platform: connection.platform,
        postId: input.post.id,
        workspaceId: input.workspaceId,
      })
    } catch (error) {
      const publishError =
        error && typeof error === 'object' && 'platform' in error
          ? (error as PublishError)
          : {
              message: error instanceof Error ? error.message : String(error),
              platform: connection.platform,
            }
      result.errors.push(publishError)
      console.error('[posts/publish] failed', {
        error: publishError.message,
        platform: connection.platform,
        postId: input.post.id,
        workspaceId: input.workspaceId,
      })
    }
  }

  return result
}

async function workspaceBrandName(input: {
  supabase: ReturnType<typeof createAdminSupabase>
  workspaceId: string
}) {
  const { data: brandKit } = await input.supabase
    .from('brand_kits')
    .select('business_name')
    .eq('workspace_id', input.workspaceId)
    .maybeSingle()

  if (typeof brandKit?.business_name === 'string' && brandKit.business_name.trim()) {
    return brandKit.business_name.trim()
  }

  const { data: workspace } = await input.supabase
    .from('workspaces')
    .select('name')
    .eq('id', input.workspaceId)
    .maybeSingle()

  return typeof workspace?.name === 'string' ? workspace.name.trim() : ''
}

async function accessibleWorkspaceIds(input: {
  candidateWorkspaceIds: string[]
  supabase: ReturnType<typeof createAdminSupabase>
  userId: string | null
}) {
  if (!input.userId || !input.candidateWorkspaceIds.length) return []

  const [{ data: ownedWorkspaces }, { data: memberWorkspaces }] = await Promise.all([
    input.supabase
      .from('workspaces')
      .select('id')
      .in('id', input.candidateWorkspaceIds)
      .eq('owner_id', input.userId),
    input.supabase
      .from('workspace_members')
      .select('workspace_id')
      .in('workspace_id', input.candidateWorkspaceIds)
      .eq('user_id', input.userId)
      .eq('status', 'active'),
  ])

  return Array.from(
    new Set([
      ...(ownedWorkspaces || []).map((workspace: { id?: string }) => workspace.id).filter(Boolean),
      ...(memberWorkspaces || [])
        .map((membership: { workspace_id?: string }) => membership.workspace_id)
        .filter(Boolean),
    ] as string[])
  )
}

async function findDuplicateBrandWorkspaceConnections(input: {
  connectionColumns: string
  supabase: ReturnType<typeof createAdminSupabase>
  userId: string | null
  workspaceId: string
}): Promise<SocialConnection[]> {
  const brandName = await workspaceBrandName({
    supabase: input.supabase,
    workspaceId: input.workspaceId,
  })

  if (!brandName) return []

  const { data: matchingBrandKits, error: brandKitError } = await input.supabase
    .from('brand_kits')
    .select('workspace_id,business_name')
    .ilike('business_name', brandName)
    .neq('workspace_id', input.workspaceId)

  if (brandKitError) throw brandKitError

  const candidateWorkspaceIds = Array.from(
    new Set((matchingBrandKits || []).map((kit: { workspace_id?: string }) => kit.workspace_id).filter(Boolean))
  ) as string[]
  const workspaceIds = await accessibleWorkspaceIds({
    candidateWorkspaceIds,
    supabase: input.supabase,
    userId: input.userId,
  })

  if (!workspaceIds.length) {
    console.log('[posts/publish] duplicate brand fallback found no accessible workspace ids:', {
      brandName,
      candidateWorkspaceIds,
      workspaceId: input.workspaceId,
    })
    return []
  }

  const { data: fallbackConnections, error: connectionsError } = await input.supabase
    .from('social_connections')
    .select(input.connectionColumns)
    .in('workspace_id', workspaceIds)
    .in('platform', ['instagram', 'facebook', 'threads'])

  if (connectionsError) throw connectionsError

  const fallbackConnectionRows = (fallbackConnections || []) as unknown as SocialConnection[]
  console.log('[posts/publish] duplicate brand fallback connections:', {
    brandName,
    sourceWorkspaceIds: workspaceIds,
    targetWorkspaceId: input.workspaceId,
    connections: fallbackConnectionRows.map(sanitizeConnection),
  })

  return fallbackConnectionRows
}
