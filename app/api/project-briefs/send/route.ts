import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/server-supabase'

export async function POST(req: Request) {
  const body = await req.json()
  const briefId = typeof body.brief_id === 'string' ? body.brief_id : ''
  const workspaceId = typeof body.workspace_id === 'string' ? body.workspace_id : ''

  if (!briefId) {
    return NextResponse.json({ error: 'Missing brief_id' }, { status: 400 })
  }

  const supabase = createAdminSupabase()
  const { data: brief, error } = await supabase
    .from('project_briefs')
    .select('*, workspaces(name)')
    .eq('id', briefId)
    .single()

  if (error || !brief) {
    return NextResponse.json({ error: 'Brief not found' }, { status: 404 })
  }

  const resolvedWorkspaceId = workspaceId || brief.workspace_id

  await supabase
    .from('project_briefs')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', briefId)

  const eggBaseUrl = process.env.EGG_BASE_URL
  const internalKey = process.env.SOON_INTERNAL_API_KEY

  if (!eggBaseUrl || !internalKey) {
    return NextResponse.json({ error: 'SOON-EGG integration is not configured' }, { status: 500 })
  }

  const res = await fetch(`${eggBaseUrl}/api/briefs/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-soon-api-key': internalKey,
    },
    body: JSON.stringify({
      cw_brief_id: brief.id,
      cw_workspace_id: resolvedWorkspaceId,
      cw_campaign_id: brief.campaign_id,
      brand_name: brief.workspaces?.name,
      creator_username: brief.creator_username,
      title: brief.title,
      background: brief.background,
      objectives: brief.objectives,
      deliverables: brief.deliverables,
      timeline: brief.timeline,
      budget: brief.budget,
      dos: brief.dos,
      donts: brief.donts,
      reference_links: brief.reference_links,
      additional_notes: brief.additional_notes,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.success) {
    return NextResponse.json({ error: 'EGG delivery failed', detail: data }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
