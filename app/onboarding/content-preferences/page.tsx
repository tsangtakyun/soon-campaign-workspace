'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { getStoredOnboardingSessionId } from '@/lib/onboarding-session'
import { createClient } from '@/lib/supabase'
import { resolveActiveWorkspace, WORKSPACE_CHANGED_EVENT } from '@/lib/workspace-client'

const PLATFORMS = [
  { id: 'instagram', icon: '📷', label: 'Instagram', desc: '對話式、表達豐富，使用 emoji 和短句' },
  { id: 'facebook', icon: '📘', label: 'Facebook', desc: '個人與資訊並重，鼓勵留言互動' },
  { id: 'linkedin', icon: '💼', label: 'LinkedIn', desc: '正式但有溫度，聚焦專業價值' },
  { id: 'twitter', icon: '𝕏', label: 'X/Twitter', desc: '簡短有力，常用幽默或趨勢語言' },
  { id: 'youtube', icon: '▶️', label: 'YouTube', desc: '描述詳盡且關鍵字豐富，利於搜尋' },
  { id: 'tiktok', icon: '🎵', label: 'TikTok', desc: '潮流輕鬆，善用 hashtag 和 hook' },
]

type IconProps = {
  size?: number
  strokeWidth?: number
}

function IconSvg({ children, size = 18, strokeWidth = 2 }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  )
}

function Sparkles({ size, strokeWidth }: IconProps) {
  return (
    <IconSvg size={size} strokeWidth={strokeWidth}>
      <path d="M12 3l1.7 4.4L18 9l-4.3 1.6L12 15l-1.7-4.4L6 9l4.3-1.6L12 3z" />
      <path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z" />
      <path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7L19 14z" />
    </IconSvg>
  )
}

function Sliders({ size, strokeWidth }: IconProps) {
  return (
    <IconSvg size={size} strokeWidth={strokeWidth}>
      <path d="M4 6h7" />
      <path d="M15 6h5" />
      <path d="M13 4v4" />
      <path d="M4 12h4" />
      <path d="M12 12h8" />
      <path d="M10 10v4" />
      <path d="M4 18h10" />
      <path d="M18 18h2" />
      <path d="M16 16v4" />
    </IconSvg>
  )
}

function Tag({ size, strokeWidth }: IconProps) {
  return (
    <IconSvg size={size} strokeWidth={strokeWidth}>
      <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <path d="M7.5 7.5h.01" />
    </IconSvg>
  )
}

function Lock({ size, strokeWidth }: IconProps) {
  return (
    <IconSvg size={size} strokeWidth={strokeWidth}>
      <rect height="11" rx="2" width="16" x="4" y="11" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </IconSvg>
  )
}

const MARKET_LOCATION_OPTIONS = ['香港', '台灣', '新加坡', '澳門', '中國大陸', '馬來西亞', '英國', '美國']
const AUDIENCE_GENDER_OPTIONS = ['全部性別', '女性為主', '男性為主', '非二元性別']
const CONTENT_LANGUAGE_OPTIONS = ['繁體中文', '簡體中文', 'English', '日本語', '한국어', 'Bahasa Melayu', 'Bahasa Indonesia']
const PERSONA_AGE_OPTIONS = ['不限', '18-24', '25-34', '35-44', '45-54', '55+']
const PERSONA_GENDER_OPTIONS = ['不限', '女性', '男性', '多元性別']
const PERSONA_ETHNICITY_OPTIONS = ['不限', '亞裔', '東亞', '東南亞', '南亞', '多元文化']

const CONTENT_MODIFICATION_OPTIONS = [
  {
    Icon: Sparkles,
    id: 'growth',
    label: '增長導向',
    desc: '透過 AI 強化和智能替換，最大化效果',
  },
  {
    Icon: Sliders,
    id: 'balanced',
    label: '平衡',
    desc: '改善風格與構圖，同時保留更多原創內容',
  },
  {
    Icon: Tag,
    id: 'brand-first',
    label: '品牌優先',
    desc: '應用光線改善，保留原有外觀和感覺',
  },
  {
    Icon: Lock,
    id: 'strict',
    label: '嚴格品牌控制',
    desc: '只使用品牌素材庫資源，不使用庫存內容',
  },
]

