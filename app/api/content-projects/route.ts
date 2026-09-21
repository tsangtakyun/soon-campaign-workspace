import { coreCode, object, styleSnapshot, validateSelection, type StyleResult } from '@/lib/production-style'
import { projectStyleContext, projectBrand } from '@/lib/project-style-context'
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
    const allowedFormats = new Set(['carousel', 'single_image', 'short_video', 'story_series'])
    const selectedFormat = typeof body.selectedFormat === 'string' && allowedFormats.has(body.selectedFormat)
      ? body.selectedFormat
      : null
    const videoMethod = body.videoMethod === 'ai_video_generation'
      ? 'ai_video_generation'
      : body.videoMethod === 'human_filming' ? 'human_filming' : null
    const initialBrief = body.brief && typeof body.brief === 'object' ? body.brief : {}
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
        brief: initialBrief,
        selected_format: selectedFormat,
        format_decision: selectedFormat ? { videoMethod: selectedFormat === 'short_video' ? videoMethod || 'human_filming' : null } : {},
        stage: 'brief',
        created_by: user.id,
        updated_by: user.id,
      })
      .select('id,title,source_url,source_name,source_note,stage,selected_format,brief,format_decision,production,updated_at')
      .single()
    if (error) throw error
    if (selectedFormat) {
      await access.admin.from('content_preference_events').insert({ workspace_id: workspaceId, content_project_id: data.id, actor_id: user.id, event_type: 'selected', dimension: 'format', value: selectedFormat, metadata: { source: 'content_studio_entry' } })
      if (selectedFormat === 'short_video' && videoMethod) {
        await access.admin.from('content_preference_events').insert({ workspace_id: workspaceId, content_project_id: data.id, actor_id: user.id, event_type: 'selected', dimension: 'production_method', value: videoMethod, metadata: { source: 'content_studio_entry' } })
      }
    }
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

    const { data: existing } = await access.admin.from('content_projects').select('id,title,source_note,brief,production,format_decision,selected_format').eq('id',projectId).eq('workspace_id',workspaceId).maybeSingle()
    if (!existing) return NextResponse.json({ error:'找不到專案' },{ status:404 })
    if (body.formatDecision && typeof body.formatDecision === 'object') {
      const requested = object(body.formatDecision), old = object(existing.format_decision)
      if (requested.recommendationId) {
        if (requested.recommendationId === old.recommendationId && requested.templateCode === old.templateCode) {
          // Clients may edit production settings but cannot rewrite an already locked snapshot.
          body.formatDecision = { ...requested, ...old, confirmedMaterials: requested.confirmedMaterials ?? old.confirmedMaterials, videoMethod: requested.videoMethod ?? old.videoMethod }
        } else {
          const input=projectStyleContext(existing,await projectBrand(access.admin,workspaceId))
          const {data:run}=await access.admin.from('content_project_style_runs').select('result').eq('project_id',projectId).eq('workspace_id',workspaceId).eq('input_hash',input.inputHash).eq('result->>id',requested.recommendationId).maybeSingle()
          const result=run?.result as StyleResult | undefined
          const selected=result?.styles.find(style=>style.code===coreCode(requested.templateCode))
          if(!selected || !result) return NextResponse.json({error:'題材或素材已改變，請重新分析風格。'},{status:409})
          try { await validateSelection(selected) } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"請重新選擇風格。"},{status:409}) }
          const snapshot=styleSnapshot(selected,result,input.inputHash,input.topicVersion), template=selected.templates[0]
          body.formatDecision={...requested,...snapshot,templateCode:requested.templateCode,templateName:selected.name,templateSource:'soon_core',templateVersion:selected.version.number,
            renderTemplateCode:template?.version.rendererCode || selected.code,templateContractSnapshot:template?.version.contract || null,
            templateRegistryId:template?.templateId || null,templateRegistryCode:template?.code || null,templateRegistryVersion:template?.version.number || null,
            templateContentHash:template?.version.contentHash || null,templateCreatorCommit:template?.version.creatorCommit || null}
        }
      } else if(old.styleVersionRef && requested.templateCode === old.templateCode) {
        body.formatDecision={...requested,...old,confirmedMaterials:requested.confirmedMaterials ?? old.confirmedMaterials};
      } else if(requested.templateSource === 'soon_core' || requested.styleRulesSnapshot) {
        return NextResponse.json({error:'請從最新建議中確認風格。'},{status:409})
      }
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
        .update({ approved_at: null, scheduled_at: null, status: 'withdrawn', updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .eq('source_key', `content-project-${projectId}`)
        .is('posted_at', null)
        .in('status', ['approved', 'scheduled', 'draft', 'ready', 'pending_approval', 'rejected', 'publishing'])
      if (withdrawError) throw withdrawError
    }
    return NextResponse.json({ project: data, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update content project', detail: String(error) }, { status: 500 })
  }
}
