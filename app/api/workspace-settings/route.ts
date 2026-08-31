import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'
import { normalizeContentDirections } from '@/lib/content-directions'

const ALLOWED_WORKSPACE_FIELDS = new Set([
  'logo_url',
  'visual_style',
  'font_style',
  'brand_colors',
  'avoided_keywords',
  'market_locations',
  'audience_gender',
  'content_persona_age',
  'content_persona_gender',
  'content_persona_ethnicity',
  'content_directions',
])

export async function GET(req: Request) {
  try {
    const workspaceId = new URL(req.url).searchParams.get('workspace_id')?.trim()
    if (!workspaceId) return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 })

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminSupabase()
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, owner_id, logo_url, visual_style, font_style, visual_identity_description, brand_colors, avoided_keywords, market_locations, audience_gender, content_persona_age, content_persona_gender, content_persona_ethnicity, content_directions')
      .eq('id', workspaceId)
      .single()

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id,role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!workspace || (workspace.owner_id !== user.id && !membership)) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const normalizedWorkspace = {
      ...workspace,
      avoided_keywords: normalizeStringArray(workspace.avoided_keywords),
      brand_colors: normalizeBrandColorsForResponse(workspace.brand_colors),
      market_locations: normalizeStringArray(workspace.market_locations),
      content_directions: normalizeContentDirections(workspace.content_directions),
      visual_identity_description: workspace.visual_identity_description || '',
    }

    console.log('[workspace-settings] fetched workspace:', JSON.stringify(normalizedWorkspace))
    console.log('[workspace-settings GET] workspace brand_colors:', workspace?.brand_colors)
    console.log('[workspace-settings GET] workspace vid:', workspace?.visual_identity_description?.substring(0, 50))

    return NextResponse.json({
      ...normalizedWorkspace,
      workspace: normalizedWorkspace,
    })
  } catch (error) {
    console.error('[workspace-settings] get failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load workspace settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id.trim() : ''
    const updates = body?.updates && typeof body.updates === 'object' && !Array.isArray(body.updates)
      ? (body.updates as Record<string, unknown>)
      : null

    if (!workspaceId || !updates) {
      return NextResponse.json({ error: 'Missing workspace_id or updates' }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {}
    Object.entries(updates).forEach(([field, value]) => {
      if (!ALLOWED_WORKSPACE_FIELDS.has(field)) return
      updatePayload[field] = normalizeWorkspaceSetting(field, value)
    })

    if (!Object.keys(updatePayload).length) {
      return NextResponse.json({ error: 'No supported workspace fields' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser()

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminSupabase()
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id,owner_id')
      .eq('id', workspaceId)
      .maybeSingle()

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id,role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!workspace || (workspace.owner_id !== user.id && !membership)) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    if (
      Object.prototype.hasOwnProperty.call(updatePayload, 'content_directions') &&
      workspace.owner_id !== user.id &&
      membership?.role !== 'owner' &&
      membership?.role !== 'admin'
    ) {
      return NextResponse.json({ error: '只有擁有者或管理員可以修改內容方向' }, { status: 403 })
    }

    const { data: updatedWorkspace, error } = await supabase
      .from('workspaces')
      .update(updatePayload)
      .eq('id', workspaceId)
      .select('logo_url,visual_style,font_style,visual_identity_description,brand_colors,avoided_keywords,market_locations,audience_gender,content_persona_age,content_persona_gender,content_persona_ethnicity,content_directions')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, workspace: updatedWorkspace })
  } catch (error) {
    console.error('[workspace-settings] patch failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update workspace settings' },
      { status: 500 }
    )
  }
}

function normalizeBrandColorsForResponse(value: unknown) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return value.split(',').map((hex) => ({ hex: normalizeHexColor(hex), name: '品牌色' })).filter((color) => color.hex)
    }
  }
  return []
}

function normalizeWorkspaceSetting(field: string, value: unknown) {
  if (field === 'brand_colors') {
    return Array.isArray(value)
      ? value
          .map((item) => {
            if (typeof item === 'string') return { hex: normalizeHexColor(item), name: '品牌色' }
            if (item && typeof item === 'object') {
              const record = item as Record<string, unknown>
              return {
                hex: normalizeHexColor(typeof record.hex === 'string' ? record.hex : ''),
                name: typeof record.name === 'string' ? record.name : '品牌色',
              }
            }
            return null
          })
          .filter((item): item is { hex: string; name: string } => Boolean(item?.hex) && !isGenericSystemBlue(item.hex))
      : []
  }
  if (field === 'content_directions') return normalizeContentDirections(value)
  if (field === 'avoided_keywords' || field === 'market_locations') {
    return normalizeStringArray(value)
  }
  if (
    field === 'audience_gender' ||
    field === 'content_persona_age' ||
    field === 'content_persona_gender' ||
    field === 'content_persona_ethnicity'
  ) {
    return typeof value === 'string' ? value.trim() : ''
  }
  return typeof value === 'string' ? value.trim() : null
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return normalizeStringArray(parsed)
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

function normalizeHexColor(value: string) {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (!match) return ''
  const hex = match[1]
  if (hex.length === 3) return `#${hex.split('').map((char) => `${char}${char}`).join('')}`.toLowerCase()
  return `#${hex.slice(0, 6)}`.toLowerCase()
}

function isGenericSystemBlue(hex: string) {
  const normalized = normalizeHexColor(hex)
  if (['#116dff', '#0000ff', '#0099ff'].includes(normalized)) return true
  const match = normalized.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/)
  if (!match) return false
  const red = Number.parseInt(match[1], 16)
  const green = Number.parseInt(match[2], 16)
  const blue = Number.parseInt(match[3], 16)
  return red <= 0x44 && green <= 0x44 && blue >= 0xcc
}
