import { NextResponse } from 'next/server'

import { requirePlatformUser } from '@/lib/platform-access'
import { getWorkspaceAccess } from '@/lib/workspace-access'

const LANGUAGE_STYLES = new Set(['brand', 'written', 'conversational'])

export async function GET(req: Request) {
  try {
    const platform = await requirePlatformUser()
    if (platform.error) return platform.error

    const workspaceId = new URL(req.url).searchParams.get('workspaceId')?.trim() || ''
    if (!workspaceId) return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })

    const access = await getWorkspaceAccess({
      email: platform.access.user.email,
      userId: platform.access.user.id,
      workspaceId,
    })
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await access.admin
      .from('content_preferences')
      .select('content_mood')
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (error) throw error

    const mood = data?.content_mood && typeof data.content_mood === 'object'
      ? data.content_mood as Record<string, unknown>
      : {}
    const languageStyle = typeof mood.languageStyle === 'string' && LANGUAGE_STYLES.has(mood.languageStyle)
      ? mood.languageStyle
      : 'brand'
    return NextResponse.json({ languageStyle })
  } catch (error) {
    console.error('[content-language-preference:get]', error)
    return NextResponse.json({ error: '未能讀取文字語氣設定' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const platform = await requirePlatformUser()
    if (platform.error) return platform.error

    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId.trim() : ''
    const languageStyle = typeof body.languageStyle === 'string' ? body.languageStyle : ''
    if (!workspaceId || !LANGUAGE_STYLES.has(languageStyle)) {
      return NextResponse.json({ error: 'Invalid preference' }, { status: 400 })
    }

    const access = await getWorkspaceAccess({
      email: platform.access.user.email,
      userId: platform.access.user.id,
      workspaceId,
    })
    if (!access || (access.role !== 'owner' && access.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: current, error: readError } = await access.admin
      .from('content_preferences')
      .select('id,content_mood')
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (readError) throw readError

    const currentMood = current?.content_mood && typeof current.content_mood === 'object'
      ? current.content_mood as Record<string, unknown>
      : {}
    const contentMood = { ...currentMood, languageStyle }
    const now = new Date().toISOString()

    const query = current?.id
      ? access.admin.from('content_preferences').update({ content_mood: contentMood, updated_at: now }).eq('id', current.id)
      : access.admin.from('content_preferences').insert({
          workspace_id: workspaceId,
          user_id: platform.access.user.id,
          content_mood: contentMood,
          updated_at: now,
        })
    const { error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, languageStyle })
  } catch (error) {
    console.error('[content-language-preference:patch]', error)
    return NextResponse.json({ error: '未能儲存文字語氣設定' }, { status: 500 })
  }
}
