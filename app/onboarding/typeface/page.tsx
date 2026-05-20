'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import type { ContentStrategyOption } from '@/lib/content-strategy'
import { getTypefacePreset, type TypefacePreset, typefacePresets } from '@/lib/typefaces'
import type { VisualStylePreset } from '@/lib/visual-styles'
import { visualStylePresets } from '@/lib/visual-styles'

type BusinessProfile = {
  businessName?: string
  logoUrl?: string
  brandProfile?: {
    offer?: string
  }
}

function TypefaceContent() {
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = useState('block-w1g')
  const [showFontModal, setShowFontModal] = useState(false)
  const [profile, setProfile] = useState<BusinessProfile>({})
  const [strategy, setStrategy] = useState<ContentStrategyOption | null>(null)
  const [visualStyle, setVisualStyle] = useState<VisualStylePreset | null>(null)

  const selectedTypeface = useMemo(() => getTypefacePreset(selectedId), [selectedId])
  const businessName = profile.businessName || searchParams.get('brandName') || searchParams.get('name') || 'SOON-LOG'
  const previewImage = visualStyle?.previewPath || strategy?.imageUrl || '/assets/content-strategies/photos/lifestyle-content.jpg'
  const previewTitle = previewHeadline(businessName, strategy?.titleZh || strategy?.title || searchParams.get('strategy') || '')
  const caption = `${businessName} ${profile.brandProfile?.offer || '把品牌故事變成一眼看得明的內容。'}`

  useEffect(() => {
    setProfile(readSession<BusinessProfile>('soon-business-profile-v1') || {})
    setStrategy(readSession<ContentStrategyOption>('soon-content-strategy-v1') || null)

    const storedVisualStyle = readSession<VisualStylePreset>('soon-visual-style-v1')
    const styleFromUrl = visualStylePresets.find((style) => style.id === searchParams.get('visualStyle'))
    setVisualStyle(storedVisualStyle || styleFromUrl || visualStylePresets[0])

    const storedTypeface = readSession<TypefacePreset>('soon-typeface-v1')
    if (storedTypeface?.id) setSelectedId(storedTypeface.id)
  }, [searchParams])

  function handleContinue() {
    sessionStorage.setItem('soon-typeface-v1', JSON.stringify(selectedTypeface))

    const url = new URL('/onboarding/photo-control', window.location.origin)
    ;['plan', 'name', 'budget', 'category', 'website', 'language', 'brandName', 'strategy', 'campaign', 'visualStyle'].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
    url.searchParams.set('typeface', selectedTypeface.id)
    url.searchParams.set('autoAnalyze', '1')
    url.searchParams.set('generatePreview', '1')
    window.location.href = `${url.pathname}${url.search}`
  }

  return (
    <main className="typeface-page">
      <Steps />
      <button className="more-button" type="button" aria-label="More options">...</button>

      <section className="typeface-layout">
        <div className="typeface-panel">
          <div className="typeface-center">
            <header>
              <h1>選擇字型</h1>
              <p>字型會影響之後社交圖像、Reels 封面和廣告素材的第一印象。</p>
            </header>

            <button
              className="selected-font-card"
              onClick={() => setShowFontModal(true)}
              style={{
                fontFamily: selectedTypeface.fontFamily,
                fontWeight: selectedTypeface.weight,
                letterSpacing: selectedTypeface.letterSpacing,
              }}
              type="button"
            >
              <span aria-hidden="true">✓</span>
              <strong>{selectedTypeface.title}</strong>
              <small>{selectedTypeface.subtitle}</small>
            </button>

            <button className="browse-button" onClick={() => setShowFontModal(true)} type="button">
              瀏覽所有字型
            </button>
          </div>
        </div>

        <aside className="ig-preview-wrap" aria-label="Instagram preview">
          <div className="ig-card">
            <div className="ig-head">
              {profile.logoUrl ? <img src={profile.logoUrl} alt={`${businessName} logo`} /> : <span>{businessName.slice(0, 2).toUpperCase()}</span>}
              <div>
                <strong>{businessName}</strong>
                <small>剛剛</small>
              </div>
            </div>

            <div className="ig-image">
              <img src={previewImage} alt={`${businessName} preview`} />
              <div className="headline-wrap">
                <h2
                  style={{
                    fontFamily: selectedTypeface.fontFamily,
                    fontWeight: selectedTypeface.weight,
                    letterSpacing: selectedTypeface.letterSpacing,
                  }}
                >
                  {previewTitle}
                </h2>
              </div>
            </div>

            <div className="ig-actions">
              <span>♡</span>
              <span>⌕</span>
              <span>⌁</span>
              <span>⌑</span>
            </div>
            <p><strong>{businessName}</strong> {caption}<em>...更多</em></p>
          </div>
        </aside>
      </section>

      {showFontModal ? (
        <div className="modal-backdrop" role="presentation">
          <section className="font-modal" aria-modal="true" role="dialog" aria-label="字型風格">
            <header>
              <h2>字型風格</h2>
              <button aria-label="關閉" onClick={() => setShowFontModal(false)} type="button">×</button>
            </header>

            <div className="font-grid">
              {typefacePresets.map((font) => {
                const selected = font.id === selectedTypeface.id
                return (
                  <button
                    className={`font-option ${selected ? 'selected' : ''}`}
                    key={font.id}
                    onClick={() => setSelectedId(font.id)}
                    style={{
                      fontFamily: font.fontFamily,
                      fontWeight: font.weight,
                      letterSpacing: font.letterSpacing,
                    }}
                    type="button"
                  >
                    <strong>{font.title}</strong>
                    <small>{font.subtitle}</small>
                    <em>{font.moodZh}</em>
                  </button>
                )
              })}
            </div>

            <footer>
              <button type="button" onClick={() => setShowFontModal(false)}>取消</button>
              <button type="button" onClick={() => setShowFontModal(false)}>確認選擇</button>
            </footer>
          </section>
        </div>
      ) : null}

      <footer className="typeface-footer">
        <button type="button" onClick={() => window.history.back()}>返回</button>
        <button type="button" onClick={handleContinue}>下一步：相片使用</button>
      </footer>

      <style jsx>{styles}</style>
    </main>
  )
}

