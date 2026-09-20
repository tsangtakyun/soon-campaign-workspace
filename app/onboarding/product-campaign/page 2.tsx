'use client'

import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { CampaignProgress } from '@/components/campaign/CampaignProgress'
import { SoonIcon } from '@/components/ui/SoonIcon'
import { getActiveWorkspaceId } from '@/lib/workspace-client'

type CampaignKind = 'product' | 'service' | 'offer'

type ProductCampaignDraft = {
  kind: CampaignKind
  name: string
  sourceUrl: string
  sellingPoints: string
  price: string
  targetAudience: string
  customAudience: string
  objective: string
  notes: string
  customNotes: string
  additionalNotes: string
  marketRegion: string
  workspaceId: string | null
}

const DRAFT_KEY = 'soon-product-campaign-draft-v1'
const IMAGE_DRAFT_KEY = 'soon-product-campaign-image-v1'

const emptyDraft: ProductCampaignDraft = {
  kind: 'product',
  name: '',
  sourceUrl: '',
  sellingPoints: '',
  price: '',
  targetAudience: '',
  customAudience: '',
  objective: 'sales',
  notes: '',
  customNotes: '',
  additionalNotes: '',
  marketRegion: 'HK',
  workspaceId: null,
}

export default function ProductCampaignPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<ProductCampaignDraft>(emptyDraft)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [analysisMessage, setAnalysisMessage] = useState('')
  const [audienceOptions, setAudienceOptions] = useState<string[]>([])
  const [contentOptions, setContentOptions] = useState<string[]>([])
  const [intakeStep, setIntakeStep] = useState<1 | 2>(1)

  async function normalizePhoto(file: File) {
    const isHeic = /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
    if (!isHeic) return file
    const url = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      canvas.getContext('2d')?.drawImage(image, 0, 0)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) throw new Error('未能轉換相片')
      return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  async function analyzeImages(files: File[], prompt = '') {
    const workspaceId = getActiveWorkspaceId()
    if (!workspaceId) return
    setAnalyzingImage(true)
    setAnalysisMessage('SOON 正在理解圖片…')
    try {
      const form = new FormData()
      form.set('workspaceId', workspaceId)
      form.set('prompt', prompt)
      files.forEach((file) => form.append('files', file))
      const response = await fetch('/api/product-campaigns/analyze-source', { method: 'POST', body: form })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || '暫時未能分析圖片')
      const analysis = payload.analysis || {}
      const suggestedAudiences = Array.isArray(analysis.targetAudienceHypotheses) ? analysis.targetAudienceHypotheses : []
      const suggestedContent = Array.isArray(analysis.contentPreferenceOptions) ? analysis.contentPreferenceOptions : []
      setAudienceOptions(suggestedAudiences)
      setContentOptions(suggestedContent)
      setDraft((current) => ({
        ...current,
        name: current.name || analysis.suggestedName || '',
        sellingPoints: current.sellingPoints || (analysis.visibleClaims || []).join('\n'),
        targetAudience: current.targetAudience,
        notes: current.notes,
      }))
      setAnalysisMessage('相片分析完成，請確認 SOON 整理的資料。')
      setIntakeStep(2)
    } catch (error) {
      setAnalysisMessage(error instanceof Error ? error.message : '暫時未能分析圖片，請手動補充資料。')
    } finally {
      setAnalyzingImage(false)
    }
  }

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(DRAFT_KEY)
      const restored = stored ? JSON.parse(stored) as Partial<ProductCampaignDraft> : null
      setDraft({ ...emptyDraft, ...restored, workspaceId: getActiveWorkspaceId() })
    } catch {
      setDraft({ ...emptyDraft, workspaceId: getActiveWorkspaceId() })
    }

    try {
      const storedImage = window.sessionStorage.getItem(IMAGE_DRAFT_KEY)
      const image = storedImage ? JSON.parse(storedImage) as { dataUrl?: string; name?: string; type?: string } : null
      if (image?.dataUrl) {
        fetch(image.dataUrl).then((response) => response.blob()).then((blob) => {
          const file = new File([blob], image.name || 'product-photo.jpg', { type: image.type || blob.type || 'image/jpeg' })
          setImageFiles([file])
          setImagePreviews([URL.createObjectURL(file)])
        }).catch(() => undefined)
      }
    } catch { /* The user can upload again if the handoff is unavailable. */ }
  }, [])

  function update<K extends keyof ProductCampaignDraft>(key: K, value: ProductCampaignDraft[K]) {
    setSaved(false)
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []).slice(0, Math.max(0, 6 - imageFiles.length))
    if (!selectedFiles.length) return
    try {
      const files = await Promise.all(selectedFiles.map(normalizePhoto))
      setImageFiles((current) => [...current, ...files].slice(0, 6))
      setImagePreviews((current) => [...current, ...files.map((file) => URL.createObjectURL(file))].slice(0, 6))
      setAnalysisMessage('相片已加入。全部準備好後，按「開始分析」。')
    } catch {
      setAnalysisMessage('這張 iPhone 相片暫時未能讀取，請在相片 App 另存或分享為 JPG 後再試。')
    }
    event.target.value = ''
  }

  function removeImage(index: number) {
    setImagePreviews((current) => {
      const preview = current[index]
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
      return current.filter((_, itemIndex) => itemIndex !== index)
    })
    setImageFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setAnalysisMessage('相片已更新。請重新開始分析。')
  }

  function updateSellingPoint(index: number, value: string) {
    const points = draft.sellingPoints.split('\n')
    points[index] = value
    update('sellingPoints', points.join('\n'))
  }

  function removeSellingPoint(index: number) {
    const points = draft.sellingPoints.split('\n').filter((_, itemIndex) => itemIndex !== index)
    update('sellingPoints', points.join('\n'))
  }

  function addSellingPoint() {
    update('sellingPoints', `${draft.sellingPoints}${draft.sellingPoints ? '\n' : ''}`)
  }

  function toggleContentOption(option: string) {
    const items = draft.notes.split('\n').map((item) => item.trim()).filter(Boolean)
    update('notes', items.includes(option) ? items.filter((item) => item !== option).join('\n') : [...items, option].join('\n'))
  }

  function toggleAudienceOption(option: string) {
    const items = draft.targetAudience.split('\n').map((item) => item.trim()).filter(Boolean)
    update('targetAudience', items.includes(option) ? items.filter((item) => item !== option).join('\n') : [...items, option].join('\n'))
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = {
      ...draft,
      targetAudience: [draft.targetAudience, draft.customAudience].map((item) => item.trim()).filter(Boolean).join('\n'),
      notes: [draft.notes, draft.customNotes, draft.additionalNotes].map((item) => item.trim()).filter(Boolean).join('\n'),
      workspaceId: getActiveWorkspaceId(),
    }
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next))
    setDraft(next)
    if (!next.workspaceId) {
      setSaveError('找不到目前工作台，請返回首頁重新選擇。')
      return
    }

    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      const imageAssets: Record<string, unknown>[] = []
      for (const imageFile of imageFiles) {
        const form = new FormData()
        form.set('workspaceId', next.workspaceId)
        form.set('file', imageFile)
        const uploadResponse = await fetch('/api/product-assets/upload', { method: 'POST', body: form })
        const uploadResult = await uploadResponse.json().catch(() => ({}))
        if (!uploadResponse.ok) throw new Error(uploadResult?.error || uploadResult?.detail || '未能上傳圖片')
        if (uploadResult.asset) imageAssets.push(uploadResult.asset)
      }
      const response = await fetch('/api/product-campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...next, imageAssets }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.detail || result?.error || '未能建立 Campaign')
      setCampaignId(typeof result?.campaign?.id === 'string' ? result.campaign.id : '')
      setSaved(true)
      window.sessionStorage.removeItem(DRAFT_KEY)
      window.sessionStorage.removeItem(IMAGE_DRAFT_KEY)
      if (typeof result?.campaign?.id === 'string') {
        router.push(`/onboarding/product-campaign/${result.campaign.id}/understanding`)
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '未能建立 Campaign')
    } finally {
      setSaving(false)
    }
  }

  const kindLabel = draft.kind === 'service' ? '服務' : draft.kind === 'offer' ? '優惠' : '產品'

  return (
    <main className="campaign-intake-page">
      <DashboardSidebar activeItem="宣傳包" />
      <section className="campaign-intake-shell">
        <CampaignProgress current={1}/>
        <header className="campaign-intake-header">
          <button type="button" onClick={() => router.push('/onboarding')}><SoonIcon name="arrow-right" size={15} style={{ transform: 'rotate(180deg)' }} />返回首頁</button>
          <div>
            <span>建立宣傳包</span>
            <h1>讓 SOON 先了解</h1>
            <p>上傳幾張相片，SOON 會綜合理解你這次想推廣的內容，再整理成計劃。</p>
          </div>
        </header>

        <nav className="intake-mobile-progress" aria-label="提供宣傳資料的步驟">
          <button className={intakeStep === 1 ? 'active' : 'done'} type="button" onClick={() => setIntakeStep(1)}><b>{intakeStep === 2 ? '✓' : '1'}</b><span>加入相片</span></button>
          <i />
          <button className={intakeStep === 2 ? 'active' : ''} type="button" onClick={() => setIntakeStep(2)}><b>2</b><span>確認資料</span></button>
        </nav>

        <form className="campaign-intake-form" data-active-step={intakeStep} onSubmit={saveDraft}>
          <section className="form-card intake-step step-source">
            <div className="source-card-header">
              <div className="section-title"><b>1</b><div><h2>加入相片</h2><p>準備好後，再交給 SOON 一次分析</p></div></div>
              <div className="intake-controls">
                <div className="kind-grid" aria-label="宣傳類型">
                  {([
                    ['product', '產品'],
                    ['service', '服務'],
                    ['offer', '優惠'],
                  ] as const).map(([value, label]) => (
                    <button className={draft.kind === value ? 'selected' : ''} key={value} type="button" onClick={() => update('kind', value)}>
                      {label}
                    </button>
                  ))}
                </div>
                <label className="market-select"><span>主要市場</span><select value={draft.marketRegion} onChange={(event) => update('marketRegion', event.target.value)}><option value="HK">香港</option><option value="MO">澳門</option><option value="TW">台灣</option><option value="GB">英國</option><option value="SG">新加坡</option><option value="OTHER">其他市場</option></select></label>
              </div>
            </div>
            <label className="upload-zone">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" multiple onChange={selectImage} />
              <span className="upload-icon"><SoonIcon name="upload" size={21} /></span>
              <strong>{imageFiles.length ? '繼續加入相片' : `上傳${kindLabel}相片`}</strong>
              <small>{imageFiles.length ? `已加入 ${imageFiles.length}／6 張` : '可一次選擇多張；產品正面、背面及使用情境都可以'}</small>
            </label>
            {imagePreviews.length ? <div className="photo-list">{imagePreviews.map((preview, index) => <figure key={preview}><img src={preview} alt={`已選擇的宣傳素材 ${index + 1}`} /><button type="button" onClick={() => removeImage(index)} aria-label={`刪除第 ${index + 1} 張相片`}>×</button><figcaption>{index === 0 ? '主相片' : `相片 ${index + 1}`}</figcaption></figure>)}</div> : null}
            {imageFiles.length ? <button className="analyze-button" type="button" disabled={analyzingImage} onClick={() => void analyzeImages(imageFiles, draft.notes)}>{analyzingImage ? 'SOON 正在分析…' : <>開始分析 {imageFiles.length} 張相片 <SoonIcon name="arrow-right" size={16} /></>}</button> : null}
            {analysisMessage ? <div className={`analysis-notice ${analyzingImage ? 'loading' : ''}`} role="status">{analysisMessage}</div> : null}
            {imageFiles.length ? <button className="mobile-next-step" type="button" disabled={analyzingImage} onClick={() => setIntakeStep(2)}>繼續確認資料 <SoonIcon name="arrow-right" size={16} /></button> : null}
          </section>

          <section className="form-card details-card intake-step step-details">
            <div className="section-title"><b>2</b><div><h2>確認 SOON 的理解</h2><p>{analysisMessage ? '以下資料可以隨時修改' : '上傳相片後 SOON 會先幫你填寫'}</p></div></div>
            <button className="mobile-back-step" type="button" onClick={() => setIntakeStep(1)}><SoonIcon name="arrow-right" size={14} />返回相片</button>
            <label><span>{kindLabel}名稱</span><input required value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder={`例如：${draft.kind === 'service' ? '初次品牌諮詢' : draft.kind === 'offer' ? '夏季限定套裝' : 'Glow Serum'}`} /></label>
            <fieldset className="selling-points-field">
              <legend>主要賣點</legend>
              <p>每項只填寫一個重點，SOON 會用於建立不同的宣傳角度。</p>
              <div className="selling-point-list">{(draft.sellingPoints.split('\n').length ? draft.sellingPoints.split('\n') : ['']).map((point, index) => <div key={index}><span>{index + 1}</span><input required={index === 0} value={point} onChange={(event) => updateSellingPoint(index, event.target.value)} placeholder={index === 0 ? '例如：質感輕盈、不黏笠' : '加入另一個賣點'} />{(draft.sellingPoints.split('\n').length > 1 || point) ? <button type="button" onClick={() => removeSellingPoint(index)} aria-label={`刪除賣點 ${index + 1}`}>×</button> : null}</div>)}</div>
              <button className="add-point-button" type="button" onClick={addSellingPoint}><SoonIcon name="plus" size={15} />新增賣點</button>
            </fieldset>
            <fieldset className="choice-field">
              <legend>你最希望接觸哪類人？ <em>可選多項</em></legend>
              {audienceOptions.length ? <div className="choice-list multi">{audienceOptions.map((option) => <button className={draft.targetAudience.split('\n').includes(option) ? 'selected' : ''} key={option} type="button" onClick={() => toggleAudienceOption(option)}>{option}</button>)}</div> : <p>上傳相片後，SOON 會提出合適的受眾讓你選擇。</p>}
              <label><span>自行填寫其他受眾</span><input value={draft.customAudience} onChange={(event) => update('customAudience', event.target.value)} placeholder="例如：正在尋找不黏笠護膚品的香港女性" /></label>
            </fieldset>
            <label><span>這次最希望達到甚麼目標？</span><select value={draft.objective} onChange={(event) => update('objective', event.target.value)}><option value="sales">推動銷售</option><option value="launch">推出新品／服務</option><option value="awareness">讓更多人認識</option><option value="leads">取得查詢或預約</option></select></label>
            <fieldset className="choice-field">
              <legend>內容有甚麼一定要包括或避免？</legend>
              {contentOptions.length ? <div className="choice-list multi">{contentOptions.map((option) => <button className={draft.notes.split('\n').includes(option) ? 'selected' : ''} key={option} type="button" onClick={() => toggleContentOption(option)}>{option}</button>)}</div> : <p>SOON 會按相片內容提供建議；你亦可以略過。</p>}
              <label><span>自行填寫其他要求</span><input value={draft.customNotes} onChange={(event) => update('customNotes', event.target.value)} placeholder="例如：必須顯示售價；避免使用醫療功效字眼" /></label>
            </fieldset>
            <details className="advanced-fields">
              <summary>更多設定 <span>售價與其他補充</span></summary>
              <div className="advanced-fields-body">
                <label><span>售價／收費（選填）</span><input value={draft.price} onChange={(event) => update('price', event.target.value)} placeholder="例如：HK$280" /></label>
                <label><span>其他補充（選填）</span><textarea rows={3} value={draft.additionalNotes} onChange={(event) => update('additionalNotes', event.target.value)} placeholder="例如：今次只限網店使用" /></label>
              </div>
            </details>
          </section>

          <footer className="form-footer">
            <div><strong>下一步：確認產品理解</strong><span>SOON 會整理賣點、受眾需要、可信證據及風險，再提出宣傳角度。</span></div>
            <button type="submit" disabled={saving}>{saving ? '正在建立…' : <>確認資料，建立推廣計劃 <SoonIcon name="arrow-right" size={17} /></>}</button>
          </footer>
          {saved ? <div className="saved-notice" role="status">✓ 產品及宣傳活動已建立。<button type="button" onClick={() => router.push(`/onboarding/campaigns/${campaignId}`)}>查看宣傳活動 →</button></div> : null}
          {saveError ? <div className="error-notice" role="alert">{saveError}</div> : null}
        </form>
      </section>
      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} />
    </main>
  )
}

