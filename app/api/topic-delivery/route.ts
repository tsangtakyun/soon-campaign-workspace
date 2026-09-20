import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/server-supabase'
export async function POST(request: Request) {
  const supabase = createServerSupabase(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const text = await request.text()
  if (text.length > 4096) return NextResponse.json({ error: 'Too large' }, { status: 413 })
  let token = ''; let failed = false
  try { const body = JSON.parse(text); token = body.token; failed = body.failed === true } catch { /* Invalid input is rejected below. */ }
  if (!failed && (typeof token !== 'string' || !token)) return NextResponse.json({ error: 'Invalid receipt' }, { status: 400 })
  const key = process.env.SOON_CORE_BUNDLE_KEY || process.env.SOON_CORE_KNOWLEDGE_KEY
  if (!key) return NextResponse.json({ error: 'Delivery reporting unavailable' }, { status: 503 })
  try {
    const response = await fetch('https://soon-core.vercel.app/api/topics/delivery-receipt', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-soon-knowledge-key': key, 'x-soon-topic-consumer': 'creator' },
      body: JSON.stringify(failed ? { failed: true } : { token }), cache: 'no-store', signal: AbortSignal.timeout(5000),
    })
    return NextResponse.json({ ok: response.ok }, { status: response.ok ? 200 : 502 })
  } catch { return NextResponse.json({ error: 'Delivery reporting unavailable' }, { status: 503 }) }
}
