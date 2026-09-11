import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

const eventTypes = new Set(['selected','changed','rejected','edited','approved','published','performed'])
const dimensions = new Set(['format','template','production_method','copy','design'])

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''
    const eventType = typeof body.eventType === 'string' ? body.eventType : ''
    const dimension = typeof body.dimension === 'string' ? body.dimension : ''
    const value = typeof body.value === 'string' ? body.value.trim().slice(0, 160) : ''
    if (!isUuid(workspaceId) || !isUuid(projectId) || !eventTypes.has(eventType) || !dimensions.has(dimension) || !value) {
      return NextResponse.json({ error: 'Invalid preference event' }, { status: 400 })
    }
    const server = createServerSupabase(await cookies())
    const { data: { user } } = await server.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const access = await getWorkspaceAccess({ userId: user.id, email: user.email, workspaceId })
    if (!access?.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data: project } = await access.admin.from('content_projects').select('id').eq('id', projectId).eq('workspace_id', workspaceId).maybeSingle()
    if (!project?.id) return NextResponse.json({ error: 'Content project not found' }, { status: 404 })
    const { error } = await access.admin.from('content_preference_events').insert({
      workspace_id: workspaceId,
      content_project_id: projectId,
      actor_id: user.id,
      event_type: eventType,
      dimension,
      value,
      previous_value: typeof body.previousValue === 'string' ? body.previousValue.slice(0, 160) : null,
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[content-preference-events]', error)
    return NextResponse.json({ error: 'Failed to save preference event' }, { status: 500 })
  }
}
