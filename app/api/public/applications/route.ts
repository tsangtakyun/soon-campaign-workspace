import { createAdminSupabase } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

type CreatorPayload = {
  id?: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  instagram_handle?: string | null
  instagram_followers?: number | null
  pitch_message?: string | null
}

type ApplicationPayload = {
  campaign_id?: string
  workspace_id?: string | null
  creator?: CreatorPayload
}

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-soon-api-key')
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { campaign_id, workspace_id, creator } =
    (await req.json()) as ApplicationPayload

  if (!campaign_id || !creator?.id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminSupabase()

  const { error } = await supabase
    .from('kol_campaign_applications')
    .upsert(
      {
        campaign_id,
        workspace_id,
        egg_creator_id: creator.id,
        creator_username: creator.username,
        creator_display_name: creator.display_name,
        creator_avatar_url: creator.avatar_url,
        creator_ig_handle: creator.instagram_handle,
        creator_ig_followers: creator.instagram_followers ?? 0,
        creator_mediakit_url: creator.username
          ? `https://egg.sooncreator.network/${creator.username}/mediakit`
          : null,
        pitch_message: creator.pitch_message ?? null,
        status: 'pending',
      },
      { onConflict: 'campaign_id,egg_creator_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
