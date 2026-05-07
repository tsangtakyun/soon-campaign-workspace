'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import type { ContentStrategyOption } from '@/lib/content-strategy'
import type { TypefacePreset } from '@/lib/typefaces'

type BusinessProfile = {
  businessName?: string
  logoUrl?: string
  productImageUrl?: string
}

type PhotoControlOption = {
  id: 'full-freedom' | 'balanced' | 'minimal-changes'
  title: string
  titleZh: string
  icon: string
  tone: string
  description: string
  generationPrompt: string
  previewImage: string
  previewAlt: string
}

const PHOTO_CONTROL_STORAGE_KEY = 'soon-photo-control-v2'
const PHOTO_CONTROL_GENERATED_STORAGE_KEY = 'soon-photo-control-generated-v1'
const PHOTO_CONTROL_ASSET_VERSION = '20260504b'
const ORIGINAL_PRODUCT_IMAGE = `/photo-control/coffee-original.jpg?v=${PHOTO_CONTROL_ASSET_VERSION}`

const photoControlOptions: PhotoControlOption[] = [
  {
    id: 'full-freedom',
    title: 'Full Freedom',
    titleZh: '完整創作自由',
    icon: '✦',
    tone: 'purple',
    description: 'AI 可以大幅重塑畫面，加入人物、場景和情緒，令內容更有廣告感。',
    generationPrompt: 'Create a polished photorealistic lifestyle advertising image based on the uploaded product photo. The uploaded product must remain the clear hero subject: large, sharp, appetizing, and immediately recognizable in the foreground. If the product is coffee, keep the cup and latte art visible and dominant. Add one or two Asian people in a warm modern Asian cafe environment enjoying or reacting to the product, but keep people secondary and behind or around the hero product. The image should feel aspirational, emotional, creative, and campaign-level, with natural editorial morning light and premium social media composition. Supporting props must stay subtle. Do not add pastries or other food that competes with the product. No text, no logo, no watermark. Vertical Instagram advertising image.',
    previewImage: `/photo-control/coffee-full-freedom.jpg?v=${PHOTO_CONTROL_ASSET_VERSION}`,
    previewAlt: 'AI generated lifestyle coffee campaign image',
  },
  {
    id: 'balanced',
    title: 'Balanced',
    titleZh: '平衡改動',
    icon: '▧',
    tone: 'blue',
    description: 'AI 會保留產品辨識度，只調整背景、光線和構圖，令畫面更完整。',
    generationPrompt: 'Create a refined photorealistic product lifestyle image based on the uploaded photo. Keep the product clearly recognizable as the main subject and preserve its key shape, material, identity, and appeal. If the product is coffee, the cup, saucer, latte art, and ceramic shape must be the largest, sharpest, most appetizing visual focus. Improve the background, lighting, table styling, color tone, and composition into a premium campaign image. Supporting props may include a small spoon, napkin, plant, or subtle cafe texture only. Do not add people, pastries, or any object that becomes more important than the product. No text, no logo, no watermark. Vertical Instagram product image.',
    previewImage: `/photo-control/coffee-balanced.jpg?v=${PHOTO_CONTROL_ASSET_VERSION}`,
    previewAlt: 'AI generated refined coffee product lifestyle image',
  },
  {
    id: 'minimal-changes',
    title: 'Minimal Changes',
    titleZh: '最少改動',
    icon: '◇',
    tone: 'green',
    description: 'AI 只會微調光線、色調和小細節，角度和產品外觀會盡量保持原樣。',
    generationPrompt: 'Retouch the uploaded photo with minimal changes. Keep the original angle, product appearance, composition, and main details intact. Only improve lighting, color tone, contrast, sharpness, and small imperfections while keeping the image realistic. Resize or crop it to a suitable Instagram format only if needed, without changing the subject or composition significantly.',
    previewImage: ORIGINAL_PRODUCT_IMAGE,
    previewAlt: 'Lightly retouched coffee product image',
  },
]

