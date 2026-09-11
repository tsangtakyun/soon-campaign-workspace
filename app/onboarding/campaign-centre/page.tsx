'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { SoonIcon } from '@/components/ui/SoonIcon'
import { resolveActiveWorkspace, WORKSPACE_CHANGED_EVENT } from '@/lib/workspace-client'

type WeekProgress = { total: number; ready: number; approved: number; pendingApproval: number; changesRequested: number; scheduled: number; published: number }
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
  if (campaign.status === 'archived') return { label: '已封存', tone: 'archived' }
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
  const [workspaceId, setWorkspaceId] = useState('')
  const [filter, setFilter] = useState<'all' | 'attention' | 'active' | 'done' | 'archived'>('all')
  const [openMenuId, setOpenMenuId] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ action: 'archive' | 'delete'; campaign: Campaign } | null>(null)
  const [savingId, setSavingId] = useState('')
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { workspaceId } = await resolveActiveWorkspace()
      if (!workspaceId) throw new Error('找不到目前工作台')
      setWorkspaceId(workspaceId)
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
    if (filter === 'archived') return status === 'archived'
    return status !== 'archived'
  }), [campaigns, filter])
  const activeCampaigns = campaigns.filter((campaign) => campaign.status !== 'archived')
  const attention = activeCampaigns.reduce((sum, campaign) => sum + campaign.progress.pendingApproval + campaign.progress.changesRequested, 0)

  async function manageCampaign(campaign: Campaign, action: 'archive' | 'restore' | 'delete') {
    if (!workspaceId) return
    setSavingId(campaign.id); setActionError(''); setOpenMenuId('')
    try {
      const response = action === 'delete'
        ? await fetch(`/api/product-campaigns?workspaceId=${encodeURIComponent(workspaceId)}&campaignId=${encodeURIComponent(campaign.id)}`, { method: 'DELETE' })
        : await fetch('/api/product-campaigns', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workspaceId, campaignId: campaign.id, action }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || payload.detail || '未能更新宣傳包')
      setConfirmAction(null)
      await load()
    } catch (manageError) { setActionError(manageError instanceof Error ? manageError.message : '未能更新宣傳包') }
    finally { setSavingId('') }
  }

  return <main className="campaign-centre-page"><DashboardSidebar activeItem="宣傳包"/><section className="campaign-centre-shell">
    <header><div><small>宣傳包</small><h1>所有宣傳活動，一眼掌握</h1><p>查看每個活動目前進度，並直接處理下一步。</p></div><button onClick={() => router.push('/onboarding/product-campaign')} type="button"><SoonIcon name="plus" size={17}/>建立宣傳包</button></header>
    <section className="centre-summary"><article><SoonIcon name="campaign"/><span><b>{activeCampaigns.length}</b>個宣傳活動</span></article><article className={attention ? 'needs-action' : ''}><SoonIcon name="check"/><span><b>{attention}</b>項需要處理</span></article><article><SoonIcon name="calendar"/><span><b>{activeCampaigns.reduce((sum, campaign) => sum + campaign.progress.scheduled, 0)}</b>項已排程</span></article></section>
    <nav className="campaign-filters" aria-label="篩選宣傳活動">{([['all','全部'],['attention',`需要處理${attention ? ` ${attention}` : ''}`],['active','進行中'],['done','已完成'],['archived','已封存']] as const).map(([value,label]) => <button className={filter === value ? 'active' : ''} key={value} onClick={() => setFilter(value)} type="button">{label}</button>)}</nav>
    {actionError ? <div className="campaign-action-error" role="alert">{actionError}<button type="button" onClick={() => setActionError('')}>×</button></div> : null}
    {loading ? <div className="centre-state"><i/><strong>正在整理宣傳活動…</strong></div> : error ? <div className="centre-state error"><strong>{error}</strong><button onClick={() => void load()} type="button">重新載入</button></div> : !visible.length ? <div className="centre-empty"><SoonIcon name="campaign" size={30}/><h2>{campaigns.length ? '這個分類暫時沒有宣傳活動' : '建立第一個宣傳包'}</h2><p>{campaigns.length ? '選擇其他分類查看現有活動。' : '上傳產品或服務相片，SOON 會整理宣傳方向及內容計劃。'}</p>{!campaigns.length ? <button onClick={() => router.push('/onboarding/product-campaign')} type="button">開始建立</button> : null}</div> : <section className="campaign-list">{visible.map((campaign) => {
      const status = statusFor(campaign); const weeks = [1,2,3,4]
      const deletionProtected = campaign.progress.scheduled > 0 || campaign.progress.published > 0
      return <article className="campaign-row" key={campaign.id}>
        <div className="campaign-identity">{campaign.imageUrl ? <img src={campaign.imageUrl} alt=""/> : <span><SoonIcon name="campaign" size={23}/></span>}<div><em className={`status ${status.tone}`}>{status.label}</em><h2>{productName(campaign)}</h2><p>{campaign.progress.total ? `${campaign.progress.approved}/${campaign.progress.total} 項已批准` : '尚未開始製作內容'}</p></div></div>
        <div className="week-progress" aria-label="四星期進度">{weeks.map((week) => { const item = campaign.progress.weeks[String(week)]; const done = item?.total && item.approved === item.total; const active = item?.total && !done; return <span className={done ? 'done' : active ? 'active' : ''} key={week}><b>{done ? '✓' : week}</b><small>Week {week}</small></span> })}</div>
        <div className="campaign-actions">{campaign.status !== 'archived' ? <button className="next-action" onClick={() => router.push(nextHref(campaign))} type="button">{nextLabel(campaign)}<SoonIcon name="arrow-right" size={16}/></button> : <button className="next-action" disabled={savingId === campaign.id} onClick={() => void manageCampaign(campaign, 'restore')} type="button">恢復宣傳包<SoonIcon name="refresh" size={16}/></button>}<div className="campaign-menu-wrap"><button aria-expanded={openMenuId === campaign.id} aria-label={`管理 ${productName(campaign)}`} className="campaign-menu-trigger" onClick={() => setOpenMenuId((current) => current === campaign.id ? '' : campaign.id)} type="button"><SoonIcon name="more" size={19}/></button>{openMenuId === campaign.id ? <div className="campaign-menu">{campaign.status === 'archived' ? <button type="button" onClick={() => void manageCampaign(campaign, 'restore')}><SoonIcon name="refresh" size={15}/>恢復宣傳包</button> : <button type="button" onClick={() => setConfirmAction({ action: 'archive', campaign })}><SoonIcon name="save" size={15}/>封存宣傳包</button>}<button className="danger" disabled={deletionProtected} title={deletionProtected ? '已有排程或已發布內容，請先取消排程或改用封存' : undefined} type="button" onClick={() => setConfirmAction({ action: 'delete', campaign })}><SoonIcon name="close" size={15}/>{deletionProtected ? '已有發布紀錄，只可封存' : '永久刪除'}</button></div> : null}</div></div>
      </article>})}</section>}
    {confirmAction ? <div className="campaign-confirm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingId) setConfirmAction(null) }}><section aria-labelledby="campaign-confirm-title" aria-modal="true" className="campaign-confirm-dialog" role="dialog"><span className={confirmAction.action === 'delete' ? 'danger' : ''}><SoonIcon name={confirmAction.action === 'delete' ? 'warning' : 'save'} size={22}/></span><h2 id="campaign-confirm-title">{confirmAction.action === 'delete' ? '永久刪除這個宣傳包？' : '封存這個宣傳包？'}</h2><p>{confirmAction.action === 'delete' ? `「${productName(confirmAction.campaign)}」的宣傳方向、${confirmAction.campaign.progress.total || 0} 項製作內容、素材及審批紀錄都會永久移除，無法復原。` : `「${productName(confirmAction.campaign)}」會移至「已封存」，所有內容及紀錄都會保留。`}</p><div><button disabled={Boolean(savingId)} type="button" onClick={() => setConfirmAction(null)}>取消</button><button className={confirmAction.action === 'delete' ? 'danger' : 'primary'} disabled={Boolean(savingId)} type="button" onClick={() => void manageCampaign(confirmAction.campaign, confirmAction.action)}>{savingId ? '正在處理…' : confirmAction.action === 'delete' ? '確認永久刪除' : '確認封存'}</button></div></section></div> : null}
  </section><style jsx global>{`${dashboardSidebarStyles}
    .campaign-centre-page{min-height:100vh;display:grid;grid-template-columns:260px minmax(0,1fr);background:var(--soon-ivory);color:var(--soon-ink)}
    .campaign-centre-shell{width:min(1180px,calc(100% - 56px));margin:0 auto;padding:52px 0 80px}.campaign-centre-shell>header{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:26px}.campaign-centre-shell>header small{color:var(--soon-oxblood);font-size:.72rem;font-weight:850;letter-spacing:.12em}.campaign-centre-shell h1{margin:7px 0 5px;font-size:clamp(2rem,4vw,3.25rem);letter-spacing:-.045em}.campaign-centre-shell>header p{margin:0;color:var(--soon-muted)}.campaign-centre-shell>header button,.centre-empty button{display:flex;align-items:center;gap:8px;border:0;border-radius:12px;background:var(--soon-oxblood);color:#fff;padding:14px 18px;font:inherit;font-weight:800;box-shadow:4px 4px 0 var(--soon-oxblood-dark);cursor:pointer}
    .centre-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.centre-summary article{display:flex;align-items:center;gap:12px;border:1px solid var(--soon-line);border-radius:16px;background:#fff;padding:17px}.centre-summary svg{color:var(--soon-oxblood)}.centre-summary span{display:flex;align-items:baseline;gap:6px;color:var(--soon-copy)}.centre-summary b{font-size:1.45rem;color:var(--soon-ink)}.centre-summary .needs-action{border-color:#e6a2a2;background:#fff6f5}.centre-summary .needs-action b,.centre-summary .needs-action svg{color:var(--soon-danger)}
    .campaign-filters{display:flex;gap:7px;margin:24px 0 14px;overflow:auto}.campaign-filters button{border:1px solid var(--soon-line);border-radius:999px;background:rgba(255,255,255,.65);color:var(--soon-copy);padding:9px 14px;font:inherit;font-size:.78rem;font-weight:750;white-space:nowrap;cursor:pointer}.campaign-filters button.active{border-color:var(--soon-ink);background:var(--soon-ink);color:#fff}
    .campaign-list{display:grid;gap:11px}.campaign-row{display:grid;grid-template-columns:minmax(250px,1fr) minmax(330px,1.2fr) auto;align-items:center;gap:24px;border:1px solid var(--soon-line);border-radius:18px;background:#fff;padding:17px;transition:.15s ease}.campaign-row:hover{border-color:#c6b4a9;box-shadow:var(--soon-shadow-sm)}.campaign-identity{display:flex;align-items:center;gap:14px;min-width:0}.campaign-identity>img,.campaign-identity>span{width:68px;height:68px;flex:none;border-radius:13px;object-fit:contain;background:#f2ece6;border:1px solid var(--soon-line)}.campaign-identity>span{display:grid;place-items:center;color:var(--soon-oxblood)}.campaign-identity h2{margin:5px 0 2px;font-size:1.08rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.campaign-identity p{margin:0;color:var(--soon-muted);font-size:.75rem}.status{display:inline-flex;border-radius:999px;padding:4px 8px;background:#eeecea;color:var(--soon-copy);font-size:.66rem;font-style:normal;font-weight:800}.status.review,.status.attention{background:#ffe7e5;color:#ae2f2f}.status.approved,.status.published{background:#edf6d4;color:var(--soon-success)}.status.working{background:var(--soon-data-blue);color:#385884}.status.scheduled{background:#efe5f6;color:#65417c}.status.archived{background:#e9e7e5;color:#716b67}
    .week-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.week-progress span{display:flex;align-items:center;gap:7px;border-radius:10px;background:#f3efeb;padding:8px;color:#948c87}.week-progress b{width:22px;height:22px;display:grid;place-items:center;border-radius:7px;background:#fff;font-size:.66rem}.week-progress small{font-size:.67rem;font-weight:750;white-space:nowrap}.week-progress span.active{background:#f3e4dc;color:var(--soon-oxblood)}.week-progress span.done{background:#edf6d4;color:var(--soon-success)}
    .campaign-actions{display:flex;align-items:center;gap:7px}.next-action{display:flex;align-items:center;justify-content:center;gap:8px;min-width:145px;border:1px solid var(--soon-line);border-radius:11px;background:#fbf8f4;color:var(--soon-oxblood);padding:12px 14px;font:inherit;font-size:.78rem;font-weight:850;cursor:pointer}.next-action:hover{background:var(--soon-oxblood);color:#fff}.next-action:disabled{opacity:.55}.campaign-menu-wrap{position:relative}.campaign-menu-trigger{width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--soon-line);border-radius:11px;background:#fff;color:var(--soon-copy);cursor:pointer}.campaign-menu{position:absolute;right:0;top:calc(100% + 7px);z-index:20;width:210px;border:1px solid var(--soon-line);border-radius:13px;background:#fff;padding:6px;box-shadow:var(--soon-shadow-md)}.campaign-menu button{width:100%;display:flex;align-items:center;gap:9px;border:0;border-radius:9px;background:transparent;color:var(--soon-copy);padding:10px;font:inherit;font-size:.76rem;font-weight:750;text-align:left;cursor:pointer}.campaign-menu button:hover{background:#f5f0ec}.campaign-menu button.danger{color:#b43131}.campaign-menu button:disabled{color:#aaa4a0;cursor:not-allowed}.campaign-menu button:disabled:hover{background:transparent}.campaign-action-error{display:flex;justify-content:space-between;align-items:center;border:1px solid #e8aaaa;border-radius:11px;background:#fff1f0;color:#a52d2d;margin:0 0 12px;padding:10px 13px;font-size:.76rem;font-weight:750}.campaign-action-error button{border:0;background:transparent;color:inherit;font-size:1.1rem;cursor:pointer}
    .campaign-confirm-overlay{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:rgba(26,20,18,.48);padding:18px}.campaign-confirm-dialog{width:min(430px,100%);border:1px solid var(--soon-line);border-radius:20px;background:#fff;padding:25px;box-shadow:0 30px 80px rgba(20,12,12,.25)}.campaign-confirm-dialog>span{width:48px;height:48px;display:grid;place-items:center;border-radius:13px;background:#f1eadf;color:var(--soon-oxblood)}.campaign-confirm-dialog>span.danger{background:#ffe7e5;color:#b43131}.campaign-confirm-dialog h2{margin:18px 0 8px;font-size:1.35rem}.campaign-confirm-dialog p{margin:0;color:var(--soon-copy);line-height:1.65}.campaign-confirm-dialog>div{display:flex;justify-content:flex-end;gap:8px;margin-top:24px}.campaign-confirm-dialog button{border:1px solid var(--soon-line);border-radius:10px;background:#fff;color:var(--soon-copy);padding:11px 15px;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}.campaign-confirm-dialog button.primary{border-color:var(--soon-oxblood);background:var(--soon-oxblood);color:#fff}.campaign-confirm-dialog button.danger{border-color:#b43131;background:#b43131;color:#fff}.campaign-confirm-dialog button:disabled{opacity:.6}.centre-state,.centre-empty{min-height:300px;display:grid;place-items:center;align-content:center;gap:12px;border:1px dashed var(--soon-line);border-radius:18px;background:rgba(255,255,255,.55);text-align:center}.centre-state i{width:28px;height:28px;border:3px solid #eadfd8;border-top-color:var(--soon-oxblood);border-radius:50%;animation:centreSpin .8s linear infinite}.centre-state button{border:1px solid var(--soon-line);border-radius:9px;background:#fff;padding:9px 12px}.centre-empty{color:var(--soon-muted)}.centre-empty h2{margin:4px 0 0;color:var(--soon-ink)}.centre-empty p{margin:0 0 6px}.centre-empty button{justify-self:center}@keyframes centreSpin{to{transform:rotate(360deg)}}
    @media(max-width:980px){.campaign-centre-page{display:block}.campaign-centre-shell{width:min(100% - 28px,760px);padding:30px 0 70px}.campaign-row{grid-template-columns:1fr}.campaign-actions{width:100%}.next-action{width:100%}}
    @media(max-width:640px){.campaign-centre-shell>header{align-items:flex-start;flex-direction:column}.campaign-centre-shell>header button{width:100%;justify-content:center}.centre-summary{grid-template-columns:repeat(3,minmax(120px,1fr));overflow-x:auto;padding-bottom:4px}.centre-summary article{min-width:120px;align-items:flex-start;flex-direction:column}.centre-summary span{display:block}.centre-summary b{display:block}.week-progress small{display:none}.week-progress span{justify-content:center}.campaign-identity>img,.campaign-identity>span{width:58px;height:58px}}
  `}</style></main>
}
