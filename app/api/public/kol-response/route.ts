import { NextResponse } from 'next/server'

import { isAuthorizedInternalRequest } from '@/lib/internal-api-auth'
import { createAdminSupabase } from '@/lib/server-supabase'

type ResponseBody = {
  status?: 'accepted' | 'declined'
  cw_workspace_id?: string
  cw_campaign_id?: string
  campaign_name?: string | null
  egg_creator_id?: string
  creator_username?: string
  creator_display_name?: string | null
  creator_mediakit_url?: string | null
}

export async function POST(req: Request) {
  if (!isAuthorizedInternalRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as ResponseBody | null
  if (
    !body?.cw_workspace_id ||
    !body.cw_campaign_id ||
    !body.egg_creator_id ||
    !body.creator_username ||
    !body.status ||
    !['accepted', 'declined'].includes(body.status)
  ) {
    return NextResponse.json({ error: 'Missing required response fields' }, { status: 400 })
  }

  const supabase = createAdminSupabase()
  const { data: campaign, error: campaignError } = await supabase
    .from('marketing_campaigns')
    .select('id,workspace_id,name')
    .eq('id', body.cw_campaign_id)
    .eq('workspace_id', body.cw_workspace_id)
    .maybeSingle()

  if (campaignError) {
    console.error('[public/kol-response] campaign lookup failed', campaignError)
    return NextResponse.json({ error: 'Failed to validate campaign' }, { status: 500 })
  }
  if (!campaign?.id) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const { data: existingApplication } = await supabase
    .from('kol_campaign_applications')
    .select('id,status')
    .eq('campaign_id', campaign.id)
    .eq('egg_creator_id', body.egg_creator_id)
    .maybeSingle()

  const { data: application, error: applicationError } = await supabase
    .from('kol_campaign_applications')
    .upsert(
      {
        campaign_id: campaign.id,
        workspace_id: campaign.workspace_id,
        egg_creator_id: body.egg_creator_id,
        creator_username: body.creator_username,
        creator_display_name: body.creator_display_name ?? null,
        creator_mediakit_url: body.creator_mediakit_url ?? null,
        status: body.status,
        reviewed_at: new Date().toISOString(),
      },
      { onConflict: 'campaign_id,egg_creator_id' },
    )
    .select('id,status')
    .single()

  if (applicationError) {
    console.error('[public/kol-response] application save failed', applicationError)
    return NextResponse.json({ error: 'Failed to save creator response' }, { status: 500 })
  }

  const dealStatus = body.status === 'accepted' ? 'accepted' : 'declined'
  const { error: briefError } = await supabase
    .from('project_briefs')
    .update({
      deal_status: dealStatus,
      kol_confirmed_at: body.status === 'accepted' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('campaign_id', campaign.id)
    .eq('workspace_id', campaign.workspace_id)
    .eq('creator_username', body.creator_username)
  if (briefError) console.error('[public/kol-response] brief update failed', briefError)

  if (existingApplication?.status !== body.status) {
    await supabase.from('workspace_notifications').insert({
      workspace_id: campaign.workspace_id,
      type: 'kol_response',
      title: `${body.creator_display_name || body.creator_username}${body.status === 'accepted' ? ' 接受咗邀請' : ' 婉拒咗邀請'}`,
      body: body.campaign_name || campaign.name,
      meta: {
        application_id: application.id,
        campaign_id: campaign.id,
        creator_username: body.creator_username,
        creator_mediakit_url: body.creator_mediakit_url,
        status: body.status,
      },
    })
  }

  return NextResponse.json({ success: true, application_id: application.id, status: application.status })
}
