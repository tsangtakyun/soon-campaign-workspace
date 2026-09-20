'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { SoonIcon } from '@/components/ui/SoonIcon'
import { resolveActiveWorkspace, WORKSPACE_CHANGED_EVENT } from '@/lib/workspace-client'

type WeekProgress = { total: number; ready: number; approved: number; changesRequested: number; scheduled: number; published: number }
type Campaign = {
  id: string; name: string; status: string; generation_status?: string; created_at: string; updated_at?: string
  imageUrl?: string | null; product?: { name?: string; kind?: string } | Array<{ name?: string; kind?: string }> | null
  progress: { total: number; ready: number; approved: number; changesRequested: number; pendingApproval: number; scheduled: number; published: number; weeks: Record<string, WeekProgress> }
}

function productName(campaign: Campaign) {
  const product = Array.isArray(campaign.product) ? campaign.product[0] : campaign.product
  return product?.name || campaign.name.replace(/ Campaign$/i, '')
}

function statusFor(campaign: Campaign) {
  const p = campaign.progress
  if (p.published > 0) return { label: '已發布', tone: 'published' }
  if (p.scheduled > 0) return { label: '已排程', tone: 'scheduled' }
  if (p.changesRequested > 0) return { label: '需要修改', tone: 'attention' }
  if (p.pendingApproval > 0) return { label: '待審批', tone: 'review' }
  if (p.total > 0 && p.approved === p.total) return { label: '已批准', tone: 'approved' }
  if (p.ready > 0 || campaign.generation_status?.includes('generation')) return { label: '製作中', tone: 'working' }
  return { label: '尚未製作', tone: 'draft' }
}

function nextHref(campaign: Campaign) {
  const p = campaign.progress
  const reviewWeek = Object.entries(p.weeks).find(([, week]) => week.ready > week.approved)
  if (p.pendingApproval || p.changesRequested) return `/onboarding/product-campaign/${campaign.id}/delivery?week=${reviewWeek?.[0] || 1}`
  const nextWeek = [1, 2, 3, 4].find((week) => !p.weeks[String(week)]?.total)
  if (p.total > 0 && nextWeek) return `/onboarding/product-campaign/${campaign.id}/creatives?week=${nextWeek}`
  if (!p.total) return `/onboarding/product-campaign/${campaign.id}/understanding`
  return `/onboarding/product-campaign/${campaign.id}/delivery?week=1`
}

function nextLabel(campaign: Campaign) {
  if (campaign.progress.changesRequested) return '處理修改'
  if (campaign.progress.pendingApproval) return `審批 ${campaign.progress.pendingApproval} 項內容`
  if (!campaign.progress.total) return '繼續建立計劃'
  if (campaign.progress.approved === campaign.progress.total) return '查看宣傳包'
  return '繼續製作'
}

