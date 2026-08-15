import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createAdminSupabase, createServerSupabase } from '@/lib/server-supabase'

const AVATAR_BUCKET = 'brand-assets'
const MAX_AVATAR_BYTES = 3 * 1024 * 1024

function safeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'avatar'
}

function storageErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String(error.message)
  return String(error || '')
}

async function currentUser() {
  const serverSupabase = createServerSupabase(await cookies())
  const {
    data: { user },
    error,
  } = await serverSupabase.auth.getUser()
  if (error || !user?.id) return null
  return user
}

export async function GET() {
  try {
    const user = await currentUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    return NextResponse.json({
      profile: {
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email || '',
        email: user.email,
        id: user.id,
      },
    })
  } catch (error) {
    console.error('[api/profile] GET error', error)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await currentUser()
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()
    const displayName = typeof form.get('displayName') === 'string' ? String(form.get('displayName')).trim() : ''
    const avatar = form.get('avatar')
    const supabase = createAdminSupabase()
    let avatarUrl = typeof form.get('avatarUrl') === 'string' ? String(form.get('avatarUrl')).trim() : ''

    if (avatar instanceof File && avatar.size > 0) {
      if (!avatar.type.startsWith('image/')) {
        return NextResponse.json({ error: '請上傳圖片檔案。' }, { status: 400 })
      }
      if (avatar.size > MAX_AVATAR_BYTES) {
        return NextResponse.json({ error: '圖片太大，請選擇較細圖片。' }, { status: 413 })
      }

      const ext = safeFilePart(avatar.name.split('.').pop() || 'jpg')
      const path = `${user.id}/avatars/${Date.now()}-${safeFilePart(avatar.name.replace(/\.[^.]+$/, ''))}.${ext}`
      const avatarBytes = Buffer.from(await avatar.arrayBuffer())
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, avatarBytes, {
          cacheControl: '3600',
          contentType: avatar.type || 'image/jpeg',
          upsert: true,
        })

      if (uploadError) throw uploadError
      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
      avatarUrl = data.publicUrl
    }

    const nextDisplayName = displayName || user.user_metadata?.full_name || user.email || ''
    const nextMetadata = {
      ...user.user_metadata,
      avatar_url: avatarUrl || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      full_name: nextDisplayName,
      name: nextDisplayName,
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: nextMetadata,
    })
    if (error) throw error

    if (nextDisplayName) {
      await supabase
        .from('workspace_members')
        .update({ display_name: nextDisplayName })
        .eq('user_id', user.id)
    }

    return NextResponse.json({
      profile: {
        avatarUrl: nextMetadata.avatar_url,
        displayName: nextDisplayName,
        email: data.user.email,
        id: data.user.id,
      },
      success: true,
    })
  } catch (error) {
    console.error('[api/profile] PATCH error', error)
    return NextResponse.json(
      {
        detail: storageErrorMessage(error),
        error: '未能儲存設定。',
      },
      { status: 500 }
    )
  }
}
