import { NextResponse } from 'next/server'
import { requirePlatformUser } from '@/lib/platform-access'
import { fetchSafeExternal } from '@/lib/safe-external-url'

export async function GET(request: Request) {
  const auth = await requirePlatformUser()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    return NextResponse.json({ error: 'Unsupported url protocol' }, { status: 400 })
  }

  const response = await fetchSafeExternal(target.toString(), {
    headers: {
      accept: 'image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent': 'SOON Logo Proxy/1.0',
    },
    signal: AbortSignal.timeout(12000),
  })

  if (!response.ok) {
    return NextResponse.json({ error: `Unable to fetch image (${response.status})` }, { status: 502 })
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

  return new NextResponse(body, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=86400',
    },
  })
}
