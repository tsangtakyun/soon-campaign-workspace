import { NextResponse } from 'next/server'

import { analyzeWebsiteWithClaude } from '@/lib/website-analysis'
import { consumeApiQuota, requirePlatformUser } from '@/lib/platform-access'

type AnalyzeWebsiteRequest = {
  website?: string
  language?: string
  name?: string
  budget?: string
  category?: string
  plan?: string
}

export async function POST(request: Request) {
  const auth = await requirePlatformUser()
  if (auth.error) return auth.error
  if (!(await consumeApiQuota(auth.access.user.id, 'analyze-website', 20))) {
    return NextResponse.json({ error: '請求次數過多，請稍後再試。' }, { status: 429 })
  }

  let body: AnalyzeWebsiteRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!body.website?.trim()) {
    return NextResponse.json({ error: 'Missing website' }, { status: 400 })
  }

  try {
    const result = await analyzeWebsiteWithClaude({
      website: body.website.trim(),
      language: body.language || '繁體中文',
      name: body.name,
      budget: body.budget,
      category: body.category,
      plan: body.plan,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to analyze website' }, { status: 500 })
  }
}
