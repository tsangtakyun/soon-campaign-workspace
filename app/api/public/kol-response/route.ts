import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/server-supabase'

type KolResponseBody = {
  cw_workspace_id?: string | null
  cw_campaign_id?: string | null
  campaign_name?: string | null
  creator_username?: string | null
  creator_display_name?: string | null
  creator_mediakit_url?: string | null
  status?: 'accepted' | 'declined'
}

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-soon-api-key')
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as KolResponseBody
  const {
    cw_workspace_id,
    cw_campaign_id,
    campaign_name,
    creator_username,
    creator_display_name,
    creator_mediakit_url,
    status,
  } = body

  if (!cw_workspace_id || !status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createAdminSupabase()
  const isAccepted = status === 'accepted'
  const creatorName = creator_display_name || creator_username || 'KOL'

  const { error } = await supabase.from('workspace_notifications').insert({
    workspace_id: cw_workspace_id,
    type: 'kol_response',
    title: isAccepted ? `${creatorName} 接受了合作邀請` : `${creatorName} 婉拒了合作邀請`,
    body: `Campaign：${campaign_name || '未命名 Campaign'}`,
    meta: {
      campaign_id: cw_campaign_id,
      campaign_name,
      creator_username,
      creator_display_name,
      creator_mediakit_url,
      status,
    },
    is_read: false,
  })

  if (error) {
    console.error('Notification insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
