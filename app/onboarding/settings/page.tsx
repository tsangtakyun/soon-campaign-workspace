'use client'

import { type FormEvent, useEffect, useState } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'

type Profile = {
  avatarUrl?: string | null
  displayName?: string | null
  email?: string | null
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

  function handleAvatarChange(file: File | null) {
    setAvatarFile(file)
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(profile?.avatarUrl || '')
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
      setMessage(payload?.error || '未能儲存設定。')
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
                onChange={(event) => handleAvatarChange(event.target.files?.[0] || null)}
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
