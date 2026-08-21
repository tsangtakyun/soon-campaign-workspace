import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

async function currentUser() {
  const supabase = createServerSupabase(await cookies())
  const { data: { user } } = await supabase.auth.getUser()
  return user || null
}

export async function GET(req: Request) {
  try {
    const workspaceId = new URL(req.url).searchParams.get('workspaceId') || ''
    if (!isUuid(workspaceId)) return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 })
    const user = await currentUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (access.role !== 'owner' && access.role !== 'admin') {
      return NextResponse.json({ error: '內容製作只限 Workspace Owner 或 Admin' }, { status: 403 })
    }

    const { data, error } = await access.admin
      .from('content_projects')
      .select('id,title,source_url,source_name,source_note,stage,selected_format,brief,format_decision,production,created_by,created_at,updated_at')
      .eq('workspace_id', workspaceId)
      .neq('stage', 'archived')
      .order('updated_at', { ascending: false })
    if (error) throw error

    const creatorIds = Array.from(new Set((data || []).map((project: any) => project.created_by).filter(Boolean)))
    const creators = new Map<string, { avatarUrl: string | null; displayName: string }>()
    await Promise.all(creatorIds.map(async (creatorId) => {
      const { data: creatorData } = await access.admin.auth.admin.getUserById(creatorId)
      const creator = creatorData.user
      if (!creator) return
      const metadata = creator.user_metadata || {}
      const emailName = creator.email?.split('@')[0] || 'Workspace Admin'
      creators.set(creatorId, {
        avatarUrl: metadata.avatar_url || metadata.picture || null,
        displayName:
          metadata.preferred_username ||
          metadata.user_name ||
          metadata.name ||
          metadata.full_name ||
          emailName,
      })
    }))

    return NextResponse.json({
      permissions: {
        canApprove: access.canApprove,
        canEdit: access.canEdit,
        canManagePrompt: access.canManagePrompt,
        canManageWorkspace: access.canManageWorkspace,
        role: access.role,
      },
      projects: (data || []).map((project: any) => ({
        ...project,
        creator: project.created_by ? creators.get(project.created_by) || null : null,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load content projects', detail: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!isUuid(workspaceId) || !title) return NextResponse.json({ error: 'Missing workspace or title' }, { status: 400 })
    const user = await currentUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access || (access.role !== 'owner' && access.role !== 'admin')) {
      return NextResponse.json({ error: '內容製作只限 Workspace Owner 或 Admin' }, { status: 403 })
    }

    const topicIdeaId = isUuid(body.topicIdeaId) ? body.topicIdeaId : null
    const { data: prompt } = await access.admin
      .from('workspace_prompt_versions')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data, error } = await access.admin
      .from('content_projects')
      .insert({
        workspace_id: workspaceId,
        topic_idea_id: topicIdeaId,
        prompt_version_id: prompt?.id || null,
        title: title.slice(0, 240),
        source_url: typeof body.sourceUrl === 'string' ? body.sourceUrl : null,
        source_name: typeof body.sourceName === 'string' ? body.sourceName.slice(0, 200) : null,
        source_note: typeof body.sourceNote === 'string' ? body.sourceNote.slice(0, 3000) : null,
        stage: 'brief',
        created_by: user.id,
        updated_by: user.id,
      })
      .select('id,title,stage')
      .single()
    if (error) throw error
    return NextResponse.json({ project: data, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create content project', detail: String(error) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''
    if (!isUuid(workspaceId) || !isUuid(projectId)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    const user = await currentUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access || (access.role !== 'owner' && access.role !== 'admin')) {
      return NextResponse.json({ error: '內容製作只限 Workspace Owner 或 Admin' }, { status: 403 })
    }

    const allowedStages = new Set(['brief', 'format', 'production', 'approval', 'scheduled', 'archived'])
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: user.id }
    if (body.brief && typeof body.brief === 'object') updates.brief = body.brief
    if (body.formatDecision && typeof body.formatDecision === 'object') updates.format_decision = body.formatDecision
    if (body.production && typeof body.production === 'object') updates.production = body.production
    if (typeof body.selectedFormat === 'string') updates.selected_format = body.selectedFormat.slice(0, 100)
    if (typeof body.stage === 'string' && allowedStages.has(body.stage)) updates.stage = body.stage

    const { data, error } = await access.admin
      .from('content_projects')
      .update(updates)
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .select('id,title,stage,selected_format,brief,format_decision,production,updated_at')
      .single()
    if (error) throw error
    if (updates.stage === 'archived') {
      const { error: withdrawError } = await access.admin
        .from('campaign_posts')
        .update({ approved_at: null, scheduled_at: null, status: 'draft', updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .eq('source_key', `content-project-${projectId}`)
      if (withdrawError) throw withdrawError
    }
    return NextResponse.json({ project: data, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update content project', detail: String(error) }, { status: 500 })
  }
}
