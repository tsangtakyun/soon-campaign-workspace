import { NextResponse } from 'next/server'

import { publishDuePosts } from '@/lib/post-publishing'

export async function GET() {
  try {
    const results = await publishDuePosts()
    return NextResponse.json({ ok: true, count: results.length, results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to publish due posts' }, { status: 500 })
  }
}

export { GET as POST }
