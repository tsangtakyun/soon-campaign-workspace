import { NextResponse } from 'next/server'
import { recommendContentStrategy } from '@/lib/content-strategy'
import { getContentStrategyLibrary } from '@/lib/content-strategy-library-store'
import { getStrategyLibrary } from '@/lib/strategy-library-store'
import { consumeApiQuota, requirePlatformUser } from '@/lib/platform-access'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const auth = await requirePlatformUser()
  if (auth.error) return auth.error
  if (!(await consumeApiQuota(auth.access.user.id, 'content-strategy', 30))) {
    return NextResponse.json({ error: '請求次數過多，請稍後再試。' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const profile = body?.profile
    const language = body?.language || profile?.language || '繁體中文'

    if (!profile || typeof profile !== 'object') {
      return NextResponse.json({ error: '缺少品牌資料。' }, { status: 400 })
    }

    const [library, contentStrategies] = await Promise.all([
      getStrategyLibrary(),
      getContentStrategyLibrary(),
    ])
    const recommendation = await recommendContentStrategy(profile, language, library, contentStrategies)
    return NextResponse.json(recommendation)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '暫時未能建立內容策略。' }, { status: 500 })
  }
}
