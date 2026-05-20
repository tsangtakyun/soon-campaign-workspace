'use client'

import { useEffect, useMemo, useState } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { getStoredOnboardingSessionId } from '@/lib/onboarding-session'
import { recommendVisualStyles, type RankedVisualStyle } from '@/lib/recommend-styles'
import { createClient } from '@/lib/supabase'
import visualStylePresets from '@/lib/visual-styles'

type ToastState = {
  message: string
  type: 'success' | 'error'
} | null

function readSessionJson(key: string) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function styleTitle(styleId: string | null) {
  if (!styleId) return null
  return visualStylePresets.find((style) => style.id === styleId) || null
}

export default function DashboardVisualStyleSettingsPage() {
  const [rankedStyles, setRankedStyles] = useState<RankedVisualStyle[]>([])
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null)
  const [loadingActiveStyle, setLoadingActiveStyle] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const loading = rankedStyles.length === 0 || loadingActiveStyle
  const activeStyle = useMemo(() => styleTitle(activeStyleId), [activeStyleId])

  useEffect(() => {
    let cancelled = false

    async function loadRecommendations() {
      const profile = readSessionJson('soon-business-profile-v1')
      const strategy = readSessionJson('soon-content-strategy-v1')
      const distribution = readSessionJson('soon-distribution-preferences-v1')
      const contentMix = readSessionJson('soon-content-mix-v1')
      const ranked = recommendVisualStyles({ contentMix, distribution, profile, strategy })

      if (!cancelled) {
        setRankedStyles(ranked)
      }
    }

    async function loadActiveStyle() {
      try {
        const supabase = createClient()
        const sessionId = getStoredOnboardingSessionId()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        let brandQuery = supabase.from('brand_kits').select('visual_style_id').limit(1)

        if (user?.id) {
          brandQuery = brandQuery.eq('user_id', user.id)
        } else if (sessionId) {
          brandQuery = brandQuery.eq('onboarding_session_id', sessionId)
        } else {
          return
        }

        const { data: brandKit } = await brandQuery.maybeSingle()
        const visualStyleId = typeof brandKit?.visual_style_id === 'string' ? brandKit.visual_style_id : null

        if (!cancelled) {
          setActiveStyleId(visualStyleId)
        }
      } catch {
        if (!cancelled) {
          setActiveStyleId(null)
        }
      } finally {
        if (!cancelled) {
          setLoadingActiveStyle(false)
        }
      }
    }

    void Promise.all([loadRecommendations(), loadActiveStyle()])

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (loadingActiveStyle || activeStyleId || !rankedStyles[0]?.id) return
    setActiveStyleId(rankedStyles[0].id)
  }, [activeStyleId, loadingActiveStyle, rankedStyles])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  async function saveVisualStyle(style: RankedVisualStyle) {
    if (saving || style.id === activeStyleId) return

    const previousStyleId = activeStyleId
    setActiveStyleId(style.id)
    setSaving(true)
    setToast(null)

    try {
      const supabase = createClient()
      const sessionId = getStoredOnboardingSessionId()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const updates = {
        visual_style_id: style.id,
        visual_style_preview: style.previewImage,
        visual_style_title: style.chineseName || style.titleZh || style.name,
        updated_at: new Date().toISOString(),
      }

      let query = supabase.from('brand_kits').update(updates)

      if (user?.id) {
        query = query.eq('user_id', user.id)
      } else if (sessionId) {
        query = query.eq('onboarding_session_id', sessionId)
      } else {
        throw new Error('No active user or onboarding session')
      }

      const { error } = await query
      if (error) throw error

      sessionStorage.setItem('soon-visual-style-v1', JSON.stringify(style))
      setToast({ message: '視覺風格已儲存 ✓', type: 'success' })
    } catch (error) {
      console.error('Failed to save visual style:', error)
      setActiveStyleId(previousStyleId)
      setToast({ message: '未能儲存視覺風格，請稍後再試', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="視覺風格" />

      <section className="home-shell">
        <header className="home-topbar">
          <div>
            <h1>視覺風格設定</h1>
            <p>選擇你品牌的視覺風格，會應用於所有 AI 生成內容</p>
          </div>
          <div className="visual-save-state">
            {saving ? <span>儲存中...</span> : activeStyle ? <span>目前：{activeStyle.chineseName}</span> : null}
          </div>
        </header>

        <div className="settings-body">
          {toast ? <div className={`settings-toast ${toast.type}`}>{toast.message}</div> : null}

          <div className={saving ? 'style-grid saving' : 'style-grid'}>
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div className="style-card skeleton-card" key={index}>
                    <span className="skeleton-thumb" />
                    <span className="skeleton-line wide" />
                    <span className="skeleton-line" />
                    <span className="skeleton-line short" />
                  </div>
                ))
              : rankedStyles.map((style) => {
                  const selected = style.id === activeStyleId

                  return (
                    <button
                      aria-pressed={selected}
                      className={selected ? 'style-card selected' : 'style-card'}
                      disabled={saving}
                      key={style.id}
                      onClick={() => saveVisualStyle(style)}
                      type="button"
                    >
                      <span className="style-preview">
                        {style.recommended ? <span className="recommended-badge">為你推薦</span> : null}
                        <img src={style.previewImage} alt={`${style.chineseName} / ${style.name}`} />
                      </span>

                      <span className="style-card-body">
                        <strong>
                          <span>{style.chineseName}</span>
                          <span>{style.name}</span>
                        </strong>
                        <em>{style.description}</em>
                        <small>
                          <span>光線：{style.lighting}</span>
                          <span>色調：{style.color}</span>
                          <span>強度：{style.intensity}</span>
                        </small>
                      </span>

                      <b aria-hidden="true">{selected ? '✓' : ''}</b>
                    </button>
                  )
                })}
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} />
    </main>
  )
}

