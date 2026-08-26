import { NextResponse } from 'next/server'

import { generateCampaignTheme } from '@/lib/campaign-theme'
import { consumeApiQuota, requirePlatformUser } from '@/lib/platform-access'

export async function POST(request: Request) {
  const auth = await requirePlatformUser()
  if (auth.error) return auth.error
  if (!(await consumeApiQuota(auth.access.user.id, 'campaign-theme', 30))) {
    return NextResponse.json({ error: '請求次數過多，請稍後再試。' }, { status: 429 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  try {
    const payload = (body || {}) as Parameters<typeof generateCampaignTheme>[0]
    const campaign = await generateCampaignTheme(payload)
    return NextResponse.json(campaign)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '暫時未能生成 campaign 方向。' }, { status: 500 })
  }
}
