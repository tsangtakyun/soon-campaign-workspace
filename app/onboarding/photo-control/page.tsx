'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type PhotoControlOption = {
  id: 'minimal' | 'balanced' | 'full' | 'strict'
  title: string
  titleEn: string
  icon: string
  description: string
  generationPrompt: string
  previewImage: string
}

const PHOTO_CONTROL_STORAGE_KEY = 'soon-photo-control-v2'
const PHOTO_CONTROL_GENERATED_STORAGE_KEY = 'soon-photo-control-generated-v1'
const ORIGINAL_PRODUCT_IMAGE = '/photo-control/photo-control-origin.jpg'

const photoControlOptions: PhotoControlOption[] = [
  {
    id: 'full',
    title: '完整創作自由',
    titleEn: 'Full Freedom',
    description: 'AI 可以大幅重塑畫面，加入人物、場景和情緒，令內容更有廣告感。',
    icon: '✨',
    previewImage: '/photo-control/photo-control-full.jpg',
    generationPrompt: 'Use the uploaded image as creative inspiration only. Feel free to completely reimagine the scene — add people, change the environment, introduce lifestyle elements, create an editorial or advertising quality image. The result can look significantly different from the original as long as it captures the brand and product essence.',
  },
  {
    id: 'balanced',
    title: '平衡改動',
    titleEn: 'Balanced',
    description: 'AI 會保留產品辨識度，只調整背景、光線和構圖，令畫面更完整。',
    icon: '⚖️',
    previewImage: '/photo-control/photo-control-balanced.jpg',
    generationPrompt: 'Keep the main product recognizable but make moderate creative improvements. Enhance the background environment, improve lighting quality, add complementary props if needed. The product should remain the clear focal point but the overall image should feel more polished and brand-ready.',
  },
  {
    id: 'minimal',
    title: '最少改動',
    titleEn: 'Minimal Changes',
    description: 'AI 只會微調光線、色調和小細節，角度和產品外觀會盡量保持原樣。',
    icon: '🔍',
    previewImage: '/photo-control/photo-control-minimal.jpg',
    generationPrompt: 'Keep the original product fully recognizable. Only make minimal adjustments: slightly improve lighting, refine color tone, sharpen details. Do not change the composition, background, or add any new elements. The result should look like a professionally edited version of the original photo.',
  },
  {
    id: 'strict',
    title: '嚴格品牌控制',
    titleEn: 'Strict Brand Control',
    description: '只使用你上傳的品牌素材，AI 不會對原圖作任何改動。',
    icon: '🔒',
    previewImage: '/photo-control/photo-control-origin.jpg',
    generationPrompt: 'Use only the exact uploaded brand assets without any AI modification. Do not alter the composition, lighting, or any element of the original image.',
  },
]

