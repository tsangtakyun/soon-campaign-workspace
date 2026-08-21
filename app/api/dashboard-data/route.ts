import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url)
    const workspaceId = requestUrl.searchParams.get('workspace_id')?.trim() || ''
    if (!isUuid(workspaceId)) {
      return NextResponse.json({ error: 'Invalid workspace_id' }, { status: 400 })
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
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id,owner_id')
      .eq('id', workspaceId)
      .maybeSingle()

    if (workspaceError) throw workspaceError
    if (!workspace?.id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const memberQuery = supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .limit(1)

    const { data: membership, error: membershipError } = user.email
      ? await memberQuery.or(`user_id.eq.${user.id},email.ilike.${user.email.toLowerCase()}`).maybeSingle()
      : await memberQuery.eq('user_id', user.id).maybeSingle()

    if (membershipError) throw membershipError
    if (workspace.owner_id !== user.id && !membership?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [postsResult, campaignsResult, brandKitResult, connectionsResult, creditsResult, contentProjectsResult, reviewNotesResult] = await Promise.all([
      supabase
        .from('campaign_posts')
        .select('id,campaign_id,title,body,post_type,scheduled_at,posted_at,image_url,status,source_key,captions,marketing_campaigns(name,strategy_emoji)')
        .eq('workspace_id', workspaceId)
        .order('scheduled_at', { ascending: true })
        .limit(30),
      supabase
        .from('marketing_campaigns')
        .select('id,name,strategy_title,strategy_emoji,starts_on,status')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('brand_kits')
        .select('business_name,logo_url')
        .eq('workspace_id', workspaceId)
        .maybeSingle(),
      supabase
        .from('social_connections')
        .select('platform,account_name')
        .eq('workspace_id', workspaceId)
        .order('connected_at', { ascending: false }),
      supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('content_projects')
        .select('id,title,selected_format,production,updated_at')
        .eq('workspace_id', workspaceId)
        .eq('stage', 'approval')
        .order('updated_at', { ascending: false })
        .limit(20),
      supabase.from('review_notes').select('id,project_id,post_id,page_number,original_text,reviewer,created_at,resolved').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(30),
    ])

    console.log('[api/dashboard-data] loaded', {
      userId: user.id,
      workspaceId,
      postsCount: postsResult.data?.length || 0,
      campaignsCount: campaignsResult.data?.length || 0,
      connectionsCount: connectionsResult.data?.length || 0,
      brandName: brandKitResult.data?.business_name || null,
      errors: {
        brandKit: brandKitResult.error?.message || null,
        campaigns: campaignsResult.error?.message || null,
        connections: connectionsResult.error?.message || null,
        credits: creditsResult.error?.message || null,
        posts: postsResult.error?.message || null,
        contentProjects: contentProjectsResult.error?.message || null,
      },
    })

    return NextResponse.json({
      brandKit: brandKitResult.data || null,
      campaigns: campaignsResult.data || [],
      connections: connectionsResult.data || [],
      credits: creditsResult.data || null,
      errors: {
        brandKit: brandKitResult.error?.message || null,
        campaigns: campaignsResult.error?.message || null,
        connections: connectionsResult.error?.message || null,
        credits: creditsResult.error?.message || null,
        posts: postsResult.error?.message || null,
      },
      posts: postsResult.data || [],
      contentProjects: contentProjectsResult.data || [],
      reviewNotes: reviewNotesResult.data || [],
    })
  } catch (error) {
    console.error('[api/dashboard-data] failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load dashboard data' },
      { status: 500 }
    )
  }
}