function PhotoControlContent() {
  const searchParams = useSearchParams()
  const shouldGeneratePreview = searchParams.get('generatePreview') !== '0'
  const [selectedId, setSelectedId] = useState<PhotoControlOption['id']>('full-freedom')
  const [profile, setProfile] = useState<BusinessProfile>({})
  const [strategy, setStrategy] = useState<ContentStrategyOption | null>(null)
  const [typeface, setTypeface] = useState<TypefacePreset | null>(null)
  const [generatedImages, setGeneratedImages] = useState<Partial<Record<PhotoControlOption['id'], string>>>({})
  const [generatingId, setGeneratingId] = useState<PhotoControlOption['id'] | null>(null)
  const [generationAttempts, setGenerationAttempts] = useState<Partial<Record<PhotoControlOption['id'], true>>>({})

  const selectedOption = useMemo(
    () => photoControlOptions.find((option) => option.id === selectedId) || photoControlOptions[1],
    [selectedId]
  )
  const businessName = profile.businessName || searchParams.get('brandName') || searchParams.get('name') || 'SOON-LOG'
  const originalImage = ORIGINAL_PRODUCT_IMAGE
  const generatedImage = generatedImages[selectedOption.id]
  const previewImage = selectedOption.id === 'minimal-changes' ? originalImage : generatedImage || selectedOption.previewImage
  const previewTitle = previewHeadline(businessName, selectedOption.id, strategy?.titleZh || strategy?.title || searchParams.get('strategy') || '')

  useEffect(() => {
    setProfile(readSession<BusinessProfile>('soon-business-profile-v1') || {})
    setStrategy(readSession<ContentStrategyOption>('soon-content-strategy-v1') || null)
    setTypeface(readSession<TypefacePreset>('soon-typeface-v1') || null)

    const stored = readSession<PhotoControlOption>(PHOTO_CONTROL_STORAGE_KEY)
    if (stored?.id) setSelectedId(stored.id)

    const storedGenerated = readSession<Partial<Record<PhotoControlOption['id'], string>>>(
      PHOTO_CONTROL_GENERATED_STORAGE_KEY,
    )
    if (storedGenerated) setGeneratedImages(storedGenerated)
  }, [])

  useEffect(() => {
    if (!shouldGeneratePreview || selectedId === 'minimal-changes' || generatedImages[selectedId] || generationAttempts[selectedId] || generatingId) return

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
      ...selectedOption,
      previewImage,
      generatedPreviewImage: generatedImage || null,
    }))

    const url = new URL('/onboarding/review', window.location.origin)
    ;['plan', 'name', 'budget', 'category', 'website', 'language', 'brandName', 'strategy', 'campaign', 'visualStyle', 'typeface'].forEach((key) => {
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
              <h1>當 SOON 使用你的相片，可以改到幾盡？</h1>
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
                    <span className={`option-icon ${option.tone}`} aria-hidden="true">{option.icon}</span>
                    <span>
                      <strong>{option.title}</strong>
                      <em>{option.titleZh}</em>
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
            <img src={previewImage} alt={selectedOption.previewAlt} />
            {selectedOption.id !== 'balanced' ? <div className="preview-gradient" /> : null}
            {selectedOption.id === 'full-freedom' ? (
              <div className="preview-copy">
                <strong
                  style={{
                    fontFamily: typeface?.fontFamily,
                    fontWeight: typeface?.weight,
                    letterSpacing: typeface?.letterSpacing,
                  }}
                >
                  {previewTitle}
                </strong>
              </div>
            ) : null}
            {selectedOption.id === 'minimal-changes' ? <span className="retouch-badge">Light retouch</span> : null}
            {generatingId === selectedOption.id ? <span className="generate-badge">ChatGPT API 生成中</span> : null}
            <div className="original-card">
              <img src={originalImage} alt="Original uploaded product reference" />
              <span>原圖</span>
            </div>
          </div>
        </aside>
      </section>

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

function previewHeadline(businessName: string, mode: PhotoControlOption['id'], strategyName: string) {
  if (mode === 'minimal-changes') return `${businessName} 實物細節`
  if (/優惠|offer|promotion/i.test(strategyName)) return `限時焦點`
  if (/教育|education|產品|product/i.test(strategyName)) return `看懂產品價值`
  return `讓 ${businessName} 更有畫面`
}

const styles = `
  .photo-control-page {
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

  .photo-control-layout {
    min-height: calc(100vh - 164px);
    display: grid;
    grid-template-columns: 1.02fr 0.98fr;
    align-items: center;
  }

  .choice-panel {
    display: grid;
    place-items: center;
    padding: 34px clamp(20px, 4vw, 56px);
  }

  .choice-inner {
    width: min(100%, 500px);
    display: grid;
    gap: 17px;
  }

  h1 {
    max-width: 500px;
    margin: 0 0 8px;
    font-size: clamp(1.52rem, 2.9vw, 2.2rem);
    line-height: 1.1;
    letter-spacing: 0;
    font-weight: 500;
  }

  .choice-inner p {
    max-width: 460px;
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
    min-height: 68px;
    border: 1px solid #e6e7eb;
    border-radius: 9px;
    background: #fbfbfc;
    color: #17181c;
    cursor: pointer;
    display: grid;
    grid-template-columns: 36px 1fr 28px;
    align-items: center;
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
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: grid;
    place-items: center;
    font-size: 0.84rem;
    font-weight: 800;
  }

  .option-icon.purple {
    color: #7f42ff;
    background: #f0e8ff;
  }

  .option-icon.blue {
    color: #2d79da;
    background: #e8f2ff;
  }

  .option-icon.green {
    color: #3b9b58;
    background: #eaf7ee;
  }

  .control-option strong,
  .control-option em,
  .control-option small {
    display: block;
  }

  .control-option strong {
    font-size: 0.86rem;
    font-weight: 580;
    line-height: 1.2;
  }

  .control-option em {
    margin-top: 2px;
    color: #31343a;
    font-style: normal;
    font-size: 0.74rem;
    font-weight: 520;
  }

  .control-option small {
    margin-top: 3px;
    color: #6a6f78;
    font-size: 0.74rem;
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
    min-height: calc(100vh - 164px);
    display: grid;
    place-items: center;
    padding: 30px clamp(18px, 3vw, 44px) 30px 16px;
  }

  .generated-frame {
    width: min(100%, 448px);
    aspect-ratio: 4 / 5;
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
    display: block;
  }

  .balanced .generated-frame > img {
    object-position: center;
  }

  .minimal-changes .generated-frame > img {
    object-fit: cover;
    filter: saturate(1.04) contrast(1.03) brightness(1.02);
    transform: scale(1.02);
  }

  .preview-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.46));
    pointer-events: none;
  }

  .preview-copy {
    position: absolute;
    left: 19px;
    right: 19px;
    bottom: 22px;
    color: #ffffff;
    text-shadow: 0 3px 18px rgba(0,0,0,0.34);
  }

  .preview-copy strong {
    display: block;
    max-width: 270px;
    font-size: clamp(1.22rem, 2.4vw, 1.84rem);
    line-height: 1.02;
    overflow-wrap: anywhere;
  }

  .retouch-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    border-radius: 999px;
    background: rgba(255,255,255,0.84);
    color: #25272d;
    padding: 6px 8px;
    font-size: 0.66rem;
    font-weight: 650;
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
      grid-template-columns: 1fr;
    }

    .image-preview {
      min-height: auto;
      padding: 22px 18px 42px;
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
