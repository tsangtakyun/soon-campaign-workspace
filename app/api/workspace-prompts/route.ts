import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export async function GET(req: Request) {
  const workspaceId = new URL(req.url).searchParams.get('workspaceId') || ''
  if (!isUuid(workspaceId)) return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 })
  const server = createServerSupabase(await cookies())
  const { data: { user } } = await server.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
  if (!access?.canManagePrompt) return NextResponse.json({ error: '只有 Workspace Owner 可以查看 Prompt' }, { status: 403 })
  const { data, error } = await access.admin
    .from('workspace_prompt_versions')
    .select('id,name,version,brief_prompt,format_prompt,production_prompt,config,is_active,created_at,updated_at')
    .eq('workspace_id', workspaceId)
    .order('version', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prompts: data || [] })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
  if (!isUuid(workspaceId)) return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 })
  const server = createServerSupabase(await cookies())
  const { data: { user } } = await server.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
  if (!access?.canManagePrompt) return NextResponse.json({ error: '只有 Workspace Owner 可以管理 Prompt' }, { status: 403 })

  const { data: latest } = await access.admin
    .from('workspace_prompt_versions')
    .select('version')
    .eq('workspace_id', workspaceId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  await access.admin.from('workspace_prompt_versions').update({ is_active: false }).eq('workspace_id', workspaceId)
  const { data, error } = await access.admin.from('workspace_prompt_versions').insert({
    workspace_id: workspaceId,
    name: typeof body.name === 'string' ? body.name.slice(0, 120) : 'Content workflow',
    version: (latest?.version || 0) + 1,
    brief_prompt: typeof body.briefPrompt === 'string' ? body.briefPrompt : '',
    format_prompt: typeof body.formatPrompt === 'string' ? body.formatPrompt : '',
    production_prompt: typeof body.productionPrompt === 'string' ? body.productionPrompt : '',
    config: body.config && typeof body.config === 'object' ? body.config : {},
    is_active: true,
    created_by: user.id,
  }).select('id,name,version,is_active').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prompt: data, success: true })
}
