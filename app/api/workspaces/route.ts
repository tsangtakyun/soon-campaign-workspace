import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

type WorkspaceRow = {
  id: string
  name: string | null
  description: string | null
  created_at: string | null
}

export async function GET() {
  try {
    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      console.log('[api/workspaces] no authenticated user', { userError })
      return NextResponse.json({ userId: null, workspaces: [] })
    }

    const supabase = createAdminSupabase()
    const email = user.email?.toLowerCase() ?? null

    const { data: userMemberships, error: userMembershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id,role,status,email,user_id')
      .eq('user_id', user.id)
      .eq('status', 'active')

    const { data: emailMemberships, error: emailMembershipError } = email
      ? await supabase
          .from('workspace_members')
          .select('workspace_id,role,status,email,user_id')
          .ilike('email', email)
          .eq('status', 'active')
      : { data: [], error: null }

    const memberWorkspaceIds = Array.from(
      new Set(
        [...(userMemberships ?? []), ...(emailMemberships ?? [])]
          .map((membership: any) => membership.workspace_id)
          .filter(Boolean)
      )
    )

    const { data: memberWorkspaces, error: memberWorkspacesError } = memberWorkspaceIds.length
      ? await supabase
          .from('workspaces')
          .select('id,name,description,created_at')
          .in('id', memberWorkspaceIds)
      : { data: [], error: null }

    const { data: ownedWorkspaces, error: ownedWorkspacesError } = await supabase
      .from('workspaces')
      .select('id,name,description,created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    const workspaceMap = new Map<string, WorkspaceRow>()
    ;[...(memberWorkspaces ?? []), ...(ownedWorkspaces ?? [])].forEach((workspace: any) => {
      if (workspace?.id) workspaceMap.set(workspace.id, workspace)
    })

    const workspaceIds = Array.from(workspaceMap.keys())
    const { data: brandKits, error: brandKitsError } = workspaceIds.length
      ? await supabase
          .from('brand_kits')
          .select('workspace_id,business_name')
          .in('workspace_id', workspaceIds)
      : { data: [], error: null }

    const brandByWorkspace = new Map<string, string>()
    brandKits?.forEach((kit: any) => {
      if (kit.workspace_id && kit.business_name) {
        brandByWorkspace.set(kit.workspace_id, kit.business_name)
      }
    })

    const workspaces = Array.from(workspaceMap.values())
      .sort((a, b) => {
        const bTime = new Date(b.created_at || 0).getTime()
        const aTime = new Date(a.created_at || 0).getTime()
        return bTime - aTime
      })
      .map((workspace) => ({
        id: workspace.id,
        name: workspace.name || '未命名工作台',
        brandName: brandByWorkspace.get(workspace.id) || workspace.name || null,
        description: workspace.description || null,
      }))

    console.log('[api/workspaces] debug', {
      userId: user.id,
      email,
      source: 'workspace_members + owner fallback via service role',
      userMemberships,
      userMembershipError,
      emailMemberships,
      emailMembershipError,
      memberWorkspaceIds,
      memberWorkspaces,
      memberWorkspacesError,
      ownedWorkspaces,
      ownedWorkspacesError,
      brandKits,
      brandKitsError,
      returnedCount: workspaces.length,
    })

    return NextResponse.json({ userId: user.id, workspaces })
  } catch (error) {
    console.error('[api/workspaces] error', error)
    return NextResponse.json(
      { error: 'Failed to load workspaces', detail: String(error), workspaces: [] },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''

    if (!name) {
      return NextResponse.json({ error: 'Missing workspace name' }, { status: 400 })
    }

    const supabase = createAdminSupabase()
    const now = new Date().toISOString()

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name,
        type: 'brand',
        owner: user.email ?? null,
        owner_id: user.id,
        description: null,
        created_at: now,
      })
      .select('id,name,description,created_at')
      .single()

    if (workspaceError) throw workspaceError

    const { error: memberError } = await supabase.from('workspace_members').upsert(
      {
        workspace_id: workspace.id,
        user_id: user.id,
        email: user.email ?? user.id,
        display_name: user.user_metadata?.full_name ?? user.email ?? name,
        role: 'owner',
        status: 'active',
      },
      { onConflict: 'workspace_id,user_id' }
    )

    if (memberError) throw memberError

    console.log('[api/workspaces] created workspace', {
      userId: user.id,
      email: user.email,
      workspaceId: workspace.id,
      name,
    })

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name || name,
        brandName: workspace.name || name,
        description: workspace.description || null,
      },
    })
  } catch (error) {
    console.error('[api/workspaces] create error', error)
    return NextResponse.json(
      { error: 'Failed to create workspace', detail: String(error) },
      { status: 500 }
    )
  }
}
