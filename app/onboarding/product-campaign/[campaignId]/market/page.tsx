'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { CampaignProgress } from '@/components/campaign/CampaignProgress'
import { SoonIcon } from '@/components/ui/SoonIcon'

type Competitor = { name: string; product: string; sellingAngles: string[]; sourceUrl: string; sourceTitle: string; imageUrl: string }
type CommentTheme = { theme: string; sentiment: string; evidenceUrl: string }
type MarketIntelligence = {
  market: string; summary: string; competitors: Competitor[]; commentStatus: string; commentSummary: string
  commentThemes: CommentTheme[]; opportunities: string[]; sources: { title: string; url: string; sourceType: string }[]
}

function strengthHeadline(value: string) {
  const quotes = Array.from(value.matchAll(/「([^」]{3,32})」/g), (match) => match[1])
  if (quotes.length) return quotes[quotes.length - 1]
  if (value.includes('品牌認知度')) return '品牌認知度是突圍關鍵'
  return value.split('：')[0].replace(/(差異化空間|訴求具科學背書)$/, '').trim()
}

export default function MarketIntelligencePage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = typeof params.campaignId === 'string' ? params.campaignId : ''
  const [productName, setProductName] = useState('')
  const [intelligence, setIntelligence] = useState<MarketIntelligence | null>(null)
  const [status, setStatus] = useState<'loading' | 'researching' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('正在準備產品及市場資料…')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const researching = useRef(false)

  const research = useCallback(async () => {
    if (!campaignId || researching.current) return
    researching.current = true
    setStatus('researching')
    setMessage('SOON 正在搜尋競品、銷售方式及公開評論…')
    try {
      const response = await fetch(`/api/product-campaigns/${campaignId}/market-intelligence`, { method: 'POST' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || '市場研究失敗')
      setIntelligence(result.intelligence)
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '市場研究失敗')
    } finally { researching.current = false }
  }, [campaignId])

  useEffect(() => {
    if (!campaignId) return
    router.prefetch(`/onboarding/product-campaign/${campaignId}/angles`)
    let cancelled = false
    async function load() {
      try {
        const response = await fetch(`/api/product-campaigns/${campaignId}/market-intelligence`, { cache: 'no-store' })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result?.error || '未能載入市場情報')
        if (cancelled) return
        setProductName(result?.product?.name || '')
        if (result.intelligence) { setIntelligence(result.intelligence); setStatus('ready') } else await research()
      } catch (error) {
        if (!cancelled) { setStatus('error'); setMessage(error instanceof Error ? error.message : '未能載入市場情報') }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [campaignId, research, router])

  function moveStrength(index: number, direction: -1 | 1) {
    setIntelligence((current) => {
      if (!current) return current
      const next = [...current.opportunities]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...current, opportunities: next }
    })
  }

  async function savePriorities() {
    if (!intelligence || saving) return
    setSaving(true)
    try {
      const response = await fetch(`/api/product-campaigns/${campaignId}/market-intelligence`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ opportunities: intelligence.opportunities, competitors: intelligence.competitors.map(({ name, sourceUrl, sellingAngles }) => ({ name, sourceUrl, sellingAngles })) }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || '儲存失敗')
      setIntelligence(result.intelligence)
      setEditing(false)
    } catch (error) { setMessage(error instanceof Error ? error.message : '儲存失敗'); setStatus('error') }
    finally { setSaving(false) }
  }

  const busy = status === 'loading' || status === 'researching'
  return <main className="market-page">
    <DashboardSidebar activeItem="宣傳包" />
    <section className="market-shell">
      <CampaignProgress current={3}/>
      <button className="back" type="button" onClick={() => router.push(`/onboarding/product-campaign/${campaignId}/understanding`)}><SoonIcon name="arrow-right" size={15} style={{ transform: 'rotate(180deg)' }}/>返回產品理解</button>
      <header><small>市場情報</small><h1>{productName || '正在載入…'}</h1><p>快速了解市場機會及競品定位。</p></header>
      {busy ? <section className="research-state" aria-live="polite" aria-busy="true"><i /><h2>{status === 'loading' ? '正在進入市場情報' : '正在研究市場'}</h2><p>{message}</p><small>{status === 'loading' ? '即將開始搜尋' : '一般需時約 1–2 分鐘'}</small></section> : status === 'error' ? <section className="error-state"><h2>暫時未能完成市場研究</h2><p>{message}</p><button type="button" onClick={() => void research()}>再試一次</button><button className="skip" type="button" onClick={() => router.push(`/onboarding/product-campaign/${campaignId}/angles`)}>略過市場研究 →</button></section> : intelligence ? <>
        <section className="market-summary"><div><span>主要市場</span><strong>{intelligence.market}</strong></div><p>{intelligence.summary}</p><button type="button" onClick={() => void research()}>更新資料</button></section>
        <section className="section-block opportunities"><div className="section-heading"><div><h2>產品強項</h2><small>按優先次序排列</small></div><button className="edit-market" type="button" onClick={() => editing ? void savePriorities() : setEditing(true)}>{saving ? '儲存中…' : editing ? '儲存更改' : '修改及排序'}</button></div><div className="opportunity-grid">{intelligence.opportunities.map((item, index) => <article key={`${index}-${item}`}><div className="priority-row"><b>{index + 1}</b>{editing ? <span><button type="button" disabled={index === 0} onClick={() => moveStrength(index, -1)} aria-label="向上移動">↑</button><button type="button" disabled={index === intelligence.opportunities.length - 1} onClick={() => moveStrength(index, 1)} aria-label="向下移動">↓</button></span> : null}</div><h3>{strengthHeadline(item)}</h3>{editing ? <textarea rows={4} value={item} onChange={(event) => setIntelligence((current) => current ? { ...current, opportunities: current.opportunities.map((value, itemIndex) => itemIndex === index ? event.target.value : value) } : current)} /> : <p>{item}</p>}</article>)}</div></section>
        <section className="section-block"><div className="section-heading"><div><h2>對手如何宣傳</h2><small>重點查看對方的主打訊息</small></div></div>{intelligence.competitors.length ? <div className="competitor-grid">{intelligence.competitors.map((competitor, competitorIndex) => <article key={`${competitor.name}-${competitor.sourceUrl}`}>{competitor.imageUrl ? <img src={`/api/website-image?url=${encodeURIComponent(competitor.imageUrl)}`} alt={`${competitor.name} 產品參考`} /> : <div className="image-fallback">暫未有圖片</div>}<div><small>{competitor.name}</small><h3>{competitor.product || competitor.name}</h3></div><div className="competitor-messages">{competitor.sellingAngles.slice(0, 2).map((angle, angleIndex) => editing ? <textarea key={angleIndex} rows={3} value={angle} onChange={(event) => setIntelligence((current) => current ? { ...current, competitors: current.competitors.map((value, valueIndex) => valueIndex === competitorIndex ? { ...value, sellingAngles: value.sellingAngles.map((message, messageIndex) => messageIndex === angleIndex ? event.target.value : message) } : value) } : current)} /> : <p key={angle}><span>主打</span>{angle}</p>)}</div><a href={competitor.sourceUrl} target="_blank" rel="noreferrer">查看來源 ↗</a></article>)}</div> : <div className="empty">暫時未找到有可靠來源支持的直接競品。</div>}</section>
        <details className="section-block comments"><summary><span><strong>公開顧客意見</strong><small>{intelligence.commentStatus === 'sufficient' ? '已找到相關評論' : intelligence.commentStatus === 'limited' ? '可用資料有限' : '未找到足夠評論'}</small></span></summary><div className={`comment-status ${intelligence.commentStatus}`}><p>{intelligence.commentSummary || '目前沒有足夠可靠的公開評論。'}</p></div>{intelligence.commentThemes.length ? <div className="theme-list">{intelligence.commentThemes.map((item) => <a key={`${item.theme}-${item.evidenceUrl}`} href={item.evidenceUrl} target="_blank" rel="noreferrer"><span>{item.sentiment === 'positive' ? '正面' : item.sentiment === 'negative' ? '負面' : '綜合'}</span>{item.theme}<b>↗</b></a>)}</div> : null}</details>
        <details className="sources"><summary>查看研究來源（{intelligence.sources.length}）</summary>{intelligence.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.sourceType}</span>{source.title} ↗</a>)}</details>
        <footer><div><strong>市場方向是否足夠？</strong><span>下一步，SOON 會結合產品與市場資料建立宣傳角度。</span></div><button type="button" onClick={() => router.push(`/onboarding/product-campaign/${campaignId}/angles`)}>建立宣傳角度 →</button></footer>
      </> : null}
    </section>
    <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} />
  </main>
}

