'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { CampaignProgress } from '@/components/campaign/CampaignProgress'
import { SoonIcon, type SoonIconName } from '@/components/ui/SoonIcon'

type Angle = { id: string; name: string; hook: string; audience_tension: string; promise: string; proof_mechanism: string; rationale: string; funnel_stage: string; recommended_formats: string[]; strategy_refs: Array<{ id?: string; role?: string }>; claim_risks: string[]; primary_metric: string; status: 'proposed' | 'approved' | 'rejected' }
type PackItem = { assetType: string; label: string; quantity: number; angleAllocation: string; purpose: string }
type Manifest = { summary?: string; estimatedMinutes?: number; items?: PackItem[]; status?: string }
type EggCreator = { username: string; display_name?: string; bio?: string; content_categories?: string[]; ai_profile_summary?: string }

const formatLabels: Record<string,string> = { short_video: '短影片', carousel: '輪播貼文', single_image: '單張圖片', story_series: '限時動態' }
const funnelLabels: Record<string,string> = { top: '吸引新客', middle: '建立考慮', bottom: '推動轉換' }
const funnelIcons: Record<string,SoonIconName> = { top: 'target', middle: 'ideas', bottom: 'performance' }
type CreatorRecommendation = { level: 'low' | 'medium' | 'high'; label: string; creatorType: string; count: string; reason: string }

function creatorRecommendation(angle: Angle): CreatorRecommendation {
  const strategyIds = (angle.strategy_refs || []).map((ref) => ref.id || '').join(' ')
  const context = `${angle.name} ${angle.rationale} ${strategyIds}`.toLowerCase()
  const hasVideo = (angle.recommended_formats || []).includes('short_video')
  const needsHumanStory = /routine|storytelling|lifestyle|social-proof|ugc|體驗|日常|共鳴|真人|生活/.test(context)
  const isInformationLed = /product-education|authority|price-anchor|原料|價格|教育|資訊/.test(context)

  if (hasVideo && needsHumanStory) return { level: 'high', label: '建議配對 Creator', creatorType: /素|vegan/.test(context) ? '全素生活／男性健康內容 Creator' : '男性生活／體驗型 Creator', count: '先測試 2 位微型 Creator', reason: '呢個方向依賴真人情境、語氣同生活共鳴；只由品牌帳戶發布，較難建立自然信任及接觸新受眾。' }
  if (hasVideo) return { level: 'medium', label: 'Creator 會提升表現', creatorType: isInformationLed ? '產品解說／理性評測型 Creator' : '相關生活內容 Creator', count: '先測試 1 位 Creator', reason: '品牌可以先自行製作，但由合適 Creator 演繹短影片，有機會提升停留率及帶來品牌現有受眾以外嘅觸及。' }
  return { level: 'low', label: '品牌自行製作即可', creatorType: '暫時毋須配對 Creator', count: '先用品牌帳戶測試', reason: '呢個方向以產品資訊及視覺表達為主，現階段可先低成本驗證訊息，等有初步成效後再決定是否放大。' }
}

function matchingCreators(angle: Angle, creators: EggCreator[]) {
  const angleText = `${angle.name} ${angle.audience_tension} ${angle.rationale}`.toLowerCase()
  const needsHealth = /健康|保健|男性|健身|營養|supplement|health|fitness/.test(angleText)
  const needsVegan = /全素|素食|vegan/.test(angleText)
  return creators.filter((creator) => {
    const profile = `${creator.display_name || ''} ${creator.bio || ''} ${(creator.content_categories || []).join(' ')} ${creator.ai_profile_summary || ''}`.toLowerCase()
    if (needsVegan) return /全素|素食|vegan|健康|wellness/.test(profile)
    if (needsHealth) return /健康|保健|健身|營養|男性|health|fitness|wellness/.test(profile)
    return true
  })
}

