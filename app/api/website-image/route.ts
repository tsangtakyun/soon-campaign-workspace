import { NextResponse } from 'next/server'
import { requirePlatformUser } from '@/lib/platform-access'
import { fetchSafeExternal } from '@/lib/safe-external-url'

export async function GET(request: Request) {
  const auth = await requirePlatformUser()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const rawUrl = searchParams.get('url')

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  let imageUrl: URL
  try {
    imageUrl = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(imageUrl.protocol)) {
    return NextResponse.json({ error: 'Unsupported url protocol' }, { status: 400 })
  }

  try {
    const response = await fetchSafeExternal(imageUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        Referer: `${imageUrl.origin}/`,
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error('[website-image] failed:', imageUrl.toString(), response.status)
      return NextResponse.json({ error: 'Unable to fetch image' }, { status: 502 })
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'Remote resource is not an image' }, { status: 415 })
    }
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Remote image is too large' }, { status: 413 })
    }
    const body = await response.arrayBuffer()
    if (body.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Remote image is too large' }, { status: 413 })
    }

    return new Response(body, {
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error) {
    console.error('[website-image] error:', imageUrl.toString(), error)
    return NextResponse.json({ error: 'Unable to fetch image' }, { status: 502 })
  }
}
