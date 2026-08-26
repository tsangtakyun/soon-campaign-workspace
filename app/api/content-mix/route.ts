import { NextResponse } from 'next/server'

import { recommendContentMix } from '@/lib/content-mix'
import { consumeApiQuota, requirePlatformUser } from '@/lib/platform-access'

export async function POST(request: Request) {
  const auth = await requirePlatformUser()
  if (auth.error) return auth.error
  if (!(await consumeApiQuota(auth.access.user.id, 'content-mix', 40))) {
    return NextResponse.json({ error: '請求次數過多，請稍後再試。' }, { status: 429 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  try {
    const recommendation = await recommendContentMix((body || {}) as Parameters<typeof recommendContentMix>[0])
    return NextResponse.json(recommendation)
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || '暫時未能生成第一週內容組合。',
    }, { status: 500 })
  }
}
