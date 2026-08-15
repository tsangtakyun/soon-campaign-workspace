'use client'

import { type FormEvent, useEffect, useState } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'

const AVATAR_MAX_DIMENSION = 1024
const AVATAR_TARGET_BYTES = 2 * 1024 * 1024

type Profile = {
  avatarUrl?: string | null
  displayName?: string | null
  email?: string | null
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('未能處理圖片。'))
      }
    }, 'image/jpeg', quality)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('未能讀取圖片。'))
    image.src = src
  })
}

async function prepareAvatarFile(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('請選擇圖片檔案。')
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)
    const sourceWidth = image.naturalWidth || image.width
    const sourceHeight = image.naturalHeight || image.height
    const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) throw new Error('未能處理圖片。')

    canvas.width = width
    canvas.height = height
    context.drawImage(image, 0, 0, width, height)

    let blob = await canvasToBlob(canvas, 0.86)
    if (blob.size > AVATAR_TARGET_BYTES) blob = await canvasToBlob(canvas, 0.72)
    if (blob.size > AVATAR_TARGET_BYTES) blob = await canvasToBlob(canvas, 0.58)
    if (blob.size > AVATAR_TARGET_BYTES) {
      throw new Error('圖片太大，請選擇較細圖片。')
    }

    const filename = `${file.name.replace(/\.[^.]+$/, '') || 'avatar'}.jpg`
    return new File([blob], filename, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      setLoading(true)
      const response = await fetch('/api/profile', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (cancelled) return
      if (response.ok) {
        setProfile(payload.profile)
        setDisplayName(payload.profile?.displayName || '')
        setPreviewUrl(payload.profile?.avatarUrl || '')
      } else {
        setMessage('未能載入個人設定。')
      }
      setLoading(false)
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleAvatarChange(file: File | null) {
    setMessage('')

    if (!file) {
      setAvatarFile(null)
      setPreviewUrl(profile?.avatarUrl || '')
      return
    }

    try {
      const preparedFile = await prepareAvatarFile(file)
      setAvatarFile(preparedFile)
      setPreviewUrl(URL.createObjectURL(preparedFile))
    } catch (error) {
      setAvatarFile(null)
      setPreviewUrl(profile?.avatarUrl || '')
      setMessage(error instanceof Error ? error.message : '未能處理圖片。')
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const form = new FormData()
    form.set('displayName', displayName.trim())
    form.set('avatarUrl', profile?.avatarUrl || '')
    if (avatarFile) form.set('avatar', avatarFile)

    const response = await fetch('/api/profile', {
      body: form,
      method: 'PATCH',
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setMessage(payload?.detail || payload?.error || '未能儲存設定。')
      setSaving(false)
      return
    }

    setProfile(payload.profile)
    setPreviewUrl(payload.profile?.avatarUrl || '')
    setAvatarFile(null)
    setMessage('設定已更新。')
    setSaving(false)
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="設定" />

      <section className="settings-shell">
        <header className="settings-topbar">
          <div>
            <h1>設定</h1>
            <p>{profile?.email || '個人資料'}</p>
          </div>
        </header>

        <div className="settings-body">
          <form className="profile-card" onSubmit={saveProfile}>
            <div className="profile-head">
              <div className="profile-avatar">
                {previewUrl ? <img src={previewUrl} alt="" /> : <span>{(displayName || profile?.email || 'S').slice(0, 1).toUpperCase()}</span>}
              </div>
              <div>
                <h2>個人資料</h2>
                <p>這個名稱及相片會顯示於你所屬的工作台。</p>
              </div>
            </div>

            <label>
              <span>顯示名稱</span>
              <input
                disabled={loading || saving}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="例如 Tom T"
                value={displayName}
              />
            </label>

            <label>
              <span>Profile picture</span>
              <input
                accept="image/*"
                disabled={loading || saving}
                onChange={(event) => void handleAvatarChange(event.target.files?.[0] || null)}
                type="file"
              />
            </label>

            <button disabled={loading || saving} type="submit">
              {saving ? '儲存中...' : '儲存設定'}
            </button>

            {message ? <p className="settings-message">{message}</p> : null}
          </form>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} />
    </main>
  )
}

const styles = `
  .site-nav {
    display: none;
  }

  .dashboard-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .settings-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .settings-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    display: flex;
    align-items: center;
    padding: 0 24px;
  }

  .settings-topbar h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 750;
  }

  .settings-topbar p {
    color: #767a83;
    font-size: 12px;
    margin: 3px 0 0;
  }

  .settings-body {
    padding: 28px;
  }

  .profile-card {
    width: min(620px, 100%);
    border: 1px solid #e6e7eb;
    border-radius: 12px;
    display: grid;
    gap: 18px;
    padding: 22px;
  }

  .profile-head {
    align-items: center;
    display: flex;
    gap: 16px;
  }

  .profile-avatar {
    align-items: center;
    background: #ffd946;
    border-radius: 18px;
    display: flex;
    height: 72px;
    justify-content: center;
    overflow: hidden;
    width: 72px;
  }

  .profile-avatar img {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .profile-avatar span {
    color: #111111;
    font-size: 28px;
    font-weight: 900;
  }

  .profile-head h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
  }

  .profile-head p {
    color: #676c76;
    margin: 5px 0 0;
  }

  .profile-card label {
    display: grid;
    gap: 8px;
  }

  .profile-card label span {
    color: #4d525c;
    font-size: 13px;
    font-weight: 750;
  }

  .profile-card input {
    background: #ffffff;
    border: 1px solid #dfe2e7;
    border-radius: 8px;
    color: #202126;
    font: inherit;
    min-height: 42px;
    padding: 0 12px;
  }

  .profile-card input[type='file'] {
    padding: 9px 12px;
  }

  .profile-card button {
    background: #111111;
    border: 1px solid #111111;
    border-radius: 8px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 800;
    min-height: 44px;
    width: fit-content;
    padding: 0 18px;
  }

  .profile-card button:disabled {
    background: #d7d9de;
    border-color: #d7d9de;
    cursor: wait;
  }

  .settings-message {
    background: #fff7d7;
    border: 1px solid #f4e6a8;
    border-radius: 8px;
    color: #655615;
    margin: 0;
    padding: 12px;
  }

  @media (max-width: 980px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .settings-body {
      padding: 18px;
    }
  }
`
