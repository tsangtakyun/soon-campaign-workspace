import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { anthropicModel } from '@/lib/anthropic-models'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

function clean(value: unknown, max = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function list(value: unknown, limit = 8) {
  return Array.isArray(value) ? value.map((item) => clean(item, 300)).filter(Boolean).slice(0, limit) : []
}

function parseJson(value: string) {
  const text = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text) as Record<string, unknown>
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const workspaceId = clean(form.get('workspaceId'), 80)
    const prompt = clean(form.get('prompt'), 2000)
    const files = [...form.getAll('files'), form.get('file')].filter((item): item is File => item instanceof File && item.size > 0).slice(0, 6)
    if (!files.length || !workspaceId) return NextResponse.json({ error: '請上載至少一張圖片' }, { status: 400 })
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024)) {
      return NextResponse.json({ error: '每張圖片必須是 JPG、PNG 或 WebP，並小於 8MB' }, { status: 400 })
    }

    const server = createServerSupabase(await cookies())
    const { data: { user } } = await server.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access?.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI service is not configured' }, { status: 500 })
    const imageContent = await Promise.all(files.map(async (file) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: file.type, data: Buffer.from(await file.arrayBuffer()).toString('base64') },
    })))
    const instruction = [
      `綜合分析用家剛拍攝或上載的 ${files.length} 張產品／服務圖片，協助建立 marketing campaign brief。不同角度可能是同一件產品，不要當成多件產品。`,
      '只把圖片中清楚可見的文字列為 visibleClaims。不要把常識、外觀推測、功效、成分、價格或受眾當成已確認事實。',
      '如果名稱無法清楚辨認，suggestedName 留空。推測內容只可放 hypotheses，並用「可能」語氣。',
      `用家補充：${prompt || '沒有'}`,
      '只輸出繁體中文 JSON：',
      'targetAudienceHypotheses 要提供 2 至 4 個簡短、互不重複而且可供用家點選的受眾選項。',
      'contentPreferenceOptions 要提供 3 至 5 個適合這類宣傳的「必須包括」或「避免」選項；每項必須清楚標示「包括：」或「避免：」。',
      JSON.stringify({ suggestedName: '', category: '', visibleClaims: [''], hypotheses: [''], targetAudienceHypotheses: [''], contentPreferenceOptions: ['包括：清楚顯示產品名稱', '避免：未經證實的功效'], questions: ['最多三條真正需要用家回答的問題'] }),
    ].join('\n\n')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: anthropicModel(process.env.ANTHROPIC_PRODUCT_MODEL), max_tokens: 1200, temperature: 0.1,
        system: 'You are SOON Product Intake. Be conservative and return valid JSON only.',
        messages: [{ role: 'user', content: [...imageContent, { type: 'text', text: instruction }] }],
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.error?.message || 'AI request failed')
    const responseText = Array.isArray(payload.content) ? payload.content.filter((item: { type?: string }) => item.type === 'text').map((item: { text?: string }) => item.text || '').join('\n') : ''
    const raw = parseJson(responseText)
    return NextResponse.json({ analysis: {
      suggestedName: clean(raw.suggestedName, 200), category: clean(raw.category, 200),
      visibleClaims: list(raw.visibleClaims), hypotheses: list(raw.hypotheses),
      targetAudienceHypotheses: list(raw.targetAudienceHypotheses, 4),
      contentPreferenceOptions: list(raw.contentPreferenceOptions, 5), questions: list(raw.questions, 3),
    } })
  } catch (error) {
    console.error('[product-source-analysis] failed', error)
    return NextResponse.json({ error: '暫時未能分析圖片', detail: String(error) }, { status: 500 })
  }
}
