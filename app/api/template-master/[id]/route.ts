import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerSupabase } from '@/lib/server-supabase'

const coreConfig = () => ({
  baseUrl: (process.env.SOON_CORE_URL || 'https://soon-core.vercel.app').replace(/\/$/, ''),
  // Deployments may still have either of the two historical reader keys.
  // Try both without exposing which credential Core accepted to the browser.
  keys: Array.from(new Set([
    process.env.SOON_CORE_KNOWLEDGE_KEY,
    process.env.SOON_CORE_BUNDLE_KEY,
  ].filter((key): key is string => Boolean(key)))),
})

async function authenticated() {
  const supabase = createServerSupabase(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  return Boolean(user?.id)
}

async function forward(request: Request, id: string, method: 'GET' | 'PATCH') {
  if (!await authenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = request.headers.get('x-template-token') || new URL(request.url).searchParams.get('token') || ''
  const { baseUrl, keys } = coreConfig()
  if (!keys.length || !token) return NextResponse.json({ error: 'Missing template editor credentials' }, { status: 500 })

  const body = method === 'PATCH' ? await request.text() : undefined
  let lastResponse: Response | null = null
  for (const key of keys) {
    const response = await fetch(`${baseUrl}/api/intelligence/template-drafts/${encodeURIComponent(id)}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-soon-knowledge-key': key, 'x-soon-template-token': token },
      body,
      cache: 'no-store',
    })
    lastResponse = response
    if (response.status !== 401) {
      const payload = await response.json().catch(() => ({ error: 'Invalid Core response' }))
      return NextResponse.json(payload, { status: response.status })
    }
  }

  console.warn('Core template draft request was rejected', { id, method, status: lastResponse?.status })
  return NextResponse.json({ error: 'Core template editor authorization failed' }, { status: 502 })
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return forward(request, (await context.params).id, 'GET')
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return forward(request, (await context.params).id, 'PATCH')
}
