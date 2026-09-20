import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerSupabase } from '@/lib/server-supabase'

const LIVE_CREATOR_USERNAMES = new Set(['soon_egg', 'egg.soon', 'eggsoon', 'renee'])

export async function GET() {
  const server = createServerSupabase(await cookies())
  const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.SOON_INTERNAL_API_KEY
  if (!apiKey) return NextResponse.json({ creators: [], available: false })
  const response = await fetch(`${process.env.EGG_BASE_URL || 'https://egg.sooncreator.network'}/api/public/kols`, {
    headers: { 'x-soon-api-key': apiKey }, cache: 'no-store',
  }).catch(() => null)
  if (!response?.ok) return NextResponse.json({ creators: [], available: false })
  const payload = await response.json().catch(() => ({}))
  const creators = (Array.isArray(payload.kols) ? payload.kols : []).filter((creator: { username?: string }) => LIVE_CREATOR_USERNAMES.has((creator.username || '').toLowerCase()))
  return NextResponse.json({ creators, available: true })
}