export default function CampaignAnglesPage() {
  const router = useRouter(); const params = useParams(); const campaignId = typeof params.campaignId === 'string' ? params.campaignId : ''
  const [productName, setProductName] = useState('')
  const [angles, setAngles] = useState<Angle[]>([])
  const [manifest, setManifest] = useState<Manifest>({})
  const [status, setStatus] = useState<'loading'|'generating'|'ready'|'saving'|'done'|'error'>('loading')
  const [message, setMessage] = useState('正在準備產品及市場資料…')
  const [eggCreators, setEggCreators] = useState<EggCreator[] | null>(null)
  const generatingRef = useRef(false)
  const appliedRecommendationRef = useRef(false)

  useEffect(() => { fetch('/api/egg-creators', { cache: 'no-store' }).then((response) => response.json()).then((payload) => setEggCreators(Array.isArray(payload.creators) ? payload.creators : [])).catch(() => setEggCreators([])) }, [])

  const generate = useCallback(async () => {
    if (generatingRef.current) return
    generatingRef.current = true
    setStatus('generating'); setMessage('SOON 正在選擇最適合的策略組合及可測試角度…')
    try {
      const response = await fetch(`/api/product-campaigns/${campaignId}/angles`, { method: 'POST' }); const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.detail || result?.error || '生成失敗')
      setAngles(result.angles || []); setManifest(result.manifest || {}); setStatus('ready'); setMessage('SOON 已選出適合第一輪測試的方向。')
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : '生成失敗') }
    finally { generatingRef.current = false }
  }, [campaignId])

  useEffect(() => {
    if (!campaignId) return
    router.prefetch(`/onboarding/product-campaign/${campaignId}/creatives`)
    let cancelled = false
    async function load() {
      try {
        const response = await fetch(`/api/product-campaigns/${campaignId}/angles`, { cache: 'no-store' }); const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result?.detail || result?.error || '載入失敗')
        if (cancelled) return
        setProductName(result?.product?.name || result?.campaign?.name || '')
        if (Array.isArray(result.angles) && result.angles.length) { setAngles(result.angles); setManifest(result.manifest || {}); setStatus(result.manifest?.status === 'approved' ? 'done' : 'ready'); setMessage('SOON 已選出適合第一輪測試的方向。') } else await generate()
      } catch (error) { if (!cancelled) { setStatus('error'); setMessage(error instanceof Error ? error.message : '載入失敗') } }
    }
    void load(); return () => { cancelled = true }
  }, [campaignId, generate, router])

  const selectedCount = useMemo(() => angles.filter((angle) => angle.status === 'approved').length, [angles])
  const recommendedIds = useMemo(() => {
    const ranked = [...angles].sort((a, b) => (a.claim_risks?.length || 0) - (b.claim_risks?.length || 0))
    const awareness = ranked.find((angle) => angle.funnel_stage === 'top')
    const conversion = ranked.find((angle) => angle.funnel_stage === 'bottom') || ranked.find((angle) => angle.funnel_stage === 'middle')
    return Array.from(new Set([awareness?.id, conversion?.id].filter((id): id is string => Boolean(id)))).slice(0, 2)
  }, [angles])
  const totalAssets = useMemo(() => (manifest.items || []).reduce((total, item) => total + item.quantity, 0), [manifest.items])
  const approximatePerAngle = selectedCount ? Math.max(1, Math.floor(totalAssets / selectedCount)) : 0

  useEffect(() => {
    if (appliedRecommendationRef.current || status !== 'ready' || !recommendedIds.length || angles.some((angle) => angle.status !== 'proposed')) return
    appliedRecommendationRef.current = true
    setAngles((current) => current.map((angle) => ({ ...angle, status: recommendedIds.includes(angle.id) ? 'approved' : angle.status })))
  }, [angles, recommendedIds, status])

  function applyRecommended() {
    appliedRecommendationRef.current = true
    setStatus('ready')
    setAngles((current) => current.map((angle) => ({ ...angle, status: recommendedIds.includes(angle.id) ? 'approved' : 'proposed' })))
  }
  function toggle(id: string) { setStatus('ready'); setAngles((current) => current.map((angle) => angle.id === id ? { ...angle, status: angle.status === 'approved' ? 'proposed' : 'approved' } : angle)) }
  function reject(id: string) { setStatus('ready'); setAngles((current) => current.map((angle) => angle.id === id ? { ...angle, status: 'rejected' } : angle)) }

  async function confirm() {
    if (!selectedCount) { setMessage('請至少選擇一個宣傳方向。'); return }
    setStatus('saving'); setMessage('正在確認宣傳方向及內容製作清單…')
    try {
      const response = await fetch(`/api/product-campaigns/${campaignId}/angles`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decisions: angles.map(({ id, status }) => ({ id, status })) }) }); const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.detail || result?.error || '儲存失敗')
      setAngles(result.angles || angles); setManifest(result.manifest || manifest); setStatus('done'); setMessage('宣傳方向及內容製作清單已確認。')
      router.push(`/onboarding/product-campaign/${campaignId}/creatives`)
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : '儲存失敗') }
  }

  const busy = status === 'loading' || status === 'generating' || status === 'saving'
  return <main className="angles-page"><DashboardSidebar activeItem="宣傳包" /><section className="angles-shell">
    <CampaignProgress current={4}/>
    <button className="back" type="button" onClick={() => router.push(`/onboarding/product-campaign/${campaignId}/market`)}><SoonIcon name="arrow-right" size={15} style={{ transform: 'rotate(180deg)' }}/>返回市場情報</button>
    <header><small>宣傳方向</small><h1>{productName || '你的宣傳活動'}</h1><p>已按建議測試次序排列，第一輪建議集中測試兩個方向。</p></header>
    {busy ? <section className="loading-card" aria-live="polite"><i/><h2>{status === 'loading' ? '正在進入宣傳方向' : status === 'saving' ? '正在確認宣傳方向' : '正在建立宣傳方向'}</h2><p>{message}</p></section> : <>
      <div className={`notice ${status === 'error' ? 'error' : ''}`}><span>{message}</span><button type="button" onClick={() => void generate()}>重新生成全部</button></div>
      <section className="recommendation-panel"><div className="recommendation-icon"><SoonIcon name="check" size={17}/></div><div><span>建議組合</span><strong>先測試兩個互補方向</strong><p>一個吸引新客，一個推動轉換，更容易比較成效。</p></div><button type="button" onClick={applyRecommended}>選擇建議組合</button></section>
      <section className="angle-grid">{angles.map((angle, index) => { const creator = creatorRecommendation(angle); const matches = matchingCreators(angle, eggCreators || []); const riskLevel = (angle.claim_risks?.length || 0) > 1 ? '較高' : (angle.claim_risks?.length || 0) === 1 ? '需要留意' : '較低'; const production = creator.level === 'high' ? '真人情境製作' : creator.level === 'medium' ? '建議加入短影片' : '品牌素材即可'; return <article className={`${angle.status} angle-card rank-${index + 1}`} key={angle.id}>
        <div className="angle-top"><span className="rank-label"><i><SoonIcon name={funnelIcons[angle.funnel_stage] || 'target'} size={17}/></i><span><small>建議次序</small><strong>{index + 1}</strong></span></span><div>{recommendedIds.includes(angle.id) ? <b>建議首輪測試</b> : null}<em>{funnelLabels[angle.funnel_stage] || angle.funnel_stage}</em></div></div><h2>{angle.name}</h2><blockquote>“{angle.hook}”</blockquote>
        <div className="quick-facts"><div><span><SoonIcon name="target" size={13}/>作用</span><strong>{funnelLabels[angle.funnel_stage] || angle.funnel_stage}</strong></div><div><span><SoonIcon name="warning" size={13}/>聲稱風險</span><strong>{riskLevel}</strong></div><div><span><SoonIcon name="create" size={13}/>製作要求</span><strong>{production}</strong></div></div>
        <details className="angle-details"><summary>查看方向詳情</summary><dl><div><dt>受眾需要</dt><dd>{angle.audience_tension}</dd></div><div><dt>核心承諾</dt><dd>{angle.promise}</dd></div><div><dt>支持證據</dt><dd>{angle.proof_mechanism || '需要以已確認資料支持'}</dd></div></dl><div className="tag-group"><b>建議格式</b><div className="tags formats">{(angle.recommended_formats || []).map((format) => <span key={format}>{formatLabels[format] || format}</span>)}</div></div>{angle.claim_risks?.length ? <p className="risk"><strong>注意：</strong>{angle.claim_risks.join('；')}</p> : null}<div className="why"><b>為何值得測試</b><p>{angle.rationale}</p></div><aside className={`creator-fit ${creator.level}`}><div className="creator-fit-head"><span>Creator 建議</span><strong>{creator.label}</strong></div><p>{creator.reason}</p><div className="creator-fit-meta"><span>{creator.creatorType}</span><span>{creator.count}</span></div>{creator.level !== 'low' ? eggCreators === null ? <span className="creator-availability">正在檢查 Egg 現有人選…</span> : matches.length ? <div className="creator-matches">{matches.map((match) => <a key={match.username} href={`https://egg.sooncreator.network/${match.username}/mediakit`} target="_blank" rel="noreferrer">查看 {match.display_name || match.username} →</a>)}</div> : <div className="creator-empty"><strong>目前 Egg 暫未有合適 Creator</strong><span>現時只會評估 egg.soon 同 renee，不會顯示虛構人選。</span></div> : null}</aside></details>
        <footer><button className="reject" type="button" onClick={() => reject(angle.id)}>{angle.status === 'rejected' ? '已略過' : '略過'}</button><button className="select" type="button" onClick={() => toggle(angle.id)}>{angle.status === 'approved' ? '✓ 已選擇' : '選擇此方向'}</button></footer>
      </article>})}</section>
      <section className="pack"><div className="pack-head"><div><small>SOON 將會製作</small><h2>{totalAssets} 項內容</h2><p>{selectedCount ? `已按 ${selectedCount} 個宣傳方向分配，每個方向約 ${approximatePerAngle} 項。` : '選擇方向後，SOON 會自動分配內容。'}</p></div><div className="pack-meta"><b>約 {manifest.estimatedMinutes || 5} 分鐘</b><span>開始回傳</span></div></div><div className="pack-grid">{(manifest.items || []).map((item) => <article key={item.assetType}><strong>{item.quantity}</strong><span>{item.label}</span></article>)}</div><details className="pack-details"><summary>查看製作詳情</summary><div>{(manifest.items || []).map((item) => <article key={item.assetType}><b>{item.label}</b><p>{item.purpose.replace(/\bangles?\b/gi, '宣傳方向')}</p></article>)}</div><small>選擇更多方向不會增加本輪內容總數。</small></details></section>
      <footer className="confirm-bar"><div><strong>已選擇 {selectedCount} 個宣傳方向</strong><span>{selectedCount ? '確認後會直接進入內容製作清單。' : '請至少選擇一個方向先繼續。'}</span></div>{status === 'done' ? <button type="button" onClick={() => router.push(`/onboarding/product-campaign/${campaignId}/creatives`)}>前往內容製作 →</button> : <button type="button" disabled={!selectedCount} onClick={() => void confirm()}>確認方向並繼續 →</button>}</footer>
    </>}
  </section><style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} /></main>
}

