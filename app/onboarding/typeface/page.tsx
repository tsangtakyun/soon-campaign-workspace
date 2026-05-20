'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import {
  recommendTypefaceDirection,
  recommendTypefacesInDirection,
  type RankedDirection,
  type RankedTypeface,
  type TypefaceRecommendationInput,
} from '@/lib/recommend-typeface'
import {
  getTypefaceCssWeight,
  getTypefaceFontFaceStyles,
  typefaces,
} from '@/lib/typefaces'

type Step = 'direction' | 'typeface'

function TypefaceContent() {
  const searchParams = useSearchParams()
  const [input, setInput] = useState<TypefaceRecommendationInput>({})
  const [rankedDirections, setRankedDirections] = useState<RankedDirection[]>([])
  const [selectedDirectionId, setSelectedDirectionId] = useState<string | null>(null)
  const [selectedTypefaceId, setSelectedTypefaceId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('direction')

  const rankedTypefaces = useMemo(() => {
    if (!selectedDirectionId) return []
    return recommendTypefacesInDirection(selectedDirectionId, input)
  }, [input, selectedDirectionId])

  const selectedDirection = rankedDirections.find((direction) => direction.id === selectedDirectionId)
  const selectedTypeface = rankedTypefaces.find((typeface) => typeface.id === selectedTypefaceId) || rankedTypefaces[0]
  const googleTypefaceLinks = useMemo(
    () => rankedTypefaces.filter((typeface) => typeface.isGoogleFont).map((typeface) => typeface.cdnUrl),
    [rankedTypefaces]
  )

  useEffect(() => {
    const nextInput: TypefaceRecommendationInput = {
      profile: readSession('soon-business-profile-v1') ?? undefined,
      strategy: readSession('soon-content-strategy-v1') ?? undefined,
      distribution: readSession('soon-distribution-preferences-v1') ?? undefined,
    }
    const ranked = recommendTypefaceDirection(nextInput)
    const storedTypeface = readSession<{
      directionId?: string
      typefaceId?: string
      id?: string
    }>('soon-typeface-v1')
    const typefaceFromStored = storedTypeface?.typefaceId || storedTypeface?.id
    const storedDirection =
      storedTypeface?.directionId ||
      typefaces.find((typeface) => typeface.id === typefaceFromStored)?.directionId ||
      ranked[0]?.id ||
      null

    setInput(nextInput)
    setRankedDirections(ranked)
    setSelectedDirectionId(storedDirection)
    if (typefaceFromStored) setSelectedTypefaceId(typefaceFromStored)
  }, [])

  useEffect(() => {
    if (!selectedDirectionId || step !== 'typeface') return
    const ranked = recommendTypefacesInDirection(selectedDirectionId, input)
    if (!ranked.some((typeface) => typeface.id === selectedTypefaceId)) {
      setSelectedTypefaceId(ranked[0]?.id ?? null)
    }
  }, [input, selectedDirectionId, selectedTypefaceId, step])

  function selectDirection(directionId: string) {
    const ranked = recommendTypefacesInDirection(directionId, input)
    setSelectedDirectionId(directionId)
    setSelectedTypefaceId(ranked[0]?.id ?? null)
    setStep('typeface')
  }

  function handleConfirm() {
    if (!selectedDirection || !selectedTypeface) return

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

    const url = new URL('/onboarding/content-mood', window.location.origin)
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

      <header className="page-header">
        <h1>選擇品牌字型風格</h1>
        <p>先選擇整體感覺方向，再從推薦字型中選一款</p>
      </header>

      <section className="typeface-shell">
        {rankedDirections.length === 0 ? (
          <div className="direction-grid" aria-label="載入字型方向">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="direction-card skeleton" key={index} />
            ))}
          </div>
        ) : step === 'direction' ? (
          <div className="direction-grid" aria-label="字型風格方向">
            {rankedDirections.map((direction) => {
              const selected = direction.id === selectedDirectionId
              return (
                <button
                  aria-pressed={selected}
                  className={selected ? 'direction-card selected' : 'direction-card'}
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
            <button className="back-inline" onClick={() => setStep('direction')} type="button">
              ← 返回
            </button>
            <div className="step-subtitle">
              <span>{selectedDirection?.emoji}</span>
              <strong>{selectedDirection?.label}</strong>
              <em>{selectedDirection?.labelEn}</em>
            </div>
            <div className="typeface-list" aria-label="字型選擇">
              {rankedTypefaces.map((typeface) => {
                const selected = typeface.id === selectedTypefaceId
                return (
                  <button
                    aria-pressed={selected}
                    className={selected ? 'typeface-card selected' : 'typeface-card'}
                    key={typeface.id}
                    onClick={() => setSelectedTypefaceId(typeface.id)}
                    type="button"
                  >
                    {typeface.recommended ? <span className="gold-badge">最推薦</span> : null}
                    {selected ? <span className="checkmark">✓</span> : null}
                    <strong
                      style={{
                        fontFamily: typeface.fontFamily,
                        fontWeight: getTypefaceCssWeight(typeface.weight),
                      }}
                    >
                      {typeface.nameEn}
                    </strong>
                    <em>{typeface.name}</em>
                    <p>{typeface.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {step === 'typeface' ? (
        <footer className="typeface-footer">
          <button type="button" onClick={() => setStep('direction')}>返回</button>
          <button disabled={!selectedTypeface} type="button" onClick={handleConfirm}>確認選擇</button>
        </footer>
      ) : null}

      {googleTypefaceLinks.map((href) => (
        <link href={href} key={href} rel="stylesheet" />
      ))}
      <style dangerouslySetInnerHTML={{ __html: getTypefaceFontFaceStyles() }} />
      <style dangerouslySetInnerHTML={{ __html: styles }} />
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

const styles = `
  .typeface-page {
    min-height: 100vh;
    background: #ffffff;
    color: #17181c;
    position: relative;
    padding: 22px 24px 96px;
  }

  .steps {
    width: fit-content;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #9a9a9a;
    font-size: 13px;
    font-weight: 600;
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
    font-size: 15px;
    font-weight: 500;
  }

  .more-button {
    position: fixed;
    top: 22px;
    right: 24px;
    border: none;
    background: transparent;
    color: #17181c;
    font-size: 18px;
    cursor: pointer;
  }

  .page-header {
    max-width: 760px;
    margin: 58px auto 34px;
    text-align: center;
  }

  .page-header h1 {
    margin: 0;
    font-size: clamp(38px, 5vw, 64px);
    line-height: 0.98;
    letter-spacing: 0;
    font-weight: 780;
  }

  .page-header p {
    margin: 18px 0 0;
    color: #777b84;
    font-size: 18px;
    line-height: 1.5;
    font-weight: 560;
  }

  .typeface-shell {
    width: min(860px, calc(100vw - 48px));
    margin: 0 auto;
  }

  .direction-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .direction-card,
  .typeface-card {
    position: relative;
    border: 1px solid #e1e3e8;
    background: #ffffff;
    color: #17181c;
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
    border-color: #17181c;
    box-shadow: 0 16px 40px rgba(22, 23, 28, 0.08);
  }

  .direction-card.selected,
  .typeface-card.selected {
    border-color: #17181c;
    box-shadow: inset 0 0 0 1px #17181c, 0 16px 42px rgba(22, 23, 28, 0.08);
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
    font-style: normal;
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
    color: #17181c;
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
    background: #17181c;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 760;
  }

  .typeface-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    height: 68px;
    border-top: 1px solid #e8e8e8;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 22px;
  }

  .typeface-footer button {
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #17181c;
    font-size: 14px;
    font-weight: 650;
    cursor: pointer;
    padding: 10px 14px;
  }

  .typeface-footer button:last-child {
    background: #17181c;
    color: #ffffff;
    padding: 11px 20px;
  }

  .typeface-footer button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (max-width: 760px) {
    .typeface-page {
      padding: 18px 16px 92px;
    }

    .steps {
      max-width: 100%;
      overflow-x: auto;
      justify-content: flex-start;
      margin: 0;
    }

    .page-header {
      margin-top: 42px;
    }

    .page-header h1 {
      font-size: 38px;
    }

    .page-header p {
      font-size: 15px;
    }

    .typeface-shell {
      width: 100%;
    }

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

export default function TypefacePage() {
  return (
    <Suspense fallback={<main className="typeface-page"><Steps /></main>}>
      <TypefaceContent />
    </Suspense>
  )
}
