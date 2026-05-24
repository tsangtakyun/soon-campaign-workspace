import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/server-supabase'

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-soon-api-key')
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.egg_creator_id || !body.cw_campaign_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const eggBaseUrl = process.env.EGG_BASE_URL
  const internalKey = process.env.SOON_INTERNAL_API_KEY

  if (!eggBaseUrl || !internalKey) {
    console.error('[invitations] SOON-EGG integration env is missing')
    return NextResponse.json({ error: 'SOON-EGG integration is not configured' }, { status: 500 })
  }

  const supabase = createAdminSupabase()
  const workspaceId = typeof body.cw_workspace_id === 'string' ? body.cw_workspace_id : null
  let brandOverview: string | null = null
  let brandWebsite: string | null = null

  if (workspaceId) {
    let { data: brandProfile } = await supabase
      .from('brand_profiles')
      .select('business_name, business_overview')
      .eq('workspace_id', workspaceId)
      .single()

    if (!brandProfile?.business_overview && brandProfile?.business_name) {
      const { data: fallback } = await supabase
        .from('brand_profiles')
        .select('business_overview')
        .eq('business_name', brandProfile.business_name)
        .not('business_overview', 'is', null)
        .limit(1)
        .single()

      if (fallback?.business_overview) {
        brandProfile = { ...brandProfile, business_overview: fallback.business_overview }
      }
    }

    brandOverview = brandProfile?.business_overview ?? null

    const { data: brandKit } = await supabase
      .from('brand_kits')
      .select('website_url')
      .eq('workspace_id', workspaceId)
      .not('website_url', 'is', null)
      .limit(1)
      .single()

    brandWebsite = brandKit?.website_url ?? null
  }

  const forwardedBody = {
    ...body,
    brand_overview: brandOverview,
    brand_website: brandWebsite,
    budget_range: body.budget_range ?? null,
    collab_formats: body.collab_formats ?? null,
  }

  let eggRes: Response
  try {
    eggRes = await fetch(`${eggBaseUrl}/api/invitations/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-soon-api-key': internalKey,
      },
      body: JSON.stringify(forwardedBody),
    })
  } catch (err) {
    console.error('[invitations] fetch to EGG failed:', err)
    return NextResponse.json({ error: 'Failed to reach SOON-EGG' }, { status: 502 })
  }

  let eggData: unknown
  try {
    eggData = await eggRes.json()
  } catch {
    eggData = null
  }

  console.log('[invitations] EGG response status:', eggRes.status, 'body:', eggData)

  if (!eggRes.ok) {
    return NextResponse.json({ error: 'EGG rejected invitation', detail: eggData }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
