import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-soon-api-key')
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.EGG_BASE_URL
  const internalKey = process.env.SOON_INTERNAL_API_KEY

  if (!baseUrl || !internalKey) {
    return NextResponse.json({ error: 'SOON-EGG integration is not configured' }, { status: 500 })
  }

  const body = await req.json()

  try {
    const res = await fetch(`${baseUrl}/api/invitations/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-soon-api-key': internalKey,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)

    if (!res.ok) {
      console.error('[public/invitations] SOON-EGG forward failed', {
        status: res.status,
        baseUrl,
        error: data?.error,
      })
    }

    return NextResponse.json(data ?? { error: 'Invalid SOON-EGG response' }, { status: res.status })
  } catch (error) {
    console.error('[public/invitations] SOON-EGG forward error', {
      baseUrl,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Failed to forward invitation' }, { status: 500 })
  }
}
