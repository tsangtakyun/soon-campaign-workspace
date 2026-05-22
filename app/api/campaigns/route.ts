import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

type CreateCampaignBody = {
  title?: string
  body?: string
  workspace_id?: string
  type?: string
  status?: string
}

function scheduledTomorrow() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(10, 0, 0, 0)
  return date.toISOString()
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json().catch(() => ({}))) as CreateCampaignBody
    const title = typeof payload.title === 'string' ? payload.title.trim() : ''
    const body = typeof payload.body === 'string' ? payload.body.trim() : ''
    const workspaceId = typeof payload.workspace_id === 'string' ? payload.workspace_id.trim() : ''
    const postType = typeof payload.type === 'string' ? payload.type.trim() : 'seo'
    const status = typeof payload.status === 'string' ? payload.status.trim() : 'draft'

    if (!title || !body || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminSupabase()
    const [{ data: membership }, { data: workspace }] = await Promise.all([
      supabase
        .from('workspace_members')
        .select('workspace_id,status')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('workspaces')
        .select('id,owner_id')
        .eq('id', workspaceId)
        .maybeSingle(),
    ])

    if (!membership?.workspace_id && workspace?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const sourceKey = `seo-${Date.now()}`
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        source_key: sourceKey,
        name: title,
        theme: 'SEO 社交內容',
        strategy_id: 'seo-social-plan',
        strategy_title: 'SEO 社交計劃',
        strategy_emoji: '📈',
        starts_on: now.slice(0, 10),
        duration_weeks: 1,
        status,
        campaign_themes: [{ title, body, source: 'seo-social-plan' }],
        topic_review: [{ title, body, type: postType }],
        updated_at: now,
      })
      .select('id,name')
      .single()

    if (campaignError) throw campaignError

    const { data: post, error: postError } = await supabase
      .from('campaign_posts')
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        campaign_id: campaign.id,
        source_key: `${sourceKey}-post`,
        title,
        body,
        post_type: postType,
        scheduled_at: scheduledTomorrow(),
        status,
        captions: {
          source: 'seo-social-plan',
          keyword: title,
          generatedContent: body,
        },
        updated_at: now,
      })
      .select('id,title')
      .single()

    if (postError) throw postError

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      postId: post.id,
    })
  } catch (error) {
    console.error('[api/campaigns] create', error)
    return NextResponse.json(
      { error: 'Failed to create campaign', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
