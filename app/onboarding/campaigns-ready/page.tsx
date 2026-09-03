'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import {
  getOrCreateOnboardingSessionId,
  markOnboardingPersisted,
} from '@/lib/onboarding-session'
import { getActiveWorkspaceId, setActiveWorkspaceId } from '@/lib/workspace-client'

type CampaignTheme = {
  id: number
  dateRange: string
  title: string
  body: string
}

const SESSION_KEYS = {
  websiteAnalysis: 'soon-website-analysis-v1',
  profile: 'soon-business-profile-v1',
  strategy: 'soon-content-strategy-v1',
  campaign: 'soon-campaign-details-v1',
  distribution: 'soon-distribution-preferences-v1',
  contentMix: 'soon-content-mix-v1',
  contentMood: 'soon-content-mood-v1',
  contentModification: 'soon-content-modification-v1',
  visualStyle: 'soon-visual-style-v1',
  typeface: 'soon-typeface-v1',
  photoControl: 'soon-photo-control-v2',
  topicReview: 'soon-topic-review-v1',
  campaignThemes: 'soon-campaign-themes-v1',
}

function readSession<T>(key: string): T | null {
  try {
    const value = window.sessionStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

function readSessionString(key: string) {
  try {
    return window.sessionStorage.getItem(key) || null
  } catch {
    return null
  }
}

function formatDateRange(start: Date) {
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`
}

function buildDateRanges() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: 4 }, (_, index) => {
    const start = new Date(today)
    start.setDate(today.getDate() + index * 7)
    return formatDateRange(start)
  })
}

function withIdsAndDates(themes: Array<{ title: string; body: string }>): CampaignTheme[] {
  const dateRanges = buildDateRanges()
  return themes.map((theme, index) => ({
    id: index + 1,
    dateRange: dateRanges[index],
    title: theme.title,
    body: theme.body,
  }))
}

async function requestCampaignThemes(payload: Record<string, unknown>) {
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 75_000)
    try {
      const response = await fetch('/api/campaign-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !Array.isArray(data.themes)) {
        const error = new Error(data?.detail || data?.error || `HTTP ${response.status}`) as Error & {
          retryable?: boolean
        }
        error.retryable = response.status >= 500
        throw error
      } else {
        return data.themes as Array<{ title: string; body: string }>
      }
    } catch (error) {
      lastError = error
      if ((error as Error & { retryable?: boolean }).retryable === false || attempt === 1) throw error
    } finally {
      window.clearTimeout(timeout)
    }

    await new Promise((resolve) => window.setTimeout(resolve, 900))
  }

  throw lastError || new Error('Failed to generate campaign themes')
}

function CampaignsReadyContent() {
  const searchParams = useSearchParams()
  const [isGenerating, setIsGenerating] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)
  const [themes, setThemes] = useState<CampaignTheme[]>([])
  const themesRef = useRef<CampaignTheme[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null)
  const [imageProgress, setImageProgress] = useState({ current: 0, total: 0, label: '內容圖片' })

  useEffect(() => {
    themesRef.current = themes
  }, [themes])

  const generateThemes = useCallback(async (regenerateIndex?: number) => {
    const profile = readSession<any>(SESSION_KEYS.profile) || {}
    const strategy = readSession<any>(SESSION_KEYS.strategy) || {}
    const campaign = readSession<any>(SESSION_KEYS.campaign) || {}
    const contentMood = readSession<any>(SESSION_KEYS.contentMood) || {}
    const language =
      profile.primaryLanguage ||
      profile.primary_language ||
      profile.language ||
      searchParams.get('language') ||
      'zh-TW'

    if (regenerateIndex) {
      setRegeneratingId(regenerateIndex)
    } else {
      setIsGenerating(true)
    }
    setError('')

    try {
      const generatedThemes = await requestCampaignThemes({
        profile,
        strategy,
        campaign,
        contentMood,
        language,
        regenerateIndex,
        existingThemes: regenerateIndex ? themesRef.current : undefined,
      })
      const nextThemes = withIdsAndDates(generatedThemes)
      setThemes((currentThemes) => {
        if (!regenerateIndex) {
          window.sessionStorage.setItem(SESSION_KEYS.campaignThemes, JSON.stringify(nextThemes))
          return nextThemes
        }
        const replacement = nextThemes[regenerateIndex - 1]
        if (!replacement) return currentThemes
        const updatedThemes = currentThemes.map((theme) =>
          theme.id === regenerateIndex
            ? { ...replacement, id: theme.id, dateRange: theme.dateRange }
            : theme
        )
        window.sessionStorage.setItem(SESSION_KEYS.campaignThemes, JSON.stringify(updatedThemes))
        return updatedThemes
      })
    } catch (err) {
      console.warn('[campaign-themes] failed:', err)
      setError('宣傳活動主題生成失敗，請稍後再試。')
    } finally {
      setIsGenerating(false)
      setRegeneratingId(null)
    }
  }, [searchParams])

  useEffect(() => {
    const savedThemes = readSession<CampaignTheme[]>(SESSION_KEYS.campaignThemes)
    if (savedThemes?.length === 4 && savedThemes.every((theme) => theme.title && theme.body)) {
      setThemes(savedThemes)
      setIsGenerating(false)
      return
    }
    void generateThemes()
  }, [generateThemes])

  function preserveParams(url: URL) {
    ;[
      'plan',
      'name',
      'budget',
      'category',
      'website',
      'language',
      'brandName',
      'strategy',
      'campaign',
      'visualStyle',
      'typeface',
      'contentModification',
      'photoControl',
    ].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
  }

  function handleBack() {
    window.history.back()
  }

  async function handleContinue() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSION_KEYS.campaignThemes, JSON.stringify(themes))
    }

    setIsCompleting(true)
    setError('')

    const payload = {
      sessionId: getOrCreateOnboardingSessionId(),
      websiteAnalysis: readSession(SESSION_KEYS.websiteAnalysis),
      businessProfile: readSession(SESSION_KEYS.profile),
      contentStrategy: readSession(SESSION_KEYS.strategy),
      campaignDetails: readSession(SESSION_KEYS.campaign),
      distributionPrefs: readSession(SESSION_KEYS.distribution),
      contentMix: readSession(SESSION_KEYS.contentMix),
      contentMood: readSession(SESSION_KEYS.contentMood),
      contentModification: readSessionString(SESSION_KEYS.contentModification),
      visualStyle: readSession(SESSION_KEYS.visualStyle),
      typeface: readSession(SESSION_KEYS.typeface),
      photoControl: readSession(SESSION_KEYS.photoControl),
      topicReview: readSession(SESSION_KEYS.topicReview),
      campaignThemes: themes,
      workspaceId: getActiveWorkspaceId(),
    }

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const message = await response.text().catch(() => '')
        throw new Error(message || `HTTP ${response.status}`)
      }

      const result = await response.json().catch(() => ({}))
      if (typeof result?.workspaceId === 'string') {
        setActiveWorkspaceId(result.workspaceId)
      }
      markOnboardingPersisted()
      console.log('[campaigns-ready] week-one post image queue:', {
        count: Array.isArray(result?.createdPostIds) ? result.createdPostIds.length : 0,
        totalCreated: Array.isArray(result?.allCreatedPostIds) ? result.allCreatedPostIds.length : undefined,
      })
      await generatePostImagesFromClient(result?.createdPostQueue || result?.createdPostIds)
    } catch (err) {
      console.warn('[onboarding/complete] failed from campaigns-ready:', err)
      setIsCompleting(false)
      setError('儲存設定時出現問題，請再試一次。')
      return
    }

    const url = new URL('/dashboard', window.location.origin)
    preserveParams(url)
    window.location.href = `${url.pathname}${url.search}`
  }

  async function generatePostImagesFromClient(postQueue: unknown) {
    if (!Array.isArray(postQueue) || postQueue.length === 0) return
    setImageProgress({ current: 0, total: postQueue.length, label: '內容圖片' })

    for (let index = 0; index < postQueue.length; index += 1) {
      const queueItem = postQueue[index]
      const postId = typeof queueItem === 'string' ? queueItem : queueItem?.id
      const postType = typeof queueItem === 'object' ? queueItem?.postType : ''
      if (typeof postId !== 'string') continue
      setImageProgress({
        current: index + 1,
        total: postQueue.length,
        label: postType === 'carousels' ? '輪播貼文底圖' : '內容圖片',
      })
      try {
        console.log('[campaigns-ready] generating post image:', { postId })
        const response = await fetch('/api/generate-post-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId }),
        })

        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          console.warn('[campaigns-ready] post image generation failed:', result)
        } else {
          console.log('[campaigns-ready] post image generated:', result)
          if (postType === 'carousels') {
            setImageProgress({
              current: index + 1,
              total: postQueue.length,
              label: '輪播貼文逐頁內容及排版',
            })
            const carouselResponse = await fetch('/api/generate-post-carousel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId }),
            })
            const carouselResult = await carouselResponse.json().catch(() => ({}))
            if (!carouselResponse.ok) {
              console.warn('[campaigns-ready] carousel generation failed:', carouselResult)
            } else {
              console.log('[campaigns-ready] carousel generated:', carouselResult)
            }
          }
        }
      } catch (error) {
        console.warn('[campaigns-ready] post image generation error:', error)
      }
    }
  }

  function handleRegenerate(themeId: number) {
    void generateThemes(themeId)
  }

  function handleTitleChange(themeId: number, title: string) {
    setThemes((currentThemes) =>
      currentThemes.map((theme) => (theme.id === themeId ? { ...theme, title } : theme))
    )
  }

  function handleBodyChange(themeId: number, body: string) {
    setThemes((currentThemes) =>
      currentThemes.map((theme) => (theme.id === themeId ? { ...theme, body } : theme))
    )
  }

  return (
    <main className="campaigns-page">
      <div className="campaign-steps" aria-label="設定進度">
        {['開始設定', '策略', '宣傳活動', '內容', '完成設定'].map((step, index) => (
          <span className={index === 4 ? 'active' : ''} key={step}>
            {step}
            {index < 4 ? <b>›</b> : null}
          </span>
        ))}
      </div>

      {isGenerating ? (
        <section className="campaign-loading" aria-live="polite">
          <div className="campaign-spinner" aria-hidden="true" />
          <h1>正在為你的品牌創作宣傳活動主題...</h1>
        </section>
      ) : isCompleting ? (
        <section className="campaign-loading" aria-live="polite">
          <div className="campaign-spinner" aria-hidden="true" />
          <h1>
            正在為你創作{imageProgress.label}...
            {imageProgress.total > 0 ? ` (${imageProgress.current}/${imageProgress.total})` : ''}
          </h1>
        </section>
      ) : error ? (
        <section className="campaign-error" aria-live="polite">
          <p>生成未完成</p>
          <h1>{error}</h1>
          <button type="button" onClick={() => generateThemes()}>重新生成全部</button>
        </section>
      ) : (
        <section className="campaign-content">
          <header>
            <h1>你的首四個宣傳活動已準備好！</h1>
            <p>在系統創作內容之前，你可以調整任何主題，或者重新創作它們。</p>
          </header>

          <div className="campaign-list">
            {themes.map((theme) => (
              <article className="campaign-card" key={theme.id}>
                <div className="campaign-meta">
                  <span>宣傳活動 {theme.id}</span>
                  <strong>{theme.dateRange}</strong>
                </div>

                <div className="campaign-copy">
                  <div className="campaign-card-header">
                    <h2>{theme.title}</h2>
                    <div className="campaign-actions">
                      <button type="button" onClick={() => setEditingId(editingId === theme.id ? null : theme.id)}>
                        {editingId === theme.id ? '完成調整' : '調整'}
                      </button>
                      <button
                        type="button"
                        disabled={regeneratingId === theme.id}
                        onClick={() => handleRegenerate(theme.id)}
                      >
                        {regeneratingId === theme.id ? '生成中...' : '重新生成'}
                      </button>
                    </div>
                  </div>

                  {editingId === theme.id ? (
                    <div className="campaign-edit-fields">
                      <input
                        aria-label={`調整宣傳活動 ${theme.id} 標題`}
                        value={theme.title}
                        onChange={(event) => handleTitleChange(theme.id, event.target.value)}
                      />
                      <textarea
                        aria-label={`調整宣傳活動 ${theme.id}`}
                        value={theme.body}
                        onChange={(event) => handleBodyChange(theme.id, event.target.value)}
                      />
                    </div>
                  ) : (
                    <p>{theme.body}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="campaign-footer">
        <button type="button" onClick={handleBack}>返回</button>
        {!isGenerating && !error ? (
          <button type="button" onClick={handleContinue} disabled={isCompleting}>
            {isCompleting ? '儲存中...' : '繼續'}
          </button>
        ) : null}
      </footer>

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </main>
  )
}

const styles = `
  .campaigns-page {
    min-height: calc(100vh - 88px);
    background: #ffffff;
    color: #191a1d;
    padding: 17px clamp(18px, 4vw, 50px) 64px;
  }

  .campaign-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 13px;
    color: #9b9b9b;
    font-size: 11px;
    line-height: 1;
  }

  .campaign-steps span {
    display: inline-flex;
    align-items: center;
    gap: 13px;
    white-space: nowrap;
  }

  .campaign-steps .active {
    color: #17181c;
    font-weight: 600;
  }

  .campaign-steps b {
    color: #b6b6b6;
    font-weight: 400;
  }

  .campaign-loading,
  .campaign-error,
  .campaign-content {
    width: min(100%, 760px);
    margin: 52px auto 0;
  }

  .campaign-loading {
    text-align: center;
    min-height: 54vh;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 16px;
  }

  .campaign-spinner {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    border: 3px solid #eceef2;
    border-top-color: #111111;
    animation: campaign-spin 800ms linear infinite;
  }

  @keyframes campaign-spin {
    to { transform: rotate(360deg); }
  }

  .campaign-loading h1,
  .campaign-error h1,
  .campaign-content h1 {
    margin: 0;
    color: #1b1c20;
    font-size: clamp(24px, 3vw, 31px);
    line-height: 1.12;
    font-weight: 500;
    letter-spacing: 0;
  }

  .campaign-error {
    min-height: 54vh;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 14px;
    text-align: center;
  }

  .campaign-error p {
    margin: 0;
    color: #9a9da4;
    font-size: 13px;
  }

  .campaign-error button {
    min-height: 38px;
    border: 0;
    border-radius: 9px;
    background: #111111;
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    padding: 0 16px;
    cursor: pointer;
  }

  .campaign-content header p {
    margin: 11px 0 0;
    color: #5d6067;
    font-size: 13px;
    line-height: 1.45;
  }

  .loading-stack {
    margin-top: 34px;
    display: grid;
    gap: 14px;
  }

  .loading-card {
    min-height: 104px;
    border: 1px solid #e9e9e9;
    border-radius: 12px;
    padding: 20px;
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 24px;
  }

  .loading-card span,
  .loading-card strong,
  .loading-card p {
    display: block;
    border-radius: 999px;
    background: linear-gradient(90deg, #f1f1f1, #fafafa, #f1f1f1);
    background-size: 220% 100%;
    animation: shimmer 1.3s infinite;
  }

  .loading-card span {
    width: 84px;
    height: 15px;
  }

  .loading-card strong {
    height: 16px;
  }

  .loading-card p {
    height: 42px;
    grid-column: 2;
    margin: -58px 0 0;
  }

  @keyframes shimmer {
    0% { background-position: 120% 0; }
    100% { background-position: -120% 0; }
  }

  .campaign-list {
    margin-top: 25px;
    display: grid;
    gap: 15px;
  }

  .campaign-card {
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    padding: 21px;
    display: grid;
    grid-template-columns: 130px minmax(0, 1fr);
    gap: 22px;
  }

  .campaign-meta span {
    display: block;
    color: #9a9a9a;
    font-size: 13px;
  }

  .campaign-meta strong {
    display: block;
    margin-top: 9px;
    color: #1f2025;
    font-size: 13px;
    font-weight: 500;
  }

  .campaign-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
  }

  .campaign-copy h2 {
    margin: 0;
    color: #1d1f24;
    font-size: 15px;
    line-height: 1.28;
    font-weight: 650;
  }

  .campaign-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .campaign-actions button {
    min-height: 29px;
    border: 1px solid #dfe7f4;
    border-radius: 7px;
    background: #f4f8ff;
    color: #3d7dd8;
    font: inherit;
    font-size: 12px;
    padding: 0 10px;
    cursor: pointer;
    white-space: nowrap;
  }

  .campaign-actions button:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  .campaign-copy p,
  .campaign-edit-fields input,
  .campaign-copy textarea {
    margin: 13px 0 0;
    color: #1a1a1a;
    font: inherit;
    font-size: 14px;
    line-height: 1.45;
    background: #ffffff;
  }

  .campaign-edit-fields {
    display: grid;
    gap: 10px;
    margin-top: 13px;
  }

  .campaign-edit-fields input {
    width: 100%;
    margin: 0;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    font-weight: 650;
  }

  .campaign-copy textarea {
    width: 100%;
    margin: 0;
    min-height: 110px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    resize: vertical;
  }

  .campaign-edit-fields input:focus,
  .campaign-copy textarea:focus {
    border-color: #111111;
    outline: none;
  }

  .campaign-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 48px;
    background: rgba(255,255,255,0.96);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 17px;
  }

  .campaign-footer button {
    border: 0;
    background: transparent;
    color: #17181c;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  .campaign-footer button:last-child {
    border-radius: 6px;
    background: #111111;
    color: #ffffff;
    padding: 8px 14px;
    font-size: 13px;
  }

  @media (max-width: 760px) {
    .campaign-card {
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .campaign-card-header {
      display: grid;
    }

    .campaign-actions {
      justify-content: flex-start;
    }
  }
`

function CampaignsReadyFallback() {
  return <main className="campaigns-page" />
}

export default function CampaignsReadyPage() {
  return (
    <Suspense fallback={<CampaignsReadyFallback />}>
      <CampaignsReadyContent />
    </Suspense>
  )
}
