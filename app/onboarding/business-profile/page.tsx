'use client'

import type { ChangeEvent } from 'react'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type BusinessType = 'services' | 'local' | 'products'

type BusinessProfile = {
  websiteUrl: string
  language: string
  businessName: string
  businessType: BusinessType
  elevatorPitch: string
  logoUrl: string
  audience: {
    ageMin: string
    ageMax: string
    gender: string
    locations: string[]
    summary: string
  }
  contentPeople: {
    ageRange: string
    gender: string
    ethnicity: string
  }
  marketPositioning: {
    primary: string
    secondary: string
    tertiary: string
  }
  brandProfile: {
    type: string
    audience: string
    position: string
    tone: string
    offer: string
  }
}

const businessTypes: Array<{ id: BusinessType; title: string; text: string }> = [
  { id: 'services', title: '服務', text: '顧問、代理、自由工作者' },
  { id: 'local', title: '本地業務', text: '餐廳、門店、美容、場地' },
  { id: 'products', title: '產品', text: '電商、製造商、品牌產品' },
]

const fallbackProfile: BusinessProfile = {
  websiteUrl: '',
  language: '繁體中文',
  businessName: '你的品牌',
  businessType: 'services',
  elevatorPitch: 'SOON 會根據你的網站內容整理品牌定位、受眾方向與下一步內容策略。',
  logoUrl: '',
  audience: {
    ageMin: '18',
    ageMax: '34',
    gender: '所有性別',
    locations: ['香港'],
    summary: '對品牌服務或產品有明確需求的潛在客戶。',
  },
  contentPeople: {
    ageRange: '18-34',
    gender: '所有性別',
    ethnicity: '多元族群',
  },
  marketPositioning: {
    primary: '以清晰的品牌主張建立信任，降低客戶理解成本。',
    secondary: '透過內容展示實際使用情境、成果與品牌個性。',
    tertiary: '把網站資訊延伸成可投放、可追蹤、可優化的宣傳內容。',
  },
  brandProfile: {
    type: '服務型品牌',
    audience: '18-34，香港',
    position: '以內容建立信任與轉化',
    tone: '專業、清晰、可信',
    offer: '品牌服務與內容體驗',
  },
}