const styles = `
  .dashboard-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .home-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .home-topbar {
    min-height: 68px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 22px;
  }

  .home-topbar h1 {
    margin: 0;
    font-size: 19px;
    font-weight: 680;
  }

  .home-topbar p {
    margin: 4px 0 0;
    color: #6f737d;
    font-size: 13px;
  }

  .visual-save-state {
    color: #6f737d;
    font-size: 13px;
    white-space: nowrap;
  }

  .settings-body {
    position: relative;
    padding: 24px 22px 36px;
  }

  .settings-toast {
    position: sticky;
    top: 12px;
    z-index: 5;
    width: fit-content;
    margin: 0 0 16px auto;
    border-radius: 10px;
    padding: 10px 13px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.09);
  }

  .settings-toast.success {
    border: 1px solid #bbf7d0;
    background: #f0fdf4;
    color: #166534;
  }

  .settings-toast.error {
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #991b1b;
  }

  .style-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
    max-width: 1280px;
  }

  .style-grid.saving {
    opacity: 0.72;
  }

  .style-card {
    position: relative;
    min-height: 100%;
    border: 1px solid #e7e7e7;
    border-radius: 13px;
    background: #ffffff;
    color: #17181c;
    cursor: pointer;
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 12px;
    text-align: left;
    padding: 10px;
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .style-card:hover {
    transform: translateY(-1px);
    border-color: #cfcfcf;
  }

  .style-card:disabled {
    cursor: wait;
  }

  .style-card.selected {
    border-color: #141414;
    box-shadow: inset 0 0 0 1px #141414, 0 10px 26px rgba(32, 33, 38, 0.06);
  }

  .style-preview {
    position: relative;
    display: block;
    height: 160px;
    border-radius: 8px;
    overflow: hidden;
    background: #f1f1f2;
  }

  .style-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .recommended-badge {
    position: absolute;
    top: 9px;
    left: 9px;
    z-index: 2;
    border-radius: 999px;
    background: #d4a843;
    color: #ffffff;
    font-size: 11px;
    font-weight: 650;
    line-height: 1;
    padding: 5px 8px;
    pointer-events: none;
  }

  .style-card-body {
    min-width: 0;
    display: grid;
    gap: 7px;
    padding: 0 2px 3px;
  }

  .style-card-body strong {
    display: grid;
    gap: 2px;
    font-size: 15px;
    line-height: 1.2;
    font-weight: 650;
  }

  .style-card-body strong span:last-child {
    color: #6a6d74;
    font-size: 13px;
    font-weight: 520;
  }

  .style-card-body em {
    color: #62656b;
    font-style: normal;
    font-size: 13px;
    line-height: 1.45;
  }

  .style-card-body small {
    display: flex;
    flex-wrap: wrap;
    gap: 7px 10px;
    color: #777b82;
    font-size: 12px;
    line-height: 1.25;
  }

  .style-card b {
    position: absolute;
    top: 174px;
    right: 14px;
    width: 25px;
    height: 25px;
    border-radius: 999px;
    border: 1px solid #dddddd;
    display: grid;
    place-items: center;
    background: #ffffff;
    color: #ffffff;
    font-size: 13px;
    font-weight: 700;
  }

  .style-card.selected b {
    border-color: #161719;
    background: #161719;
  }

  .skeleton-card {
    pointer-events: none;
  }

  .skeleton-thumb,
  .skeleton-line {
    display: block;
    border-radius: 8px;
    background: linear-gradient(90deg, #f1f1f2 25%, #e5e5e7 50%, #f1f1f2 75%);
    background-size: 200% 100%;
    animation: visual-shimmer 1.4s infinite;
  }

  .skeleton-thumb {
    width: 100%;
    height: 160px;
  }

  .skeleton-line {
    width: 62%;
    height: 13px;
  }

  .skeleton-line.wide {
    width: 84%;
    height: 16px;
  }

  .skeleton-line.short {
    width: 44%;
  }

  @keyframes visual-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @media (max-width: 840px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .sidebar {
      display: none;
    }

    .home-topbar {
      align-items: flex-start;
      flex-direction: column;
      justify-content: center;
      padding: 14px 18px;
    }

    .settings-body {
      padding: 18px;
    }
  }
`
