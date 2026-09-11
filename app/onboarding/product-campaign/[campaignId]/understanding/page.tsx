'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { CampaignProgress } from '@/components/campaign/CampaignProgress'
import { SoonIcon } from '@/components/ui/SoonIcon'

type Understanding = {
  summary: string
  coreValue: string
  useCases: string[]
  audienceTensions: string[]
  proofPoints: string[]
  objections: string[]
  confirmedClaims: string[]
  unverifiedClaims: string[]
  restrictions: string[]
  recommendedObjective: string
  recommendedPrimaryMetric: string
  analysisVersion?: number
  status?: string
}

const emptyUnderstanding: Understanding = {
  summary: '', coreValue: '', useCases: [], audienceTensions: [], proofPoints: [], objections: [],
  confirmedClaims: [], unverifiedClaims: [], restrictions: [], recommendedObjective: '', recommendedPrimaryMetric: '',
}

function listText(items: string[]) { return items.join('\n') }
function textList(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean) }

export default function ProductUnderstandingPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = typeof params.campaignId === 'string' ? params.campaignId : ''
  const [productName, setProductName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [understanding, setUnderstanding] = useState<Understanding>(emptyUnderstanding)
  const [status, setStatus] = useState<'loading' | 'analyzing' | 'ready' | 'saving' | 'done' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)
  const analyzingRef = useRef(false)

  const analyze = useCallback(async () => {
    if (analyzingRef.current) return
    analyzingRef.current = true
    setStatus('analyzing')
    setMessage('正在整理產品資料、圖片及相關資料…')
    try {
      const response = await fetch(`/api/product-campaigns/${campaignId}/understanding`, { method: 'POST' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.detail || result?.error || '分析失敗')
      setUnderstanding({ ...emptyUnderstanding, ...result.understanding })
      setStatus('ready')
      setMessage('資料已整理完成，請確認是否正確。')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '分析失敗')
    } finally { analyzingRef.current = false }
  }, [campaignId])

  useEffect(() => {
    if (!campaignId) return
    router.prefetch(`/onboarding/product-campaign/${campaignId}/market`)
    let cancelled = false
    async function load() {
      try {
        const response = await fetch(`/api/product-campaigns/${campaignId}/understanding`, { cache: 'no-store' })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result?.detail || result?.error || '未能載入宣傳活動')
        if (cancelled) return
        setProductName(result?.product?.name || result?.campaign?.name || '')
        setImageUrl(result?.assets?.[0]?.url || '')
        const existing = result?.product?.source_snapshot?.understanding
        if (existing?.summary && Number(existing.analysisVersion || 0) >= 2) {
          setUnderstanding({ ...emptyUnderstanding, ...existing })
          setStatus(existing.status === 'confirmed' ? 'done' : 'ready')
          setMessage(existing.status === 'confirmed' ? '產品資料已確認。' : '請確認以下資料。')
        } else {
          await analyze()
        }
      } catch (error) {
        if (!cancelled) { setStatus('error'); setMessage(error instanceof Error ? error.message : '未能載入宣傳活動') }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [analyze, campaignId, router])

  function field(key: keyof Understanding, value: string) {
    setUnderstanding((current) => ({ ...current, [key]: value }))
    if (status === 'done') setStatus('ready')
  }

  function listField(key: keyof Understanding, value: string) {
    setUnderstanding((current) => ({ ...current, [key]: textList(value) }))
    if (status === 'done') setStatus('ready')
  }

  async function confirm() {
    setStatus('saving')
    setMessage('正在儲存已確認資料…')
    try {
      const response = await fetch(`/api/product-campaigns/${campaignId}/understanding`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ understanding }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.detail || result?.error || '未能儲存')
      setUnderstanding({ ...emptyUnderstanding, ...result.understanding })
      setStatus('done')
      setMessage('產品資料已確認。下一步將根據這些資料整理宣傳方向。')
      router.push(`/onboarding/product-campaign/${campaignId}/market`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '未能儲存')
    }
  }

  const busy = status === 'loading' || status === 'analyzing' || status === 'saving'

  return <main className="understanding-page">
    <DashboardSidebar activeItem="宣傳包" />
    <section className="understanding-shell">
      <CampaignProgress current={2}/>
      <button className="back" type="button" onClick={() => router.push('/onboarding/product-campaign')}><SoonIcon name="arrow-right" size={15} style={{ transform: 'rotate(180deg)' }}/>返回建立宣傳包</button>
      <header>
        <div>{imageUrl ? <img src={imageUrl} alt="" /> : <span>✦</span>}</div>
        <section><small>確認產品資料</small><h1>{productName || '正在載入…'}</h1><p>請確認以下資料是否正確；如無需更改，可直接繼續。</p></section>
      </header>

      {busy ? <section className="analysis-state" aria-live="polite" aria-busy="true"><i /><h2>{status === 'saving' ? '正在確認資料' : '正在整理產品資料'}</h2><p>{message}</p></section> : <>
        {status === 'error' ? <div className="status-note error">{message}<button type="button" onClick={() => void analyze()}>重新整理</button></div> : null}
        <form className="understanding-form" onSubmit={(event) => { event.preventDefault(); void confirm() }}>
          {!editing ? <>
            <section className="summary-card">
              <div className="summary-heading"><div><span>產品摘要</span><h2>{understanding.summary}</h2></div><button type="button" onClick={() => setEditing(true)}>需要更正</button></div>
              <div className="summary-grid">
                <article><small>核心價值</small><p>{understanding.coreValue || '尚未整理'}</p></article>
                <article><small>受眾需要</small><ul>{understanding.audienceTensions.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></article>
                <article><small>可採用的資料</small><ul>{[...understanding.confirmedClaims, ...understanding.proofPoints].slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul></article>
              </div>
            </section>

            {(understanding.unverifiedClaims.length > 0 || understanding.restrictions.length > 0) ? <details className="attention-card">
              <summary>
                <span className="attention-icon"><SoonIcon name="warning" size={15}/></span>
                <span className="attention-summary-copy"><strong>發布前需要注意</strong><small>查看尚待確認的資料及內容限制</small></span>
                <span className="attention-count">{understanding.unverifiedClaims.length + understanding.restrictions.length} 項</span>
              </summary>
              <div className="attention-content">
                {understanding.unverifiedClaims.length ? <div><strong>尚待確認的資料</strong><ul>{understanding.unverifiedClaims.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
                {understanding.restrictions.length ? <div><strong>內容限制</strong><ul>{understanding.restrictions.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
              </div>
            </details> : null}

            <details className="full-analysis">
              <summary><span>查看其他資料</span><small>購買情境、考慮因素及成效建議</small></summary>
              <div className="analysis-grid">
                <article><strong>使用／購買場景</strong><ul>{understanding.useCases.map((item) => <li key={item}>{item}</li>)}</ul></article>
                <article><strong>購買考慮因素</strong><ul>{understanding.objections.map((item) => <li key={item}>{item}</li>)}</ul></article>
                <article><strong>宣傳目標</strong><p>{understanding.recommendedObjective || '尚未設定'}</p></article>
                <article><strong>主要成效指標</strong><p>{understanding.recommendedPrimaryMetric || '尚未設定'}</p></article>
              </div>
            </details>
          </> : <>
            <section className="edit-intro"><div><strong>更正產品資料</strong><span>只需更正不準確之處，其餘內容可保持不變。</span></div><button type="button" onClick={() => setEditing(false)}>取消</button></section>
            <section className="wide"><div className="section-title"><b>1</b><div><strong>產品摘要</strong><span>說明產品內容及主要價值</span></div></div><label>產品摘要<textarea required rows={3} value={understanding.summary} onChange={(event) => field('summary', event.target.value)} /></label><label>核心價值<textarea required rows={3} value={understanding.coreValue} onChange={(event) => field('coreValue', event.target.value)} /></label></section>
            <section><div className="section-title"><b>2</b><div><strong>受眾與購買情境</strong><span>每行一項</span></div></div><label>受眾需要<textarea rows={5} value={listText(understanding.audienceTensions)} onChange={(event) => listField('audienceTensions', event.target.value)} /></label><label>使用／購買場景<textarea rows={5} value={listText(understanding.useCases)} onChange={(event) => listField('useCases', event.target.value)} /></label><label>購買阻力<textarea rows={5} value={listText(understanding.objections)} onChange={(event) => listField('objections', event.target.value)} /></label></section>
            <section><div className="section-title"><b>3</b><div><strong>證據與內容限制</strong><span>未經確認的聲稱不會用於製作內容</span></div></div><label>已確認的聲稱<textarea rows={5} value={listText(understanding.confirmedClaims)} onChange={(event) => listField('confirmedClaims', event.target.value)} /></label><label>尚未確認的聲稱<textarea rows={5} value={listText(understanding.unverifiedClaims)} onChange={(event) => listField('unverifiedClaims', event.target.value)} /></label><label>內容限制<textarea rows={5} value={listText(understanding.restrictions)} onChange={(event) => listField('restrictions', event.target.value)} /></label></section>
          </>}
          <footer><div><strong>{editing ? '儲存更正資料' : '以上資料是否正確？'}</strong><span>{editing ? '下一步將使用更正後的資料了解市場。' : '確認後將查看相關市場及競爭品牌。'}</span></div><div className="footer-actions">{!editing ? <button className="secondary" type="button" onClick={() => setEditing(true)}>需要更正</button> : null}<button type="submit">{status === 'done' ? '查看市場資料 →' : editing ? '儲存並查看市場 →' : '資料正確，繼續 →'}</button></div></footer>
        </form>
      </>}
    </section>
    <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} />
  </main>
}

const styles = `
  .understanding-page { min-height: 100vh; display: grid; grid-template-columns: 240px minmax(0,1fr); background: #f5f5f6; color: #202126; }
  .understanding-shell { width: min(100%, 1040px); box-sizing: border-box; margin: 0 auto; padding: 34px clamp(18px,4vw,54px) 80px; }
  .back { border: 0; background: transparent; color: #70747b; padding: 0; font: inherit; cursor: pointer; }
  header { display: flex; align-items: center; gap: 20px; margin: 30px 0 24px; }
  header > div { width: 90px; height: 90px; flex: 0 0 auto; display: grid; place-items: center; overflow: hidden; border-radius: 20px; background: #202126; color: #f6d260; font-size: 1.6rem; }
  header img { width: 100%; height: 100%; object-fit: cover; }
  header small { color: #8c7421; font-weight: 850; letter-spacing: .14em; }
  header h1 { margin: 6px 0; font-size: clamp(2rem,5vw,3.4rem); line-height: 1; letter-spacing: -.045em; }
  header p { margin: 0; color: #757981; }
  .analysis-state { min-height: 360px; display: grid; place-items: center; align-content: center; border: 1px solid #e0e1e4; border-radius: 22px; background: #fff; text-align: center; padding: 28px; }
  .analysis-state i { width: 34px; height: 34px; border: 3px solid #e8e8e8; border-top-color: #202126; border-radius: 50%; animation: spin .8s linear infinite; }
  .analysis-state h2 { margin: 18px 0 6px; }
  .analysis-state p { margin: 0; color: #7b7f87; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .status-note { display: flex; justify-content: space-between; gap: 14px; border: 1px solid #cfe7d5; border-radius: 13px; background: #eff9f2; color: #256c3e; padding: 13px 15px; font-size: .86rem; font-weight: 700; }
  .status-note.error { border-color: #efcccc; background: #fff1f1; color: #9b3636; }
  .status-note button { border: 0; background: transparent; color: inherit; font: inherit; font-weight: 850; cursor: pointer; }
  .understanding-form { display: grid; gap: 16px; margin-top: 16px; }
  .understanding-form > section { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; border: 1px solid #e0e1e4; border-radius: 18px; background: #fff; padding: 24px; box-shadow: 0 1px 2px rgba(20,22,26,.025); }
  .understanding-form > section.wide { grid-template-columns: 1fr; }
  .understanding-form > section.summary-card { grid-template-columns: 1fr; gap: 22px; padding: 28px; }
  .summary-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
  .summary-heading > div { display: grid; gap: 8px; }
  .summary-heading span { color: #8c7421; font-size: .72rem; font-weight: 850; letter-spacing: .08em; }
  .summary-heading h2 { max-width: 760px; margin: 0; color: #202126; font-size: clamp(1.15rem,2.2vw,1.55rem); line-height: 1.5; }
  .summary-heading button, .edit-intro button { flex: 0 0 auto; border: 1px solid #d9dade; border-radius: 10px; background: #fff; color: #35383e; padding: 9px 13px; font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .summary-grid article { border-radius: 14px; background: #f6f6f7; padding: 17px; }
  .summary-grid article:first-child { grid-column: 1/-1; }
  .summary-grid small { color: #777b83; font-weight: 800; }
  .summary-grid p { margin: 8px 0 0; line-height: 1.6; }
  .summary-grid ul, .attention-card ul, .analysis-grid ul { margin: 9px 0 0; padding-left: 18px; color: #4e5259; font-size: .84rem; line-height: 1.65; }
  .attention-card { overflow: hidden; border: 1px solid #e6dfc8; border-radius: 12px; background: #fffdf7; }
  .attention-card > summary { display: flex; align-items: center; gap: 12px; padding: 15px 17px; color: #34363b; cursor: pointer; list-style: none; }
  .attention-card > summary::-webkit-details-marker { display: none; }
  .attention-card > summary::after { content: '+'; flex: 0 0 auto; color: #777b83; font-size: 1.1rem; }
  .attention-card[open] > summary::after { content: '−'; }
  .attention-icon { width: 28px; height: 28px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; background: #5f6064; color: #fff; font-size: .75rem; font-weight: 900; }
  .attention-summary-copy { min-width: 0; flex: 1; display: grid; gap: 2px; }
  .attention-summary-copy strong { font-size: .86rem; }
  .attention-summary-copy small { color: #777b83; font-size: .74rem; font-weight: 550; }
  .attention-count { flex: 0 0 auto; border-radius: 999px; background: #f2efe5; color: #68604a; padding: 5px 9px; font-size: .72rem; font-weight: 800; }
  .attention-content { display: grid; gap: 16px; border-top: 1px solid #eee6ce; padding: 17px; }
  .attention-content > div > strong { font-size: .82rem; }
  .full-analysis { border: 1px solid #e0e1e4; border-radius: 16px; background: #fff; padding: 18px 20px; }
  .full-analysis > summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; cursor: pointer; list-style: none; }
  .full-analysis > summary::-webkit-details-marker { display: none; }
  .full-analysis > summary span { font-weight: 850; }
  .full-analysis > summary small { color: #858991; }
  .full-analysis > summary::after { content: '+'; color: #777b83; font-size: 1.15rem; }
  .full-analysis[open] > summary::after { content: '−'; }
  .analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 18px; }
  .analysis-grid article { border-radius: 12px; background: #f6f6f7; padding: 15px; }
  .analysis-grid article strong { font-size: .82rem; }
  .analysis-grid article p { margin: 8px 0 0; color: #555a62; font-size: .84rem; }
  .understanding-form > section.edit-intro { display: flex; align-items: center; justify-content: space-between; gap: 18px; border-color: #d8dbe0; background: #f0f1f3; padding: 17px 20px; }
  .edit-intro > div { display: grid; gap: 3px; }
  .edit-intro span { color: #737780; font-size: .78rem; }
  .section-title { grid-column: 1/-1; display: flex; align-items: center; gap: 11px; padding-bottom: 16px; border-bottom: 1px solid #ececef; }
  .section-title > b { width: 34px; height: 34px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 10px; background: #202126; color: #f6d260; font-size: .72rem; }
  .section-title > div { display: grid; gap: 2px; }
  .section-title strong { color: #202126; font-size: .98rem; }
  .section-title span { color: #777b83; font-size: .72rem; }
  .understanding-form > section.risk { border-color: #e4d18e; background: #fffaf0; }
  .risk .section-title { border-bottom-color: #ecdfb4; }
  .risk .section-title > b { background: #8a7323; color: #fff; }
  .recommendation { background: linear-gradient(135deg,#fff 0%,#fffdf6 100%) !important; }
  label { display: grid; align-content: start; gap: 9px; color: #36393f; font-size: .83rem; font-weight: 800; }
  textarea, input { width: 100%; box-sizing: border-box; border: 1px solid #d9dade; border-radius: 11px; background: #f8f8f9; color: #202126; padding: 13px 14px; font: inherit; font-size: .84rem; font-weight: 540; line-height: 1.6; outline: none; resize: vertical; }
  input { min-height: 48px; }
  textarea:focus, input:focus { border-color: #202126; background: #fff; box-shadow: 0 0 0 3px rgba(32,33,38,.07); }
  label small { color: #737780; font-size: .7rem; font-weight: 600; }
  footer { position: sticky; bottom: 16px; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 20px; border: 1px solid rgba(255,255,255,.09); border-radius: 18px; background: rgba(32,33,38,.97); color: #fff; padding: 18px 20px; box-shadow: 0 12px 34px rgba(20,21,24,.2); backdrop-filter: blur(12px); }
  footer div { display: grid; gap: 4px; } footer span { color: #b8bbc1; font-size: .8rem; }
  footer .footer-actions { display: flex; align-items: center; gap: 9px; }
  footer button { min-height: 46px; border: 0; border-radius: 12px; background: #f6d260; color: #202126; padding: 0 18px; font: inherit; font-weight: 850; cursor: pointer; }
  footer button.secondary { border: 1px solid #565961; background: transparent; color: #fff; }
  @media(max-width:900px){.understanding-page{grid-template-columns:1fr}.understanding-page .sidebar{display:none}}
  @media(max-width:640px){.understanding-shell{padding:24px 16px 90px}header{align-items:flex-start}.understanding-form>section{grid-template-columns:1fr;padding:18px}.summary-heading{align-items:stretch;flex-direction:column}.summary-heading button{width:max-content}.summary-grid,.analysis-grid{grid-template-columns:1fr}.summary-grid article:first-child{grid-column:auto}.full-analysis>summary small{display:none}.understanding-form>section.edit-intro{align-items:stretch;flex-direction:column}.edit-intro button{width:max-content}.section-title{padding-bottom:14px}footer{position:sticky;bottom:10px;align-items:stretch;flex-direction:column}footer .footer-actions{display:grid;grid-template-columns:1fr}footer button{width:100%}}
  .understanding-page{background:#fff}.understanding-shell{width:min(100%,980px)}
  header{gap:18px;margin:34px 0 30px;padding-bottom:26px;border-bottom:1px solid #e8e8ea}header>div{width:72px;height:72px;border:1px solid #dedfe2;border-radius:14px;background:#f3f3f4;color:#555}header img{object-fit:contain;background:#fff}header small{color:#737780;font-size:.72rem;font-weight:750;letter-spacing:.04em}header h1{font-size:clamp(2rem,4vw,2.8rem);letter-spacing:-.035em}header p{font-size:.92rem}
  .understanding-form{gap:14px;margin-top:0}.understanding-form>section,.understanding-form>section.summary-card{border-radius:14px;box-shadow:none}.understanding-form>section.summary-card{padding:24px}.summary-heading span{color:#70747b;letter-spacing:.03em}.summary-grid article{border:1px solid #ececef;background:#fafafa}.full-analysis{border-radius:12px;background:#fafafa}.analysis-grid article{border:1px solid #ececef;background:#fff}
  footer{bottom:12px;border:1px solid #dedfe2;border-radius:14px;background:rgba(255,255,255,.96);color:#202126;box-shadow:0 10px 28px rgba(20,21,24,.1)}footer span{color:#737780}footer button{border-radius:9px;background:#202126;color:#fff}footer button.secondary{border-color:#d5d7db;background:#fff;color:#34373c}
`
