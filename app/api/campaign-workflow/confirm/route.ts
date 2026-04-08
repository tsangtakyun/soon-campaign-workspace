import { NextResponse } from 'next/server'

import { createAdminSupabase } from '@/lib/server-supabase'

type ConfirmPayload = {
  campaignIntakeId?: string
  step?: 'creator-matching' | 'script-planning' | 'storyboard-planning'
  selectedCreatorTitle?: string
  scriptPlanningDraft?: {
    corePositioning?: string
    strongestSellingPoint?: string
    suitableAudience?: string
    backgroundNotes?: string
    testContentItems?: string[]
  }
  storyboardDraft?: {
    openingShot?: string
    heroProductShot?: string
    environmentShot?: string
    ctaShot?: string
  }
}

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
  }

  let body: ConfirmPayload

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!body.campaignIntakeId || !body.step) {
    return NextResponse.json({ error: 'Missing campaignIntakeId or step' }, { status: 400 })
  }

  try {
    const supabase = createAdminSupabase()
    const { data, error } = await supabase
      .from('campaign_intakes')
      .select('id, full_analysis')
      .eq('id', body.campaignIntakeId)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const fullAnalysis = ((data.full_analysis || {}) as Record<string, unknown>)
    const workflow = ((fullAnalysis._workflow || {}) as Record<string, unknown>)
    const now = new Date().toISOString()

    if (body.step === 'creator-matching') {
      workflow.creatorMatchingConfirmedAt = now
      workflow.selectedCreatorTitle = body.selectedCreatorTitle || workflow.selectedCreatorTitle || ''
    }

    if (body.step === 'script-planning') {
      workflow.scriptPlanningConfirmedAt = now
      workflow.scriptPlanningDraft = {
        ...(workflow.scriptPlanningDraft as Record<string, unknown> || {}),
        ...(body.scriptPlanningDraft || {}),
      }
    }

    if (body.step === 'storyboard-planning') {
      workflow.storyboardPlanningConfirmedAt = now
      workflow.openingShot = body.storyboardDraft?.openingShot || workflow.openingShot || ''
      workflow.heroProductShot = body.storyboardDraft?.heroProductShot || workflow.heroProductShot || ''
      workflow.environmentShot = body.storyboardDraft?.environmentShot || workflow.environmentShot || ''
      workflow.ctaShot = body.storyboardDraft?.ctaShot || workflow.ctaShot || ''
    }

    const { error: updateError } = await supabase
      .from('campaign_intakes')
      .update({
        full_analysis: {
          ...fullAnalysis,
          _workflow: workflow,
        },
      })
      .eq('id', body.campaignIntakeId)

    if (updateError) throw updateError

    return NextResponse.json({
      ok: true,
      workflow,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to confirm workflow step' }, { status: 500 })
  }
}
