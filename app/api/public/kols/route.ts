import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const apiKey = req.headers.get('x-soon-api-key')
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.EGG_BASE_URL
  const internalKey = process.env.SOON_INTERNAL_API_KEY

  if (!baseUrl || !internalKey) {
    return NextResponse.json({ error: 'SOON-EGG integration is not configured' }, { status: 500 })
  }

  const res = await fetch(`${baseUrl}/api/public/kols`, {
    headers: { 'x-soon-api-key': internalKey },
    next: { revalidate: 300 },
  })
  const data = await res.json()

  return NextResponse.json(data, { status: res.status })
}
