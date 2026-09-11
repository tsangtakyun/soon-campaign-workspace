'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { SoonIcon } from '@/components/ui/SoonIcon'
import { resolveActiveWorkspace, WORKSPACE_CHANGED_EVENT } from '@/lib/workspace-client'

type Campaign = {
  id: string; name: string; imageUrl?: string | null
  product?: { name?: string } | Array<{ name?: string }> | null
  progress: { pendingApproval: number; changesRequested: number; weeks: Record<string, { total: number; ready: number; approved: number; pendingApproval: number; changesRequested: number }> }
}

function nameOf(campaign: Campaign) {
  const product = Array.isArray(campaign.product) ? campaign.product[0] : campaign.product
  return product?.name || campaign.name.replace(/ Campaign$/i, '')
}

export default function ContentReviewPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { workspaceId } = await resolveActiveWorkspace()
      if (!workspaceId) throw new Error('找不到目前工作台')
      const response = await fetch(`/api/product-campaigns?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.detail || payload.error || '未能載入審批內容')
      setCampaigns(Array.isArray(payload.campaigns) ? payload.campaigns : [])
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : '未能載入審批內容') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load(); const reload = () => void load(); window.addEventListener(WORKSPACE_CHANGED_EVENT, reload); return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, reload) }, [load])

  const queue = useMemo(() => campaigns.flatMap((campaign) => Object.entries(campaign.progress.weeks).flatMap(([week, progress]) => {
    const pending = progress.pendingApproval || 0
    if (!pending && !progress.changesRequested) return []
    return [{ campaign, week: Number(week), pending, changes: progress.changesRequested }]
  })).sort((a, b) => a.week - b.week), [campaigns])
  const pendingTotal = queue.reduce((sum, item) => sum + item.pending, 0)
  const changesTotal = queue.reduce((sum, item) => sum + item.changes, 0)

  return <main className="content-review-page"><DashboardSidebar activeItem="內容審批"/><section className="content-review-shell">
    <header><small>內容審批</small><h1>{pendingTotal ? `${pendingTotal} 項內容等待你確認` : changesTotal ? `${changesTotal} 項內容正在修改` : '審批已完成'}</h1><p>按宣傳活動及星期整理；你的決定會自動保存。</p></header>
    {loading ? <div className="review-state"><i/><strong>正在整理待審批內容…</strong></div> : error ? <div className="review-state"><strong>{error}</strong><button onClick={() => void load()} type="button">重新載入</button></div> : !queue.length ? <div className="review-empty"><span><SoonIcon name="check" size={28}/></span><h2>目前沒有待審批內容</h2><p>新素材完成後，會自動出現在這裡。</p><button onClick={() => router.push('/onboarding/campaign-centre')} type="button">查看所有宣傳包</button></div> : <section className="review-queue">{queue.map(({ campaign, week, pending, changes }) => <article key={`${campaign.id}-${week}`}>
      <div className="review-campaign">{campaign.imageUrl ? <img src={campaign.imageUrl} alt=""/> : <span><SoonIcon name="campaign" size={22}/></span>}<div><small>WEEK {week}</small><h2>{nameOf(campaign)}</h2><p>{pending ? `${pending} 項待審批` : ''}{pending && changes ? ' · ' : ''}{changes ? `${changes} 項正在修改` : ''}</p></div></div>
      <div className="review-counts">{pending ? <span className="pending"><i/>{pending} 待審批</span> : null}{changes ? <span><SoonIcon name="edit" size={14}/>{changes} 修改中</span> : null}</div>
      <button onClick={() => router.push(`/onboarding/product-campaign/${campaign.id}/delivery?week=${week}`)} type="button">{pending ? '開始審批' : '查看修改進度'}<SoonIcon name="arrow-right" size={16}/></button>
    </article>)}</section>}
  </section><style jsx global>{`${dashboardSidebarStyles}
    .content-review-page{min-height:100vh;display:grid;grid-template-columns:260px minmax(0,1fr);background:var(--soon-ivory);color:var(--soon-ink)}.content-review-shell{width:min(960px,calc(100% - 56px));margin:0 auto;padding:58px 0 90px}.content-review-shell>header{margin-bottom:28px}.content-review-shell>header small{color:var(--soon-oxblood);font-size:.72rem;font-weight:850;letter-spacing:.12em}.content-review-shell>header h1{margin:8px 0 6px;font-size:clamp(2rem,4vw,3.1rem);letter-spacing:-.045em}.content-review-shell>header p{margin:0;color:var(--soon-muted)}
    .review-queue{display:grid;gap:11px}.review-queue>article{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:24px;border:1px solid var(--soon-line);border-radius:18px;background:#fff;padding:17px}.review-campaign{display:flex;align-items:center;gap:14px;min-width:0}.review-campaign>img,.review-campaign>span{width:66px;height:66px;flex:none;border:1px solid var(--soon-line);border-radius:13px;background:#f2ece6;object-fit:contain}.review-campaign>span{display:grid;place-items:center;color:var(--soon-oxblood)}.review-campaign small{color:var(--soon-oxblood);font-size:.65rem;font-weight:850;letter-spacing:.08em}.review-campaign h2{margin:4px 0 2px;font-size:1.08rem}.review-campaign p{margin:0;color:var(--soon-muted);font-size:.75rem}.review-counts{display:flex;gap:7px}.review-counts span{display:flex;align-items:center;gap:6px;border-radius:999px;background:#eeeae6;color:var(--soon-copy);padding:7px 10px;font-size:.7rem;font-weight:800}.review-counts span.pending{background:#ffe7e5;color:#ad3030}.review-counts i{width:7px;height:7px;border-radius:50%;background:var(--soon-danger)}.review-queue>article>button,.review-empty button{display:flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:11px;background:var(--soon-oxblood);color:#fff;padding:12px 15px;font:inherit;font-size:.78rem;font-weight:850;cursor:pointer}
    .review-state,.review-empty{min-height:320px;display:grid;place-items:center;align-content:center;gap:12px;border:1px dashed var(--soon-line);border-radius:18px;background:rgba(255,255,255,.55);text-align:center}.review-state i{width:28px;height:28px;border:3px solid #eadfd8;border-top-color:var(--soon-oxblood);border-radius:50%;animation:reviewSpin .8s linear infinite}.review-state button{border:1px solid var(--soon-line);border-radius:9px;background:#fff;padding:9px 12px}.review-empty>span{width:58px;height:58px;display:grid;place-items:center;border-radius:16px;background:#edf6d4;color:var(--soon-success)}.review-empty h2{margin:4px 0 0}.review-empty p{margin:0 0 5px;color:var(--soon-muted)}@keyframes reviewSpin{to{transform:rotate(360deg)}}
    @media(max-width:980px){.content-review-page{display:block}.content-review-shell{width:min(100% - 28px,760px);padding:34px 0 70px}.review-queue>article{grid-template-columns:1fr}.review-queue>article>button{width:100%}.review-counts{margin-left:80px}}
    @media(max-width:520px){.review-counts{margin-left:0}.review-counts span{flex:1;justify-content:center}}
  `}</style></main>
}
