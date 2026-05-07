import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerSupabase } from '@/lib/server-supabase'
import { getStrategyLibrary, saveStrategyLibrary } from '@/lib/strategy-library-store'
import { normalizeStrategyLibrary } from '@/lib/strategy-library'

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map((email) => email.trim()).filter(Boolean)

async function requireInternalUser() {
  const supabase = createServerSupabase(await cookies())
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(user.email || '')) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

export async function GET() {
  const auth = await requireInternalUser()
  if (auth.error) return auth.error

  const library = await getStrategyLibrary()
  return NextResponse.json({ library })
}

export async function PUT(request: Request) {
  const auth = await requireInternalUser()
  if (auth.error) return auth.error

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  try {
    const payload = (body || {}) as { library?: unknown }
    const result = await saveStrategyLibrary(normalizeStrategyLibrary(payload.library))
    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unable to save strategy library',
      hint: '請先喺 Supabase 跑 supabase/campaign_workspace.sql 入面嘅 strategy_library table migration。',
    }, { status: 500 })
  }
}
