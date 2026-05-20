import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id')?.trim()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminSupabase()
    const { data: source, error } = await supabase
      .from('brand_sources')
      .select('id,workspace_id,status,url,last_scanned_at')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 })

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id,owner_id')
      .eq('id', source.workspace_id)
      .maybeSingle()

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', source.workspace_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!workspace || (workspace.owner_id !== user.id && !membership)) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: source.id,
      last_scanned_at: source.last_scanned_at,
      status: source.status,
      url: source.url,
    })
  } catch (error) {
    console.error('[brand-source-status] failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load source status' },
      { status: 500 }
    )
  }
}
