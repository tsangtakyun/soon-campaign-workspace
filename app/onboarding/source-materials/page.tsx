'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { createClient } from '@/lib/supabase'

const STORAGE_KEYS = {
  websiteAnalysis: 'soon-website-analysis-v1',
  selectedWebsiteImages: 'soon-selected-website-images-v1',
}

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='220' viewBox='0 0 320 220'%3E%3Crect width='320' height='220' rx='18' fill='%23f3f4f6'/%3E%3Cpath d='M92 142l44-47 34 36 18-21 40 32H92z' fill='%23d9dde4'/%3E%3Ccircle cx='220' cy='76' r='18' fill='%23c8ced8'/%3E%3Crect x='88' y='58' width='144' height='104' rx='12' fill='none' stroke='%23c5cbd5' stroke-width='4'/%3E%3Ctext x='160' y='190' text-anchor='middle' font-family='Arial, sans-serif' font-size='18' fill='%238b929e'%3E參考圖片%3C/text%3E%3C/svg%3E"

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function displayImageUrl(value: string) {
  if (!value) return ''
  if (value.startsWith('blob:') || value.startsWith('data:') || value.startsWith('/')) return value
  return `/api/website-image?url=${encodeURIComponent(value)}`
}

function collectImageStrings(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectImageStrings)
  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>
    return [
      objectValue.url,
      objectValue.src,
      objectValue.image,
      objectValue.imageUrl,
    ].flatMap(collectImageStrings)
  }
  return []
}

function isUsableWebsiteReferenceImage(image: string) {
  if (!image || image === PLACEHOLDER_IMAGE) return false
  return !/(logo|icon|favicon|sprite|placeholder|blank|pixel|tracking|facebook\.com\/tr|monogram|gencode|qrcode|qr[-_]?code|award|badge|singleline|title|bar|social|payment|visa|mastercard|blur_|\.(svg|ico|gif)(?:\?|$))/i.test(image)
}

function normalizeWebsiteReferenceImage(image: string) {
  try {
    const url = new URL(image.trim())
    if (/static\.wixstatic\.com$/i.test(url.hostname) || /static\.parastorage\.com$/i.test(url.hostname)) {
      const mediaMatch = url.pathname.match(/^(\/media\/[^/]+\.(?:jpe?g|png|webp|avif))(?:\/.*)?$/i)
      if (mediaMatch?.[1]) {
        url.pathname = mediaMatch[1]
        url.search = ''
        url.hash = ''
        return url.toString()
      }
    }

    if (/cdn\.shopify\.com$/i.test(url.hostname) || /\.myshopify\.com$/i.test(url.hostname)) {
      url.pathname = url.pathname.replace(
        /_(?:\d+x\d*|\d+x|x\d+|pico|icon|thumb|small|compact|medium|large|grande|master)(?=\.(?:jpe?g|png|webp|avif)$)/i,
        ''
      )
      url.search = ''
      url.hash = ''
      return url.toString()
    }

    url.hash = ''
    return url.toString()
  } catch {
    return image.trim()
  }
}