function BusinessProfileContent() {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<BusinessProfile>(fallbackProfile)
  const [refreshingLogo, setRefreshingLogo] = useState(false)
  const [attemptedLogoRefresh, setAttemptedLogoRefresh] = useState(false)
  const [logoLoadError, setLogoLoadError] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('soon-website-analysis-v1')
    const websiteUrl = searchParams.get('website') || ''
    const language = searchParams.get('language') || '繁體中文'
    if (!stored) {
      setProfile((current) => ({
        ...current,
        websiteUrl,
        language,
      }))
      return
    }

    try {
      const parsed = JSON.parse(stored)
      setProfile({ ...fallbackProfile, ...parsed.analysis, websiteUrl: parsed.analysis?.websiteUrl || websiteUrl, language: parsed.analysis?.language || language })
    } catch {
      setProfile(fallbackProfile)
    }
  }, [searchParams])

  useEffect(() => {
    const websiteUrl = profile.websiteUrl || searchParams.get('website')
    if (!websiteUrl || (profile.logoUrl && !logoLoadError) || refreshingLogo || (attemptedLogoRefresh && !logoLoadError)) return

    let isActive = true
    setRefreshingLogo(true)
    setAttemptedLogoRefresh(true)

    fetch('/api/analyze-website', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        website: websiteUrl,
        language: profile.language || searchParams.get('language') || '繁體中文',
        name: searchParams.get('name') || undefined,
        budget: searchParams.get('budget') || undefined,
        category: searchParams.get('category') || undefined,
        plan: searchParams.get('plan') || undefined,
      }),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((analysis) => {
        if (!isActive || !analysis?.logoUrl) return
        setLogoLoadError(false)
        setProfile((current) => {
          const next = { ...current, logoUrl: analysis.logoUrl }
          const stored = sessionStorage.getItem('soon-website-analysis-v1')
          if (stored) {
            try {
              const parsed = JSON.parse(stored)
              sessionStorage.setItem('soon-website-analysis-v1', JSON.stringify({
                ...parsed,
                analysis: { ...parsed.analysis, logoUrl: analysis.logoUrl },
              }))
            } catch {
              sessionStorage.setItem('soon-website-analysis-v1', JSON.stringify({ analysis: next }))
            }
          }
          return next
        })
      })
      .finally(() => {
        if (isActive) setRefreshingLogo(false)
      })

    return () => {
      isActive = false
    }
  }, [attemptedLogoRefresh, logoLoadError, profile.logoUrl, profile.websiteUrl, profile.language, refreshingLogo, searchParams])

  const positioningText = useMemo(() => {
    return [
      `主要定位：${profile.marketPositioning.primary}`,
      `次要定位：${profile.marketPositioning.secondary}`,
      `延伸定位：${profile.marketPositioning.tertiary}`,
    ].join('\n')
  }, [profile.marketPositioning])

  function updateProfile<T extends keyof BusinessProfile>(key: T, value: BusinessProfile[T]) {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  function updateNested<T extends 'audience' | 'contentPeople' | 'marketPositioning' | 'brandProfile'>(
    section: T,
    key: keyof BusinessProfile[T],
    value: string | string[]
  ) {
    setProfile((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }))
  }

  function handlePositioningChange(value: string) {
    const lines = value.split('\n').map((line) => line.replace(/^(主要定位|次要定位|延伸定位|Primary Positioning|Secondary Positioning|Tertiary Positioning)[:：]?/, '').trim()).filter(Boolean)
    updateProfile('marketPositioning', {
      primary: lines[0] || '',
      secondary: lines[1] || '',
      tertiary: lines[2] || '',
    })
  }

  function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setLogoLoadError(false)
    updateProfile('logoUrl', URL.createObjectURL(file))
  }

  function handleLogoError() {
    setLogoLoadError(true)
    setAttemptedLogoRefresh(false)
    updateProfile('logoUrl', '')
  }

  function handleRefreshLogo() {
    setLogoLoadError(true)
    setAttemptedLogoRefresh(false)
    setProfile((current) => ({ ...current, logoUrl: '' }))
    const stored = sessionStorage.getItem('soon-website-analysis-v1')
    if (!stored) return

    try {
      const parsed = JSON.parse(stored)
      sessionStorage.setItem('soon-website-analysis-v1', JSON.stringify({
        ...parsed,
        analysis: { ...parsed.analysis, logoUrl: '' },
      }))
    } catch {
      sessionStorage.removeItem('soon-website-analysis-v1')
    }
  }

  function logoSrc(value: string) {
    if (!value) return ''
    if (value.startsWith('blob:') || value.startsWith('data:')) return value
    return `/api/logo-image?url=${encodeURIComponent(value)}`
  }

  function handleLooksGood() {
    sessionStorage.setItem('soon-business-profile-v1', JSON.stringify(profile))

    const url = new URL('/onboarding/content-strategy', window.location.origin)
    ;['plan', 'name', 'budget', 'category'].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
    url.searchParams.set('website', profile.websiteUrl || searchParams.get('website') || '')
    url.searchParams.set('language', profile.language || searchParams.get('language') || '繁體中文')
    url.searchParams.set('brandName', profile.businessName)
    window.location.href = `${url.pathname}${url.search}`
  }

  return (
    <main className="profile-page">
      <nav className="steps" aria-label="Onboarding progress">
        {['你的業務', '目標與計劃', '你的品牌', '生成內容'].map((step, index) => (
          <span className={index === 0 ? 'active' : ''} key={step}>
            {step}
            {index < 3 ? <b>›</b> : null}
          </span>
        ))}
      </nav>

      <button className="more-button" type="button" aria-label="More options">
        ...
      </button>

      <section className="profile-shell">
        <div className="profile-main">
          <label className="field-block">
            <span>品牌名稱</span>
            <input value={profile.businessName} onChange={(event) => updateProfile('businessName', event.target.value)} />
          </label>

          <section className="business-type">
            <h2>選擇你的業務類型</h2>
            <p>這會影響之後的內容計劃與宣傳角度。</p>
            <div className="type-grid">
              {businessTypes.map((type) => (
                <button
                  className={profile.businessType === type.id ? 'active' : ''}
                  key={type.id}
                  type="button"
                  onClick={() => updateProfile('businessType', type.id)}
                >
                  <strong>{type.title}</strong>
                  <span>{type.text}</span>
                </button>
              ))}
            </div>
          </section>

          <label className="field-block">
            <span>品牌簡介</span>
            <textarea value={profile.elevatorPitch} onChange={(event) => updateProfile('elevatorPitch', event.target.value)} />
          </label>

          <section className="logo-block">
            <div className="section-head">
              <h2>品牌標誌</h2>
              <div className="logo-actions">
                <button type="button" onClick={handleRefreshLogo}>重新讀取標誌</button>
                <label className="upload-button">
                  編輯
                  <input accept="image/*" type="file" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
            <div className="logo-preview">
              {profile.logoUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoSrc(profile.logoUrl)} alt={`${profile.businessName} logo`} onError={handleLogoError} />
                  <small>{profile.logoUrl.replace(/^https?:\/\//, '')}</small>
                </>
              ) : refreshingLogo ? (
                <span>正在讀取品牌標誌...</span>
              ) : (
                <strong>{profile.businessName}</strong>
              )}
            </div>
          </section>

          <div className="split">
            <section>
              <h2>你正在對誰說話</h2>
              <div className="inline-fields">
                <label>
                  <span>年齡</span>
                  <input value={profile.audience.ageMin} onChange={(event) => updateNested('audience', 'ageMin', event.target.value)} />
                </label>
                <em>至</em>
                <label>
                  <span>&nbsp;</span>
                  <input value={profile.audience.ageMax} onChange={(event) => updateNested('audience', 'ageMax', event.target.value)} />
                </label>
                <label>
                  <span>性別</span>
                  <select value={profile.audience.gender} onChange={(event) => updateNested('audience', 'gender', event.target.value)}>
                    <option value="所有性別">所有性別</option>
                    <option value="女性為主">女性為主</option>
                    <option value="男性為主">男性為主</option>
                  </select>
                </label>
              </div>
            </section>

            <section>
              <h2>受眾</h2>
              <label>
                <span>主要市場</span>
                <input
                  value={profile.audience.locations.join('、')}
                  onChange={(event) => updateNested('audience', 'locations', event.target.value.split(/[、,]/).map((item) => item.trim()).filter(Boolean))}
                />
              </label>
            </section>
          </div>

          <section>
            <h2>內容中出現的人物</h2>
            <div className="three-fields">
              <label>
                <span>年齡</span>
                <select value={profile.contentPeople.ageRange} onChange={(event) => updateNested('contentPeople', 'ageRange', event.target.value)}>
                  <option>18-24</option>
                  <option>25-34</option>
                  <option>35-44</option>
                  <option>45+</option>
                </select>
              </label>
              <label>
                  <span>性別</span>
                  <select value={profile.contentPeople.gender} onChange={(event) => updateNested('contentPeople', 'gender', event.target.value)}>
                  <option value="所有性別">所有性別</option>
                  <option value="女性為主">女性為主</option>
                  <option value="男性為主">男性為主</option>
                </select>
              </label>
              <label>
                <span>族群</span>
                <select value={profile.contentPeople.ethnicity} onChange={(event) => updateNested('contentPeople', 'ethnicity', event.target.value)}>
                  <option value="多元族群">多元族群</option>
                  <option value="本地香港人">本地香港人</option>
                  <option value="亞洲面孔">亞洲面孔</option>
                  <option value="國際化形象">國際化形象</option>
                </select>
              </label>
            </div>
          </section>

          <label className="field-block">
            <span>市場定位</span>
            <textarea className="positioning" value={positioningText} onChange={(event) => handlePositioningChange(event.target.value)} />
          </label>
        </div>

        <aside className="helper-card">
          <h2>看起來正確嗎？</h2>
          <p>這份資料由你的網站建立。如有不準確，可直接在左邊修改。</p>

          <h3>建議檢查</h3>
          {['品牌核心是否準確', '目標受眾是否相關', '市場定位是否合理'].map((item) => (
            <div className="check-row" key={item}>
              <span>✓</span>
              {item}
            </div>
          ))}

          <h3>需要新增或修改？</h3>
          <p>直接點擊任何欄位即可編輯。</p>

          <h3>為什麼重要？</h3>
          <p>資料越準確，之後生成的策略、內容和廣告方向就越貼近實際生意。</p>
        </aside>
      </section>

      <footer className="profile-footer">
        <button type="button" onClick={() => window.history.back()}>返回</button>
        <button type="button" onClick={handleLooksGood}>看起來正確</button>
      </footer>

      <style jsx>{`
        .profile-page {
          min-height: calc(100vh - 88px);
          background: #ffffff;
          color: #161719;
          position: relative;
          padding: 28px 24px 108px;
        }

        .steps {
          width: fit-content;
          margin: 0 auto 28px;
          display: flex;
          align-items: center;
          gap: 16px;
          color: #9a9a9a;
          font-size: 0.92rem;
          font-weight: 650;
        }

        .steps span {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          white-space: nowrap;
        }

        .steps .active {
          color: #1b1c1f;
        }

        .steps b {
          color: #b4b4b4;
          font-size: 1.05rem;
          font-weight: 500;
        }

        .more-button {
          position: absolute;
          top: 28px;
          right: 36px;
          border: 0;
          background: transparent;
          color: #1b1c1f;
          font-size: 1.05rem;
          cursor: pointer;
        }

        .profile-shell {
          width: min(100%, 1280px);
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 56px;
          align-items: start;
        }

        .profile-main {
          display: grid;
          gap: 26px;
        }

        h2 {
          margin: 0;
          font-size: 1.26rem;
          line-height: 1.2;
          font-weight: 650;
        }

        p {
          margin: 6px 0 0;
          color: #6d7077;
          line-height: 1.42;
          font-size: 0.92rem;
        }

        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .logo-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .logo-actions button,
        .upload-button {
          min-height: 32px;
          border: 1px solid #dddddd;
          border-radius: 8px;
          background: #ffffff;
          color: #1b1c1f;
          font: inherit;
          font-weight: 700;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .upload-button input {
          display: none;
        }

        .logo-preview {
          min-height: 182px;
          border: 1px solid #dddddd;
          border-radius: 8px;
          background: #ffffff;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 10px;
          overflow: hidden;
          padding: 14px;
        }

        .logo-preview img {
          width: min(92%, 320px);
          max-height: 138px;
          object-fit: contain;
          display: block;
        }

        .logo-preview strong {
          font-size: 1.38rem;
          color: #6c6c6c;
        }

        .logo-preview span {
          color: #7d7f85;
          font-size: 0.9rem;
          font-weight: 650;
        }

        .logo-preview small {
          color: #9a9da3;
          font-size: 0.76rem;
          font-weight: 650;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .field-block,
        label {
          display: grid;
          gap: 7px;
          color: #7d7f85;
          font-size: 0.86rem;
          font-weight: 650;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid #dedede;
          border-radius: 8px;
          background: #ffffff;
          color: #161719;
          font: inherit;
          font-size: 0.96rem;
          outline: none;
        }

        input,
        select {
          min-height: 44px;
          padding: 0 14px;
        }

        textarea {
          min-height: 106px;
          padding: 14px;
          resize: vertical;
          line-height: 1.55;
        }

        .positioning {
          min-height: 146px;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #161719;
          box-shadow: 0 0 0 3px rgba(22, 23, 25, 0.08);
        }

        .business-type {
          border: 1px solid #dfe8f1;
          border-radius: 8px;
          background: #f4f8fc;
          padding: 20px;
        }

        .type-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 16px;
        }

        .type-grid button {
          min-height: 92px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #ffffff;
          color: #161719;
          text-align: left;
          padding: 16px;
          cursor: pointer;
        }

        .type-grid button.active {
          border-color: #161719;
          box-shadow: inset 0 0 0 1px #161719;
        }

        .type-grid strong,
        .type-grid span {
          display: block;
        }

        .type-grid strong {
          margin-bottom: 5px;
          font-size: 1rem;
        }

        .type-grid span {
          color: #72757b;
          line-height: 1.35;
          font-size: 0.86rem;
        }

        .split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
        }

        .inline-fields,
        .three-fields {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .inline-fields {
          grid-template-columns: 68px 22px 68px minmax(140px, 1fr);
          align-items: end;
        }

        .inline-fields em {
          align-self: center;
          color: #8a8a8a;
          font-style: normal;
          padding-top: 20px;
        }

        .three-fields {
          grid-template-columns: repeat(3, 1fr);
        }

        .helper-card {
          position: sticky;
          top: 110px;
          border: 1px solid #e1e1e1;
          border-radius: 10px;
          background: #ffffff;
          padding: 26px;
        }

        .helper-card h2 {
          margin-bottom: 8px;
        }

        .helper-card h3 {
          margin: 28px 0 10px;
          font-size: 0.98rem;
        }

        .check-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          color: #333333;
          font-weight: 650;
          font-size: 0.92rem;
        }

        .check-row span {
          width: 19px;
          height: 19px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #4caf50;
          color: #ffffff;
          font-size: 0.7rem;
        }

        .profile-footer {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          height: 66px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(16px);
          border-top: 1px solid #ededed;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 22px;
          z-index: 20;
        }

        .profile-footer button {
          border: 0;
          background: transparent;
          color: #161719;
          font: inherit;
          font-size: 0.96rem;
          cursor: pointer;
        }

        .profile-footer button:last-child {
          min-height: 42px;
          border-radius: 8px;
          background: #151515;
          color: #ffffff;
          font-weight: 750;
          padding: 0 18px;
        }

        @media (max-width: 1080px) {
          .profile-shell {
            grid-template-columns: 1fr;
            gap: 36px;
          }

          .helper-card {
            position: static;
          }
        }

        @media (max-width: 760px) {
          .steps {
            max-width: 100%;
            overflow-x: auto;
            padding-bottom: 8px;
          }

          .type-grid,
          .split,
          .three-fields,
          .inline-fields {
            grid-template-columns: 1fr;
          }

          .inline-fields em {
            display: none;
          }
        }
      `}</style>
    </main>
  )
}

export default function BusinessProfilePage() {
  return (
    <Suspense fallback={null}>
      <BusinessProfileContent />
    </Suspense>
  )
}
