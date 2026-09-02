'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { contentMoodOptions as moodOptions } from '@/lib/recommend-content-mood'

function ContentMoodContent() {
  const searchParams = useSearchParams()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [shakeId, setShakeId] = useState<string | null>(null)

  function toggleMood(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      if (current.length >= 2) {
        setShakeId(id)
        window.setTimeout(() => setShakeId(null), 380)
        return current
      }
      return [...current, id]
    })
  }

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
      'photoControl',
      'autoAnalyze',
      'generatePreview',
    ].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
  }

  function handleConfirm() {
    const selectedMoods = moodOptions
      .filter((option) => selectedIds.includes(option.id))
      .map(({ id, label, generationMood }) => ({ id, label, generationMood }))

    if (selectedMoods.length === 0) return

    window.sessionStorage.setItem('soon-content-mood-v1', JSON.stringify({ selectedMoods }))
    window.sessionStorage.setItem('soon-content-modification-v1', 'balanced')

    const url = new URL('/onboarding/photo-control', window.location.origin)
    preserveParams(url)
    url.searchParams.set('contentMood', selectedMoods.map((mood) => mood.id).join(','))
    url.searchParams.set('contentModification', 'balanced')
    window.location.href = `${url.pathname}${url.search}`
  }

  function handleBack() {
    window.history.back()
  }

  return (
    <main className="content-mood-page">
      <Steps />
      <button className="more-button" type="button" aria-label="More options">...</button>

      <section className="content-mood-shell">
        <header className="content-mood-header">
          <h1>同一個品牌 無限種感覺</h1>
          <p>選擇你想要的內容風格，最多可以選 2 種</p>
        </header>

        <div className="original-product">
          <span>你的產品</span>
          <img src="/mood/mood-original.jpg" alt="你的產品" />
          <p>可以變成...</p>
        </div>

        <div className="mood-grid" aria-label="內容風格選擇">
          {moodOptions.map((option) => {
            const selected = selectedIds.includes(option.id)
            return (
              <button
                aria-pressed={selected}
                className={[
                  'mood-card',
                  selected ? 'selected' : '',
                  shakeId === option.id ? 'shake' : '',
                ].filter(Boolean).join(' ')}
                key={option.id}
                onClick={() => toggleMood(option.id)}
                type="button"
              >
                <img src={option.image} alt="" />
                <span className="selection-indicator">{selected ? '✓' : ''}</span>
                <span className="mood-label">{option.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      <footer className="content-mood-footer">
        <button type="button" onClick={handleBack}>返回</button>
        <div>
          <button disabled={selectedIds.length === 0} type="button" onClick={handleConfirm}>
            確認選擇
          </button>
          <p>可以之後在設定中更改</p>
        </div>
      </footer>

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

const styles = `
  .content-mood-page {
    min-height: 100vh;
    background: #ffffff;
    color: #17181c;
    padding: 22px 24px 96px;
    position: relative;
    animation: pageFadeIn 220ms ease both;
  }

  @keyframes pageFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
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
    right: 28px;
    border: 0;
    background: transparent;
    color: #33363d;
    font-size: 18px;
    cursor: pointer;
  }

  .content-mood-shell {
    width: min(100%, 760px);
    margin: 42px auto 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .content-mood-header {
    text-align: center;
  }

  .content-mood-header h1 {
    margin: 0;
    font-size: clamp(34px, 5vw, 56px);
    line-height: 1.02;
    font-weight: 800;
    letter-spacing: 0;
  }

  .content-mood-header p {
    margin: 16px 0 0;
    color: #6f737d;
    font-size: 18px;
    line-height: 1.45;
    font-weight: 500;
  }

  .original-product {
    margin-top: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .original-product span {
    color: #8c9099;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .original-product img {
    width: min(100%, 330px);
    height: 120px;
    object-fit: cover;
    border-radius: 12px;
    border: 1px solid #e8e9ec;
    box-shadow: 0 16px 42px rgba(20, 25, 35, 0.08);
  }

  .original-product p {
    margin: 2px 0 0;
    color: #9a9da4;
    font-size: 13px;
    font-weight: 600;
  }

  .mood-grid {
    margin-top: 22px;
    display: grid;
    grid-template-columns: repeat(3, 160px);
    gap: 16px;
    justify-content: center;
  }

  .mood-card {
    position: relative;
    width: 160px;
    aspect-ratio: 1;
    border: 2px solid transparent;
    border-radius: 16px;
    overflow: hidden;
    padding: 0;
    background: #f4f4f5;
    cursor: pointer;
    transform: scale(1);
    transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  }

  .mood-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 44px rgba(20, 25, 35, 0.12);
  }

  .mood-card.selected {
    border-color: #D4A843;
    transform: scale(1.03);
    box-shadow: 0 18px 44px rgba(212, 168, 67, 0.22);
  }

  .mood-card.shake {
    animation: moodShake 340ms ease both;
  }

  @keyframes moodShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }

  .mood-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .mood-card::after {
    content: '';
    position: absolute;
    inset: auto 0 0;
    height: 58%;
    background: linear-gradient(180deg, transparent, rgba(0,0,0,0.72));
  }

  .selection-indicator {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 2;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: 2px solid rgba(255,255,255,0.9);
    background: rgba(0,0,0,0.24);
    color: #ffffff;
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 800;
  }

  .mood-card.selected .selection-indicator {
    border-color: #D4A843;
    background: #D4A843;
  }

  .mood-label {
    position: absolute;
    z-index: 2;
    left: 14px;
    right: 14px;
    bottom: 14px;
    color: #ffffff;
    font-size: 17px;
    font-weight: 800;
    text-align: left;
  }

  .content-mood-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    min-height: 58px;
    background: rgba(255,255,255,0.96);
    border-top: 1px solid #ececec;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 18px;
  }

  .content-mood-footer > button {
    border: 0;
    background: transparent;
    color: #17181c;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  .content-mood-footer div {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  .content-mood-footer div button {
    border: 0;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    padding: 8px 16px;
    font: inherit;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }

  .content-mood-footer div button:disabled {
    cursor: not-allowed;
    opacity: 0.34;
  }

  .content-mood-footer p {
    margin: 0;
    color: #9a9da4;
    font-size: 11px;
  }

  @media (max-width: 720px) {
    .content-mood-page {
      padding-left: 18px;
      padding-right: 18px;
    }

    .steps {
      font-size: 11px;
      gap: 7px;
    }

    .steps span {
      gap: 7px;
    }

    .content-mood-shell {
      margin-top: 34px;
    }

    .mood-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      width: 100%;
    }

    .mood-card {
      width: 100%;
    }
  }
`

export default function ContentMoodPage() {
  return (
    <Suspense fallback={<main className="content-mood-page"><Steps /></main>}>
      <ContentMoodContent />
    </Suspense>
  )
}
