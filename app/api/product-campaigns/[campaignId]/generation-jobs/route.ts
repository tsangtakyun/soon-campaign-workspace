import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

type RouteProps = { params: Promise<{ campaignId: string }> }

async function context(campaignId: string) {
  const server = createServerSupabase(await cookies())
  const { data: { user } } = await server.auth.getUser()
  if (!user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: campaign } = await server.from('marketing_campaigns').select('*').eq('id', campaignId).maybeSingle()
  if (!campaign?.workspace_id) return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }) }
  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId: campaign.workspace_id })
  if (!access) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { access, campaign, user }
}

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    const data = await context((await params).campaignId)
    if (data.error) return data.error
    const { data: jobs, error } = await data.access.admin.from('creative_generation_jobs').select('*')
      .eq('workspace_id', data.campaign.workspace_id).eq('campaign_id', data.campaign.id).order('created_at')
    if (error) throw error
    return NextResponse.json({ jobs: jobs || [], campaign: data.campaign })
  } catch (error) { return NextResponse.json({ error: '未能載入Generation Jobs', detail: String(error) }, { status: 500 }) }
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const data = await context((await params).campaignId)
    if (data.error) return data.error
    if (!data.access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await request.json().catch(() => ({})) as { projectIds?: unknown; campaignWeek?: unknown }
    const requestedIds = Array.isArray(body.projectIds) ? body.projectIds.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(0, 24) : []
    const { data: projects, error: projectError } = await data.access.admin.from('content_projects')
      .select('id,title,selected_format,creative_role,brief,production').eq('workspace_id', data.campaign.workspace_id).eq('campaign_id', data.campaign.id).order('created_at')
    if (projectError) throw projectError
    if (!projects?.length) return NextResponse.json({ error: '請先建立Content Pack' }, { status: 400 })
    const selectedProjects = requestedIds.length ? projects.filter((project) => requestedIds.includes(project.id)) : projects
    if (!selectedProjects.length) return NextResponse.json({ error: '找不到今星期需要製作的內容' }, { status: 400 })
    const campaignWeek = Math.max(1, Math.min(4, Number(body.campaignWeek) || 1))
    const now = new Date().toISOString()
    await Promise.all(selectedProjects.map((project) => data.access.admin.from('content_projects').update({ brief: { ...(project.brief || {}), campaignWeek }, updated_at: now, updated_by: data.user.id }).eq('id', project.id).eq('campaign_id', data.campaign.id)))
    const rows = selectedProjects.map((project) => ({
      workspace_id: data.campaign.workspace_id, campaign_id: data.campaign.id, content_project_id: project.id,
      job_type: project.selected_format === 'short_video' ? 'video_storyboard' : 'image', status: 'queued', progress: 0,
      prompt_snapshot: { title: project.title, format: project.selected_format, role: project.creative_role, brief: project.brief, production: project.production },
      created_by: data.user.id, updated_at: now,
    }))
    const { error: insertError } = await data.access.admin.from('creative_generation_jobs').upsert(rows, { onConflict: 'content_project_id,job_type', ignoreDuplicates: true })
    if (insertError) throw insertError
    const { data: jobs, error } = await data.access.admin.from('creative_generation_jobs').select('*')
      .eq('workspace_id', data.campaign.workspace_id).eq('campaign_id', data.campaign.id).in('content_project_id', selectedProjects.map((project) => project.id)).order('created_at')
    if (error) throw error
    await data.access.admin.from('marketing_campaigns').update({ generation_status: 'assets_queued', updated_at: now }).eq('id', data.campaign.id)
    return NextResponse.json({ jobs: jobs || [], success: true })
  } catch (error) { return NextResponse.json({ error: '未能建立Generation Jobs', detail: String(error) }, { status: 500 }) }
}
