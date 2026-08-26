import { NextResponse } from 'next/server'

import { generateFollowUpAnswer } from '@/lib/ai-follow-up'
import type { CampaignFormInput } from '@/lib/analysis'
import { consumeApiQuota, requirePlatformUser } from '@/lib/platform-access'

type FollowUpRequest = {
  form?: CampaignFormInput
  sectionTitle?: string
  item?: string
  question?: string
}

export async function POST(request: Request) {
  const auth = await requirePlatformUser()
  if (auth.error) return auth.error
  if (!(await consumeApiQuota(auth.access.user.id, 'ai-follow-up', 30))) {
    return NextResponse.json({ error: '請求次數過多，請稍後再試。' }, { status: 429 })
  }

  let body: FollowUpRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!body.form || !body.sectionTitle || !body.item || !body.question?.trim()) {
    return NextResponse.json({ error: 'Missing follow-up payload' }, { status: 400 })
  }

  try {
    const result = await generateFollowUpAnswer({
      form: body.form,
      sectionTitle: body.sectionTitle,
      item: body.item,
      question: body.question.trim(),
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to generate follow-up answer' }, { status: 500 })
  }
}
