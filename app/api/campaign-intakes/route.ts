import { NextResponse } from 'next/server'

import { createAdminSupabase } from '@/lib/server-supabase'

type CampaignIntakePayload = {
  id?: string
  contactName?: string
  objective?: string
  businessName?: string
  whatsapp?: string
  email?: string
  campaignTitle?: string
  vertical?: string
  budgetRange?: string
  brief?: string
  mustInclude?: string
  aiSummary?: string
  suggestedBudgetShape?: string
  suggestedAngle?: string
  suggestedDeliverableShape?: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_LENGTHS = {
  contactName: 120,
  objective: 80,
  businessName: 200,
  whatsapp: 80,
  email: 254,
  campaignTitle: 200,
  vertical: 80,
  budgetRange: 80,
  brief: 8000,
  mustInclude: 12000,
  aiSummary: 8000,
  suggestedBudgetShape: 4000,
  suggestedAngle: 4000,
  suggestedDeliverableShape: 4000,
} as const

function clean(value?: string) {
  return (value || '').trim()
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CampaignIntakePayload
    const payload = {
      id: clean(body.id),
      contactName: clean(body.contactName),
      objective: clean(body.objective),
      businessName: clean(body.businessName),
      whatsapp: clean(body.whatsapp),
      email: clean(body.email).toLowerCase(),
      campaignTitle: clean(body.campaignTitle),
      vertical: clean(body.vertical),
      budgetRange: clean(body.budgetRange),
      brief: clean(body.brief),
      mustInclude: clean(body.mustInclude),
      aiSummary: clean(body.aiSummary),
      suggestedBudgetShape: clean(body.suggestedBudgetShape),
      suggestedAngle: clean(body.suggestedAngle),
      suggestedDeliverableShape: clean(body.suggestedDeliverableShape),
    }

    if (!UUID_RE.test(payload.id)) {
      return NextResponse.json({ error: '需求編號格式不正確。' }, { status: 400 })
    }
    if (!payload.contactName || !payload.businessName || !payload.email || !payload.brief) {
      return NextResponse.json({ error: '請填寫聯絡人、品牌、電郵及宣傳需求。' }, { status: 400 })
    }
    if (!EMAIL_RE.test(payload.email)) {
      return NextResponse.json({ error: '請輸入有效電郵地址。' }, { status: 400 })
    }

    const tooLong = (Object.keys(MAX_LENGTHS) as Array<keyof typeof MAX_LENGTHS>).some(
      (key) => payload[key].length > MAX_LENGTHS[key]
    )
    if (tooLong) {
      return NextResponse.json({ error: '部分資料過長，請縮短後再提交。' }, { status: 400 })
    }

    const supabase = createAdminSupabase()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await supabase
      .from('campaign_intakes')
      .select('id', { count: 'exact', head: true })
      .eq('email', payload.email)
      .gte('created_at', oneHourAgo)

    if (countError) throw countError
    if ((count || 0) >= 5) {
      return NextResponse.json({ error: '提交次數過多，請稍後再試。' }, { status: 429 })
    }

    const { error } = await supabase.from('campaign_intakes').insert({
      id: payload.id,
      contact_name: payload.contactName,
      objective: payload.objective,
      business_name: payload.businessName,
      whatsapp: payload.whatsapp,
      email: payload.email,
      campaign_title: payload.campaignTitle,
      vertical: payload.vertical,
      budget_range: payload.budgetRange,
      brief: payload.brief,
      must_include: payload.mustInclude,
      ai_summary: payload.aiSummary,
      suggested_budget_shape: payload.suggestedBudgetShape,
      suggested_angle: payload.suggestedAngle,
      suggested_deliverable_shape: payload.suggestedDeliverableShape,
      source_channel: 'soon-campaign-workspace',
    })

    if (error) throw error
    return NextResponse.json({ ok: true, campaignIntakeId: payload.id })
  } catch (error) {
    console.error('[campaign-intakes] unable to save intake', error)
    return NextResponse.json({ error: '暫時未能記錄品牌需求。' }, { status: 500 })
  }
}
