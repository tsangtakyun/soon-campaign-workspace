export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
export const META_GRAPH_ORIGIN = 'https://graph.facebook.com'

export type MetaGraphError = {
  error?: {
    code?: number
    error_subcode?: number
    message?: string
    type?: string
    error_user_title?: string
    error_user_msg?: string
    error_data?: {
      blame_field_specs?: string[][]
      details?: string
    }
    fbtrace_id?: string
  }
}

export class MetaApiError extends Error {
  code?: number
  errorSubcode?: number
  userMessage?: string
  operation: string

  constructor(operation: string, graphError: NonNullable<MetaGraphError['error']>, fallback: string) {
    super(`${operation}: ${fallback}`)
    this.name = 'MetaApiError'
    this.operation = operation
    this.code = graphError.code
    this.errorSubcode = graphError.error_subcode
    this.userMessage = graphError.error_user_msg
  }
}

export async function readMetaJson(response: Response, label: string) {
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown> & MetaGraphError
  if (!response.ok || json.error) {
    const graphError = json.error
    const message = graphError?.error_user_msg || graphError?.message || `HTTP ${response.status}`
    const title = graphError?.error_user_title
    const blamedFields = graphError?.error_data?.blame_field_specs?.flat().filter(Boolean).join(', ')
    const details = graphError?.error_data?.details
    const context = [title, blamedFields ? `欄位：${blamedFields}` : '', details].filter(Boolean).join(' — ')
    throw new MetaApiError(label, graphError || {}, `${message}${context ? `（${context}）` : ''}`)
  }
  return json
}

export async function metaGet(path: string, accessToken: string, params?: Record<string, string>) {
  const url = new URL(`${META_GRAPH_ORIGIN}/${META_GRAPH_VERSION}/${path.replace(/^\//, '')}`)
  url.searchParams.set('access_token', accessToken)
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value))
  return readMetaJson(await fetch(url, { cache: 'no-store' }), `GET ${path}`)
}

export async function metaPost(path: string, accessToken: string, body: Record<string, string>) {
  return readMetaJson(
    await fetch(`${META_GRAPH_ORIGIN}/${META_GRAPH_VERSION}/${path.replace(/^\//, '')}`, {
      method: 'POST',
      body: new URLSearchParams({ ...body, access_token: accessToken }),
      cache: 'no-store',
    }),
    `POST ${path}`,
  )
}

export async function uploadMetaImage(adAccountId: string, accessToken: string, imageUrl: string) {
  const imageResponse = await fetch(imageUrl, { cache: 'no-store' })
  if (!imageResponse.ok) throw new Error('未能下載所選廣告圖片')
  const blob = await imageResponse.blob()
  if (!blob.type.startsWith('image/')) throw new Error('所選素材不是可用圖片')

  const form = new FormData()
  form.set('access_token', accessToken)
  form.set('filename', blob, 'soon-ad-creative.jpg')
  const result = await readMetaJson(
    await fetch(`${META_GRAPH_ORIGIN}/${META_GRAPH_VERSION}/${adAccountId}/adimages`, {
      method: 'POST',
      body: form,
    }),
    'Upload ad image',
  )
  const images = result.images && typeof result.images === 'object'
    ? Object.values(result.images as Record<string, { hash?: string }>)
    : []
  const hash = images.find((image) => image?.hash)?.hash
  if (!hash) throw new Error('Meta 未有回傳廣告圖片 hash')
  return hash
}

export function normalizeAdAccountId(value: string) {
  const id = value.trim()
  if (!/^act_\d+$/.test(id)) throw new Error('Invalid Meta ad account id')
  return id
}
