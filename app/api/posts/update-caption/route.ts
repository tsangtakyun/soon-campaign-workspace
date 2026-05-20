import { NextResponse } from 'next/server'

import { createAdminSupabase } from '@/lib/server-supabase'

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
  }

  let body: { postId?: string; id?: string; caption?: string; body?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const postId = body.postId || body.id
  const caption = body.caption ?? body.body
  if (!postId || typeof caption !== 'string') {
    return NextResponse.json({ error: 'Missing postId or caption' }, { status: 400 })
  }

  try {
    const supabase = createAdminSupabase()
    const { data, error } = await supabase
      .from('campaign_posts')
      .update({
        caption,
        body: caption,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select('*')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, post: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to update caption' }, { status: 500 })
  }
}
