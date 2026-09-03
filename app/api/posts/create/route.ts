import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { requirePlatformUser } from '@/lib/platform-access'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export async function POST(req: Request) {
  try {
    const platform = await requirePlatformUser()
    if (platform.error) return platform.error

    const body = await req.json().catch(() => ({}))
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const postType = typeof body.postType === 'string' ? body.postType.trim() : 'single_image'
    const scheduledAt = typeof body.scheduledAt === 'string' ? body.scheduledAt : ''

    if (!isUuid(workspaceId) || !title || !scheduledAt) {
      return NextResponse.json({ error: 'Missing workspace, title or schedule' }, { status: 400 })
    }

    const date = new Date(scheduledAt)
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid schedule' }, { status: 400 })
    }

    const workspaceAccess = await getWorkspaceAccess({
      email: platform.access.user.email,
      userId: platform.access.user.id,
      workspaceId,
    })
    if (!workspaceAccess?.canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: post, error } = await workspaceAccess.admin
      .from('campaign_posts')
      .insert({
        user_id: platform.access.user.id,
        workspace_id: workspaceId,
        source_key: `manual-${crypto.randomUUID()}`,
        title: title.slice(0, 200),
        body: 'SOON 會根據這個標題協助你完善內容。',
        post_type: postType,
        scheduled_at: date.toISOString(),
        image_url: null,
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ post, success: true })
  } catch (error) {
    console.error('[posts/create]', error)
    return NextResponse.json({ error: 'Failed to create post', detail: String(error) }, { status: 500 })
  }
}