type ContentPreferenceRow = {
  raw_content_mix: Record<string, unknown> | null
}

type WorkspaceSettings = {
  avoided_keywords?: unknown
  market_locations?: unknown
  audience_gender?: string | null
  content_persona_age?: string | null
  content_persona_gender?: string | null
  content_persona_ethnicity?: string | null
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return normalizeStringArray(parsed)
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

function addUniqueTag(current: string[], value: string) {
  const trimmed = value.trim()
  if (!trimmed || current.includes(trimmed)) return current
  return [...current, trimmed]
}

function normalizeContentLanguage(value: unknown) {
  if (value === 'zh-HK' || value === 'zh-TW' || value === '繁體中文（香港）' || value === '繁體中文（台灣）') return '繁體中文'
  if (value === 'zh-CN') return '簡體中文'
  if (value === 'en-US' || value === 'en') return 'English'
  if (value === 'ja') return '日本語'
  if (value === 'ko') return '한국어'
  if (typeof value === 'string' && CONTENT_LANGUAGE_OPTIONS.includes(value)) return value
  return '繁體中文'
}

function normalizeAudienceGender(value: unknown) {
  return typeof value === 'string' && AUDIENCE_GENDER_OPTIONS.includes(value) ? value : '全部性別'
}

function normalizePersonaGender(value: unknown) {
  if (value === '全部性別') return '不限'
  return typeof value === 'string' && PERSONA_GENDER_OPTIONS.includes(value) ? value : '不限'
}

export default function ContentPreferencesPage() {
  const [prefs, setPrefs] = useState<ContentPreferenceRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [contentLang, setContentLang] = useState('繁體中文')
  const [smartCaptions, setSmartCaptions] = useState(false)
  const [includeMusic, setIncludeMusic] = useState(true)
  const [contentModification, setContentModification] = useState('growth')
  const [defaultCta, setDefaultCta] = useState('')
  const [defaultUrl, setDefaultUrl] = useState('')
  const [ageMin, setAgeMin] = useState(18)
  const [ageMax, setAgeMax] = useState(34)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [avoidedKeywords, setAvoidedKeywords] = useState<string[]>([])
  const [avoidedKeywordDraft, setAvoidedKeywordDraft] = useState('')
  const [marketLocations, setMarketLocations] = useState<string[]>([])
  const [marketLocationDraft, setMarketLocationDraft] = useState('')
  const [audienceGender, setAudienceGender] = useState('全部性別')
  const [contentPersonaAge, setContentPersonaAge] = useState('不限')
  const [contentPersonaGender, setContentPersonaGender] = useState('不限')
  const [contentPersonaEthnicity, setContentPersonaEthnicity] = useState('不限')
  const [personaDetailsOpen, setPersonaDetailsOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPreferences() {
      try {
        const supabase = createClient()
        const sessionId = getStoredOnboardingSessionId()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        let query = supabase.from('content_preferences').select('raw_content_mix')
        if (user?.id) {
          query = query.eq('user_id', user.id)
        } else if (sessionId) {
          query = query.eq('onboarding_session_id', sessionId)
        } else {
          return
        }

        const { data } = await query.maybeSingle()
        if (cancelled || !data) return

        const row = data as ContentPreferenceRow
        const raw = row.raw_content_mix || {}
        setPrefs(row)
        if (typeof raw.smart_captions === 'boolean') setSmartCaptions(raw.smart_captions)
        if (typeof raw.include_music === 'boolean') setIncludeMusic(raw.include_music)
        if (typeof raw.content_modification === 'string') setContentModification(raw.content_modification)
        if (typeof raw.content_language === 'string') setContentLang(normalizeContentLanguage(raw.content_language))
        if (typeof raw.default_cta === 'string') setDefaultCta(raw.default_cta)
        if (typeof raw.default_url === 'string') setDefaultUrl(raw.default_url)
        if (typeof raw.audience_gender === 'string') setAudienceGender(normalizeAudienceGender(raw.audience_gender))
        if (typeof raw.content_persona_age === 'string') setContentPersonaAge(raw.content_persona_age)
        if (typeof raw.content_persona_gender === 'string') setContentPersonaGender(normalizePersonaGender(raw.content_persona_gender))
        if (typeof raw.content_persona_ethnicity === 'string') setContentPersonaEthnicity(raw.content_persona_ethnicity)
        setAvoidedKeywords(normalizeStringArray(raw.avoided_keywords))
        setMarketLocations(normalizeStringArray(raw.market_locations))
        if (
          raw.audience_age &&
          typeof raw.audience_age === 'object' &&
          'min' in raw.audience_age &&
          'max' in raw.audience_age
        ) {
          const age = raw.audience_age as { min?: unknown; max?: unknown }
          if (typeof age.min === 'number') setAgeMin(age.min)
          if (typeof age.max === 'number') setAgeMax(age.max)
        }
      } catch {
        // Keep local defaults when the data foundation is not ready yet.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadPreferences()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function resolveWorkspace() {
      const { workspaceId: resolvedWorkspaceId } = await resolveActiveWorkspace()
      if (!cancelled) setWorkspaceId(resolvedWorkspaceId)
    }

    function handleWorkspaceChanged(event: Event) {
      const nextWorkspaceId = (event as CustomEvent<{ workspaceId?: string | null }>).detail?.workspaceId || null
      setWorkspaceId(nextWorkspaceId)
    }

    void resolveWorkspace()
    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)

    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    }
  }, [])

  useEffect(() => {
    if (!workspaceId) return

    async function loadWorkspaceSettings() {
      try {
        const response = await fetch(`/api/workspace-settings?workspace_id=${encodeURIComponent(workspaceId)}`, {
          cache: 'no-store',
        })
        if (!response.ok) return
        const payload = await response.json()
        const settings = (payload.workspace || payload || {}) as WorkspaceSettings
        setAvoidedKeywords(normalizeStringArray(settings.avoided_keywords))
        setMarketLocations(normalizeStringArray(settings.market_locations))
        setAudienceGender(normalizeAudienceGender(settings.audience_gender))
        setContentPersonaAge(settings.content_persona_age || '不限')
        setContentPersonaGender(normalizePersonaGender(settings.content_persona_gender))
        setContentPersonaEthnicity(settings.content_persona_ethnicity || '不限')
      } catch (error) {
        console.error('Failed to load workspace content settings:', error)
      }
    }

    void loadWorkspaceSettings()
  }, [workspaceId])

  function addAvoidedKeyword() {
    setAvoidedKeywords((current) => addUniqueTag(current, avoidedKeywordDraft))
    setAvoidedKeywordDraft('')
  }

  function addMarketLocation(value = marketLocationDraft) {
    setMarketLocations((current) => addUniqueTag(current, value))
    setMarketLocationDraft('')
  }

  async function handleSave(overrides: Partial<Record<string, unknown>> = {}) {
    setSaving(true)
    setSaved(false)

    try {
      const supabase = createClient()
      const sessionId = getStoredOnboardingSessionId()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const updates = {
        raw_content_mix: {
          ...(prefs?.raw_content_mix || {}),
          audience_age: { max: ageMax, min: ageMin },
          audience_gender: audienceGender,
          content_language: contentLang,
          content_modification: contentModification,
          content_persona_age: contentPersonaAge,
          content_persona_ethnicity: contentPersonaEthnicity,
          content_persona_gender: contentPersonaGender,
          default_cta: defaultCta,
          default_url: defaultUrl,
          avoided_keywords: avoidedKeywords,
          include_music: includeMusic,
          market_locations: marketLocations,
          smart_captions: smartCaptions,
          ...overrides,
        },
        updated_at: new Date().toISOString(),
      }

      if (user?.id) {
        await supabase.from('content_preferences').update(updates).eq('user_id', user.id)
      } else if (sessionId) {
        await supabase.from('content_preferences').update(updates).eq('onboarding_session_id', sessionId)
      }

      if (workspaceId) {
        await fetch('/api/workspace-settings', {
          body: JSON.stringify({
            updates: {
              audience_gender: audienceGender,
              avoided_keywords: avoidedKeywords,
              content_persona_age: contentPersonaAge,
              content_persona_ethnicity: contentPersonaEthnicity,
              content_persona_gender: contentPersonaGender,
              market_locations: marketLocations,
            },
            workspace_id: workspaceId,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        })
      }

      setPrefs({ raw_content_mix: updates.raw_content_mix })
      setSaved(true)
    } catch (error) {
      console.error('Failed to save content preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  function handleContentLanguageChange(value: string) {
    const nextLanguage = normalizeContentLanguage(value)
    setContentLang(nextLanguage)
    void handleSave({ content_language: nextLanguage })
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="內容偏好" />

      <section className="home-shell">
        <header className="home-topbar">
          <div>
            <h1>內容偏好</h1>
            {loading ? <span className="cp-save-note">載入設定中...</span> : null}
            {saved ? <span className="cp-save-note">已儲存</span> : null}
          </div>
          <div className="home-topbar-right">
            <button className="home-create-btn" disabled={saving} onClick={() => void handleSave()} type="button">
              {saving ? '儲存中...' : '儲存設定'}
            </button>
          </div>
        </header>

        <div className="content-prefs-body">
          <section className="cp-section">
            <h2>內容指引</h2>

            <div className="cp-field">
              <label>內容語言</label>
              <select className="cp-select" onChange={(event) => handleContentLanguageChange(event.target.value)} value={contentLang}>
                {CONTENT_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="cp-field">
              <label>避免詞彙與概念</label>
              <div className="cp-tag-input-row">
                <input
                  className="cp-input"
                  onChange={(event) => setAvoidedKeywordDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addAvoidedKeyword()
                    }
                  }}
                  placeholder="輸入要避免的詞彙或概念"
                  type="text"
                  value={avoidedKeywordDraft}
                />
                <button className="cp-secondary-btn" onClick={addAvoidedKeyword} type="button">+ 新增</button>
              </div>
              <div className="cp-tags">
                {avoidedKeywords.map((keyword) => (
                  <span key={keyword}>
                    {keyword}
                    <button
                      aria-label={`移除 ${keyword}`}
                      onClick={() => setAvoidedKeywords((current) => current.filter((item) => item !== keyword))}
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="cp-field">
              <label>主要市場地區</label>
              <div className="cp-tag-input-row">
                <input
                  className="cp-input"
                  list="market-location-options"
                  onChange={(event) => setMarketLocationDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addMarketLocation()
                    }
                  }}
                  placeholder="搜尋或輸入地區"
                  type="text"
                  value={marketLocationDraft}
                />
                <datalist id="market-location-options">
                  {MARKET_LOCATION_OPTIONS.map((location) => (
                    <option key={location} value={location} />
                  ))}
                </datalist>
                <button className="cp-secondary-btn" onClick={() => addMarketLocation()} type="button">+ 新增</button>
              </div>
              <div className="cp-location-options">
                {MARKET_LOCATION_OPTIONS.filter((location) => !marketLocations.includes(location)).map((location) => (
                  <button key={location} onClick={() => addMarketLocation(location)} type="button">
                    {location}
                  </button>
                ))}
              </div>
              <div className="cp-tags">
                {marketLocations.map((location) => (
                  <span key={location}>
                    {location}
                    <button
                      aria-label={`移除 ${location}`}
                      onClick={() => setMarketLocations((current) => current.filter((item) => item !== location))}
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="cp-field">
              <label>目標受眾年齡</label>
              <div className="cp-age-row">
                <input
                  className="cp-age-input"
                  max={65}
                  min={13}
                  onChange={(event) => setAgeMin(Number(event.target.value))}
                  type="number"
                  value={ageMin}
                />
                <span>至</span>
                <input
                  className="cp-age-input"
                  max={65}
                  min={13}
                  onChange={(event) => setAgeMax(Number(event.target.value))}
                  type="number"
                  value={ageMax}
                />
                <span>歲</span>
                <div className="cp-inline-select-field">
                  <label>性別</label>
                  <select className="cp-select compact" onChange={(event) => setAudienceGender(event.target.value)} value={audienceGender}>
                    {AUDIENCE_GENDER_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="cp-section">
            <h2>內容修改程度</h2>
            <p className="cp-desc">選擇 AI 在生成內容時，如何平衡你的品牌素材與優化目標。</p>
            <div className="cp-radio-list">
              {CONTENT_MODIFICATION_OPTIONS.map((option) => (
                <label
                  className={contentModification === option.id ? 'cp-radio-card active' : 'cp-radio-card'}
                  key={option.id}
                >
                  <input
                    checked={contentModification === option.id}
                    name="content-modification"
                    onChange={() => setContentModification(option.id)}
                    type="radio"
                    value={option.id}
                  />
                  <span className="cp-radio-icon" aria-hidden="true">
                    <option.Icon size={18} strokeWidth={2} />
                  </span>
                  <div>
                    <strong>{option.label}</strong>
                    <p>{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="cp-section">
            <h2>內容呈現人物</h2>
            <p className="cp-desc">設定在你的內容中出現的人物形象</p>
            <div className="cp-persona-grid">
              <div className="cp-field">
                <label>年齡層</label>
                <select className="cp-select" onChange={(event) => setContentPersonaAge(event.target.value)} value={contentPersonaAge}>
                  <option disabled value="">選擇年齡層</option>
                  {PERSONA_AGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="cp-field">
                <label>性別</label>
                <select className="cp-select" onChange={(event) => setContentPersonaGender(event.target.value)} value={contentPersonaGender}>
                  <option disabled value="">選擇性別</option>
                  {PERSONA_GENDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="cp-field">
                <label>族裔背景</label>
                <select className="cp-select" onChange={(event) => setContentPersonaEthnicity(event.target.value)} value={contentPersonaEthnicity}>
                  <option disabled value="">選擇族裔</option>
                  {PERSONA_ETHNICITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            <button className="cp-collapse-toggle" onClick={() => setPersonaDetailsOpen((value) => !value)} type="button">
              新增形象細節（選填）{personaDetailsOpen ? '⌄' : '›'}
            </button>
            {personaDetailsOpen ? <div className="cp-empty-expansion" /> : null}
          </section>

          <section className="cp-section">
            <h2>影片偏好</h2>
            <div className="cp-toggle-row">
              <div>
                <strong>加入背景音樂</strong>
                <p>為影片加入背景音軌</p>
              </div>
              <button
                aria-label="加入背景音樂"
                className={includeMusic ? 'cp-toggle on' : 'cp-toggle'}
                onClick={() => setIncludeMusic((value) => !value)}
                type="button"
              >
                <span />
              </button>
            </div>
            <div className="cp-toggle-row disabled">
              <div>
                <strong>
                  加入旁白 <span className="cp-coming-soon">即將推出</span>
                </strong>
                <p>為影片自動生成旁白</p>
              </div>
              <button aria-label="加入旁白" className="cp-toggle" disabled type="button">
                <span />
              </button>
            </div>
          </section>

          <section className="cp-section">
            <h2>預設行動呼籲</h2>
            <p className="cp-desc">設定預設 CTA 文字和 URL，SOON 會在每個 campaign 中使用，並可按需調整。</p>
            <div className="cp-cta-row">
              <input
                className="cp-input"
                onChange={(event) => setDefaultCta(event.target.value)}
                placeholder="行動呼籲文字"
                type="text"
                value={defaultCta}
              />
              <input
                className="cp-input"
                onChange={(event) => setDefaultUrl(event.target.value)}
                placeholder="預設 URL（如 https://sooncreator.network）"
                type="url"
                value={defaultUrl}
              />
            </div>
          </section>

          <section className="cp-section">
            <h2>智能 Caption</h2>
            <div className="cp-toggle-row">
              <div>
                <strong>智能 Caption {smartCaptions ? '已開啟' : '已關閉'}</strong>
                <p>每個社交平台獲得符合其獨特風格和受眾期望的優化 caption。</p>
              </div>
              <button
                aria-label="智能 Caption"
                className={smartCaptions ? 'cp-toggle on' : 'cp-toggle'}
                onClick={() => setSmartCaptions((value) => !value)}
                type="button"
              >
                <span />
              </button>
            </div>

            {smartCaptions ? (
              <div className="cp-platform-list">
                {PLATFORMS.map((platform) => (
                  <div className="cp-platform-row" key={platform.id}>
                    <span className="cp-platform-icon">{platform.icon}</span>
                    <div>
                      <strong>{platform.label}</strong>
                    <p>{platform.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
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
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 20px;
  }

  .home-topbar h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }

  .home-topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .home-create-btn {
    border: 1px solid #111111;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    padding: 8px 13px;
    cursor: pointer;
    transition: opacity 150ms ease;
  }

  .home-create-btn:hover {
    opacity: 0.86;
  }

  .home-create-btn:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  .cp-save-note {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    color: #6f737d;
  }

  .content-prefs-body {
    padding: 28px 20px;
    max-width: 680px;
    display: flex;
    flex-direction: column;
    gap: 36px;
  }

  .cp-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .cp-section h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 650;
    padding-bottom: 10px;
    border-bottom: 1px solid #e8e9ec;
  }

  .cp-desc {
    margin: 0;
    font-size: 13px;
    color: #6f737d;
    line-height: 1.5;
  }

  .cp-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .cp-field label {
    font-size: 13px;
    font-weight: 500;
    color: #202126;
  }

  .cp-select {
    width: 240px;
    padding: 8px 12px;
    border: 1px solid #d1d5db !important;
    border-radius: 8px;
    font-size: 14px;
    background: #ffffff !important;
    color: #111827 !important;
    font-family: inherit;
  }

  .cp-select option {
    background: #ffffff;
    color: #111827;
  }

  .cp-select.compact {
    width: 150px;
  }

  .cp-age-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #6f737d;
    flex-wrap: wrap;
  }

  .cp-age-input {
    width: 70px;
    padding: 7px 10px;
    border: 1px solid #d1d5db !important;
    border-radius: 8px;
    font-size: 14px;
    text-align: center;
    background: #ffffff !important;
    color: #111827 !important;
  }

  .cp-inline-select-field {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 8px;
  }

  .cp-inline-select-field label {
    color: #202126;
    font-size: 13px;
    font-weight: 500;
  }

  .cp-tag-input-row {
    display: flex;
    gap: 8px;
  }

  .cp-secondary-btn {
    border: 1px solid #d8d9de;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    cursor: pointer;
    flex-shrink: 0;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 0 12px;
  }

  .cp-secondary-btn:hover {
    border-color: #b9bbc3;
  }

  .cp-tags,
  .cp-location-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .cp-tags span {
    align-items: center;
    background: #f4f4f5;
    border: 1px solid #e2e3e7;
    border-radius: 999px;
    color: #202126;
    display: inline-flex;
    font-size: 13px;
    gap: 6px;
    padding: 5px 9px;
  }

  .cp-tags button {
    background: transparent;
    border: 0;
    color: #6f737d;
    cursor: pointer;
    font: inherit;
    padding: 0;
  }

  .cp-location-options button {
    background: #ffffff;
    border: 1px solid #e2e3e7;
    border-radius: 999px;
    color: #6f737d;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    padding: 5px 9px;
  }

  .cp-location-options button:hover {
    border-color: #b9bbc3;
    color: #202126;
  }

  .cp-persona-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .cp-persona-grid .cp-select {
    width: 100%;
  }

  .cp-collapse-toggle {
    align-self: flex-start;
    border: 0;
    background: transparent;
    color: #4b5563;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    padding: 0;
  }

  .cp-empty-expansion {
    min-height: 8px;
  }

  .cp-radio-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cp-radio-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid #e2e3e7;
    border-radius: 10px;
    cursor: pointer;
    transition: border-color 150ms, background 150ms;
  }

  .cp-radio-card.active {
    border-color: #202126;
    background: #f8f8f9;
  }

  .cp-radio-card input {
    margin-top: 2px;
    flex-shrink: 0;
  }

  .cp-radio-icon {
    align-items: center;
    background: #f3f4f6;
    border-radius: 10px;
    color: #4b5563;
    display: inline-flex;
    flex-shrink: 0;
    height: 40px;
    justify-content: center;
    width: 40px;
  }

  .cp-radio-card.active .cp-radio-icon {
    background: #eff6ff;
    color: #1d4ed8;
  }

  .cp-radio-card strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
  }

  .cp-radio-card p {
    margin: 2px 0 0;
    font-size: 13px;
    color: #6f737d;
  }

  .cp-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f1f3;
  }

  .cp-toggle-row.disabled {
    opacity: 0.5;
  }

  .cp-toggle-row strong {
    font-size: 14px;
    font-weight: 600;
    display: block;
  }

  .cp-toggle-row p {
    margin: 2px 0 0;
    font-size: 13px;
    color: #6f737d;
  }

  .cp-coming-soon {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 6px;
    background: #f0f0f0;
    color: #6f737d;
    font-weight: 400;
  }

  .cp-toggle {
    position: relative;
    width: 44px;
    height: 24px;
    border-radius: 99px;
    background: #d0d0d0;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 200ms;
  }

  .cp-toggle.on {
    background: #202126;
  }

  .cp-toggle span {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #ffffff;
    transition: left 200ms;
  }

  .cp-toggle.on span {
    left: 23px;
  }

  .cp-toggle:disabled {
    cursor: not-allowed;
  }

  .cp-cta-row {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cp-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db !important;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    background: #ffffff !important;
    color: #111827 !important;
  }

  .cp-input::placeholder {
    color: #9ca3af !important;
  }

  .cp-platform-list {
    border: 1px solid #e8e9ec;
    border-radius: 10px;
    overflow: hidden;
    background: #ffffff;
  }

  .cp-platform-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f1f3;
  }

  .cp-platform-row:last-child {
    border-bottom: none;
  }

  .cp-platform-row strong {
    font-size: 14px;
    display: block;
  }

  .cp-platform-icon {
    align-items: center;
    background: #f7f7f8;
    border-radius: 8px;
    display: inline-flex;
    flex-shrink: 0;
    height: 32px;
    justify-content: center;
    width: 32px;
  }

  .cp-platform-row p {
    margin: 2px 0 0;
    font-size: 13px;
    color: #6f737d;
  }

  @media (max-width: 760px) {
    .cp-persona-grid {
      grid-template-columns: 1fr;
    }

    .cp-tag-input-row {
      flex-direction: column;
    }

    .cp-secondary-btn {
      min-height: 38px;
    }
  }
`