function SourceMaterialsContent() {
  const searchParams = useSearchParams()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [uploadedNames, setUploadedNames] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [assetError, setAssetError] = useState('')

  const websiteImages = useMemo(() => {
    const websiteStored = readStorage<any>(STORAGE_KEYS.websiteAnalysis)
    const analysis = websiteStored?.analysis || websiteStored
    const images = [
      ...collectImageStrings(analysis?.websiteImages),
      ...collectImageStrings(analysis?.images),
      ...collectImageStrings(analysis?.media),
    ]
      .map(normalizeWebsiteReferenceImage)
      .filter(isUsableWebsiteReferenceImage)
    return Array.from(new Set(images))
  }, [])

  useEffect(() => {
    const stored = readStorage<string[]>(STORAGE_KEYS.selectedWebsiteImages)
    setSelectedImages(stored?.filter((image) => websiteImages.includes(image)) ?? websiteImages)
  }, [websiteImages])

  useEffect(() => {
    const sessionId = window.localStorage.getItem('soon-onboarding-session-id')
    if (!sessionId) return
    const supabase = createClient()
    void supabase
      .from('brand_assets')
      .select('filename')
      .eq('onboarding_session_id', sessionId)
      .eq('asset_type', 'upload')
      .then(({ data, error }) => {
        if (!error) setUploadedNames((data || []).map((asset) => asset.filename).filter(Boolean) as string[])
      })
  }, [])

  function ensureSessionId() {
    let sessionId = window.localStorage.getItem('soon-onboarding-session-id')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      window.localStorage.setItem('soon-onboarding-session-id', sessionId)
    }
    return sessionId
  }

  async function saveWebsiteAssets() {
    const supabase = createClient()
    const sessionId = ensureSessionId()
    const { data: { user } } = await supabase.auth.getUser()
    const existingQuery = supabase
      .from('brand_assets')
      .select('id,url')
      .eq('onboarding_session_id', sessionId)
      .eq('asset_type', 'website_image')
    const { data: existing, error: readError } = await existingQuery
    if (readError) throw readError

    const selected = new Set(selectedImages)
    const removeIds = (existing || []).filter((asset) => !selected.has(asset.url)).map((asset) => asset.id)
    if (removeIds.length) {
      const { error } = await supabase.from('brand_assets').delete().in('id', removeIds)
      if (error) throw error
    }

    const existingUrls = new Set((existing || []).map((asset) => asset.url))
    const additions = selectedImages
      .filter((url) => !existingUrls.has(url))
      .map((url) => ({
        asset_type: 'website_image',
        filename: decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'website-image'),
        is_used: true,
        onboarding_session_id: sessionId,
        source_url: searchParams.get('website'),
        url,
        user_id: user?.id || null,
      }))
    if (additions.length) {
      const { error } = await supabase.from('brand_assets').insert(additions)
      if (error) throw error
    }

    window.sessionStorage.setItem(STORAGE_KEYS.selectedWebsiteImages, JSON.stringify(selectedImages))
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
      'contentModification',
      'photoControl',
    ].forEach((key) => {
      const value = searchParams.get(key)
      if (value) url.searchParams.set(key, value)
    })
  }

  async function handleContinue() {
    setIsSaving(true)
    setAssetError('')
    try {
      await saveWebsiteAssets()
      const url = new URL('/onboarding/campaigns-ready', window.location.origin)
      preserveParams(url)
      window.location.href = `${url.pathname}${url.search}`
    } catch (error) {
      console.warn('[source-materials] unable to save assets', error)
      setAssetError('素材未能儲存，請稍後再試。')
      setIsSaving(false)
    }
  }

  function handleBack() {
    window.history.back()
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    const images = Array.from(files)
    if (images.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      setAssetError('請上載 JPG、PNG 或 WebP 圖片。品牌文件可在完成設定後加入品牌資料庫。')
      return
    }

    setIsUploading(true)
    setAssetError('')
    try {
      const supabase = createClient()
      const sessionId = ensureSessionId()
      const { data: { user } } = await supabase.auth.getUser()
      const ownerId = user?.id || sessionId
      const savedNames: string[] = []
      for (const file of images) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const storagePath = `${ownerId}/source-materials/${Date.now()}-${crypto.randomUUID()}-${safeName}`
        const { error: uploadError } = await supabase.storage
          .from('brand-assets')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('brand-assets').getPublicUrl(storagePath)
        const { error: insertError } = await supabase.from('brand_assets').insert({
          asset_type: 'upload',
          filename: file.name,
          is_used: true,
          onboarding_session_id: sessionId,
          source_url: null,
          url: data.publicUrl,
          user_id: user?.id || null,
        })
        if (insertError) throw insertError
        savedNames.push(file.name)
      }
      setUploadedNames((current) => [...current, ...savedNames])
    } catch (error) {
      console.warn('[source-materials] upload failed', error)
      setAssetError('圖片上載未完成，請稍後再試。')
    } finally {
      setIsUploading(false)
      if (uploadInputRef.current) uploadInputRef.current.value = ''
    }
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
              <strong>已選 {selectedImages.length}／{websiteImages.length} 張圖片</strong>
              <button type="button" onClick={() => setIsAdjusting(true)}>調整</button>
            </div>
            <div className="website-thumbs">
              {selectedImages.length ? (
                selectedImages.slice(0, 4).map((image) => (
                  <img src={displayImageUrl(image)} alt="" key={image} />
                ))
              ) : (
                <span className="empty-website-assets">未找到可用網站圖片</span>
              )}
            </div>
          </article>

          <article className="source-card">
            <div className="source-icon blue">⇧</div>
            <h2>加入更多來源素材</h2>
            <p>上載產品、服務、團隊或場景圖片，讓 SOON 在生成視覺內容時使用更準確的品牌素材。</p>
            <div className="source-card-divider" />
            <button
              type="button"
              className="upload-dropzone"
              disabled={isUploading}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                void handleUpload(event.dataTransfer.files)
              }}
              onClick={() => uploadInputRef.current?.click()}
            >
              <span>{uploadedNames.length ? `已上載：${uploadedNames.join('、')}` : '將 JPG、PNG 或 WebP 拖放到這裡，或點擊上載'}</span>
              <strong>{isUploading ? '上載中…' : '上載'}</strong>
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => void handleUpload(event.target.files)}
            />
          </article>
        </div>
        {assetError ? <p className="asset-error" role="alert">{assetError}</p> : null}
      </section>

      {isAdjusting ? (
        <div className="adjust-backdrop" role="presentation" onMouseDown={() => setIsAdjusting(false)}>
          <section className="adjust-modal" role="dialog" aria-modal="true" aria-labelledby="adjust-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="adjust-close" onClick={() => setIsAdjusting(false)} aria-label="關閉">×</button>
            <h2 id="adjust-title">網站素材</h2>
            <p>只選擇與品牌、服務和實際環境有關的圖片。已選圖片會保存到品牌素材庫。</p>
            {websiteImages.length ? <div className="adjust-actions">
              <button type="button" onClick={() => setSelectedImages(websiteImages)}>全部選取</button>
              <button type="button" onClick={() => setSelectedImages([])}>全部取消</button>
            </div> : null}
            <div className="adjust-grid">
              {websiteImages.length ? websiteImages.map((image) => (
                <button
                  type="button"
                  className={selectedImages.includes(image) ? 'selected' : ''}
                  aria-pressed={selectedImages.includes(image)}
                  onClick={() => setSelectedImages((current) => current.includes(image)
                    ? current.filter((value) => value !== image)
                    : [...current, image])}
                  key={image}
                >
                  <img src={displayImageUrl(image)} alt="" />
                  <span>{selectedImages.includes(image) ? '✓ 已選' : '選取'}</span>
                </button>
              )) : <p>暫時未找到可用網站圖片。你可以返回上一頁重新分析，或在右邊上載素材。</p>}
            </div>
          </section>
        </div>
      ) : null}

      <footer className="source-footer">
        <button type="button" onClick={handleBack}>返回</button>
        <button type="button" onClick={() => void handleContinue()} disabled={isSaving || isUploading}>
          {isSaving ? '儲存中…' : '繼續'}
        </button>
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
    object-fit: contain;
    border-radius: 6px;
    border: 1px solid #eeeeee;
    background: #ffffff;
    padding: 4px;
  }

  .empty-website-assets {
    color: #8a8e97;
    font-size: 12px;
    line-height: 44px;
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

  .upload-dropzone:disabled,
  .source-footer button:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  .asset-error {
    margin: 14px 0 0;
    color: #a8322b;
    font-size: 12px;
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
    max-height: min(720px, calc(100vh - 48px));
    overflow: auto;
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

  .adjust-actions {
    margin-top: 14px;
    display: flex;
    gap: 8px;
  }

  .adjust-actions button {
    border: 1px solid #dedfe3;
    border-radius: 7px;
    background: #ffffff;
    padding: 6px 9px;
    color: #34363d;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
  }

  .adjust-grid > button {
    position: relative;
    border: 2px solid transparent;
    border-radius: 10px;
    background: #ffffff;
    padding: 0;
    cursor: pointer;
    overflow: hidden;
  }

  .adjust-grid > button.selected {
    border-color: #1f6feb;
  }

  .adjust-grid img {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: contain;
    background: #ffffff;
    padding: 8px;
    display: block;
  }

  .adjust-grid > button span {
    position: absolute;
    right: 5px;
    bottom: 5px;
    border-radius: 999px;
    background: rgba(24, 26, 31, 0.82);
    color: #ffffff;
    padding: 3px 6px;
    font-size: 9px;
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
