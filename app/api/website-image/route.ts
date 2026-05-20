import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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
    const response = await fetch(imageUrl.toString(), {
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

    const contentType = response.headers.get('content-type') || 'image/png'
    const body = await response.arrayBuffer()

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
