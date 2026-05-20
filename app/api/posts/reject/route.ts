import { NextResponse } from 'next/server'

import { createAdminSupabase } from '@/lib/server-supabase'

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
  }

  let body: { postId?: string; id?: string; reason?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const postId = body.postId || body.id
  if (!postId) {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
  }

  try {
    const now = new Date().toISOString()
    const supabase = createAdminSupabase()
    const { data, error } = await supabase
      .from('campaign_posts')
      .update({
        status: 'rejected',
        rejection_reason: body.reason || '',
        rejected_at: now,
        updated_at: now,
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
    return NextResponse.json({ error: error.message || 'Unable to reject post' }, { status: 500 })
  }
}
