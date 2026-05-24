import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-soon-api-key')
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.egg_creator_id || !body.cw_campaign_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const eggBaseUrl = process.env.EGG_BASE_URL
  const internalKey = process.env.SOON_INTERNAL_API_KEY

  if (!eggBaseUrl || !internalKey) {
    console.error('[invitations] SOON-EGG integration env is missing')
    return NextResponse.json({ error: 'SOON-EGG integration is not configured' }, { status: 500 })
  }

  let eggRes: Response
  try {
    eggRes = await fetch(`${eggBaseUrl}/api/invitations/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-soon-api-key': internalKey,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('[invitations] fetch to EGG failed:', err)
    return NextResponse.json({ error: 'Failed to reach SOON-EGG' }, { status: 502 })
  }

  let eggData: unknown
  try {
    eggData = await eggRes.json()
  } catch {
    eggData = null
  }

  console.log('[invitations] EGG response status:', eggRes.status, 'body:', eggData)

  if (!eggRes.ok) {
    return NextResponse.json({ error: 'EGG rejected invitation', detail: eggData }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
