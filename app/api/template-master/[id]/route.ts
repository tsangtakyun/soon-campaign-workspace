import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerSupabase } from '@/lib/server-supabase'

const coreConfig = () => ({
  baseUrl: (process.env.SOON_CORE_URL || 'https://soon-core.vercel.app').replace(/\/$/, ''),
  // Style Registry integrations historically use the knowledge key. Prefer it
  // so this proxy matches the already-working Content Studio style feed.
  key: process.env.SOON_CORE_KNOWLEDGE_KEY || process.env.SOON_CORE_BUNDLE_KEY || '',
})

async function authenticated() {
  const supabase = createServerSupabase(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  return Boolean(user?.id)
}

async function forward(request: Request, id: string, method: 'GET' | 'PATCH') {
  if (!await authenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = request.headers.get('x-template-token') || new URL(request.url).searchParams.get('token') || ''
  const { baseUrl, key } = coreConfig()
  if (!key || !token) return NextResponse.json({ error: 'Missing template editor credentials' }, { status: 500 })
  const response = await fetch(`${baseUrl}/api/intelligence/template-drafts/${encodeURIComponent(id)}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-soon-knowledge-key': key, 'x-soon-template-token': token },
    body: method === 'PATCH' ? await request.text() : undefined,
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({ error: 'Invalid Core response' }))
  return NextResponse.json(payload, { status: response.status })
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return forward(request, (await context.params).id, 'GET')
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return forward(request, (await context.params).id, 'PATCH')
}