export default function CampaignCentrePage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'attention' | 'active' | 'done'>('all')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { workspaceId } = await resolveActiveWorkspace()
      if (!workspaceId) throw new Error('找不到目前工作台')
      const response = await fetch(`/api/product-campaigns?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.detail || payload.error || '未能載入宣傳包')
      setCampaigns(Array.isArray(payload.campaigns) ? payload.campaigns : [])
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : '未能載入宣傳包') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load(); const reload = () => void load(); window.addEventListener(WORKSPACE_CHANGED_EVENT, reload); return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, reload) }, [load])
  const visible = useMemo(() => campaigns.filter((campaign) => {
    const status = statusFor(campaign).tone
    if (filter === 'attention') return status === 'review' || status === 'attention'
    if (filter === 'active') return status === 'working' || status === 'draft'
    if (filter === 'done') return status === 'approved' || status === 'scheduled' || status === 'published'
    return true
  }), [campaigns, filter])
  const attention = campaigns.reduce((sum, campaign) => sum + campaign.progress.pendingApproval + campaign.progress.changesRequested, 0)

  return <main className="campaign-centre-page"><DashboardSidebar activeItem="宣傳包"/><section className="campaign-centre-shell">
    <header><div><small>宣傳包</small><h1>所有宣傳活動，一眼掌握</h1><p>查看每個活動目前進度，並直接處理下一步。</p></div><button onClick={() => router.push('/onboarding/product-campaign')} type="button"><SoonIcon name="plus" size={17}/>建立宣傳包</button></header>
    <section className="centre-summary"><article><SoonIcon name="campaign"/><span><b>{campaigns.length}</b>個宣傳活動</span></article><article className={attention ? 'needs-action' : ''}><SoonIcon name="check"/><span><b>{attention}</b>項需要處理</span></article><article><SoonIcon name="calendar"/><span><b>{campaigns.reduce((sum, campaign) => sum + campaign.progress.scheduled, 0)}</b>項已排程</span></article></section>
    <nav className="campaign-filters" aria-label="篩選宣傳活動">{([['all','全部'],['attention',`需要處理${attention ? ` ${attention}` : ''}`],['active','進行中'],['done','已完成']] as const).map(([value,label]) => <button className={filter === value ? 'active' : ''} key={value} onClick={() => setFilter(value)} type="button">{label}</button>)}</nav>
    {loading ? <div className="centre-state"><i/><strong>正在整理宣傳活動…</strong></div> : error ? <div className="centre-state error"><strong>{error}</strong><button onClick={() => void load()} type="button">重新載入</button></div> : !visible.length ? <div className="centre-empty"><SoonIcon name="campaign" size={30}/><h2>{campaigns.length ? '這個分類暫時沒有宣傳活動' : '建立第一個宣傳包'}</h2><p>{campaigns.length ? '選擇其他分類查看現有活動。' : '上傳產品或服務相片，SOON 會整理宣傳方向及內容計劃。'}</p>{!campaigns.length ? <button onClick={() => router.push('/onboarding/product-campaign')} type="button">開始建立</button> : null}</div> : <section className="campaign-list">{visible.map((campaign) => {
      const status = statusFor(campaign); const weeks = [1,2,3,4]
      return <article className="campaign-row" key={campaign.id}>
        <div className="campaign-identity">{campaign.imageUrl ? <img src={campaign.imageUrl} alt=""/> : <span><SoonIcon name="campaign" size={23}/></span>}<div><em className={`status ${status.tone}`}>{status.label}</em><h2>{productName(campaign)}</h2><p>{campaign.progress.total ? `${campaign.progress.approved}/${campaign.progress.total} 項已批准` : '尚未開始製作內容'}</p></div></div>
        <div className="week-progress" aria-label="四星期進度">{weeks.map((week) => { const item = campaign.progress.weeks[String(week)]; const done = item?.total && item.approved === item.total; const active = item?.total && !done; return <span className={done ? 'done' : active ? 'active' : ''} key={week}><b>{done ? '✓' : week}</b><small>Week {week}</small></span> })}</div>
        <button className="next-action" onClick={() => router.push(nextHref(campaign))} type="button">{nextLabel(campaign)}<SoonIcon name="arrow-right" size={16}/></button>
      </article>})}</section>}
  </section><style jsx global>{`${dashboardSidebarStyles}
    .campaign-centre-page{min-height:100vh;display:grid;grid-template-columns:260px minmax(0,1fr);background:var(--soon-ivory);color:var(--soon-ink)}
    .campaign-centre-shell{width:min(1180px,calc(100% - 56px));margin:0 auto;padding:52px 0 80px}.campaign-centre-shell>header{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:26px}.campaign-centre-shell>header small{color:var(--soon-oxblood);font-size:.72rem;font-weight:850;letter-spacing:.12em}.campaign-centre-shell h1{margin:7px 0 5px;font-size:clamp(2rem,4vw,3.25rem);letter-spacing:-.045em}.campaign-centre-shell>header p{margin:0;color:var(--soon-muted)}.campaign-centre-shell>header button,.centre-empty button{display:flex;align-items:center;gap:8px;border:0;border-radius:12px;background:var(--soon-oxblood);color:#fff;padding:14px 18px;font:inherit;font-weight:800;box-shadow:4px 4px 0 var(--soon-oxblood-dark);cursor:pointer}
    .centre-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.centre-summary article{display:flex;align-items:center;gap:12px;border:1px solid var(--soon-line);border-radius:16px;background:#fff;padding:17px}.centre-summary svg{color:var(--soon-oxblood)}.centre-summary span{display:flex;align-items:baseline;gap:6px;color:var(--soon-copy)}.centre-summary b{font-size:1.45rem;color:var(--soon-ink)}.centre-summary .needs-action{border-color:#e6a2a2;background:#fff6f5}.centre-summary .needs-action b,.centre-summary .needs-action svg{color:var(--soon-danger)}
    .campaign-filters{display:flex;gap:7px;margin:24px 0 14px;overflow:auto}.campaign-filters button{border:1px solid var(--soon-line);border-radius:999px;background:rgba(255,255,255,.65);color:var(--soon-copy);padding:9px 14px;font:inherit;font-size:.78rem;font-weight:750;white-space:nowrap;cursor:pointer}.campaign-filters button.active{border-color:var(--soon-ink);background:var(--soon-ink);color:#fff}
    .campaign-list{display:grid;gap:11px}.campaign-row{display:grid;grid-template-columns:minmax(250px,1fr) minmax(330px,1.2fr) auto;align-items:center;gap:24px;border:1px solid var(--soon-line);border-radius:18px;background:#fff;padding:17px;transition:.15s ease}.campaign-row:hover{border-color:#c6b4a9;box-shadow:var(--soon-shadow-sm)}.campaign-identity{display:flex;align-items:center;gap:14px;min-width:0}.campaign-identity>img,.campaign-identity>span{width:68px;height:68px;flex:none;border-radius:13px;object-fit:contain;background:#f2ece6;border:1px solid var(--soon-line)}.campaign-identity>span{display:grid;place-items:center;color:var(--soon-oxblood)}.campaign-identity h2{margin:5px 0 2px;font-size:1.08rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.campaign-identity p{margin:0;color:var(--soon-muted);font-size:.75rem}.status{display:inline-flex;border-radius:999px;padding:4px 8px;background:#eeecea;color:var(--soon-copy);font-size:.66rem;font-style:normal;font-weight:800}.status.review,.status.attention{background:#ffe7e5;color:#ae2f2f}.status.approved,.status.published{background:#edf6d4;color:var(--soon-success)}.status.working{background:var(--soon-data-blue);color:#385884}.status.scheduled{background:#efe5f6;color:#65417c}
    .week-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.week-progress span{display:flex;align-items:center;gap:7px;border-radius:10px;background:#f3efeb;padding:8px;color:#948c87}.week-progress b{width:22px;height:22px;display:grid;place-items:center;border-radius:7px;background:#fff;font-size:.66rem}.week-progress small{font-size:.67rem;font-weight:750;white-space:nowrap}.week-progress span.active{background:#f3e4dc;color:var(--soon-oxblood)}.week-progress span.done{background:#edf6d4;color:var(--soon-success)}
    .next-action{display:flex;align-items:center;justify-content:center;gap:8px;min-width:145px;border:1px solid var(--soon-line);border-radius:11px;background:#fbf8f4;color:var(--soon-oxblood);padding:12px 14px;font:inherit;font-size:.78rem;font-weight:850;cursor:pointer}.next-action:hover{background:var(--soon-oxblood);color:#fff}.centre-state,.centre-empty{min-height:300px;display:grid;place-items:center;align-content:center;gap:12px;border:1px dashed var(--soon-line);border-radius:18px;background:rgba(255,255,255,.55);text-align:center}.centre-state i{width:28px;height:28px;border:3px solid #eadfd8;border-top-color:var(--soon-oxblood);border-radius:50%;animation:centreSpin .8s linear infinite}.centre-state button{border:1px solid var(--soon-line);border-radius:9px;background:#fff;padding:9px 12px}.centre-empty{color:var(--soon-muted)}.centre-empty h2{margin:4px 0 0;color:var(--soon-ink)}.centre-empty p{margin:0 0 6px}.centre-empty button{justify-self:center}@keyframes centreSpin{to{transform:rotate(360deg)}}
    @media(max-width:980px){.campaign-centre-page{display:block}.campaign-centre-shell{width:min(100% - 28px,760px);padding:30px 0 70px}.campaign-row{grid-template-columns:1fr}.next-action{width:100%}}
    @media(max-width:640px){.campaign-centre-shell>header{align-items:flex-start;flex-direction:column}.campaign-centre-shell>header button{width:100%;justify-content:center}.centre-summary{grid-template-columns:repeat(3,minmax(120px,1fr));overflow-x:auto;padding-bottom:4px}.centre-summary article{min-width:120px;align-items:flex-start;flex-direction:column}.centre-summary span{display:block}.centre-summary b{display:block}.week-progress small{display:none}.week-progress span{justify-content:center}.campaign-identity>img,.campaign-identity>span{width:58px;height:58px}}
  `}</style></main>
}
