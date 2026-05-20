'use client'

import type { ChangeEvent, FormEvent } from 'react'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type ManualBusinessType = 'services' | 'local' | 'products' | ''
type ContentPersona = '老闆本人' | '產品' | '團隊' | '無特定' | ''
type PrimaryLanguage = '繁體中文' | 'English' | '中英雙語' | ''
type MarketPositioning = '平價親民' | '中價優質' | '高端奢華' | ''

const progressMessages = ['正在讀取網站', '識別品牌核心', '整理受眾輪廓', '抽取內容方向', '建立品牌資料']
const businessTypeOptions: Array<{ label: string; value: Exclude<ManualBusinessType, ''> }> = [
  { label: '服務業', value: 'services' },
  { label: '實體店', value: 'local' },
  { label: '產品品牌', value: 'products' },
]
const personaOptions: ContentPersona[] = ['老闆本人', '產品', '團隊', '無特定']
const languageOptions: PrimaryLanguage[] = ['繁體中文', 'English', '中英雙語']
const positioningOptions: MarketPositioning[] = ['平價親民', '中價優質', '高端奢華']

const businessTypeLabels: Record<Exclude<ManualBusinessType, ''>, string> = {
  services: '服務業',
  local: '實體店',
  products: '產品品牌',
}

type ManualProfile = {
  businessName: string
  businessType: ManualBusinessType
  elevatorPitch: string
  logoUrl: string
  targetAudience: string
  contentPersona: ContentPersona
  primaryLanguage: PrimaryLanguage
  marketPositioning: MarketPositioning
}

type AnalysisPreviewState = {
  data: any | null
  revealStep: number
}

const emptyManualProfile: ManualProfile = {
  businessName: '',
  businessType: '',
  elevatorPitch: '',
  logoUrl: '',
  targetAudience: '',
  contentPersona: '',
  primaryLanguage: '繁體中文',
  marketPositioning: '',
}

