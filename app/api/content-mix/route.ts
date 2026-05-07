import { NextResponse } from 'next/server'

import { recommendContentMix } from '@/lib/content-mix'

export async function POST(request: Request) {
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
