'use client'

import { useEffect, useMemo, useState } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { getStoredOnboardingSessionId } from '@/lib/onboarding-session'
import {
  recommendTypefaceDirection,
  recommendTypefacesInDirection,
  type RankedDirection,
  type TypefaceRecommendationInput,
} from '@/lib/recommend-typeface'
import { createClient } from '@/lib/supabase'
import {
  getTypefaceCssWeight,
  getTypefaceFontFaceStyles,
  typefaces,
} from '@/lib/typefaces'

type Step = 'direction' | 'typeface'

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

export default function DashboardTypefaceSettingsPage() {
  const [input, setInput] = useState<TypefaceRecommendationInput>({})
  const [rankedDirections, setRankedDirections] = useState<RankedDirection[]>([])
  const [selectedDirectionId, setSelectedDirectionId] = useState<string | null>(null)
  const [selectedTypefaceId, setSelectedTypefaceId] = useState<string | null>(null)
  const [activeDirectionId, setActiveDirectionId] = useState<string | null>(null)
  const [activeTypefaceId, setActiveTypefaceId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('direction')
  const [loadingActive, setLoadingActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const rankedTypefaces = useMemo(() => {
    if (!selectedDirectionId) return []
    return recommendTypefacesInDirection(selectedDirectionId, input)
  }, [input, selectedDirectionId])

  const selectedDirection = rankedDirections.find((direction) => direction.id === selectedDirectionId)
  const selectedTypeface = rankedTypefaces.find((typeface) => typeface.id === selectedTypefaceId) || rankedTypefaces[0]
  const loading = rankedDirections.length === 0 || loadingActive
  const googleTypefaceLinks = useMemo(
    () => rankedTypefaces.filter((typeface) => typeface.isGoogleFont).map((typeface) => typeface.cdnUrl),
    [rankedTypefaces]
  )

  useEffect(() => {
    let cancelled = false

    async function loadRecommendations() {
      const nextInput: TypefaceRecommendationInput = {
        profile: readSessionJson('soon-business-profile-v1') ?? undefined,
        strategy: readSessionJson('soon-content-strategy-v1') ?? undefined,
        distribution: readSessionJson('soon-distribution-preferences-v1') ?? undefined,
      }
      const ranked = recommendTypefaceDirection(nextInput)

      if (!cancelled) {
        setInput(nextInput)
        setRankedDirections(ranked)
        setSelectedDirectionId(ranked[0]?.id ?? null)
      }
    }

    async function loadActiveTypeface() {
      try {
        const supabase = createClient()
        const sessionId = getStoredOnboardingSessionId()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        let query = supabase
          .from('brand_kits')
          .select('typeface_direction, typeface_id')
          .limit(1)

        if (user?.id) {
          query = query.eq('user_id', user.id)
        } else if (sessionId) {
          query = query.eq('onboarding_session_id', sessionId)
        } else {
          return
        }

        const { data } = await query.maybeSingle()
        const typefaceId = typeof data?.typeface_id === 'string' ? data.typeface_id : null
        const directionId =
          typeof data?.typeface_direction === 'string'
            ? data.typeface_direction
            : typefaces.find((typeface) => typeface.id === typefaceId)?.directionId ?? null

        if (!cancelled) {
          setActiveDirectionId(directionId)
          setActiveTypefaceId(typefaceId)
          if (directionId) setSelectedDirectionId(directionId)
          if (typefaceId) setSelectedTypefaceId(typefaceId)
        }
      } catch {
        const stored = readSessionJson('soon-typeface-v1')
        const typefaceId = stored?.typefaceId || stored?.id || null
        const directionId = stored?.directionId || typefaces.find((typeface) => typeface.id === typefaceId)?.directionId || null

        if (!cancelled) {
          setActiveDirectionId(directionId)
          setActiveTypefaceId(typefaceId)
          if (directionId) setSelectedDirectionId(directionId)
          if (typefaceId) setSelectedTypefaceId(typefaceId)
        }
      } finally {
        if (!cancelled) setLoadingActive(false)
      }
    }

    void Promise.all([loadRecommendations(), loadActiveTypeface()])

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedDirectionId || step !== 'typeface') return
    const ranked = recommendTypefacesInDirection(selectedDirectionId, input)
    if (!ranked.some((typeface) => typeface.id === selectedTypefaceId)) {
      setSelectedTypefaceId(ranked[0]?.id ?? null)
    }
  }, [input, selectedDirectionId, selectedTypefaceId, step])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  function selectDirection(directionId: string) {
    const ranked = recommendTypefacesInDirection(directionId, input)
    setSelectedDirectionId(directionId)
    setSelectedTypefaceId(ranked[0]?.id ?? null)
    setStep('typeface')
  }

  async function saveTypeface() {
    if (!selectedDirection || !selectedTypeface || saving) return

    const previousDirectionId = activeDirectionId
    const previousTypefaceId = activeTypefaceId
    setSaving(true)
    setToast(null)
    setActiveDirectionId(selectedDirection.id)
    setActiveTypefaceId(selectedTypeface.id)

    try {
      const supabase = createClient()
      const sessionId = getStoredOnboardingSessionId()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const updates = {
        typeface_direction: selectedDirection.id,
        typeface_id: selectedTypeface.id,
        typeface_name: selectedTypeface.name,
        typeface_name_en: selectedTypeface.nameEn,
        typeface_family: selectedTypeface.fontFamily,
        typeface_cdn_url: selectedTypeface.cdnUrl,
        typeface_weight: selectedTypeface.weight,
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

      sessionStorage.setItem('soon-typeface-v1', JSON.stringify({
        directionId: selectedDirection.id,
        directionLabel: selectedDirection.label,
        directionEmoji: selectedDirection.emoji,
        typefaceId: selectedTypeface.id,
        typefaceName: selectedTypeface.name,
        typefaceNameEn: selectedTypeface.nameEn,
        fontFamily: selectedTypeface.fontFamily,
        cdnUrl: selectedTypeface.cdnUrl,
        isGoogleFont: selectedTypeface.isGoogleFont ?? false,
      }))
      setToast({ message: '字型風格已儲存 ✓', type: 'success' })
    } catch (error) {
      console.error('Failed to save typeface:', error)
      setActiveDirectionId(previousDirectionId)
      setActiveTypefaceId(previousTypefaceId)
      setToast({ message: '未能儲存字型風格，請稍後再試', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="字型風格" />

      <section className="home-shell">
        <header className="home-topbar">
          <div>
            <h1>字型風格設定</h1>
            <p>選擇你品牌的字型方向，會應用於所有 AI 生成內容</p>
          </div>
          <div className="save-state">
            {saving ? <span>儲存中...</span> : activeTypefaceId ? <span>目前：{typefaces.find((t) => t.id === activeTypefaceId)?.name}</span> : null}
          </div>
        </header>

        <div className="settings-body">
          {toast ? <div className={`settings-toast ${toast.type}`}>{toast.message}</div> : null}

          {loading ? (
            <div className="direction-grid">
              {Array.from({ length: 6 }).map((_, index) => <div className="direction-card skeleton" key={index} />)}
            </div>
          ) : step === 'direction' ? (
            <div className={saving ? 'direction-grid saving' : 'direction-grid'}>
              {rankedDirections.map((direction) => {
                const selected = direction.id === selectedDirectionId || direction.id === activeDirectionId
                return (
                  <button
                    aria-pressed={selected}
                    className={selected ? 'direction-card selected' : 'direction-card'}
                    disabled={saving}
                    key={direction.id}
                    onClick={() => selectDirection(direction.id)}
                    type="button"
                  >
                    {direction.recommended ? <span className="gold-badge">為你推薦</span> : null}
                    <span className="direction-emoji">{direction.emoji}</span>
                    <span className="direction-title">{direction.label}</span>
                    <span className="direction-en">{direction.labelEn}</span>
                    <span className="direction-tagline">{direction.tagline}</span>
                    <span className="direction-desc">{direction.description}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="typeface-step">
              <button className="back-inline" disabled={saving} onClick={() => setStep('direction')} type="button">
                ← 返回
              </button>
              <div className="step-subtitle">
                <span>{selectedDirection?.emoji}</span>
                <strong>{selectedDirection?.label}</strong>
                <em>{selectedDirection?.labelEn}</em>
              </div>
              <div className={saving ? 'typeface-list saving' : 'typeface-list'}>
                {rankedTypefaces.map((typeface) => {
                  const selected = typeface.id === selectedTypefaceId || typeface.id === activeTypefaceId
                  return (
                    <button
                      aria-pressed={selected}
                      className={selected ? 'typeface-card selected' : 'typeface-card'}
                      disabled={saving}
                      key={typeface.id}
                      onClick={() => setSelectedTypefaceId(typeface.id)}
                      type="button"
                    >
                      {typeface.recommended ? <span className="gold-badge">最推薦</span> : null}
                      {selected ? <span className="checkmark">✓</span> : null}
                      <strong style={{ fontFamily: typeface.fontFamily, fontWeight: getTypefaceCssWeight(typeface.weight) }}>
                        {typeface.nameEn}
                      </strong>
                      <em>{typeface.name}</em>
                      <p>{typeface.description}</p>
                    </button>
                  )
                })}
              </div>
              <div className="confirm-row">
                <button className="secondary" disabled={saving} onClick={() => setStep('direction')} type="button">
                  返回
                </button>
                <button disabled={saving || !selectedTypeface} onClick={saveTypeface} type="button">
                  {saving ? '儲存中...' : '確認選擇'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {googleTypefaceLinks.map((href) => (
        <link href={href} key={href} rel="stylesheet" />
      ))}
      <style dangerouslySetInnerHTML={{ __html: getTypefaceFontFaceStyles() }} />
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
    color: #7b7f88;
    font-size: 13px;
  }

  .save-state {
    color: #6f737d;
    font-size: 13px;
    white-space: nowrap;
  }

  .settings-body {
    width: min(860px, calc(100vw - 300px));
    padding: 32px 24px 54px;
    margin: 0 auto;
  }

  .settings-toast {
    margin-bottom: 16px;
    border-radius: 10px;
    padding: 11px 14px;
    font-size: 13px;
    font-weight: 650;
  }

  .settings-toast.success {
    color: #065f46;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
  }

  .settings-toast.error {
    color: #991b1b;
    background: #fef2f2;
    border: 1px solid #fecaca;
  }

  .direction-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .direction-grid.saving,
  .typeface-list.saving {
    opacity: 0.6;
    pointer-events: none;
  }

  .direction-card,
  .typeface-card {
    position: relative;
    border: 1px solid #e1e3e8;
    background: #ffffff;
    color: #202126;
    border-radius: 18px;
    text-align: left;
    cursor: pointer;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .direction-card {
    min-height: 190px;
    padding: 26px 24px 22px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .direction-card:hover,
  .typeface-card:hover {
    transform: translateY(-1px);
    border-color: #202126;
    box-shadow: 0 16px 40px rgba(22, 23, 28, 0.08);
  }

  .direction-card.selected,
  .typeface-card.selected {
    border-color: #202126;
    box-shadow: inset 0 0 0 1px #202126, 0 16px 42px rgba(22, 23, 28, 0.08);
  }

  .direction-card:disabled,
  .typeface-card:disabled {
    cursor: wait;
  }

  .direction-card.skeleton {
    min-height: 190px;
    background: linear-gradient(90deg, #f4f4f5 25%, #ececef 50%, #f4f4f5 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .gold-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    background: #d4a843;
    color: #ffffff;
    border-radius: 999px;
    padding: 4px 9px;
    font-size: 11px;
    line-height: 1;
    font-weight: 700;
  }

  .direction-emoji {
    font-size: 32px;
    line-height: 1;
    margin: 18px 0 4px;
  }

  .direction-title {
    font-size: 22px;
    line-height: 1.1;
    font-weight: 760;
  }

  .direction-en {
    color: #8b8f98;
    font-size: 13px;
    font-weight: 600;
  }

  .direction-tagline {
    color: #60646f;
    font-size: 13px;
    font-style: italic;
    line-height: 1.35;
  }

  .direction-desc {
    color: #5f6470;
    font-size: 14px;
    line-height: 1.45;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .typeface-step {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .back-inline {
    width: fit-content;
    border: none;
    background: transparent;
    color: #555a64;
    font-size: 14px;
    font-weight: 650;
    cursor: pointer;
    padding: 0;
  }

  .step-subtitle {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 9px;
    color: #555a64;
  }

  .step-subtitle span {
    font-size: 20px;
  }

  .step-subtitle strong {
    color: #202126;
    font-size: 18px;
    font-weight: 750;
  }

  .step-subtitle em {
    color: #8b8f98;
    font-size: 13px;
    font-style: normal;
  }

  .typeface-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .typeface-card {
    width: 100%;
    min-height: 140px;
    padding: 30px 26px 22px;
  }

  .typeface-card strong {
    display: block;
    font-size: 36px;
    line-height: 1.05;
    letter-spacing: 0;
    margin-bottom: 12px;
  }

  .typeface-card em {
    display: block;
    color: #777b84;
    font-size: 14px;
    font-style: normal;
    font-weight: 650;
    margin-bottom: 5px;
  }

  .typeface-card p {
    margin: 0;
    color: #777b84;
    font-size: 12px;
    line-height: 1.45;
  }

  .checkmark {
    position: absolute;
    top: 18px;
    right: 18px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #202126;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 760;
  }

  .confirm-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 6px;
  }

  .confirm-row button {
    border: none;
    border-radius: 10px;
    background: #202126;
    color: #ffffff;
    font-size: 14px;
    font-weight: 650;
    cursor: pointer;
    padding: 11px 18px;
  }

  .confirm-row button.secondary {
    background: #f2f3f5;
    color: #202126;
  }

  .confirm-row button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (max-width: 980px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .settings-body {
      width: 100%;
    }
  }

  @media (max-width: 720px) {
    .direction-grid {
      grid-template-columns: 1fr;
    }

    .direction-desc {
      white-space: normal;
    }

    .typeface-card strong {
      font-size: 30px;
    }
  }
`
