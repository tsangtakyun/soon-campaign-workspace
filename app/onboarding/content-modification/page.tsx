'use client'

import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

type IconProps = {
  size?: number
  strokeWidth?: number
}

type ContentModificationOption = {
  id: 'growth' | 'balanced' | 'brand' | 'strict'
  icon: (props: IconProps) => ReactNode
  heading: string
  tag: string | null
  description: string
  previewImage: string
}

const CONTENT_MODIFICATION_STORAGE_KEY = 'soon-content-modification-v1'
const PRESERVED_PARAMS = [
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
  'contentMood',
  'autoAnalyze',
  'generatePreview',
]

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

function Sparkles(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M12 3l1.7 4.4L18 9l-4.3 1.6L12 15l-1.7-4.4L6 9l4.3-1.6L12 3z" />
      <path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z" />
      <path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7L19 14z" />
    </IconSvg>
  )
}

function Sliders(props: IconProps) {
  return (
    <IconSvg {...props}>
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

function Tag(props: IconProps) {
  return (
    <IconSvg {...props}>
      <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <path d="M7.5 7.5h.01" />
    </IconSvg>
  )
}

function Lock(props: IconProps) {
  return (
    <IconSvg {...props}>
      <rect height="11" rx="2" width="16" x="4" y="11" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </IconSvg>
  )
}

const contentModificationOptions: ContentModificationOption[] = [
  {
    id: 'growth',
    icon: Sparkles,
    heading: '增長導向',
    tag: 'AI 優先',
    description: '透過 AI 強化和智能替換，最大化效果',
    previewImage: '/content-modification/content-mod-growth.jpg',
  },
  {
    id: 'balanced',
    icon: Sliders,
    heading: '平衡',
    tag: null,
    description: '改善風格與構圖，同時保留更多原創內容',
    previewImage: '/content-modification/content-mod-balanced.jpg',
  },
  {
    id: 'brand',
    icon: Tag,
    heading: '品牌優先',
    tag: null,
    description: '應用光線改善，保留原有外觀和感覺',
    previewImage: '/content-modification/content-mod-brand.jpg',
  },
  {
    id: 'strict',
    icon: Lock,
    heading: '嚴格品牌控制',
    tag: null,
    description: '只使用品牌素材庫資源，不使用庫存內容',
    previewImage: '/content-modification/content-mod-strict.jpg',
  },
]

function ContentModificationContent() {
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = useState<ContentModificationOption['id']>('growth')
  const selectedOption = useMemo(
    () => contentModificationOptions.find((option) => option.id === selectedId) || contentModificationOptions[0],
    [selectedId]
  )

  useEffect(() => {
    const stored = window.sessionStorage.getItem(CONTENT_MODIFICATION_STORAGE_KEY)
    if (contentModificationOptions.some((option) => option.id === stored)) {
      setSelectedId(stored as ContentModificationOption['id'])
    }
  }, [])

  function preserveParams(url: URL) {
    PRESERVED_PARAMS.forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
  }

  function handleBack() {
    const url = new URL('/onboarding/content-mood', window.location.origin)
    preserveParams(url)
    window.location.href = `${url.pathname}${url.search}`
  }

  function handleContinue() {
    window.sessionStorage.setItem(CONTENT_MODIFICATION_STORAGE_KEY, selectedOption.id)
    const url = new URL('/onboarding/photo-control', window.location.origin)
    preserveParams(url)
    url.searchParams.set('contentModification', selectedOption.id)
    window.location.href = `${url.pathname}${url.search}`
  }

  return (
    <main className="photo-control-page">
      <Steps />
      <button className="more-button" type="button" aria-label="More options">...</button>

      <section className="photo-control-layout">
        <div className="choice-panel">
          <div className="choice-inner">
            <header>
              <h1>內容修改程度</h1>
              <p>選擇 AI 在生成內容時，如何平衡你的品牌素材與優化目標</p>
            </header>

            <div className="option-list" role="radiogroup" aria-label="內容修改程度">
              {contentModificationOptions.map((option) => {
                const selected = option.id === selectedOption.id
                const Icon = option.icon
                return (
                  <button
                    aria-checked={selected}
                    className={`control-option ${selected ? 'selected' : ''}`}
                    key={option.id}
                    onClick={() => setSelectedId(option.id)}
                    role="radio"
                    type="button"
                  >
                    <span className="option-icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="option-copy">
                      <span className="option-heading">
                        <strong>{option.heading}</strong>
                        {option.tag ? <em>{option.tag}</em> : null}
                      </span>
                      <small>{option.description}</small>
                    </span>
                    <b aria-hidden="true">{selected ? '✓' : ''}</b>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <aside className={`image-preview ${selectedOption.id}`} aria-label="Content modification preview">
          <div className="generated-frame">
            <img key={selectedOption.previewImage} src={selectedOption.previewImage} alt={`${selectedOption.heading} preview`} />
            <span className="selection-badge">{selectedOption.heading}</span>
          </div>
        </aside>
      </section>

      <footer className="photo-control-footer">
        <button type="button" onClick={handleBack}>返回</button>
        <button type="button" onClick={handleContinue}>繼續</button>
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
  .photo-control-page {
    min-height: calc(100vh - 88px);
    background: #ffffff;
    color: #17181c;
    position: relative;
    padding: 14px 0 68px;
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

  .photo-control-layout {
    width: min(calc(100% - 48px), 1160px);
    min-height: calc(100vh - 138px);
    margin: 18px auto 0;
    display: grid;
    grid-template-columns: minmax(360px, 0.9fr) minmax(420px, 1.1fr);
    column-gap: clamp(18px, 3vw, 38px);
    align-items: start;
  }

  .choice-panel {
    display: grid;
    justify-items: stretch;
    align-items: start;
    padding: 0;
  }

  .choice-inner {
    width: 100%;
    display: grid;
    gap: 16px;
  }

  h1 {
    max-width: 520px;
    margin: 0 0 8px;
    font-size: clamp(1.52rem, 2.9vw, 2.2rem);
    line-height: 1.1;
    letter-spacing: 0;
    font-weight: 500;
  }

  .choice-inner p {
    max-width: 500px;
    margin: 0;
    color: #666b75;
    font-size: 0.86rem;
    line-height: 1.5;
  }

  .option-list {
    display: grid;
    gap: 8px;
  }

  .control-option {
    width: 100%;
    min-height: 92px;
    border: 1px solid #e6e7eb;
    border-radius: 9px;
    background: #fbfbfc;
    color: #17181c;
    cursor: pointer;
    display: grid;
    grid-template-columns: 36px 1fr 28px;
    align-items: start;
    gap: 11px;
    padding: 11px 14px;
    text-align: left;
  }

  .control-option.selected {
    border-color: #141518;
    box-shadow: inset 0 0 0 1px #141518;
    background: #ffffff;
  }

  .option-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: #202126;
    background: #f2f3f5;
  }

  .option-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .option-heading {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .control-option strong,
  .control-option em,
  .control-option small {
    display: block;
  }

  .control-option strong {
    font-size: 15px;
    font-weight: 700;
    line-height: 1.2;
  }

  .control-option em {
    color: #8b8f98;
    font-style: normal;
    font-size: 12px;
    font-weight: 600;
  }

  .control-option small {
    margin-top: 8px;
    color: #6a6f78;
    font-size: 13px;
    line-height: 1.4;
  }

  .control-option b {
    width: 23px;
    height: 23px;
    border: 1px solid #d9dbe0;
    border-radius: 999px;
    color: #ffffff;
    background: #ffffff;
    display: grid;
    place-items: center;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .control-option.selected b {
    border-color: #16171a;
    background: #16171a;
  }

  .image-preview {
    min-height: 0;
    display: grid;
    place-items: start center;
    padding: 0;
  }

  .generated-frame {
    width: min(100%, calc((100vh - 120px) * 0.75), 615px);
    aspect-ratio: 3 / 4;
    position: relative;
    overflow: hidden;
    border-radius: 12px;
    background: #e9e9e9;
    box-shadow: 0 18px 52px rgba(20, 25, 35, 0.15);
  }

  .generated-frame > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
    animation: previewFade 200ms ease;
  }

  @keyframes previewFade {
    from { opacity: 0.55; }
    to { opacity: 1; }
  }

  .selection-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    border-radius: 999px;
    background: rgba(255,255,255,0.84);
    color: #25272d;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 700;
    backdrop-filter: blur(8px);
  }

  .photo-control-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    min-height: 56px;
    border-top: 1px solid #e7e7e7;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(18px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 22px;
  }

  .photo-control-footer button {
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

  .photo-control-footer button:last-child {
    background: #111111;
    color: #ffffff;
  }

  @media (max-width: 960px) {
    .photo-control-page {
      overflow: visible;
    }

    .photo-control-layout {
      width: calc(100% - 36px);
      grid-template-columns: 1fr;
      margin-top: 20px;
    }

    .image-preview {
      min-height: auto;
      padding: 22px 18px 42px;
    }

    .generated-frame {
      width: min(100%, 520px);
      aspect-ratio: 3 / 4;
    }
  }

  @media (max-width: 680px) {
    .photo-control-page {
      padding-top: 14px;
    }

    .steps {
      width: calc(100% - 28px);
      overflow-x: auto;
      justify-content: flex-start;
    }

    .choice-panel {
      padding: 30px 16px 16px;
    }

    .control-option {
      grid-template-columns: 38px 1fr 30px;
      padding: 14px;
    }
  }
`

export default function ContentModificationPage() {
  return (
    <Suspense fallback={null}>
      <ContentModificationContent />
    </Suspense>
  )
}
