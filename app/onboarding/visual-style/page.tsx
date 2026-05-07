'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { type VisualStylePreset, visualStyleBeforePath, visualStylePresets } from '@/lib/visual-styles'

function VisualStyleContent() {
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = useState(searchParams.get('style') || visualStylePresets[0].id)
  const [split, setSplit] = useState(50)

  const selectedStyle = useMemo(() => {
    return visualStylePresets.find((style) => style.id === selectedId) || visualStylePresets[0]
  }, [selectedId])

  function selectStyle(style: VisualStylePreset) {
    setSelectedId(style.id)
  }

  function handleContinue() {
    sessionStorage.setItem('soon-visual-style-v1', JSON.stringify(selectedStyle))

    const url = new URL('/onboarding/typeface', window.location.origin)
    ;['plan', 'name', 'budget', 'category', 'website', 'language', 'brandName', 'strategy', 'campaign'].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
    url.searchParams.set('visualStyle', selectedStyle.id)
    url.searchParams.set('autoAnalyze', '1')
    window.location.href = `${url.pathname}${url.search}`
  }

  return (
    <main className="visual-page">
      <Steps />
      <button className="more-button" type="button" aria-label="More options">...</button>

      <section className="visual-layout">
        <div className="style-panel">
          <header>
            <h1>選擇內容的視覺風格</h1>
            <p>SOON 會用這個 preset 作為之後生成內容的色調方向。這裡只是在選風格，不是選這張相。</p>
          </header>

          <p className="section-label">所有風格</p>
          <div className="style-list">
            {visualStylePresets.map((style) => {
              const selected = style.id === selectedStyle.id
              return (
                <button
                  className={`style-option ${selected ? 'selected' : ''}`}
                  key={style.id}
                  onClick={() => selectStyle(style)}
                  type="button"
                >
                  <img src={style.thumbPath} alt={`${style.titleZh} / ${style.title}`} />
                  <span className="option-body">
                    <strong>{style.titleZh} / {style.title}</strong>
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

        <aside className="preview-panel" aria-label="Before after preview">
          <div className="preview-frame">
            <img className="before-image" src={visualStyleBeforePath} alt="Before preview" />
            <div className="after-layer" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
              <img src={selectedStyle.previewPath} alt={`${selectedStyle.titleZh} after preview`} />
            </div>

            <span className="badge before">Before</span>
            <span className="badge style-name">{selectedStyle.titleZh}</span>
            <span className="badge after">After</span>
            <div className="split-line" style={{ left: `${split}%` }}>
              <span>‹ ›</span>
            </div>
            <input
              aria-label="調整 before after 比例"
              className="split-slider"
              max="82"
              min="18"
              onChange={(event) => setSplit(Number(event.target.value))}
              type="range"
              value={split}
            />
          </div>

          <section className="style-note">
            <p>已連接 LUT</p>
            <h2>{selectedStyle.fileName}</h2>
            <span>這個 preset 會被儲存在 onboarding 資料入面，之後可用同一個 ID 對應到真正內容生成或後期處理。</span>
          </section>
        </aside>
      </section>

      <footer className="visual-footer">
        <button type="button" onClick={() => window.history.back()}>返回</button>
        <button type="button" onClick={handleContinue}>以「{selectedStyle.titleZh}」繼續</button>
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

const styles = `
  .visual-page {
    min-height: calc(100vh - 88px);
    background: #ffffff;
    color: #17181c;
    position: relative;
    padding: 18px 28px 86px;
  }

  .steps {
    width: fit-content;
    margin: 0 auto 26px;
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

  .visual-layout {
    width: min(100%, 1320px);
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(420px, 0.9fr) minmax(520px, 1.08fr);
    gap: 44px;
    align-items: start;
  }

  header {
    margin-bottom: 24px;
  }

  h1 {
    margin: 0 0 10px;
    font-size: clamp(2rem, 3.2vw, 3rem);
    line-height: 1.05;
    letter-spacing: 0;
    font-weight: 520;
  }

  header p {
    max-width: 650px;
    margin: 0;
    color: #666970;
    font-size: 0.96rem;
    line-height: 1.5;
  }

  .section-label {
    margin: 0 0 10px;
    font-size: 0.95rem;
    font-weight: 560;
  }

  .style-list {
    height: calc(100vh - 260px);
    min-height: 520px;
    overflow: auto;
    padding-right: 8px;
    display: grid;
    gap: 10px;
  }

  .style-option {
    width: 100%;
    border: 1px solid #e7e7e7;
    border-radius: 11px;
    background: #ffffff;
    color: #17181c;
    cursor: pointer;
    display: grid;
    grid-template-columns: 82px 1fr 26px;
    gap: 14px;
    align-items: center;
    text-align: left;
    padding: 10px;
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .style-option:hover {
    transform: translateY(-1px);
    border-color: #cfcfcf;
  }

  .style-option.selected {
    border-color: #141414;
    box-shadow: inset 0 0 0 1px #141414;
  }

  .style-option img {
    width: 82px;
    aspect-ratio: 1;
    border-radius: 8px;
    object-fit: cover;
    background: #f1f1f2;
  }

  .option-body {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .option-body strong {
    font-size: 0.98rem;
    line-height: 1.2;
    font-weight: 580;
  }

  .option-body em {
    color: #62656b;
    font-style: normal;
    font-size: 0.84rem;
    line-height: 1.4;
  }

  .option-body small {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    color: #777b82;
    font-size: 0.76rem;
    line-height: 1.2;
  }

  .style-option b {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: 1px solid #dddddd;
    display: grid;
    place-items: center;
    background: #ffffff;
    color: #ffffff;
    font-size: 0.82rem;
    font-weight: 600;
  }

  .style-option.selected b {
    border-color: #161719;
    background: #161719;
  }

  .preview-panel {
    position: sticky;
    top: 18px;
    display: grid;
    gap: 14px;
  }

  .preview-frame {
    min-height: 620px;
    border-radius: 16px;
    overflow: hidden;
    background: #f1f1f1;
    position: relative;
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.08);
  }

  .preview-frame img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .after-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .badge {
    position: absolute;
    top: 14px;
    z-index: 4;
    border-radius: 999px;
    background: #111111;
    color: #ffffff;
    padding: 7px 12px;
    font-size: 0.76rem;
    font-weight: 560;
    line-height: 1;
  }

  .badge.before {
    left: 14px;
  }

  .badge.style-name {
    right: 76px;
    background: #ffffff;
    color: #17181c;
  }

  .badge.after {
    right: 14px;
    background: #ffffff;
    color: #17181c;
  }

  .split-line {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 3;
    width: 2px;
    background: rgba(255,255,255,0.88);
    transform: translateX(-1px);
    pointer-events: none;
  }

  .split-line span {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    background: rgba(255,255,255,0.95);
    color: #222222;
    display: grid;
    place-items: center;
    transform: translate(-50%, -50%);
    font-size: 0.85rem;
    box-shadow: 0 8px 28px rgba(0,0,0,0.14);
  }

  .split-slider {
    position: absolute;
    inset: 0;
    z-index: 5;
    opacity: 0;
    cursor: ew-resize;
  }

  .style-note {
    border: 1px solid #ececef;
    border-radius: 12px;
    padding: 16px;
    background: #ffffff;
  }

  .style-note p {
    margin: 0 0 6px;
    color: #73777f;
    font-size: 0.76rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .style-note h2 {
    margin: 0 0 8px;
    font-size: 1rem;
    font-weight: 580;
  }

  .style-note span {
    display: block;
    color: #62656b;
    font-size: 0.84rem;
    line-height: 1.5;
  }

  .visual-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 56px;
    border-top: 1px solid #e7e7e7;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(18px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 22px;
    z-index: 20;
  }

  .visual-footer button {
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

  .visual-footer button:last-child {
    background: #111111;
    color: #ffffff;
  }

  @media (max-width: 1040px) {
    .visual-layout {
      grid-template-columns: 1fr;
    }

    .style-list {
      height: auto;
      min-height: 0;
    }

    .preview-panel {
      position: static;
    }

    .preview-frame {
      min-height: 520px;
    }
  }

  @media (max-width: 680px) {
    .visual-page {
      padding: 18px 14px 86px;
    }

    .steps {
      width: 100%;
      overflow-x: auto;
      justify-content: flex-start;
    }

    .style-option {
      grid-template-columns: 68px 1fr 24px;
    }

    .style-option img {
      width: 68px;
    }

    .preview-frame {
      min-height: 420px;
    }
  }
`

export default function VisualStylePage() {
  return (
    <Suspense fallback={null}>
      <VisualStyleContent />
    </Suspense>
  )
}
