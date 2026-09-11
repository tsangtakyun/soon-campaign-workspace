import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

import { isUuid } from '@/lib/oauth-connections'
import { createServerSupabase } from '@/lib/server-supabase'
import { getWorkspaceAccess } from '@/lib/workspace-access'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const workspaceId = typeof form.get('workspaceId') === 'string' ? String(form.get('workspaceId')) : ''
    const file = form.get('file')
    if (!isUuid(workspaceId) || !(file instanceof File)) {
      return NextResponse.json({ error: '請選擇有效圖片及 Workspace' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: '只支援 10MB 以下的 JPG、PNG 或 WebP 圖片' }, { status: 400 })
    }

    const server = createServerSupabase(await cookies())
    const { data: { user } } = await server.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId })
    if (!access?.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const bytes = Buffer.from(await file.arrayBuffer())
    const metadata = await sharp(bytes).metadata()
    if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp'].includes(metadata.format || '')) {
      return NextResponse.json({ error: '圖片格式無效或已損壞' }, { status: 400 })
    }

    const extension = metadata.format === 'jpeg' ? 'jpg' : metadata.format
    const storagePath = `${workspaceId}/products/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await access.admin.storage
      .from('brand-assets')
      .upload(storagePath, bytes, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError
    const { data: publicUrl } = access.admin.storage.from('brand-assets').getPublicUrl(storagePath)

    return NextResponse.json({
      asset: {
        filename: file.name.slice(0, 240),
        height: metadata.height,
        mimeType: file.type,
        storagePath,
        url: publicUrl.publicUrl,
        width: metadata.width,
      },
      success: true,
    })
  } catch (error) {
    console.error('[product-assets/upload] failed', error)
    return NextResponse.json({ error: '未能上傳產品圖片', detail: String(error) }, { status: 500 })
  }
}