const styles = `
  .market-page{min-height:100vh;display:grid;grid-template-columns:240px minmax(0,1fr);background:#f7f7f8;color:#202126}.market-shell{width:min(100%,1040px);box-sizing:border-box;margin:0 auto;padding:34px clamp(18px,4vw,54px) 90px}.back{border:0;background:transparent;color:#70747b;padding:0;font:inherit;cursor:pointer}.market-shell>header{margin:30px 0 22px;border-bottom:1px solid #e5e6e8;padding-bottom:22px}.market-shell>header small{color:#737780;font-size:.72rem;font-weight:800;letter-spacing:.05em}.market-shell>header h1{margin:7px 0;font-size:clamp(2rem,5vw,2.8rem);letter-spacing:-.04em}.market-shell>header p{margin:0;color:#757981}.research-state,.error-state{min-height:390px;display:grid;place-items:center;align-content:center;border:1px solid #e0e1e4;border-radius:14px;background:#fff;padding:28px;text-align:center}.research-state i{width:36px;height:36px;border:3px solid #e8e8e8;border-top-color:#202126;border-radius:50%;animation:spin .8s linear infinite}.research-state h2,.error-state h2{margin:18px 0 6px}.research-state p,.error-state p{margin:0;color:#737780}.research-state small{margin-top:12px;color:#999da4}.error-state button{margin-top:18px;border:0;border-radius:9px;background:#202126;color:#fff;padding:12px 16px;font-weight:800;cursor:pointer}.error-state button.skip{margin-top:8px;background:transparent;color:#555}.market-summary{display:grid;grid-template-columns:110px 1fr auto;align-items:start;gap:20px;border:1px solid #e0e1e4;border-radius:12px;background:#fff;padding:18px}.market-summary>div{display:grid;gap:3px}.market-summary span{color:#777b83;font-size:.7rem;font-weight:750}.market-summary strong{font-size:1.05rem}.market-summary p{margin:0;color:#4f535a;font-size:.84rem;line-height:1.65}.market-summary button{border:0;background:transparent;color:#555a62;font-weight:800;cursor:pointer}.section-block{margin-top:14px;border:1px solid #e0e1e4;border-radius:12px;background:#fff;padding:20px}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:16px}.section-heading>div{display:grid;gap:3px}.section-heading h2{margin:0;font-size:1rem}.section-heading small{color:#858991;font-size:.72rem}.section-heading>p{margin:0;color:#858991;font-size:.74rem}.edit-market{border:1px solid #d9dade;border-radius:8px;background:#fff;color:#35383e;padding:8px 11px;font:inherit;font-size:.75rem;font-weight:800;cursor:pointer}.opportunity-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.opportunity-grid article{display:grid;align-content:start;gap:11px;border:1px solid transparent;border-radius:10px;padding:16px}.opportunity-grid article:nth-child(1){border-color:#eadba5;background:#fff8df}.opportunity-grid article:nth-child(2){border-color:#cddfec;background:#eef7fc}.opportunity-grid article:nth-child(3){border-color:#cce3d5;background:#eef8f1}.priority-row{display:flex;align-items:center;justify-content:space-between}.opportunity-grid b{width:23px;height:23px;display:grid;place-items:center;border-radius:50%;color:#fff;font-size:.68rem}.opportunity-grid article:nth-child(1) b{background:#8b6a00}.opportunity-grid article:nth-child(2) b{background:#356b8b}.opportunity-grid article:nth-child(3) b{background:#397552}.priority-row span{display:flex;gap:4px}.priority-row button{width:28px;height:28px;border:1px solid rgba(40,42,47,.16);border-radius:7px;background:rgba(255,255,255,.8);color:#34373d;cursor:pointer}.priority-row button:disabled{opacity:.3;cursor:default}.opportunity-grid h3{margin:0;font-size:clamp(1.05rem,2vw,1.3rem);line-height:1.32;letter-spacing:-.015em}.opportunity-grid p{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:4;margin:0;color:#4d5258;font-size:.76rem;line-height:1.55}.opportunity-grid textarea,.competitor-messages textarea{width:100%;box-sizing:border-box;border:1px solid #d6d8dc;border-radius:8px;background:#fff;color:#25272b;padding:10px;font:inherit;font-size:.76rem;line-height:1.5;resize:vertical}.competitor-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.competitor-grid article{display:grid;grid-template-columns:72px minmax(0,1fr);align-content:start;gap:12px;border:1px solid #e6e7e9;border-radius:10px;padding:12px}.competitor-grid img,.image-fallback{width:72px;height:72px;border-radius:8px;background:#f2f2f3;object-fit:contain}.image-fallback{display:grid;place-items:center;color:#999;font-size:.67rem;text-align:center}.competitor-grid small{color:#737780;font-size:.68rem;font-weight:750}.competitor-grid h3{margin:3px 0 7px;font-size:.86rem;line-height:1.35}.competitor-messages{grid-column:1/-1;display:grid;gap:8px}.competitor-messages p{margin:0;border-top:1px solid #ececef;padding-top:9px;color:#36393f;font-size:.8rem;font-weight:700;line-height:1.5}.competitor-messages p span{display:block;margin-bottom:4px;color:#8a8d94;font-size:.64rem;font-weight:800}.competitor-grid a{grid-column:1/-1;color:#555a62;font-size:.7rem;font-weight:800}.empty{border-radius:10px;background:#f5f5f6;color:#777b83;padding:16px}.comments{padding:0;overflow:hidden}.comments>summary{display:flex;align-items:center;padding:16px 18px;cursor:pointer;list-style:none}.comments>summary::-webkit-details-marker{display:none}.comments>summary span{display:grid;gap:3px}.comments>summary strong{font-size:.88rem}.comments>summary small{color:#81858c;font-size:.72rem}.comments>summary::after{content:'+';margin-left:auto;color:#777b83;font-size:1.1rem}.comments[open]>summary::after{content:'−'}.comments .comment-status{border-top:1px solid #ececef;border-radius:0;background:#fafafa;padding:15px 18px}.comment-status p{margin:0;color:#666b73;font-size:.8rem}.theme-list{display:grid;gap:8px;padding:0 18px 18px}.theme-list a{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;border:1px solid #e5e6e8;border-radius:9px;color:#34373d;padding:10px;text-decoration:none;font-size:.78rem}.theme-list span{border-radius:999px;background:#efeff1;padding:4px 7px;font-size:.65rem;font-weight:800}.theme-list b{color:#999}.sources{margin:14px 0;border:1px solid #e0e1e4;border-radius:12px;background:#fff;padding:15px 18px}.sources summary{font-size:.82rem;font-weight:800;cursor:pointer}.sources a{display:block;margin-top:10px;color:#555a62;font-size:.76rem}.sources a span{margin-right:8px;border-radius:999px;background:#f0f0f2;padding:3px 7px;font-size:.64rem}.market-shell>footer{position:sticky;bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:20px;border:1px solid #dedfe2;border-radius:13px;background:rgba(255,255,255,.97);color:#202126;padding:16px 18px;box-shadow:0 10px 28px rgba(20,21,24,.1)}.market-shell>footer div{display:grid;gap:4px}.market-shell>footer span{color:#737780;font-size:.76rem}.market-shell>footer button{min-height:44px;border:0;border-radius:9px;background:#202126;color:#fff;padding:0 17px;font:inherit;font-weight:850;cursor:pointer}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:900px){.market-page{grid-template-columns:1fr}.market-page .sidebar{display:none}.opportunity-grid,.competitor-grid{grid-template-columns:1fr 1fr}}@media(max-width:680px){.market-shell{padding:24px 16px 90px}.market-summary{grid-template-columns:1fr}.opportunity-grid,.competitor-grid{grid-template-columns:1fr}.market-shell>footer{align-items:stretch;flex-direction:column}.market-shell>footer button{width:100%}}
`
