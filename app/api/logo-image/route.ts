import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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

  const response = await fetch(target.toString(), {
    headers: {
      accept: 'image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent': 'SOON Logo Proxy/1.0',
    },
    signal: AbortSignal.timeout(12000),
  })

  if (!response.ok) {
    return NextResponse.json({ error: `Unable to fetch image (${response.status})` }, { status: 502 })
  }

  const contentType = response.headers.get('content-type') || 'image/png'
  const body = await response.arrayBuffer()

  return new NextResponse(body, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=86400',
    },
  })
}
