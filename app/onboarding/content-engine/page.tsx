'use client'

import type { FormEvent } from 'react'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const languages = ['繁體中文', '簡體中文', 'English (US)', 'English (UK)', '泰文', '越南文', '菲律賓文', '日本語', '한국어']
const progressMessages = ['正在讀取網站', '識別品牌核心', '整理受眾輪廓', '抽取內容方向', '建立品牌資料']

function ContentEngineContent() {
  const searchParams = useSearchParams()
  const [website, setWebsite] = useState('')
  const [language, setLanguage] = useState('繁體中文')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progressIndex, setProgressIndex] = useState(0)

  useEffect(() => {
    if (!loading) return
    const timer = window.setInterval(() => {
      setProgressIndex((current) => (current + 1) % progressMessages.length)
    }, 1800)

    return () => window.clearInterval(timer)
  }, [loading])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setProgressIndex(0)

    const passthroughKeys = ['plan', 'name', 'budget', 'category']
    const passthrough: Record<string, string> = {}
    passthroughKeys.forEach((key) => {
      const value = searchParams.get(key)
      if (value) passthrough[key] = value
    })

    try {
      const response = await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          website: website.trim(),
          language,
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

      const url = new URL('/onboarding/business-profile', window.location.origin)
      Object.entries(passthrough).forEach(([key, value]) => url.searchParams.set(key, value))
      url.searchParams.set('website', website.trim())
      url.searchParams.set('language', language)

      window.location.href = `${url.pathname}${url.search}`
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
                <span>{website.trim()}</span>
                <div className="skeleton image" />
                <div className="skeleton line wide" />
                <div className="skeleton line" />
                <div className="skeleton button" />
              </div>
            </div>
            <div className="arrow">→</div>
            <div>
              <strong>品牌資料</strong>
              <div className="profile-card">
                <div className="brand-row">
                  <i />
                  <span>正在建立...</span>
                </div>
                {['類型', '受眾', '定位'].map((item) => (
                  <div className="profile-row" key={item}>
                    <b>{item}</b>
                    <span />
                  </div>
                ))}
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

          .browser-card span {
            display: block;
            margin-bottom: 18px;
            color: #a1a1a1;
            font-size: 0.9rem;
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
            height: 96px;
            margin-bottom: 18px;
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
          }

          .brand-row i {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: #eeeeee;
          }

          .profile-row {
            display: grid;
            grid-template-columns: 90px 1fr;
            align-items: center;
            gap: 16px;
            margin-top: 22px;
          }

          .profile-row b {
            color: #616161;
          }

          .profile-row span {
            height: 14px;
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
        <form className="engine-form" onSubmit={handleSubmit}>
          <h1>建立你的內容引擎</h1>
          <p>輸入你的網站，SOON 會根據品牌資料整理下一步宣傳方向。</p>

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

          <label className="language-row">
            <span>內容語言</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              {languages.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          {error && <p className="error-message">{error}</p>}
        </form>
      </section>

      <style jsx>{sharedStyles}</style>
      <style jsx>{`
        .engine-page {
          min-height: calc(100vh - 88px);
        }

        .engine-form {
          width: min(100%, 760px);
          display: grid;
          justify-items: center;
          text-align: center;
        }

        h1 {
          margin: 0 0 10px;
          font-size: clamp(2.6rem, 4.2vw, 4.4rem);
          line-height: 1;
          letter-spacing: 0;
          font-weight: 620;
        }

        p {
          margin: 0 0 34px;
          color: #72757b;
          font-size: 1.18rem;
          line-height: 1.5;
        }

        .website-row {
          width: min(100%, 700px);
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 260px;
          gap: 12px;
          margin-bottom: 28px;
        }

        input,
        select {
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

        input {
          border-color: #161719;
        }

        input::placeholder {
          color: #a6a6a6;
        }

        input:focus,
        select:focus {
          box-shadow: 0 0 0 3px rgba(22, 23, 25, 0.08);
        }

        .website-row button {
          min-height: 62px;
          border: 0;
          border-radius: 8px;
          background: #ef3f2f;
          color: #ffffff;
          font: inherit;
          font-size: 1.05rem;
          font-weight: 800;
          cursor: pointer;
        }

        .website-row button:disabled {
          background: #b8b8b8;
          cursor: not-allowed;
        }

        .language-row {
          display: inline-grid;
          grid-template-columns: auto 220px;
          align-items: center;
          gap: 14px;
          color: #72757b;
          font-size: 1rem;
          font-weight: 650;
        }

        .language-row select {
          min-height: 48px;
          padding: 0 14px;
          appearance: auto;
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

          .language-row {
            grid-template-columns: 1fr;
            justify-items: start;
            width: 100%;
          }

          .language-row select {
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
    min-height: calc(100vh - 210px);
    display: grid;
    place-items: center;
  }
`

export default function ContentEnginePage() {
  return (
    <Suspense>
      <ContentEngineContent />
    </Suspense>
  )
}
