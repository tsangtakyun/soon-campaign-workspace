import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { buildContentPreferenceSummary } from '@/lib/content-preference-summary'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get('workspaceId') || ''
    const server = createServerSupabase(await cookies())
    const { data: { user } } = await server.auth.getUser()
    if (!user?.id || !workspaceId) return NextResponse.json({ error: 'Unauthorized or workspace missing' }, { status: 401 })
    const access = await getWorkspaceAccess({ userId: user.id, email: user.email, workspaceId })
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await access.admin
      .from('content_preference_events')
      .select('id,content_project_id,event_type,dimension,value,previous_value,metadata,created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(1000)
    if (error) throw error

    const events = (data || []).map((event) => ({ ...event, id: event.content_project_id || event.id }))
    return NextResponse.json({ summary: buildContentPreferenceSummary(events), source: 'workspace_evidence_v1' })
  } catch (error) {
    console.error('[content-preference-summary]', error)
    return NextResponse.json({ error: '未能整理內容偏好' }, { status: 500 })
  }
}
