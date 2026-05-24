import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/server-supabase'

type DealConfirmedBody = {
  cw_brief_id?: string | null
  cw_workspace_id?: string | null
  creator_username?: string | null
  creator_display_name?: string | null
  creator_mediakit_url?: string | null
  creator_ig_followers?: number | null
  brief_title?: string | null
  brand_name?: string | null
  first_submission_date?: string | null
  final_submission_date?: string | null
  notes?: string | null
}

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-soon-api-key')
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as DealConfirmedBody
  const {
    cw_brief_id,
    cw_workspace_id,
    creator_username,
    creator_display_name,
    creator_mediakit_url,
    creator_ig_followers,
    brief_title,
    brand_name,
    first_submission_date,
    final_submission_date,
    notes,
  } = body

  if (!cw_brief_id || !cw_workspace_id || !first_submission_date) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createAdminSupabase()
  const confirmedAt = new Date().toISOString()

  const { error: briefError } = await supabase
    .from('project_briefs')
    .update({
      deal_status: 'confirmed',
      kol_confirmed_at: confirmedAt,
      kol_first_submission_date: first_submission_date,
      kol_final_submission_date: final_submission_date ?? null,
      kol_confirmation_notes: notes ?? null,
    })
    .eq('id', cw_brief_id)

  if (briefError) {
    console.error('Project brief confirm update error:', briefError)
    return NextResponse.json({ error: briefError.message }, { status: 500 })
  }

  const creatorName = creator_display_name || creator_username || 'KOL'
  const { error: notificationError } = await supabase.from('workspace_notifications').insert({
    workspace_id: cw_workspace_id,
    type: 'deal_confirmed',
    title: `${creatorName} 確認咗合作條款`,
    body: `${brief_title || 'Project Brief'} · 首次交稿：${first_submission_date}`,
    meta: {
      creator_username,
      creator_display_name,
      creator_mediakit_url,
      creator_ig_followers,
      brief_title,
      brand_name,
      first_submission_date,
      final_submission_date,
      notes,
    },
    is_read: false,
  })

  if (notificationError) {
    console.error('Deal confirmed notification insert error:', notificationError)
    return NextResponse.json({ error: notificationError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