const styles = `
  .campaign-intake-page { min-height: 100vh; display: grid; grid-template-columns: 240px minmax(0, 1fr); background: #f5f5f6; color: #202126; }
  .campaign-intake-shell { min-width: 0; padding: 34px clamp(18px, 4vw, 56px) 80px; }
  .campaign-intake-header { max-width: 920px; margin: 0 auto 24px; }
  .campaign-intake-header > button { border: 0; background: transparent; color: #666b74; padding: 0; cursor: pointer; font: inherit; font-size: .88rem; }
  .campaign-intake-header > div { margin-top: 28px; }
  .campaign-intake-header span { color: #8c7421; font-size: .72rem; font-weight: 850; letter-spacing: .12em; }
  .campaign-intake-header h1 { margin: 8px 0 10px; font-size: clamp(2rem, 5vw, 3.7rem); line-height: 1; letter-spacing: -.05em; }
  .campaign-intake-header p { max-width: 690px; margin: 0; color: #6b6f77; line-height: 1.65; }
  .campaign-intake-form { max-width: 920px; display: grid; gap: 16px; margin: 0 auto; }
  .form-card { display: grid; gap: 20px; border: 1px solid #e0e1e4; border-radius: 20px; background: #fff; padding: clamp(20px, 4vw, 32px); }
  .section-title { display: flex; align-items: center; gap: 12px; }
  .section-title > b { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 11px; background: #202126; color: #fff; font-size: .78rem; }
  .section-title h2 { margin: 0; font-size: 1.12rem; }
  .section-title p { margin: 3px 0 0; color: #858991; font-size: .8rem; }
  .source-card-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .intake-controls { display: flex; align-items: center; gap: 10px; }
  .market-select { display: flex !important; align-items: center; gap: 7px !important; border-left: 1px solid #e0e1e4; padding-left: 10px; white-space: nowrap; }
  .market-select span { color: #777b83; font-size: .72rem; }
  .market-select select { width: auto; min-height: 42px !important; padding: 8px 30px 8px 10px !important; background: #f2f2f3 !important; }
  .kind-grid { display: flex; gap: 6px; padding: 4px; border-radius: 12px; background: #f2f2f3; }
  .kind-grid button { min-width: 62px; border: 0; border-radius: 9px; background: transparent; color: #666b74; padding: 9px 12px; font: inherit; font-size: .82rem; font-weight: 800; text-align: center; cursor: pointer; }
  .kind-grid button.selected { border-color: #202126; background: #202126; color: #fff; }
  .upload-zone { min-height: 220px; display: grid; place-items: center; align-content: center; gap: 7px; overflow: hidden; border: 1px dashed #bfc2c7; border-radius: 18px; background: #f8f8f9; cursor: pointer; text-align: center; transition: border-color .18s ease, background .18s ease; }
  .upload-zone:hover { border-color: #202126; background: #f4f4f5; }
  .upload-zone input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .upload-zone img { width: 120px; height: 120px; border-radius: 14px; object-fit: cover; }
  .upload-icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 14px; background: #202126; color: #fff; font-size: 1.35rem; }
  .upload-zone small { color: #858991; }
  .photo-list { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
  .photo-list figure { position: relative; min-width: 0; margin: 0; }
  .photo-list img { width: 100%; aspect-ratio: 1; display: block; border-radius: 12px; object-fit: cover; }
  .photo-list figure > button { position: absolute; top: 5px; right: 5px; width: 25px; height: 25px; display: grid; place-items: center; border: 0; border-radius: 50%; background: rgba(20,21,24,.82); color: #fff; font-size: 1rem; cursor: pointer; }
  .photo-list figcaption { margin-top: 6px; color: #777b83; font-size: .7rem; text-align: center; }
  .analyze-button { min-height: 48px; border: 0; border-radius: 12px; background: #202126; color: #fff; padding: 0 18px; font: inherit; font-weight: 850; cursor: pointer; }
  .analyze-button:disabled { cursor: wait; opacity: .65; }
  .source-divider { display: flex; align-items: center; gap: 12px; color: #999da4; font-size: .76rem; }
  .source-divider::before, .source-divider::after { content: ''; height: 1px; flex: 1; background: #ebecef; }
  .url-field { display: grid; gap: 8px; color: #383b41; font-size: .85rem; font-weight: 750; }
  .field-grid { display: grid; gap: 14px; }
  .field-grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .form-card label:not(.upload-zone) { display: grid; gap: 8px; color: #383b41; font-size: .85rem; font-weight: 750; }
  .form-card input, .form-card textarea, .form-card select { width: 100%; box-sizing: border-box; border: 1px solid #dfe0e3; border-radius: 11px; background: #fbfbfc; color: #202126; padding: 12px 13px; font: inherit; font-weight: 500; outline: none; }
  .form-card input, .form-card select { min-height: 48px; }
  .form-card textarea { resize: vertical; line-height: 1.5; }
  .form-card input:focus, .form-card textarea:focus, .form-card select:focus { border-color: #202126; background: #fff; box-shadow: 0 0 0 3px rgba(32,33,38,.07); }
  .choice-field { display: grid; gap: 11px; min-width: 0; margin: 0; border: 0; padding: 0; }
  .choice-field legend { margin: 0 0 2px; padding: 0; color: #383b41; font-size: .85rem; font-weight: 800; }
  .choice-field legend em { margin-left: 5px; border-radius: 999px; background: #f1e7bd; color: #6c5710; padding: 3px 7px; font-size: .68rem; font-style: normal; font-weight: 800; }
  .choice-field > p { margin: 0; border-radius: 11px; background: #f5f5f6; color: #858991; padding: 13px 14px; font-size: .8rem; line-height: 1.5; }
  .choice-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .choice-list button { border: 1px solid #dfe0e3; border-radius: 999px; background: #fff; color: #4a4e55; padding: 10px 14px; font: inherit; font-size: .8rem; font-weight: 700; cursor: pointer; }
  .choice-list button:hover { border-color: #9b9fa6; }
  .choice-list button.selected { border-color: #202126; background: #202126; color: #fff; }
  .choice-list.multi button.selected::before { content: '✓ '; }
  .selling-points-field { display: grid; gap: 10px; min-width: 0; margin: 0; border: 0; padding: 0; }
  .selling-points-field legend { padding: 0; color: #383b41; font-size: .85rem; font-weight: 800; }
  .selling-points-field > p { margin: 0; color: #858991; font-size: .78rem; }
  .selling-point-list { display: grid; gap: 8px; }
  .selling-point-list > div { display: grid; grid-template-columns: 28px minmax(0, 1fr) 34px; align-items: center; gap: 8px; }
  .selling-point-list > div > span { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; background: #f0f0f2; color: #777b83; font-size: .72rem; font-weight: 850; }
  .selling-point-list > div > button { width: 34px; height: 34px; border: 0; border-radius: 9px; background: #f3f3f4; color: #777b83; font-size: 1.05rem; cursor: pointer; }
  .add-point-button { width: max-content; border: 0; background: transparent; color: #66561f; padding: 4px 0; font: inherit; font-size: .8rem; font-weight: 850; cursor: pointer; }
  .advanced-fields { border-top: 1px solid #e7e8ea; padding-top: 18px; }
  .advanced-fields summary { display: flex; align-items: center; justify-content: space-between; color: #383b41; font-size: .88rem; font-weight: 800; cursor: pointer; list-style: none; }
  .advanced-fields summary::-webkit-details-marker { display: none; }
  .advanced-fields summary::after { content: '+'; color: #737780; font-size: 1.15rem; }
  .advanced-fields[open] summary::after { content: '−'; }
  .advanced-fields summary span { color: #92969d; font-size: .76rem; font-weight: 550; }
  .advanced-fields-body { display: grid; gap: 16px; padding-top: 18px; }
  .form-footer { display: flex; align-items: center; justify-content: space-between; gap: 24px; border-radius: 18px; background: #202126; color: #fff; padding: 20px 22px; }
  .form-footer div { display: grid; gap: 4px; }
  .form-footer span { color: #b7bac1; font-size: .8rem; line-height: 1.45; }
  .form-footer button { flex-shrink: 0; min-height: 46px; border: 0; border-radius: 12px; background: #f6d260; color: #202126; padding: 0 18px; font: inherit; font-weight: 850; cursor: pointer; }
  .form-footer button:disabled { cursor: wait; opacity: .65; }
  .saved-notice { border: 1px solid #cce8d4; border-radius: 12px; background: #effaf2; color: #257041; padding: 13px 15px; font-size: .86rem; font-weight: 700; }
  .saved-notice button { border: 0; background: transparent; color: inherit; font: inherit; font-weight: 850; cursor: pointer; }
  .error-notice { border: 1px solid #f0cccc; border-radius: 12px; background: #fff1f1; color: #a13b3b; padding: 13px 15px; font-size: .86rem; font-weight: 700; }
  .analysis-notice { border: 1px solid #d9d2af; border-radius: 12px; background: #fffaf0; color: #66561f; padding: 12px 14px; font-size: .82rem; font-weight: 700; }
  .analysis-notice.loading { animation: analysisPulse 1.2s ease-in-out infinite alternate; }
  @keyframes analysisPulse { to { opacity: .55; } }
  @media (max-width: 900px) { .campaign-intake-page { grid-template-columns: 1fr; } .campaign-intake-page .sidebar { display: none; } }
  .intake-mobile-progress,.mobile-next-step,.mobile-back-step{display:none}
  @media (max-width: 640px) { .campaign-intake-shell { padding: 22px 16px 92px; } .campaign-progress{display:none!important}.campaign-intake-header{margin-bottom:16px}.campaign-intake-header > div { margin-top: 22px; } .campaign-intake-header span{display:none}.campaign-intake-header h1 { margin-top:0;font-size:2.15rem; } .campaign-intake-header p{font-size:.84rem;line-height:1.55}.intake-mobile-progress{display:grid;grid-template-columns:1fr 28px 1fr;align-items:center;max-width:920px;margin:0 auto 14px}.intake-mobile-progress>button{display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#8a8e96;padding:8px 0;font:inherit;font-size:.78rem;font-weight:800}.intake-mobile-progress>button:last-child{justify-content:flex-end}.intake-mobile-progress b{width:27px;height:27px;display:grid;place-items:center;border-radius:9px;background:#e7e0d8;color:#7b7670;font-size:.7rem}.intake-mobile-progress button.active{color:var(--soon-oxblood,#6b2c30)}.intake-mobile-progress button.active b{background:var(--soon-oxblood,#6b2c30);color:#fff}.intake-mobile-progress button.done b{background:#edf6d4;color:#52691a}.intake-mobile-progress>i{height:1px;background:#d8d0c7}.campaign-intake-form[data-active-step="1"] .step-details,.campaign-intake-form[data-active-step="1"] .form-footer,.campaign-intake-form[data-active-step="2"] .step-source{display:none}.form-card{gap:17px;padding:20px 16px;border-radius:17px}.section-title> b{width:32px;height:32px;border-radius:10px}.section-title p{font-size:.73rem}.source-card-header { align-items: flex-start; flex-direction: column; } .intake-controls { width: 100%; align-items: stretch; flex-direction: column; } .kind-grid { width: 100%; } .kind-grid button { flex: 1; min-width: 0; } .market-select { justify-content: space-between; border-left: 0; padding: 0; } .field-grid.two { grid-template-columns: 1fr; } .upload-zone { min-height: 180px; } .photo-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }.mobile-next-step{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border:0;border-radius:12px;background:var(--soon-oxblood,#6b2c30);color:#fff;font:inherit;font-weight:850}.mobile-next-step:disabled{opacity:.55}.mobile-back-step{width:max-content;display:flex;align-items:center;gap:6px;border:0;background:transparent;color:#777b83;padding:0;font:inherit;font-size:.76rem;font-weight:750}.mobile-back-step svg{transform:rotate(180deg)}.advanced-fields summary span { display: none; } .form-footer { position: sticky; bottom: 12px; z-index: 5; align-items: stretch; flex-direction: column; box-shadow:6px 6px 0 #4d2023; } .form-footer div{display:none}.form-footer button { width: 100%; } }
`
