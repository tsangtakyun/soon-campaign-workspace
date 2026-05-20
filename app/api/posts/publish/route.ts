import { NextResponse } from 'next/server'

import { publishPost } from '@/lib/post-publishing'

export async function POST(request: Request) {
  let body: { postId?: string; id?: string }

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
    const post = await publishPost(postId)
    return NextResponse.json({ ok: true, post })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to publish post' }, { status: 500 })
  }
}
