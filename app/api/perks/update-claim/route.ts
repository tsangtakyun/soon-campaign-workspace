import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/server-supabase'

type UpdateClaimBody = {
  claim_id?: string
  perk_id?: string
  status?: string
  brand_notes?: string | null
  creator_username?: string | null
}

export async function POST(req: Request) {
  const { claim_id, perk_id, status, brand_notes, creator_username } = (await req.json()) as UpdateClaimBody

  if (!claim_id || !perk_id || !status || !creator_username) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabaseAdmin = createAdminSupabase()

  const { error } = await supabaseAdmin
    .from('perk_claims')
    .update({ status, brand_notes: brand_notes ?? null, updated_at: new Date().toISOString() })
    .eq('id', claim_id)

  if (error) {
    console.error('[perks/update-claim] DB error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const eggRes = await fetch(`${process.env.EGG_BASE_URL}/api/perks/status-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-soon-api-key': process.env.SOON_INTERNAL_API_KEY!,
    },
    body: JSON.stringify({
      perk_id,
      creator_username,
      status,
      brand_notes: brand_notes ?? null,
    }),
  })

  const eggData = await eggRes.json().catch(() => null)
  console.log('[update-claim] EGG sync:', eggRes.status, eggData)

  if (!eggRes.ok) {
    console.error('[perks/update-claim] EGG sync failed:', eggRes.status, eggData)
    return NextResponse.json({ error: 'EGG sync failed', detail: eggData }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