function PhotoControlContent() {
  const searchParams = useSearchParams()
  const shouldGeneratePreview = searchParams.get('generatePreview') !== '0'
  const [selectedId, setSelectedId] = useState<PhotoControlOption['id']>('full')
  const [generatedImages, setGeneratedImages] = useState<Partial<Record<PhotoControlOption['id'], string>>>({})
  const [generatingId, setGeneratingId] = useState<PhotoControlOption['id'] | null>(null)
  const [generationAttempts, setGenerationAttempts] = useState<Partial<Record<PhotoControlOption['id'], true>>>({})
  const [creditWarning, setCreditWarning] = useState<{ balance: number; required: number } | null>(null)

  const selectedOption = useMemo(
    () => photoControlOptions.find((option) => option.id === selectedId) || photoControlOptions[0],
    [selectedId]
  )
  const originalImage = ORIGINAL_PRODUCT_IMAGE
  const generatedImage = generatedImages[selectedOption.id]
  const previewImage = generatedImage || selectedOption.previewImage

  useEffect(() => {
    const stored = readSession<PhotoControlOption>(PHOTO_CONTROL_STORAGE_KEY)
    if (stored?.id && photoControlOptions.some((option) => option.id === stored.id)) setSelectedId(stored.id)

    const storedGenerated = readSession<Partial<Record<PhotoControlOption['id'], string>>>(
      PHOTO_CONTROL_GENERATED_STORAGE_KEY,
    )
    if (storedGenerated) setGeneratedImages(storedGenerated)
  }, [])

  useEffect(() => {
    if (
      !shouldGeneratePreview ||
      selectedId === 'strict' ||
      generatedImages[selectedId] ||
      generationAttempts[selectedId] ||
      generatingId
    ) return

    const controller = new AbortController()
    setGenerationAttempts((current) => ({ ...current, [selectedId]: true }))
    setGeneratingId(selectedId)

    fetch('/api/photo-control/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: selectedId,
        originalImageUrl: originalImage,
        prompt: selectedOption.generationPrompt,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 402) {
          const data = await response.json().catch(() => null)
          setCreditWarning({
            balance: Number(data?.balance || 0),
            required: Number(data?.required || 5),
          })
          return null
        }
        if (!response.ok) return null
        return response.json() as Promise<{ imageDataUrl?: string }>
      })
      .then((result) => {
        if (result?.imageDataUrl) {
          setGeneratedImages((current) => {
            const next = { ...current, [selectedId]: result.imageDataUrl }
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem(PHOTO_CONTROL_GENERATED_STORAGE_KEY, JSON.stringify(next))
            }
            return next
          })
        }
      })
      .catch(() => {
        // If the API key is not configured or generation fails, keep the curated static preview.
      })
      .finally(() => {
        setGeneratingId((current) => (current === selectedId ? null : current))
      })

    return () => controller.abort()
  }, [generatedImages, generatingId, generationAttempts, originalImage, selectedId, selectedOption.generationPrompt, shouldGeneratePreview])

  function handleContinue() {
    sessionStorage.setItem(PHOTO_CONTROL_STORAGE_KEY, JSON.stringify({
      id: selectedOption.id,
      title: selectedOption.title,
      titleEn: selectedOption.titleEn,
      previewImage,
      generationPrompt: selectedOption.generationPrompt,
    }))

    const url = new URL('/onboarding/topic-review', window.location.origin)
    ;['plan', 'name', 'budget', 'category', 'website', 'language', 'brandName', 'strategy', 'campaign', 'visualStyle', 'typeface', 'contentMood', 'contentModification'].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
    url.searchParams.set('photoControl', selectedOption.id)
    url.searchParams.set('autoAnalyze', '1')
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
              <h1>
                我們使用你的相片
                <br />
                可以改到幾盡？
              </h1>
              <p>SOON 會根據貼文主題生成新畫面。你可以決定 AI 可以由原圖改變幾多。</p>
            </header>

            <div className="option-list" role="radiogroup" aria-label="相片改動幅度">
              {photoControlOptions.map((option) => {
                const selected = option.id === selectedOption.id
                return (
                  <button
                    aria-checked={selected}
                    className={`control-option ${selected ? 'selected' : ''}`}
                    key={option.id}
                    onClick={() => setSelectedId(option.id)}
                    role="radio"
                    type="button"
                  >
                    <span className="option-icon" aria-hidden="true">{option.icon}</span>
                    <span className="option-copy">
                      <span className="option-heading">
                        <strong>{option.title}</strong>
                        <em>{option.titleEn}</em>
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

        <aside className={`image-preview ${selectedOption.id}`} aria-label="AI image preview">
          <div className="generated-frame">
            <img key={previewImage} src={previewImage} alt={`${selectedOption.title} preview`} />
            {selectedOption.id === 'full' ? <div className="preview-gradient" /> : null}
            <span className="selection-badge">{selectedOption.title}</span>
            {generatingId === selectedOption.id ? <span className="generate-badge">ChatGPT API 生成中</span> : null}
            <div className="original-card">
              <img src={originalImage} alt="Original uploaded product reference" />
              <span>原圖</span>
            </div>
          </div>
        </aside>
      </section>

      {creditWarning ? (
        <div className="credit-modal-backdrop" role="presentation" onClick={() => setCreditWarning(null)}>
          <div className="credit-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2>你的積分不足以生成此內容。</h2>
            <p>剩餘：{creditWarning.balance} 積分，需要：{creditWarning.required} 積分。</p>
            <div>
              <button type="button" onClick={() => setCreditWarning(null)}>稍後再試</button>
              <button type="button" onClick={() => { window.location.href = '/pricing' }}>升級方案</button>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="photo-control-footer">
        <button type="button" onClick={() => window.history.back()}>返回</button>
        <button type="button" onClick={handleContinue}>確認偏好</button>
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
    font-size: 24px;
    font-weight: 800;
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

  .preview-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.46));
    pointer-events: none;
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

  .generate-badge {
    position: absolute;
    top: 14px;
    left: 14px;
    border-radius: 999px;
    background: rgba(17, 17, 17, 0.72);
    color: #ffffff;
    padding: 6px 9px;
    font-size: 0.66rem;
    font-weight: 600;
    backdrop-filter: blur(8px);
  }

  .original-card {
    position: absolute;
    left: 14px;
    bottom: 16px;
    width: 110px;
    border-radius: 10px;
    background: rgba(245, 243, 235, 0.88);
    color: #797467;
    padding: 10px;
    display: grid;
    gap: 6px;
    text-align: center;
    box-shadow: 0 12px 26px rgba(0,0,0,0.14);
    backdrop-filter: blur(8px);
  }

  .original-card img {
    width: 100%;
    aspect-ratio: 1.34 / 1;
    border-radius: 7px;
    object-fit: cover;
    display: block;
  }

  .original-card span {
    font-size: 0.68rem;
    font-weight: 650;
  }

  .credit-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0,0,0,0.46);
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .credit-modal {
    width: min(100%, 420px);
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 24px 80px rgba(0,0,0,0.22);
    padding: 24px;
    display: grid;
    gap: 12px;
  }

  .credit-modal h2 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 650;
    color: #17181c;
  }

  .credit-modal p {
    margin: 0;
    color: #666b75;
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .credit-modal div {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  .credit-modal button {
    border: 1px solid #dedfe3;
    border-radius: 9px;
    background: #ffffff;
    color: #17181c;
    font: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    padding: 9px 14px;
    cursor: pointer;
  }

  .credit-modal button:last-child {
    border-color: #ef4444;
    background: #ef4444;
    color: #ffffff;
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

    .original-card {
      width: 118px;
    }
  }
`

export default function PhotoControlPage() {
  return (
    <Suspense fallback={null}>
      <PhotoControlContent />
    </Suspense>
  )
}