function ContentEngineContent() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'website' | 'manual'>('website')
  const [website, setWebsite] = useState('')
  const [manualProfile, setManualProfile] = useState<ManualProfile>(emptyManualProfile)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progressIndex, setProgressIndex] = useState(0)
  const [analysisPreview, setAnalysisPreview] = useState<AnalysisPreviewState>({ data: null, revealStep: 0 })

  useEffect(() => {
    if (!loading) return
    const timer = window.setInterval(() => {
      setProgressIndex((current) => (current + 1) % progressMessages.length)
    }, 1800)

    return () => window.clearInterval(timer)
  }, [loading])

  function passthroughParams() {
    const passthroughKeys = ['plan', 'name', 'budget', 'category']
    const passthrough: Record<string, string> = {}
    passthroughKeys.forEach((key) => {
      const value = searchParams.get(key)
      if (value) passthrough[key] = value
    })
    return passthrough
  }

  function mapAnalysisToManual(data: any): ManualProfile {
    return {
      businessName: data?.businessName || searchParams.get('name') || '',
      businessType: data?.businessType || '',
      elevatorPitch: data?.elevatorPitch || '',
      logoUrl: data?.logoUrl || '',
      targetAudience: data?.audience?.summary || data?.brandProfile?.audience || '',
      contentPersona: '產品',
      primaryLanguage: data?.language === 'English (US)' || data?.language === 'English (UK)' ? 'English' : '繁體中文',
      marketPositioning: '中價優質',
    }
  }

  function websiteHost(value: string) {
    try {
      const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
      return new URL(withProtocol).hostname.replace(/^www\./, '')
    } catch {
      return value.trim()
    }
  }

  function faviconUrl(value: string) {
    const host = websiteHost(value)
    return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=96` : ''
  }

  function displayImageUrl(value: string) {
    if (!value) return ''
    if (value.startsWith('blob:') || value.startsWith('data:')) return value
    return `/api/website-image?url=${encodeURIComponent(value)}`
  }

  function analysisBusinessTypeLabel(value: unknown) {
    if (value === 'local') return '實體店'
    if (value === 'products') return '產品品牌'
    if (value === 'services') return '服務業'
    return '正在判斷'
  }

  function analysisPositioning(data: any) {
    return data?.brandProfile?.position || data?.marketPositioning?.primary || '正在整理品牌定位'
  }

  async function revealAnalysis(data: any) {
    setAnalysisPreview({ data, revealStep: 0 })
    for (let step = 1; step <= 5; step += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 400))
      setAnalysisPreview({ data, revealStep: step })
    }
  }

  function updateManualProfile<T extends keyof ManualProfile>(key: T, value: ManualProfile[T]) {
    setManualProfile((current) => ({ ...current, [key]: value }))
  }

  function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    updateManualProfile('logoUrl', URL.createObjectURL(file))
  }

  function buildBusinessProfile() {
    const hasWebsite = Boolean(website.trim())
    const businessType: Exclude<ManualBusinessType, ''> = manualProfile.businessType || 'services'
    const primaryLanguage = manualProfile.primaryLanguage || '繁體中文'
    const targetAudience = manualProfile.targetAudience.trim()
    const contentPersona = manualProfile.contentPersona || '無特定'
    const marketPositioning = manualProfile.marketPositioning || '中價優質'

    return {
      websiteUrl: hasWebsite ? website.trim() : '',
      language: primaryLanguage,
      businessName: manualProfile.businessName.trim(),
      businessType,
      elevatorPitch: manualProfile.elevatorPitch.trim(),
      logoUrl: manualProfile.logoUrl,
      audience: {
        ageMin: '',
        ageMax: '',
        gender: '所有性別',
        locations: ['香港'],
        summary: targetAudience,
      },
      contentPeople: {
        ageRange: targetAudience,
        gender: '所有性別',
        ethnicity: contentPersona,
      },
      marketPositioning: {
        primary: marketPositioning,
        secondary: `內容主角：${contentPersona}`,
        tertiary: `內容語言：${primaryLanguage}`,
      },
      brandProfile: {
        type: businessTypeLabels[businessType],
        audience: targetAudience,
        position: marketPositioning,
        tone: primaryLanguage,
        offer: manualProfile.elevatorPitch.trim(),
      },
      business_name: manualProfile.businessName.trim(),
      business_type: businessType,
      target_audience: targetAudience,
      content_persona: contentPersona,
      primary_language: primaryLanguage,
      market_positioning: marketPositioning,
      website_url: hasWebsite ? website.trim() : '',
      has_website: hasWebsite,
    }
  }

  function continueToNext() {
    const profile = buildBusinessProfile()
    sessionStorage.setItem('soon-business-profile-v1', JSON.stringify(profile))
    sessionStorage.setItem('soon-brand-profile-v1', JSON.stringify({
      business_name: profile.business_name,
      business_type: profile.business_type,
      elevator_pitch: profile.elevatorPitch,
      logo_url: profile.logoUrl,
      target_audience: profile.target_audience,
      content_persona: profile.content_persona,
      primary_language: profile.primary_language,
      market_positioning: profile.market_positioning,
      website_url: profile.website_url,
      has_website: profile.has_website,
    }))

    const url = new URL('/onboarding/content-strategy', window.location.origin)
    Object.entries(passthroughParams()).forEach(([key, value]) => url.searchParams.set(key, value))
    if (profile.website_url) url.searchParams.set('website', profile.website_url)
    url.searchParams.set('language', profile.primary_language)
    url.searchParams.set('brandName', profile.business_name)
    window.location.href = `${url.pathname}${url.search}`
  }

  const canContinueManual = Boolean(
    manualProfile.businessName.trim() &&
    manualProfile.businessType &&
    manualProfile.elevatorPitch.trim() &&
    manualProfile.targetAudience.trim() &&
    manualProfile.contentPersona &&
    manualProfile.primaryLanguage &&
    manualProfile.marketPositioning
  )

  async function handleWebsiteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setProgressIndex(0)
    setAnalysisPreview({ data: null, revealStep: 0 })

    const passthrough = passthroughParams()

    try {
      const response = await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          website: website.trim(),
          language: '繁體中文',
          ...passthrough,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || '暫時未能分析網站')
      }

      sessionStorage.setItem('soon-website-analysis-v1', JSON.stringify({
        analysis: data,
        onboarding: passthrough,
      }))

      await revealAnalysis(data)
      setManualProfile(mapAnalysisToManual(data))
      setMode('manual')
      setLoading(false)
    } catch (error: any) {
      setError(error.message || '暫時未能分析網站，請稍後再試。')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="engine-page analyzing">
        <nav className="steps" aria-label="Onboarding progress">
          {['開始設定', '策略', '宣傳活動', '內容', '完成設定'].map((step, index) => (
            <span className={index === 0 ? 'active' : ''} key={step}>
              {step}
              {index < 4 ? <b>›</b> : null}
            </span>
          ))}
        </nav>

        <button className="more-button" type="button" aria-label="More options">
          ...
        </button>

        <section className="analysis-progress">
          <p className="eyebrow">進行中...</p>
          <h1>{progressMessages[progressIndex]}</h1>
          <p>SOON 正在閱讀你的網站，建立可編輯的品牌定位、受眾與內容方向。</p>

          <div className="analysis-preview">
            <div>
              <strong>你的網站</strong>
              <div className="browser-card">
                <div className="browser-url-row">
                  {faviconUrl(website) ? <img src={faviconUrl(website)} alt="" /> : <i />}
                  <span>{website.trim()}</span>
                </div>
                <div className={`website-visual ${analysisPreview.revealStep >= 5 ? 'revealed' : ''}`}>
                  {analysisPreview.data?.logoUrl ? (
                    <img src={displayImageUrl(analysisPreview.data.logoUrl)} alt="" />
                  ) : (
                    <div className="skeleton image" />
                  )}
                </div>
                <div className={analysisPreview.data ? 'website-copy revealed' : 'website-copy'}>
                  <b>{analysisPreview.data?.sourceSummary?.title || websiteHost(website)}</b>
                  <p>{analysisPreview.data?.sourceSummary?.description || '正在讀取網站標題、描述和頁面內容...'}</p>
                </div>
              </div>
            </div>
            <div className="arrow">→</div>
            <div>
              <strong>品牌資料</strong>
              <div className="profile-card">
                <div className={`brand-row ${analysisPreview.revealStep >= 1 ? 'revealed' : ''}`}>
                  {analysisPreview.data?.logoUrl ? <img src={displayImageUrl(analysisPreview.data.logoUrl)} alt="" /> : <i />}
                  <span>{analysisPreview.revealStep >= 1 ? analysisPreview.data?.businessName || '你的品牌' : '正在建立...'}</span>
                </div>
                <div className={`profile-row ${analysisPreview.revealStep >= 2 ? 'revealed' : ''}`}>
                  <b>類型</b>
                  {analysisPreview.revealStep >= 2 ? <em>{analysisBusinessTypeLabel(analysisPreview.data?.businessType)}</em> : <span />}
                </div>
                <div className={`profile-row ${analysisPreview.revealStep >= 3 ? 'revealed' : ''}`}>
                  <b>受眾</b>
                  {analysisPreview.revealStep >= 3 ? <em>{analysisPreview.data?.audience?.summary || '正在整理目標受眾'}</em> : <span />}
                </div>
                <div className={`profile-row ${analysisPreview.revealStep >= 4 ? 'revealed' : ''}`}>
                  <b>定位</b>
                  {analysisPreview.revealStep >= 4 ? <em>{analysisPositioning(analysisPreview.data)}</em> : <span />}
                </div>
              </div>
            </div>
          </div>
        </section>

        <style jsx>{sharedStyles}</style>
        <style jsx>{`
          .analysis-progress {
            min-height: calc(100vh - 210px);
            display: grid;
            align-content: center;
            justify-items: center;
            text-align: center;
          }

          .eyebrow {
            margin: 0 0 20px;
            color: #9a9a9a;
            font-weight: 700;
          }

          .analysis-progress h1 {
            margin: 0 0 14px;
            font-size: clamp(2.2rem, 3.8vw, 3.6rem);
            line-height: 1.05;
          }

          .analysis-progress > p:not(.eyebrow) {
            margin: 0 0 38px;
            color: #595d64;
            font-size: 1.12rem;
          }

          .analysis-preview {
            width: min(100%, 920px);
            border-top: 1px solid #ececec;
            padding-top: 34px;
            display: grid;
            grid-template-columns: minmax(260px, 1fr) 70px minmax(260px, 1fr);
            gap: 24px;
            text-align: left;
          }

          .analysis-preview strong {
            display: block;
            margin-bottom: 12px;
            font-size: 1rem;
          }

          .browser-card,
          .profile-card {
            border: 1px solid #e7e7e7;
            border-radius: 8px;
            background: #ffffff;
            min-height: 250px;
            padding: 20px;
          }

          .browser-url-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 18px;
            color: #62666d;
            font-size: 0.95rem;
            font-weight: 750;
          }

          .browser-url-row img,
          .browser-url-row i {
            width: 28px;
            height: 28px;
            border-radius: 8px;
            background: #eeeeee;
            flex-shrink: 0;
          }

          .browser-url-row span {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .skeleton,
          .profile-row span {
            display: block;
            border-radius: 6px;
            background: linear-gradient(90deg, #eeeeee, #f7f7f7, #eeeeee);
            background-size: 240% 100%;
            animation: shimmer 1.4s infinite linear;
          }

          .skeleton.image {
            width: 100%;
            height: 100%;
          }

          .website-visual {
            height: 108px;
            margin-bottom: 16px;
            border-radius: 8px;
            overflow: hidden;
            background: #ffffff;
            border: 1px solid #eeeeee;
            opacity: 0.78;
            padding: 18px;
            transition: opacity 220ms ease, transform 220ms ease;
          }

          .website-visual.revealed,
          .website-copy.revealed {
            opacity: 1;
            transform: translateY(0);
          }

          .website-visual img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .website-copy {
            opacity: 0.72;
            transform: translateY(4px);
            transition: opacity 220ms ease, transform 220ms ease;
          }

          .website-copy b {
            display: block;
            margin-bottom: 6px;
            color: #1b1c1f;
            font-size: 0.95rem;
            line-height: 1.35;
          }

          .website-copy p {
            margin: 0;
            color: #70737a;
            font-size: 0.86rem;
            line-height: 1.45;
          }

          .skeleton.line {
            height: 12px;
            width: 78%;
            margin-bottom: 12px;
          }

          .skeleton.line.wide {
            width: 92%;
          }

          .skeleton.button {
            width: 84px;
            height: 28px;
            margin-top: 16px;
          }

          .brand-row {
            display: flex;
            align-items: center;
            gap: 16px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ededed;
            color: #767676;
            font-weight: 700;
            opacity: 0.75;
            transition: opacity 220ms ease, transform 220ms ease;
          }

          .brand-row.revealed,
          .profile-row.revealed {
            opacity: 1;
            transform: translateY(0);
          }

          .brand-row i,
          .brand-row img {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: #f6f6f6;
            object-fit: contain;
            padding: 6px;
            flex-shrink: 0;
          }

          .profile-row {
            display: grid;
            grid-template-columns: 90px 1fr;
            align-items: center;
            gap: 16px;
            margin-top: 22px;
            opacity: 0.75;
            transform: translateY(5px);
            transition: opacity 220ms ease, transform 220ms ease;
          }

          .profile-row b {
            color: #616161;
          }

          .profile-row span {
            height: 14px;
          }

          .profile-row em {
            color: #1b1c1f;
            font-size: 0.92rem;
            font-style: normal;
            font-weight: 700;
            line-height: 1.4;
            animation: revealText 220ms ease both;
          }

          .arrow {
            display: grid;
            place-items: center;
            padding-top: 84px;
            font-size: 3rem;
            color: #1b1c1f;
          }

          @keyframes shimmer {
            to {
              background-position: -240% 0;
            }
          }

          @keyframes revealText {
            from {
              opacity: 0;
              transform: translateY(5px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (max-width: 820px) {
            .analysis-preview {
              grid-template-columns: 1fr;
            }

            .arrow {
              padding: 0;
              transform: rotate(90deg);
            }
          }
        `}</style>
      </main>
    )
  }

  return (
    <main className="engine-page">
      <nav className="steps" aria-label="Onboarding progress">
        {['開始設定', '策略', '宣傳活動', '內容', '完成設定'].map((step, index) => (
          <span className={index === 0 ? 'active' : ''} key={step}>
            {step}
            {index < 4 ? <b>›</b> : null}
          </span>
        ))}
      </nav>

      <button className="more-button" type="button" aria-label="More options">
        ...
      </button>

      <section className="engine-shell">
        <form className={`engine-form mode-${mode}`} onSubmit={mode === 'website' ? handleWebsiteSubmit : (event) => { event.preventDefault(); continueToNext() }}>
          <h1>建立你的內容引擎</h1>
          <p>{mode === 'website' ? '輸入你的網站，SOON 會根據品牌資料整理下一步宣傳方向。' : '沒有網站也可以開始。直接描述你的品牌，SOON 會建立第一份內容策略。'}</p>

          {mode === 'website' ? (
            <div className="path-panel website-path">
              <div className="website-row">
                <input
                  required
                  type="text"
                  inputMode="url"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="yourbusiness.com"
                />
                <button type="submit" disabled={loading || !website.trim()}>
                  {loading ? '分析中...' : '分析我的品牌'}
                </button>
              </div>
              <button className="switch-link" type="button" onClick={() => { setMode('manual'); setError('') }}>
                沒有網站？直接描述你的品牌 →
              </button>
            </div>
          ) : (
            <div className="path-panel manual-path">
              <label className="manual-field">
                <span>品牌名稱</span>
                <input
                  required
                  value={manualProfile.businessName}
                  onChange={(event) => updateManualProfile('businessName', event.target.value)}
                  placeholder="例如：Rosary Lifestyle"
                />
              </label>

              <fieldset className="toggle-field">
                <legend>業務類型</legend>
                <div className="toggle-grid three">
                  {businessTypeOptions.map((option) => (
                    <button
                      className={manualProfile.businessType === option.value ? 'selected' : ''}
                      key={option.value}
                      type="button"
                      onClick={() => updateManualProfile('businessType', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="manual-field">
                <span>品牌簡介</span>
                <textarea
                  required
                  rows={3}
                  value={manualProfile.elevatorPitch}
                  onChange={(event) => updateManualProfile('elevatorPitch', event.target.value)}
                  placeholder="簡單描述你的品牌、主要產品或服務，以及你的獨特之處。例如：我係香港手工皮具品牌，主打原創設計，透過 Instagram 售賣。"
                />
              </label>

              <label className="manual-field upload-field">
                <span>上傳 Logo 或品牌圖片（選填）</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} />
                {manualProfile.logoUrl ? (
                  <div className="logo-preview-card">
                    <div className="logo-preview-image">
                      <img src={displayImageUrl(manualProfile.logoUrl)} alt="" />
                    </div>
                    <div>
                      <strong>已自動擷取品牌圖片</strong>
                      <em>你可以保留這張圖，或重新上傳另一張。</em>
                    </div>
                  </div>
                ) : null}
              </label>

              <label className="manual-field">
                <span>目標受眾</span>
                <input
                  required
                  value={manualProfile.targetAudience}
                  onChange={(event) => updateManualProfile('targetAudience', event.target.value)}
                  placeholder="例如：25-35歲香港女性，注重生活品味"
                />
              </label>

              <fieldset className="toggle-field">
                <legend>內容主角</legend>
                <div className="toggle-grid four">
                  {personaOptions.map((option) => (
                    <button
                      className={manualProfile.contentPersona === option ? 'selected' : ''}
                      key={option}
                      type="button"
                      onClick={() => updateManualProfile('contentPersona', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="toggle-field">
                <legend>內容語言</legend>
                <div className="toggle-grid three">
                  {languageOptions.map((option) => (
                    <button
                      className={manualProfile.primaryLanguage === option ? 'selected' : ''}
                      key={option}
                      type="button"
                      onClick={() => updateManualProfile('primaryLanguage', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="toggle-field">
                <legend>市場定位</legend>
                <div className="toggle-grid three">
                  {positioningOptions.map((option) => (
                    <button
                      className={manualProfile.marketPositioning === option ? 'selected' : ''}
                      key={option}
                      type="button"
                      onClick={() => updateManualProfile('marketPositioning', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button className="continue-button" type="submit" disabled={!canContinueManual}>
                繼續
              </button>
              <button className="switch-link" type="button" onClick={() => { setMode('website'); setError('') }}>
                返回輸入網址 ←
              </button>
            </div>
          )}

          {error && <p className="error-message">{error}</p>}
        </form>
      </section>

      <style jsx>{sharedStyles}</style>
      <style jsx>{`
        .engine-page {
          min-height: calc(100vh - 88px);
        }

        .engine-form {
          width: min(100%, 820px);
          display: grid;
          justify-items: center;
          text-align: center;
        }

        h1 {
          margin: 0 0 24px;
          font-size: 1.875rem;
          line-height: 1.15;
          letter-spacing: 0;
          font-weight: 700;
        }

        p {
          margin: 0 0 32px;
          color: #72757b;
          font-size: 1rem;
          line-height: 1.5;
        }

        .path-panel {
          width: min(100%, 760px);
          display: grid;
          justify-items: center;
          animation: pathFade 180ms ease;
        }

        .website-path {
          gap: 0;
        }

        .website-row {
          width: min(100%, 480px);
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        input,
        select,
        textarea {
          min-height: 62px;
          border-radius: 8px;
          border: 1px solid #d9d9d9;
          background: #ffffff;
          color: #161719;
          font: inherit;
          font-size: 1.05rem;
          padding: 0 18px;
          outline: none;
        }

        .website-row input {
          border-color: #161719;
          min-height: 48px;
        }

        input::placeholder,
        textarea::placeholder {
          color: #a6a6a6;
        }

        input:focus,
        select:focus,
        textarea:focus {
          box-shadow: 0 0 0 3px rgba(22, 23, 25, 0.08);
        }

        .website-row button {
          min-height: 48px;
          border: 0;
          border-radius: 8px;
          background: #202126;
          color: #ffffff;
          font: inherit;
          font-size: 1.05rem;
          font-weight: 500;
          cursor: pointer;
        }

        .website-row button:disabled {
          background: #b8b8b8;
          cursor: not-allowed;
        }

        .switch-link {
          width: fit-content;
          border: 0;
          background: transparent;
          color: #555960;
          font: inherit;
          font-size: 0.98rem;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 4px;
          transition: color 160ms ease, transform 160ms ease;
        }

        .switch-link:hover {
          color: #202126;
          transform: translateX(2px);
        }

        .manual-path {
          width: min(100%, 720px);
          justify-items: stretch;
          text-align: left;
          gap: 18px;
        }

        .manual-field,
        .toggle-field {
          display: grid;
          gap: 8px;
          margin: 0;
          padding: 0;
          border: 0;
        }

        .manual-field span,
        .toggle-field legend {
          color: #1b1c1f;
          font-size: 0.94rem;
          font-weight: 750;
        }

        .manual-field input,
        .manual-field textarea {
          width: 100%;
          border-color: #dedede;
          font-size: 1rem;
        }

        .manual-field input {
          min-height: 52px;
        }

        .manual-field textarea {
          min-height: 118px;
          padding: 14px 16px;
          resize: vertical;
          line-height: 1.55;
        }

        .upload-field input[type='file'] {
          min-height: 52px;
          padding: 13px 16px;
          cursor: pointer;
        }

        .logo-preview-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px;
          border: 1px solid #e6e6e6;
          border-radius: 8px;
          background: #fbfbfb;
        }

        .logo-preview-image {
          width: 72px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 6px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #eeeeee;
          flex-shrink: 0;
        }

        .logo-preview-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 6px;
        }

        .logo-preview-card strong {
          display: block;
          margin-bottom: 3px;
          color: #1b1c1f;
          font-size: 0.9rem;
        }

        .upload-field em {
          color: #357a4f;
          font-size: 0.86rem;
          font-style: normal;
          font-weight: 500;
        }

        .toggle-grid {
          display: grid;
          gap: 10px;
        }

        .toggle-grid.three {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .toggle-grid.four {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .toggle-grid button {
          min-height: 48px;
          border: 1px solid #dedede;
          border-radius: 8px;
          background: #ffffff;
          color: #1b1c1f;
          font: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
        }

        .toggle-grid button:hover {
          border-color: #202126;
          background: #fafafa;
        }

        .toggle-grid button.selected {
          border-color: #202126;
          background: #202126;
          color: #ffffff;
        }

        .continue-button {
          min-height: 54px;
          margin-top: 8px;
          border: 0;
          border-radius: 8px;
          background: #202126;
          color: #ffffff;
          font: inherit;
          font-size: 1.03rem;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 160ms ease, background 160ms ease;
        }

        .continue-button:disabled {
          background: #b8b8b8;
          cursor: not-allowed;
        }

        @keyframes pathFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .error-message {
          margin: 18px 0 0;
          color: #b42318;
          font-weight: 700;
        }

        @media (max-width: 760px) {
          .steps {
            overflow-x: auto;
            max-width: 100%;
            padding-bottom: 8px;
          }

          .website-row {
            grid-template-columns: 1fr;
          }

          .toggle-grid.three,
          .toggle-grid.four {
            grid-template-columns: 1fr;
          }

          .manual-path {
            width: 100%;
          }
        }
      `}</style>
    </main>
  )
}

const sharedStyles = `
  .engine-page {
    min-height: calc(100vh - 88px);
    background: #ffffff;
    color: #161719;
    position: relative;
    padding: 34px 24px 80px;
  }

  .steps {
    width: fit-content;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 18px;
    color: #9a9a9a;
    font-size: 1rem;
    font-weight: 650;
  }

  .steps span {
    display: inline-flex;
    align-items: center;
    gap: 18px;
    white-space: nowrap;
  }

  .steps .active {
    color: #1b1c1f;
  }

  .steps b {
    color: #b4b4b4;
    font-size: 1.2rem;
    font-weight: 500;
  }

  .more-button {
    position: absolute;
    top: 28px;
    right: 36px;
    border: 0;
    background: transparent;
    color: #1b1c1f;
    font-size: 1.2rem;
    cursor: pointer;
  }

	  .engine-shell {
	    min-height: calc(100vh - 60px);
	    display: flex;
	    flex-direction: column;
	    align-items: center;
	    justify-content: center;
	  }
	`

export default function ContentEnginePage() {
  return (
    <Suspense>
      <ContentEngineContent />
    </Suspense>
  )
}
