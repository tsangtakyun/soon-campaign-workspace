import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

async function requireWorkspace(workspaceId: string) {
  const serverSupabase = createServerSupabase(await cookies())
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const admin = createAdminSupabase()
  const email = user.email?.toLowerCase() || ''
  const [{ data: workspace }, { data: userMembership }, { data: emailMembership }] = await Promise.all([
    admin.from('workspaces').select('id').eq('id', workspaceId).eq('owner_id', user.id).maybeSingle(),
    admin
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .eq('user_id', user.id)
      .maybeSingle(),
    email
      ? admin
          .from('workspace_members')
          .select('workspace_id')
          .eq('workspace_id', workspaceId)
          .eq('status', 'active')
          .ilike('email', email)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  if (!workspace && !userMembership && !emailMembership) {
    return { error: NextResponse.json({ error: '你並非這個 workspace 的成員' }, { status: 403 }) }
  }
  return { admin, user }
}

function toIdea(row: any) {
  const generated = row.source === 'SOON 專屬題材'
  const [summary = '', generatedDetails = ''] = String(row.note || '').split('\n\n點解值得做：')
  const [whyNow = '', hook = ''] = generatedDetails.split('\n開場 Hook：')
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    url: generated ? undefined : row.source_url,
    image: row.image_url || '',
    height: row.height,
    category: row.category,
    tags: Array.isArray(row.tags) ? row.tags : [],
    note: generated ? summary : row.note,
    whyNow: generated ? whyNow : undefined,
    hook: generated ? hook : undefined,
  }
}

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId') || ''
  if (!workspaceId) return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  const auth = await requireWorkspace(workspaceId)
  if (auth.error) return auth.error

  const [{ data, error }, { data: dismissals, error: dismissalError }] = await Promise.all([
    auth.admin
      .from('workspace_topic_ideas')
      .select('id,title,source,source_url,image_url,height,category,tags,note,created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    auth.admin
      .from('workspace_topic_idea_dismissals')
      .select('idea_id')
      .eq('workspace_id', workspaceId),
  ])
  if (error || dismissalError) return NextResponse.json({ error: error?.message || dismissalError?.message }, { status: 500 })
  return NextResponse.json({
    ideas: (data || []).map(toIdea),
    dismissedIdeaIds: (dismissals || []).map((row: any) => row.idea_id),
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId : ''
  const idea = body?.idea
  if (!workspaceId || !idea?.url || !idea?.title) {
    return NextResponse.json({ error: 'Missing workspace or idea' }, { status: 400 })
  }
  const auth = await requireWorkspace(workspaceId)
  if (auth.error) return auth.error

  const { data, error } = await auth.admin
    .from('workspace_topic_ideas')
    .upsert({
      workspace_id: workspaceId,
      title: String(idea.title).slice(0, 200),
      source: String(idea.source || new URL(idea.url).hostname).slice(0, 200),
      source_url: String(idea.url),
      image_url: typeof idea.image === 'string' ? idea.image : null,
      height: ['short', 'medium', 'tall'].includes(idea.height) ? idea.height : 'medium',
      category: String(idea.category || 'Trending 最新資訊').slice(0, 100),
      tags: Array.isArray(idea.tags) ? idea.tags.slice(0, 10).map(String) : [],
      note: String(idea.note || '').slice(0, 1000),
      created_by: auth.user.id,
    }, { onConflict: 'workspace_id,source_url' })
    .select('id,title,source,source_url,image_url,height,category,tags,note,created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ idea: toIdea(data) })
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId : ''
  const ideaId = typeof body?.ideaId === 'string' ? body.ideaId : ''
  const central = body?.central === true
  if (!workspaceId || !ideaId) return NextResponse.json({ error: 'Missing workspace or idea' }, { status: 400 })
  const auth = await requireWorkspace(workspaceId)
  if (auth.error) return auth.error

  const isDatabaseIdea = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ideaId)
  if (isDatabaseIdea && !central) {
    const { error } = await auth.admin
      .from('workspace_topic_ideas')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', ideaId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await auth.admin.from('workspace_topic_idea_dismissals').upsert({
      workspace_id: workspaceId,
      idea_id: ideaId,
      dismissed_by: auth.user.id,
      dismissed_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,idea_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