const styles = `
  .angles-page{min-height:100vh;display:grid;grid-template-columns:240px minmax(0,1fr);background:#f5f5f6;color:#202126}.angles-shell{min-width:0;padding:34px clamp(18px,4vw,54px) 80px}.back{border:0;background:transparent;color:#737780;padding:0;font:inherit;cursor:pointer}.angles-shell>header{max-width:900px;margin:30px auto 25px}.angles-shell>header small,.pack-head small{color:#8a7323;font-size:12px;font-weight:850;letter-spacing:.15em}.angles-shell>header h1{margin:7px 0;font-size:clamp(2.2rem,5vw,4rem);line-height:1;letter-spacing:-.05em}.angles-shell>header p,.pack-head p{margin:0;color:#757981}.loading-card{max-width:900px;min-height:360px;display:grid;place-items:center;align-content:center;margin:auto;border:1px solid #e0e1e4;border-radius:22px;background:#fff;text-align:center}.loading-card i{width:36px;height:36px;border:3px solid #e5e5e5;border-top-color:#202126;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.loading-card h2{margin:18px 0 5px}.loading-card p{margin:0;color:#7b7f87}.notice{max-width:1160px;display:flex;justify-content:space-between;gap:15px;margin:0 auto 14px;border:1px solid #d8e7dc;border-radius:12px;background:#f0f8f2;color:#286b3d;padding:12px 14px;font-size:13px;font-weight:700}.notice.error{border-color:#efcccc;background:#fff1f1;color:#993737}.notice button{border:0;background:transparent;color:inherit;font:inherit;font-weight:850;cursor:pointer}.recommendation-panel{max-width:1160px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:24px;margin:0 auto 14px;border-radius:17px;background:#202126;color:#fff;padding:18px 20px}.recommendation-panel>div{display:grid;gap:3px}.recommendation-panel span{color:#f6d260;font-size:10px;font-weight:900;letter-spacing:.13em}.recommendation-panel strong{font-size:17px}.recommendation-panel p{margin:0;color:#bec1c7;font-size:12px;line-height:1.45}.recommendation-panel button{flex:0 0 auto;min-height:40px;border:0;border-radius:10px;background:#f6d260;color:#202126;padding:0 14px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.angle-grid{max-width:1160px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:auto}.angle-card{display:flex;min-width:0;flex-direction:column;border:1px solid #dedfe2;border-radius:16px;background:#fff;padding:16px;transition:.16s}.angle-card.approved{border:2px solid #202126;background:#fff;box-shadow:0 8px 22px rgba(32,33,38,.09)}.angle-card.rejected{opacity:.48}.angle-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.angle-top>div{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:5px}.angle-top span{color:#8a7323;font-size:10px;font-weight:900;letter-spacing:.11em}.angle-top b{border-radius:999px;background:#f6d260;color:#202126;padding:5px 7px;font-size:8px;letter-spacing:.03em}.angle-top em{border-radius:999px;background:#f0f1f3;color:#555961;padding:5px 7px;font-size:9px;font-style:normal;font-weight:700}.angle-card.approved .angle-top em{background:#f6d260;color:#202126}.angle-card h2{margin:13px 0 9px;font-size:1.08rem;line-height:1.32}.angle-card blockquote{margin:0;border-left:3px solid #f6d260;background:#fffaf0;padding:10px 11px;font-size:.82rem;font-weight:700;line-height:1.5}.quick-facts{display:grid;grid-template-columns:1fr;gap:5px;margin-top:11px}.quick-facts div{display:flex;align-items:center;justify-content:space-between;gap:7px;border-radius:8px;background:#f5f5f6;padding:7px 8px}.quick-facts span{color:#7a7e86;font-size:8px;font-weight:800}.quick-facts strong{font-size:9px;line-height:1.35;text-align:right}.angle-details{margin-top:11px;border-top:1px solid #e9e9ec;padding-top:10px}.angle-details summary{display:flex;align-items:center;justify-content:space-between;color:#63676f;font-size:10px;font-weight:850;cursor:pointer;list-style:none}.angle-details summary::-webkit-details-marker{display:none}.angle-details summary:after{content:'＋';color:#202126;font-size:14px}.angle-details[open] summary:after{content:'−'}.angle-card dl{display:grid;gap:11px;margin:16px 0}.angle-card dl div{display:grid;grid-template-columns:1fr;gap:3px}.angle-card dt{color:#6f737b;font-size:10px;font-weight:850}.angle-card dd{margin:0;font-size:11px;line-height:1.55}.tag-group{display:grid;grid-template-columns:1fr;align-items:start;gap:6px;margin-top:8px}.tag-group>b{color:#767a82;font-size:10px}.tags{display:flex;flex-wrap:wrap;gap:5px}.tags span{border-radius:999px;background:#f1f2f4;color:#565a62;padding:5px 8px;font-size:9px}.tags.formats span{background:#f0f1f3;color:#4f535a}.risk{border-radius:9px;background:#fff3d7;color:#76520a;padding:9px;font-size:10px;line-height:1.5}.risk strong{margin-right:4px}.why{margin:4px 0 0;padding-top:11px;border-top:1px solid #ececef}.why>b{font-size:10px}.why p{margin:5px 0 0;color:#676b73;font-size:10px;line-height:1.55}.angle-card footer{display:flex;gap:6px;margin-top:auto;padding-top:13px}.angle-card footer button{min-height:39px;border-radius:9px;font:inherit;font-size:10px;font-weight:800;cursor:pointer}.reject{border:1px solid #ddd;background:#fff;color:#777}.select{flex:1;border:0;background:#202126;color:#fff}.angle-card.approved .select{background:#202126}.pack{max-width:1160px;margin:18px auto 0;border:1px solid #dedfe2;border-radius:20px;background:#fff;padding:24px}.pack-head{display:flex;justify-content:space-between;gap:20px}.pack-head h2{margin:6px 0}.pack-head>b{height:fit-content;border-radius:999px;background:#fff4cf;color:#725a0c;padding:8px 11px;font-size:12px}.pack-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:20px}.pack-grid article{display:flex;align-items:center;gap:11px;border-radius:13px;background:#f5f5f6;padding:13px}.pack-grid article>strong{font-size:1.65rem}.pack-grid article div{display:grid;gap:3px}.pack-grid article b{font-size:12px}.pack-grid article span{color:#686c74;font-size:10px;line-height:1.4}.confirm-bar{position:sticky;bottom:16px;z-index:5;max-width:1160px;display:flex;align-items:center;justify-content:space-between;gap:20px;box-sizing:border-box;margin:18px auto 0;border-radius:18px;background:rgba(32,33,38,.97);color:#fff;padding:18px 22px;box-shadow:0 12px 34px rgba(20,21,24,.2);backdrop-filter:blur(12px)}.confirm-bar div{display:grid;gap:4px}.confirm-bar span{color:#c4c7cd;font-size:12px}.confirm-bar button{min-height:46px;border:0;border-radius:11px;background:#f6d260;color:#202126;padding:0 18px;font:inherit;font-weight:850;cursor:pointer}.confirm-bar button:disabled{opacity:.45;cursor:not-allowed}@media(max-width:1200px){.angle-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.quick-facts{grid-template-columns:repeat(3,minmax(0,1fr))}.quick-facts div{display:grid;align-content:start;justify-content:initial}.quick-facts strong{text-align:left}.pack-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:900px){.angles-page{grid-template-columns:1fr}.angles-page .sidebar{display:none}}@media(max-width:680px){.recommendation-panel,.pack-head,.confirm-bar{align-items:stretch;flex-direction:column}.recommendation-panel button{width:100%}.angle-grid,.pack-grid{grid-template-columns:1fr}.quick-facts{grid-template-columns:repeat(3,minmax(0,1fr))}.confirm-bar{position:static}.confirm-bar button{width:100%}}
  .creator-fit{display:grid;gap:9px;margin-top:14px;border:1px solid #dfe1e5;border-radius:13px;background:#f7f7f8;padding:13px}.creator-fit.medium{border-color:#d9d2b7;background:#fffdf5}.creator-fit.high{border-color:#d8c369;background:#fff9e8}.creator-fit-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.creator-fit-head span{color:#737780;font-size:10px;font-weight:900;letter-spacing:.08em}.creator-fit-head strong{font-size:12px}.creator-fit p{margin:0;color:#62666e;font-size:11px;line-height:1.5}.creator-fit-meta{display:flex;flex-wrap:wrap;gap:5px}.creator-fit-meta span{border-radius:999px;background:#fff;color:#555961;padding:5px 8px;font-size:10px}.creator-fit a{width:fit-content;color:#70590c;font-size:11px;font-weight:850;text-decoration:none}.creator-fit a:hover{text-decoration:underline}.creator-availability{color:#777b83;font-size:11px}.creator-matches{display:flex;flex-wrap:wrap;gap:10px}.creator-empty{display:grid;gap:3px;border-top:1px solid #e8dcae;padding-top:9px}.creator-empty strong{color:#7a570b;font-size:11px}.creator-empty span{color:#77705e;font-size:10px;line-height:1.45}
  .pack-head{align-items:center}.pack-head h2{margin:5px 0 4px;font-size:1.65rem}.pack-meta{display:grid;justify-items:end;gap:2px}.pack-meta b{border-radius:999px;background:#f6d260;color:#202126;padding:8px 11px;font-size:12px}.pack-meta span{color:#858991;font-size:10px}.pack-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:18px}.pack-grid article{display:grid;justify-items:center;gap:4px;padding:13px 8px;text-align:center}.pack-grid article>strong{font-size:1.45rem}.pack-grid article>span{color:#555961;font-size:10px;font-weight:800;line-height:1.35}.pack-details{margin-top:14px;border-top:1px solid #e8e9eb;padding-top:13px}.pack-details>summary{display:flex;align-items:center;justify-content:space-between;color:#62666e;font-size:11px;font-weight:850;cursor:pointer;list-style:none}.pack-details>summary::-webkit-details-marker{display:none}.pack-details>summary:after{content:'＋';color:#202126;font-size:15px}.pack-details[open]>summary:after{content:'−'}.pack-details>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.pack-details article{border-radius:10px;background:#f7f7f8;padding:11px}.pack-details article b{font-size:11px}.pack-details article p{margin:4px 0 0;color:#686c74;font-size:10px;line-height:1.5}.pack-details>small{display:block;margin-top:10px;color:#858991;font-size:10px}@media(max-width:1200px){.pack-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:680px){.pack-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pack-meta{justify-items:start}.pack-details>div{grid-template-columns:1fr}}
  .recommendation-panel{display:grid;grid-template-columns:auto 1fr auto;border:1px solid #dfe1e5;border-radius:13px;background:#fff;color:#202126;box-shadow:none}.recommendation-panel>.recommendation-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:#202126;color:#fff;font-weight:900}.recommendation-panel>div:nth-child(2){display:grid;gap:3px}.recommendation-panel span{color:#747880;letter-spacing:.05em}.recommendation-panel p{color:#737780}.recommendation-panel button{border:1px solid #d8dade;border-radius:9px;background:#f4f4f5;color:#202126}
  .angle-card{position:relative;overflow:hidden;border-width:1px;box-shadow:none}.angle-card.rank-1{--angle-accent:#a87800;--angle-tint:#fff7d9;--angle-line:#e8d184;border-color:#e2cd88}.angle-card.rank-2{--angle-accent:#356f95;--angle-tint:#edf7fd;--angle-line:#bfdbea;border-color:#c8ddea}.angle-card.rank-3{--angle-accent:#397957;--angle-tint:#eef8f1;--angle-line:#c4dfce;border-color:#c9dfd1}.angle-card.rank-4{--angle-accent:#75529a;--angle-tint:#f6f0fb;--angle-line:#d9c7e8;border-color:#dacde6}.angle-card:before{content:'';position:absolute;inset:0 0 auto;height:5px;background:var(--angle-accent)}.angle-card.approved{border-color:var(--angle-accent);background:var(--angle-tint);box-shadow:0 7px 18px rgba(32,33,38,.07)}
  .angle-top>.rank-label{display:flex;align-items:center;gap:8px;color:var(--angle-accent);letter-spacing:0}.angle-top>.rank-label>i{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:var(--angle-tint);color:var(--angle-accent);font-size:18px;font-style:normal}.angle-top>.rank-label>span{display:grid;gap:0;color:inherit;letter-spacing:0}.angle-top>.rank-label small{color:#858991;font-size:8px;font-weight:800;letter-spacing:.04em}.angle-top>.rank-label strong{color:var(--angle-accent);font-size:18px;line-height:1}.angle-top b{background:var(--angle-accent);color:#fff}.angle-card.approved .angle-top em{background:var(--angle-accent);color:#fff}.angle-card blockquote{border-left-color:var(--angle-accent);background:var(--angle-tint)}.angle-card .quick-facts div{background:rgba(255,255,255,.72)}.angle-card .select{background:var(--angle-accent)}
  @media(max-width:680px){.recommendation-panel{grid-template-columns:auto 1fr}.recommendation-panel button{grid-column:1/-1}}
`
