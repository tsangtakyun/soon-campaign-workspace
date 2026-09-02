import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_BODY_BYTES = 750_000

const ALLOWED_KEYS = new Set([
  'soon-business-profile-v1',
  'soon-brand-profile-v1',
  'soon-website-analysis-v1',
  'soon-content-strategy-v1',
  'soon-campaign-details-v1',
  'soon-distribution-preferences-v1',
  'soon-content-mix-v1',
  'soon-visual-style-v1',
  'soon-typeface-v1',
  'soon-photo-control-v2',
  'soon-content-mood-v1',
  'soon-content-modification-v1',
  'soon-topic-review-v1',
])

function validSessionId(value: string | null): value is string {
  return Boolean(value && UUID_PATTERN.test(value))
}
function sanitizeValues(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([key]) => ALLOWED_KEYS.has(key))
  )
}

async function currentUserId() {
  const client = createServerSupabase(await cookies())
  const { data: { user } } = await client.auth.getUser()
  return user?.id || null
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get('sessionId')
  if (!validSessionId(sessionId)) {
    return NextResponse.json({ error: 'Invalid onboarding session' }, { status: 400 })
  }

  const userId = await currentUserId()
  const { data, error } = await createAdminSupabase()
    .from('onboarding_drafts')
    .select('data,user_id,updated_at')
    .eq('onboarding_session_id', sessionId)
    .maybeSingle()

  if (error) {
    console.error('[onboarding/draft] load failed', error)
    return NextResponse.json({ error: 'Failed to load onboarding draft' }, { status: 500 })
  }
  if (data?.user_id && data.user_id !== userId) {
    return NextResponse.json({ error: 'Onboarding session belongs to another user' }, { status: 403 })
  }

  return NextResponse.json({ data: data?.data || {}, updatedAt: data?.updated_at || null })
}

export async function PATCH(request: Request) {
  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Onboarding draft is too large' }, { status: 413 })
  }

  let body: { sessionId?: string; values?: unknown; removeKeys?: unknown }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sessionId = body.sessionId || null
  if (!validSessionId(sessionId)) {
    return NextResponse.json({ error: 'Invalid onboarding session' }, { status: 400 })
  }

  const userId = await currentUserId()
  const admin = createAdminSupabase()
  const { data: existing, error: loadError } = await admin
    .from('onboarding_drafts')
    .select('data,user_id')
    .eq('onboarding_session_id', sessionId)
    .maybeSingle()

  if (loadError) throw loadError
  if (existing?.user_id && existing.user_id !== userId) {
    return NextResponse.json({ error: 'Onboarding session belongs to another user' }, { status: 403 })
  }

  const nextData = { ...((existing?.data || {}) as Record<string, unknown>), ...sanitizeValues(body.values) }
  const removeKeys = Array.isArray(body.removeKeys)
    ? body.removeKeys.filter((key): key is string => typeof key === 'string' && ALLOWED_KEYS.has(key))
    : []
  removeKeys.forEach((key) => delete nextData[key])

  const { error } = await admin.from('onboarding_drafts').upsert({
    onboarding_session_id: sessionId,
    user_id: existing?.user_id || userId,
    data: nextData,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'onboarding_session_id' })

  if (error) {
    console.error('[onboarding/draft] save failed', error)
    return NextResponse.json({ error: 'Failed to save onboarding draft' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
