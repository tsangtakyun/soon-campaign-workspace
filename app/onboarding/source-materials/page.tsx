'use client'

import { Suspense, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type TopicReference = {
  id: string
  label: string
  image: string
}

const STORAGE_KEYS = {
  topicReview: 'soon-topic-review-v1',
}

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='220' viewBox='0 0 320 220'%3E%3Crect width='320' height='220' rx='18' fill='%23f3f4f6'/%3E%3Cpath d='M92 142l44-47 34 36 18-21 40 32H92z' fill='%23d9dde4'/%3E%3Ccircle cx='220' cy='76' r='18' fill='%23c8ced8'/%3E%3Crect x='88' y='58' width='144' height='104' rx='12' fill='none' stroke='%23c5cbd5' stroke-width='4'/%3E%3Ctext x='160' y='190' text-anchor='middle' font-family='Arial, sans-serif' font-size='18' fill='%238b929e'%3E參考圖片%3C/text%3E%3C/svg%3E"

const FALLBACK_WEBSITE_IMAGES = [
  '/photo-control/coffee-full-freedom.jpg',
  '/assets/content-strategies/photos/lifestyle-content.jpg',
]

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function SourceMaterialsContent() {
  const searchParams = useSearchParams()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [uploadedNames, setUploadedNames] = useState<string[]>([])

  const websiteImages = useMemo(() => {
    const topics = readStorage<TopicReference[]>(STORAGE_KEYS.topicReview) || []
    const topicImages = topics
      .map((topic) => topic.image)
      .filter((image) => image && image !== PLACEHOLDER_IMAGE)
    const uniqueImages = Array.from(new Set(topicImages))
    return uniqueImages.length ? uniqueImages : FALLBACK_WEBSITE_IMAGES
  }, [])

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
    ].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
  }

  function handleContinue() {
    const url = new URL('/onboarding/review', window.location.origin)
    preserveParams(url)
    window.location.href = `${url.pathname}${url.search}`
  }

  function handleBack() {
    window.history.back()
  }

  function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploadedNames(Array.from(files).map((file) => file.name))
  }

  return (
    <main className="source-materials-page">
      <div className="source-steps" aria-label="設定進度">
        {['開始設定', '策略', '宣傳活動', '內容', '完成設定'].map((step, index) => (
          <span className={index === 4 ? 'active' : ''} key={step}>
            {step}
            {index < 4 ? <b>›</b> : null}
          </span>
        ))}
      </div>

      <section className="source-content">
        <header>
          <h1>提供 SOON 生成內容所需的素材。</h1>
          <p>SOON 會根據這些素材建立內容。你可以現在加入更多參考資料，或者之後再補充。</p>
        </header>

        <div className="source-card-grid">
          <article className="source-card">
            <div className="source-icon purple">◎</div>
            <h2>來自你的網站</h2>
            <p>分析網站時擷取到的圖片和影片。SOON 會用這些素材作為視覺內容的基礎。</p>
            <div className="source-card-divider" />
            <div className="source-card-row">
              <strong>{websiteImages.length} 張圖片</strong>
              <button type="button" onClick={() => setIsAdjusting(true)}>調整</button>
            </div>
            <div className="website-thumbs">
              {websiteImages.slice(0, 4).map((image) => (
                <img src={image} alt="" key={image} />
              ))}
            </div>
          </article>

          <article className="source-card">
            <div className="source-icon blue">⇧</div>
            <h2>加入更多來源素材</h2>
            <p>品牌指引、參考文件和其他背景資料，可以幫助 SOON 理解你的語氣，生成更聰明的內容。</p>
            <div className="source-card-divider" />
            <button
              type="button"
              className="upload-dropzone"
              onClick={() => uploadInputRef.current?.click()}
            >
              <span>{uploadedNames.length ? uploadedNames.join('、') : '將檔案拖放到這裡，或點擊上載'}</span>
              <strong>上載</strong>
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              onChange={(event) => handleUpload(event.target.files)}
            />
          </article>
        </div>
      </section>

      {isAdjusting ? (
        <div className="adjust-backdrop" role="presentation" onMouseDown={() => setIsAdjusting(false)}>
          <section className="adjust-modal" role="dialog" aria-modal="true" aria-labelledby="adjust-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="adjust-close" onClick={() => setIsAdjusting(false)} aria-label="關閉">×</button>
            <h2 id="adjust-title">網站素材</h2>
            <p>這些圖片會用作之後生成內容的視覺參考。</p>
            <div className="adjust-grid">
              {websiteImages.map((image) => (
                <img src={image} alt="" key={image} />
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <footer className="source-footer">
        <button type="button" onClick={handleBack}>返回</button>
        <button type="button" onClick={handleContinue}>繼續</button>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </main>
  )
}

const styles = `
  .source-materials-page {
    min-height: calc(100vh - 88px);
    background: #ffffff;
    color: #191a1d;
    padding: 17px clamp(18px, 4vw, 50px) 64px;
  }

  .source-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 13px;
    color: #9b9b9b;
    font-size: 11px;
    line-height: 1;
  }

  .source-steps span {
    display: inline-flex;
    align-items: center;
    gap: 13px;
    white-space: nowrap;
  }

  .source-steps .active {
    color: #17181c;
    font-weight: 600;
  }

  .source-steps b {
    color: #b6b6b6;
    font-weight: 400;
  }

  .source-content {
    width: min(100%, 760px);
    margin: 52px auto 0;
  }

  .source-content h1 {
    margin: 0;
    color: #1b1c20;
    font-size: clamp(24px, 3vw, 31px);
    line-height: 1.12;
    font-weight: 500;
    letter-spacing: 0;
  }

  .source-content header p {
    margin: 11px 0 0;
    color: #5d6067;
    font-size: 13px;
    line-height: 1.45;
  }

  .source-card-grid {
    margin-top: 34px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 23px;
  }

  .source-card {
    min-height: 240px;
    border: 1px solid #e8e8e8;
    border-radius: 13px;
    padding: 20px;
  }

  .source-icon {
    width: 36px;
    height: 36px;
    border-radius: 7px;
    display: grid;
    place-items: center;
    font-size: 17px;
    font-weight: 700;
  }

  .source-icon.purple {
    background: #efe7ff;
    color: #8157ff;
  }

  .source-icon.blue {
    background: #eef5ff;
    color: #3b82f6;
  }

  .source-card h2 {
    margin: 16px 0 0;
    color: #202126;
    font-size: 16px;
    line-height: 1.25;
    font-weight: 550;
  }

  .source-card p {
    margin: 14px 0 0;
    color: #34363d;
    font-size: 13px;
    line-height: 1.42;
  }

  .source-card-divider {
    height: 1px;
    background: #ededed;
    margin: 16px 0 0;
  }

  .source-card-row {
    margin-top: 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .source-card-row strong {
    color: #202126;
    font-size: 13px;
    font-weight: 500;
  }

  .source-card-row button,
  .upload-dropzone strong {
    border: 1px solid #e5e5e5;
    border-radius: 7px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 12px;
    padding: 6px 10px;
    cursor: pointer;
  }

  .website-thumbs {
    margin-top: 17px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .website-thumbs img {
    width: 44px;
    height: 44px;
    object-fit: cover;
    border-radius: 6px;
  }

  .upload-dropzone {
    width: 100%;
    margin-top: 13px;
    border: 0;
    background: transparent;
    color: #75787f;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 0;
    text-align: left;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  .source-card input[type="file"] {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  .source-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 48px;
    background: rgba(255,255,255,0.96);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 17px;
  }

  .source-footer button {
    border: 0;
    background: transparent;
    color: #17181c;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  .source-footer button:last-child {
    border-radius: 6px;
    background: #111111;
    color: #ffffff;
    padding: 8px 14px;
    font-size: 13px;
  }

  .adjust-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(241, 243, 245, 0.74);
    backdrop-filter: blur(7px);
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .adjust-modal {
    position: relative;
    width: min(100%, 520px);
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 26px 90px rgba(23, 24, 28, 0.14);
    padding: 28px;
  }

  .adjust-close {
    position: absolute;
    top: 14px;
    right: 16px;
    width: 26px;
    height: 26px;
    border: 0;
    background: transparent;
    color: #282a30;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
  }

  .adjust-modal h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 500;
  }

  .adjust-modal p {
    margin: 8px 0 0;
    color: #656973;
    font-size: 13px;
  }

  .adjust-grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 10px;
  }

  .adjust-grid img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 8px;
  }

  @media (max-width: 760px) {
    .source-card-grid {
      grid-template-columns: 1fr;
    }
  }
`

function SourceMaterialsFallback() {
  return <main className="source-materials-page" />
}

export default function SourceMaterialsPage() {
  return (
    <Suspense fallback={<SourceMaterialsFallback />}>
      <SourceMaterialsContent />
    </Suspense>
  )
}
