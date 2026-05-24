import { createAdminSupabase } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

type PerkClaimBody = {
  perk_id?: string
  creator_username?: string | null
  creator_display_name?: string | null
  creator_mediakit_url?: string | null
  type?: 'service' | 'product'
  preferred_date?: string | null
  preferred_time?: string | null
  party_size?: number | null
  delivery_name?: string | null
  delivery_phone?: string | null
  delivery_address?: string | null
  delivery_district?: string | null
  delivery_notes?: string | null
}

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-soon-api-key')
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as PerkClaimBody

  if (!body.perk_id || !body.creator_username || !body.type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabaseAdmin = createAdminSupabase()

  const { error } = await supabaseAdmin.from('perk_claims').insert({
    perk_id: body.perk_id,
    egg_creator_username: body.creator_username,
    type: body.type,
    preferred_date: body.preferred_date ?? null,
    preferred_time: body.preferred_time ?? null,
    party_size: body.party_size ?? 1,
    delivery_name: body.delivery_name ?? null,
    delivery_phone: body.delivery_phone ?? null,
    delivery_address: body.delivery_address ?? null,
    delivery_district: body.delivery_district ?? null,
    delivery_notes: body.delivery_notes ?? null,
    status: 'pending',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: perk } = await supabaseAdmin
    .from('brand_perks')
    .select('workspace_id, title')
    .eq('id', body.perk_id)
    .single()

  if (perk) {
    await supabaseAdmin.from('workspace_notifications').insert({
      workspace_id: perk.workspace_id,
      type: 'perk_claimed',
      title: `${body.creator_display_name || body.creator_username} 申請咗「${perk.title}」`,
      body:
        body.type === 'service'
          ? `預計日期：${body.preferred_date || '未指定'} · 人數：${body.party_size ?? 1}`
          : `寄送至：${body.delivery_district || ''} ${body.delivery_address || ''}`.trim(),
      meta: {
        perk_id: body.perk_id,
        perk_title: perk.title,
        creator_username: body.creator_username,
        creator_display_name: body.creator_display_name,
        creator_mediakit_url: body.creator_mediakit_url,
        type: body.type,
        preferred_date: body.preferred_date,
        preferred_time: body.preferred_time,
        party_size: body.party_size,
        delivery_name: body.delivery_name,
        delivery_phone: body.delivery_phone,
        delivery_address: body.delivery_address,
        delivery_district: body.delivery_district,
      },
      is_read: false,
    })
  }

  return NextResponse.json({ success: true })
}
