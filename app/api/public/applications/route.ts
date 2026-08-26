import { NextResponse } from 'next/server'

import { isAuthorizedInternalRequest } from '@/lib/internal-api-auth'
import { createAdminSupabase } from '@/lib/server-supabase'

type ApplicationBody = {
  campaign_id?: string
  workspace_id?: string
  creator?: {
    id?: string
    username?: string
    display_name?: string | null
    avatar_url?: string | null
    instagram_handle?: string | null
    instagram_followers?: number | null
    mediakit_url?: string | null
    pitch_message?: string | null
  }
}

export async function POST(req: Request) {
  if (!isAuthorizedInternalRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as ApplicationBody | null
  const creator = body?.creator
  if (!body?.campaign_id || !body.workspace_id || !creator?.id || !creator.username) {
    return NextResponse.json({ error: 'Missing required application fields' }, { status: 400 })
  }

  const supabase = createAdminSupabase()
  const { data: campaign, error: campaignError } = await supabase
    .from('marketing_campaigns')
    .select('id,workspace_id,name')
    .eq('id', body.campaign_id)
    .eq('workspace_id', body.workspace_id)
    .maybeSingle()

  if (campaignError) {
    console.error('[public/applications] campaign lookup failed', campaignError)
    return NextResponse.json({ error: 'Failed to validate campaign' }, { status: 500 })
  }
  if (!campaign?.id) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const { data: existingApplication } = await supabase
    .from('kol_campaign_applications')
    .select('id,status')
    .eq('campaign_id', campaign.id)
    .eq('egg_creator_id', creator.id)
    .maybeSingle()

  const { data: application, error } = await supabase
    .from('kol_campaign_applications')
    .upsert(
      {
        campaign_id: campaign.id,
        workspace_id: campaign.workspace_id,
        egg_creator_id: creator.id,
        creator_username: creator.username,
        creator_display_name: creator.display_name ?? null,
        creator_avatar_url: creator.avatar_url ?? null,
        creator_ig_handle: creator.instagram_handle ?? null,
        creator_ig_followers: Math.max(0, Number(creator.instagram_followers) || 0),
        creator_mediakit_url: creator.mediakit_url ?? `https://egg.sooncreator.network/${creator.username}/mediakit`,
        pitch_message: creator.pitch_message?.trim() || null,
        status: existingApplication?.status ?? 'pending',
      },
      { onConflict: 'campaign_id,egg_creator_id' },
    )
    .select('id,status')
    .single()

  if (error) {
    console.error('[public/applications] save failed', error)
    return NextResponse.json({ error: 'Failed to save application' }, { status: 500 })
  }

  if (!existingApplication?.id) {
    await supabase.from('workspace_notifications').insert({
      workspace_id: campaign.workspace_id,
      type: 'kol_application',
      title: `${creator.display_name || creator.username} 申請咗品牌合作`,
      body: campaign.name,
      meta: {
        application_id: application.id,
        campaign_id: campaign.id,
        creator_username: creator.username,
        creator_mediakit_url: creator.mediakit_url ?? `https://egg.sooncreator.network/${creator.username}/mediakit`,
      },
    })
  }

  return NextResponse.json({ success: true, application_id: application.id, status: application.status })
}
