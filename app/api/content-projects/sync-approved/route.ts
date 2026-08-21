import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    if (!isUuid(workspaceId)) {
      return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: projects, error: projectsError } = await access.admin
      .from('content_projects')
      .select('id,title,selected_format,production,created_by')
      .eq('workspace_id', workspaceId)
      .eq('stage', 'approval')
    if (projectsError) throw projectsError

    const approvedProjects = (projects || []).filter((project: any) =>
      project?.production?.approvalStatus === 'approved',
    )
    if (!approvedProjects.length) {
      return NextResponse.json({ created: 0, success: true })
    }

    const sourceKeys = approvedProjects.map((project: any) => `content-project-${project.id}`)
    const { data: existingPosts, error: existingError } = await access.admin
      .from('campaign_posts')
      .select('source_key')
      .eq('workspace_id', workspaceId)
      .in('source_key', sourceKeys)
    if (existingError) throw existingError
    const existingKeys = new Set((existingPosts || []).map((post: any) => post.source_key))

    const now = new Date().toISOString()
    const missingPosts = approvedProjects
      .filter((project: any) => !existingKeys.has(`content-project-${project.id}`))
      .map((project: any) => {
        const production = project.production && typeof project.production === 'object' ? project.production : {}
        const generatedPages = Array.isArray(production.generatedPages) ? production.generatedPages : []
        const assets = generatedPages
          .map((page: any, index: number) => ({
            page: typeof page?.page === 'string' ? page.page : `P.${index + 1}`,
            url: typeof page?.url === 'string' ? page.url : '',
          }))
          .filter((asset: { url: string }) => asset.url)
        return {
          user_id: project.created_by || user.id,
          workspace_id: workspaceId,
          source_key: `content-project-${project.id}`,
          title: String(project.title || '未命名 Carousel').slice(0, 200),
          body: typeof production.captionDraft === 'string' ? production.captionDraft : '',
          post_type: project.selected_format === 'short_video' ? 'video' : 'carousel',
          scheduled_at: null,
          image_url: assets[0]?.url || null,
          captions: { assets, contentProjectId: project.id },
          status: 'approved',
          approved_at: now,
          updated_at: now,
        }
      })

    if (missingPosts.length) {
      const { error: insertError } = await access.admin.from('campaign_posts').insert(missingPosts)
      if (insertError) throw insertError
    }

    return NextResponse.json({ created: missingPosts.length, success: true })
  } catch (error) {
    console.error('[content-projects/sync-approved]', error)
    return NextResponse.json(
      { error: 'Failed to sync approved content projects', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