function Steps() {
  return (
    <nav className="steps" aria-label="Onboarding progress">
      {['開始設定', '策略', '宣傳活動', '內容', '完成設定'].map((step, index) => (
        <span className={index === 3 ? 'active' : ''} key={step}>
          {step}
          {index < 4 ? <b>›</b> : null}
        </span>
      ))}
    </nav>
  )
}

function readSession<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.sessionStorage.getItem(key)
    return value ? JSON.parse(value) as T : null
  } catch {
    return null
  }
}

function previewHeadline(businessName: string, strategyName: string) {
  if (/產品|product|電商/i.test(strategyName)) return `重新認識 ${businessName}`
  if (/優惠|offer|promotion/i.test(strategyName)) return `限時體驗 ${businessName}`
  if (/故事|story/i.test(strategyName)) return `把日常變成故事`
  if (/權威|authority|教育|education/i.test(strategyName)) return `懂得選擇，才會買得準`
  return `讓你的品牌被記住`
}

const styles = `
  .typeface-page {
    min-height: calc(100vh - 88px);
    background: #ffffff;
    color: #17181c;
    position: relative;
    padding: 18px 0 76px;
    overflow: hidden;
  }

  .steps {
    width: fit-content;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #9a9a9a;
    font-size: 0.78rem;
    font-weight: 500;
  }

  .steps span {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    white-space: nowrap;
  }

  .steps .active {
    color: #1b1c1f;
  }

  .steps b {
    color: #b4b4b4;
    font-size: 0.92rem;
    font-weight: 500;
  }

  .more-button {
    position: absolute;
    top: 18px;
    right: 30px;
    border: 0;
    background: transparent;
    color: #1b1c1f;
    font-size: 0.92rem;
    cursor: pointer;
  }

  .typeface-layout {
    min-height: calc(100vh - 182px);
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .typeface-panel {
    display: grid;
    place-items: center;
    padding: 48px clamp(24px, 5vw, 72px);
  }

  .typeface-center {
    width: min(100%, 560px);
    display: grid;
    justify-items: center;
    gap: 22px;
  }

  .typeface-center header {
    text-align: center;
  }

  h1 {
    margin: 0 0 8px;
    font-size: clamp(2rem, 4.2vw, 3rem);
    line-height: 1;
    letter-spacing: 0;
    font-weight: 520;
  }

  .typeface-center p {
    max-width: 480px;
    margin: 0 auto;
    color: #6b6f78;
    font-size: 0.95rem;
    line-height: 1.55;
  }

  .selected-font-card {
    width: min(100%, 500px);
    min-height: 150px;
    border: 1px solid #e6e7eb;
    border-radius: 9px;
    background: #fbfbfc;
    color: #18191d;
    cursor: pointer;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 10px;
    position: relative;
    padding: 24px;
  }

  .selected-font-card span {
    position: absolute;
    top: 14px;
    left: 14px;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    background: #151515;
    color: #ffffff;
    display: grid;
    place-items: center;
    font: 600 0.8rem/1 Arial, sans-serif;
  }

  .selected-font-card strong {
    font-size: clamp(2rem, 4.6vw, 3.2rem);
    line-height: 0.95;
    text-align: center;
  }

  .selected-font-card small {
    font: 500 0.92rem/1.2 Arial, sans-serif;
    color: #45484f;
  }

  .browse-button {
    border: 1px solid #e3e4e8;
    border-radius: 7px;
    background: #ffffff;
    color: #23252b;
    min-height: 38px;
    padding: 0 18px;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
  }

  .ig-preview-wrap {
    min-height: calc(100vh - 182px);
    background: radial-gradient(circle at 50% 10%, #2a2d30 0%, #101214 44%, #090a0b 100%);
    display: grid;
    place-items: center;
    padding: 44px;
  }

  .ig-card {
    width: min(100%, 360px);
    border-radius: 7px;
    background: #050505;
    color: #ffffff;
    overflow: hidden;
    box-shadow: 0 28px 80px rgba(0,0,0,0.35);
  }

  .ig-head {
    height: 42px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
  }

  .ig-head img,
  .ig-head span {
    width: 26px;
    height: 26px;
    border-radius: 999px;
    object-fit: contain;
    background: #1c1c1c;
    display: grid;
    place-items: center;
    color: #ffffff;
    font-size: 0.58rem;
    font-weight: 800;
  }

  .ig-head div {
    display: grid;
    gap: 1px;
  }

  .ig-head strong {
    font-size: 0.78rem;
    line-height: 1;
    font-weight: 700;
  }

  .ig-head small {
    color: rgba(255,255,255,0.7);
    font-size: 0.62rem;
  }

  .ig-image {
    aspect-ratio: 4 / 5;
    position: relative;
    overflow: hidden;
    background: #1b1b1d;
  }

  .ig-image > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .headline-wrap {
    position: absolute;
    left: 34px;
    right: 54px;
    bottom: 48px;
    display: flex;
    justify-content: flex-start;
  }

  .headline-wrap h2 {
    max-width: 100%;
    margin: 0;
    border-radius: 8px;
    background: rgba(39, 31, 28, 0.68);
    color: #ffffff;
    padding: 9px 11px;
    font-size: clamp(1.35rem, 2.4vw, 1.75rem);
    line-height: 1.08;
    text-wrap: balance;
    overflow-wrap: anywhere;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    text-shadow: 0 2px 16px rgba(0,0,0,0.26);
  }

  .ig-actions {
    height: 30px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    color: #f3f3f3;
    font-size: 1.2rem;
  }

  .ig-actions span:last-child {
    margin-left: auto;
  }

  .ig-card p {
    margin: 0;
    padding: 0 12px 14px;
    color: rgba(255,255,255,0.78);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .ig-card p strong {
    color: #ffffff;
    font-weight: 700;
  }

  .ig-card p em {
    color: rgba(255,255,255,0.52);
    font-style: normal;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgba(10, 11, 13, 0.38);
    backdrop-filter: blur(8px);
    display: grid;
    place-items: center;
    padding: 32px;
  }

  .font-modal {
    width: min(100%, 1040px);
    max-height: min(760px, calc(100vh - 64px));
    border-radius: 14px;
    background: #ffffff;
    color: #18191d;
    display: grid;
    grid-template-rows: auto 1fr auto;
    box-shadow: 0 24px 90px rgba(0,0,0,0.22);
    overflow: hidden;
  }

  .font-modal header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 26px 32px 16px;
  }

  .font-modal h2 {
    margin: 0;
    font-size: 1.55rem;
    font-weight: 520;
    letter-spacing: 0;
  }

  .font-modal header button {
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #1c1d20;
    cursor: pointer;
    font-size: 1.35rem;
    line-height: 1;
  }

  .font-grid {
    overflow: auto;
    padding: 0 32px 28px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .font-option {
    min-height: 150px;
    border: 1px solid transparent;
    border-radius: 9px;
    background: #f7f7f8;
    color: #17181c;
    cursor: pointer;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 9px;
    padding: 18px;
    text-align: center;
  }

  .font-option.selected {
    border-color: #17181c;
    box-shadow: inset 0 0 0 1px #17181c;
    background: #fbfbfb;
  }

  .font-option strong {
    font-size: clamp(1.6rem, 3.1vw, 2.65rem);
    line-height: 0.96;
    overflow-wrap: anywhere;
  }

  .font-option small,
  .font-option em {
    font: 500 0.82rem/1.25 Arial, sans-serif;
    color: #3f4248;
  }

  .font-option em {
    color: #777b82;
    font-style: normal;
  }

  .font-modal footer,
  .typeface-footer {
    min-height: 56px;
    border-top: 1px solid #e7e7e7;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(18px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 22px;
  }

  .typeface-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
  }

  .font-modal footer button,
  .typeface-footer button {
    min-height: 34px;
    border-radius: 7px;
    border: 0;
    background: transparent;
    color: #191919;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0 14px;
  }

  .font-modal footer button:last-child,
  .typeface-footer button:last-child {
    background: #111111;
    color: #ffffff;
  }

  @media (max-width: 960px) {
    .typeface-page {
      overflow: visible;
    }

    .typeface-layout {
      grid-template-columns: 1fr;
    }

    .ig-preview-wrap {
      min-height: auto;
    }
  }

  @media (max-width: 680px) {
    .typeface-page {
      padding-top: 14px;
    }

    .steps {
      width: calc(100% - 28px);
      overflow-x: auto;
      justify-content: flex-start;
    }

    .typeface-panel {
      padding: 36px 16px;
    }

    .ig-preview-wrap {
      padding: 28px 16px 36px;
    }

    .font-grid {
      grid-template-columns: 1fr;
      padding: 0 18px 24px;
    }

    .modal-backdrop {
      padding: 14px;
    }

    .font-modal header {
      padding: 20px 18px 14px;
    }
  }
`

export default function TypefacePage() {
  return (
    <Suspense fallback={null}>
      <TypefaceContent />
    </Suspense>
  )
}
