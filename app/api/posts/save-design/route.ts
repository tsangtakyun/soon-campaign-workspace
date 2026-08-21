import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const postId = typeof body.postId === 'string' ? body.postId : ''
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : 'Untitled'
    const canvasJson = body.canvasJson && typeof body.canvasJson === 'object' ? body.canvasJson : null
    const canvasWidth = Math.max(100, Math.round(Number(body.canvasWidth) || 1080))
    const canvasHeight = Math.max(100, Math.round(Number(body.canvasHeight) || 1080))

    if (!isUuid(postId) || !isUuid(workspaceId) || !imageUrl || !canvasJson) {
      return NextResponse.json({ error: 'Missing design data' }, { status: 400 })
    }

    const serverSupabase = createServerSupabase(await cookies())
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access || !access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { admin } = access
    const { data: post, error: postError } = await admin
      .from('campaign_posts')
      .select('id,user_id')
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (postError) throw postError
    if (!post?.id) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const { data: existingDesign, error: designLookupError } = await admin
      .from('designs')
      .select('id')
      .eq('post_id', postId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (designLookupError) throw designLookupError

    const designPayload = {
      canvas_height: canvasHeight,
      canvas_json: canvasJson,
      canvas_width: canvasWidth,
      is_draft: true,
      name: name || 'Untitled',
      post_id: postId,
      thumbnail_url: imageUrl,
      updated_at: new Date().toISOString(),
      user_id: post.user_id || user.id,
    }
    const designResult = existingDesign?.id
      ? await admin.from('designs').update(designPayload).eq('id', existingDesign.id).select('id').single()
      : await admin.from('designs').insert(designPayload).select('id').single()
    if (designResult.error) throw designResult.error

    const { error: updateError } = await admin
      .from('campaign_posts')
      .update({
        canvas_json: canvasJson,
        design_id: designResult.data.id,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
    if (updateError) throw updateError

    return NextResponse.json({ designId: designResult.data.id, imageUrl, success: true })
  } catch (error) {
    console.error('[posts/save-design]', error)
    return NextResponse.json(
      { error: 'Failed to save design', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
