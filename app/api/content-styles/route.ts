import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

const formatMap: Record<string, string> = {
  carousel: 'instagram_carousel',
  single_image: 'instagram_single_feed',
  human_video: 'human_short_video',
  ai_video: 'ai_short_video',
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const workspaceId = url.searchParams.get('workspaceId') || ''
  const creatorFormat = url.searchParams.get('format') || ''
  if (!isUuid(workspaceId) || !formatMap[creatorFormat]) {
    return NextResponse.json({ error: 'Invalid workspace or format' }, { status: 400 })
  }

  const supabase = createServerSupabase(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const key = process.env.SOON_CORE_KNOWLEDGE_KEY
  if (!key) return NextResponse.json({ styles: [], source: 'fallback', reason: 'Core credential is not configured' })

  try {
    const baseUrl = (process.env.SOON_CORE_URL || 'https://soon-core.vercel.app').replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/api/intelligence/styles?format=${formatMap[creatorFormat]}`, {
      headers: { 'x-soon-knowledge-key': key },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error(`Core returned ${response.status}`)
    const payload = await response.json()
    return NextResponse.json({ ...payload, source: 'soon_core' })
  } catch (error) {
    console.error('[content-styles] Core unavailable', error)
    return NextResponse.json({ styles: [], source: 'fallback', reason: 'Core is temporarily unavailable' })
  }
}
