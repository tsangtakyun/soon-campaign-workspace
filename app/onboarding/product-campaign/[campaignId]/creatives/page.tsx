'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ProductionProgress } from '@/components/campaign/ProductionProgress'
import { SoonIcon, type SoonIconName } from '@/components/ui/SoonIcon'

type Project = {
  id: string
  title: string
  selected_format: string
  campaign_angle_id: string
  variant_key: string
  creative_role: string
  brief?: { campaignWeek?: number; angleName?: string; purpose?: string; formatReason?: string }
  production?: {
    concept?: string
    hooks?: string[]
    captionDraft?: string
    cta?: string
    script?: { durationSeconds?: number; opening?: string; scenes?: Array<{ seconds?: string; visual?: string; voiceover?: string; onScreenText?: string }>; closing?: string }
    carouselPlan?: { slideCount?: number; slides?: Array<{ purpose?: string; headline?: string; body?: string; visual?: string }> }
    visualBrief?: { composition?: string; setting?: string; productPlacement?: string; lighting?: string; creatorStyle?: string; overlayCopy?: string; generationPrompt?: string }
    complianceNotes?: string[]
  }
}

type ApiPayload = { projects?: Project[]; campaign?: { name?: string }; product?: { name?: string }; error?: string; detail?: string }
type GenerationJob = { id: string; content_project_id: string; job_type: 'image' | 'video_storyboard'; status: 'queued' | 'processing' | 'completed' | 'failed'; progress: number; attempt: number; max_attempts: number; error_message?: string; output?: { asset?: { url?: string }; productionStatus?: string; finalVideoRendered?: boolean; referenceMode?: 'product_image' | 'concept_only' } }
type ScheduleSlot = { day: number; phase: '建立認知' | '重點宣傳' | '互動延伸' | '資訊補充'; order: number }

const roleLabels: Record<string, string> = {
  hero_visual: '產品主視覺', lifestyle_visual: '情境圖片', ugc_concept: '創作者內容', reel_script: '短片腳本', hook: '開場句',
  caption: '貼文文案', thumbnail: '縮圖', paid_social_creative: '廣告素材',
}

const formatLabels: Record<string, string> = { single_image: '單張圖片', carousel: '輪播貼文', short_video: '短片' }
const formatIcons: Record<string, SoonIconName> = { single_image: 'image', carousel: 'carousel', short_video: 'video' }
const roleIcons: Record<string, SoonIconName> = {
  hero_visual: 'image', lifestyle_visual: 'image', ugc_concept: 'creator', reel_script: 'video', hook: 'hook',
  caption: 'caption', thumbnail: 'image', paid_social_creative: 'performance',
}

function apiError(payload: ApiPayload, fallback: string) {
  if (typeof payload.detail === 'string' && payload.detail) return payload.detail
  if (typeof payload.error === 'string' && payload.error) return payload.error
  return fallback
}

function roleSummary(items: Project[]) {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.creative_role, (counts.get(item.creative_role) || 0) + 1)
  return Array.from(counts.entries()).map(([role, count]) => ({ role, count, label: roleLabels[role] || role, icon: roleIcons[role] || 'create' }))
}

function scheduleForGroups(groups: Array<[string, Project[]]>) {
  const result = new Map<string, ScheduleSlot>()
  groups.forEach(([, items], angleIndex) => {
    const seen = new Map<string, number>()
    items.forEach((item) => {
      const occurrence = seen.get(item.creative_role) || 0
      seen.set(item.creative_role, occurrence + 1)
      let slot: ScheduleSlot
      if (item.creative_role === 'lifestyle_visual') slot = { day: 1 + angleIndex, phase: '建立認知', order: 10 }
      else if (item.creative_role === 'hook' && occurrence === 0) slot = { day: 3 + angleIndex, phase: '建立認知', order: 20 }
      else if (item.creative_role === 'hero_visual') slot = { day: 5 + angleIndex, phase: '重點宣傳', order: 30 }
      else if (item.creative_role === 'reel_script') slot = { day: 7 + angleIndex, phase: '重點宣傳', order: 40 }
      else if (item.creative_role === 'paid_social_creative') slot = { day: 9 + angleIndex, phase: '重點宣傳', order: 50 }
      else if (item.creative_role === 'hook') slot = { day: 12 + angleIndex, phase: '互動延伸', order: 60 }
      else if (item.creative_role === 'caption' && occurrence === 0) slot = { day: 15 + angleIndex, phase: '互動延伸', order: 70 }
      else slot = { day: 19 + angleIndex, phase: '資訊補充', order: 80 + occurrence }
      result.set(item.id, slot)
    })
  })
  return result
}

export default function CampaignCreativesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const campaignId = typeof params.campaignId === 'string' ? params.campaignId : ''
  const [projects, setProjects] = useState<Project[]>([])
  const [campaignName, setCampaignName] = useState('你的宣傳活動')
  const [status, setStatus] = useState<'loading' | 'generating' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('正在讀取宣傳活動…')
  const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [running, setRunning] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editConcept, setEditConcept] = useState('')
  const [editCopy, setEditCopy] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [formatRecommending, setFormatRecommending] = useState(false)
  const [weekOneGenerating, setWeekOneGenerating] = useState(false)
  const [weekOneProgress, setWeekOneProgress] = useState({ completed: 0, total: 0 })
  const [generationActivity, setGenerationActivity] = useState<string[]>([])
  const generatingRef = useRef(false)

  const generate = useCallback(async () => {
    if (!campaignId || generatingRef.current) return
    generatingRef.current = true
    setStatus('generating')
    setMessage('SOON 正在將宣傳方向展開成腳本、開場文案、貼文說明及視覺指引…')
    try {
      const response = await fetch(`/api/product-campaigns/${campaignId}/creatives`, { method: 'POST' })
      const payload = await response.json().catch(() => ({})) as ApiPayload
      if (!response.ok) throw new Error(apiError(payload, '生成失敗'))
      setProjects(payload.projects || [])
      setStatus('ready')
      setMessage('宣傳內容包已建立，每項內容都保留所屬方向及製作要求。')
    } catch (error) {
      setStatus('error')
      const detail = error instanceof Error ? error.message : ''
      setMessage(detail.includes('SyntaxError') || detail.includes('JSON') ? '內容回傳不完整，請按「再試一次」重新建立。' : detail || '生成失敗')
    } finally {
      generatingRef.current = false
    }
  }, [campaignId])

  useEffect(() => {
    if (!campaignId) return
    let cancelled = false
    async function load() {
      try {
        const response = await fetch(`/api/product-campaigns/${campaignId}/creatives`, { cache: 'no-store' })
        const payload = await response.json().catch(() => ({})) as ApiPayload
        if (!response.ok) throw new Error(apiError(payload, '載入失敗'))
        if (cancelled) return
        setCampaignName(payload.product?.name || payload.campaign?.name || '你的宣傳活動')
        if (payload.projects?.length) {
          setProjects(payload.projects)
          setStatus('ready')
          setMessage('宣傳內容包已準備好。')
        } else {
          await generate()
        }
      } catch (error) {
        if (!cancelled) { setStatus('error'); setMessage(error instanceof Error ? error.message : '載入失敗') }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [campaignId, generate])

  const grouped = useMemo(() => {
    const groups = new Map<string, Project[]>()
    for (const project of projects) {
      const key = project.brief?.angleName || '宣傳活動基本內容'
      groups.set(key, [...(groups.get(key) || []), project])
    }
    return Array.from(groups.entries())
  }, [projects])
  const campaignSchedule = useMemo(() => scheduleForGroups(grouped), [grouped])
  const requestedWeek = Math.max(1, Math.min(4, Number(searchParams.get('week')) || 1))
  const weekPhases: ScheduleSlot['phase'][] = ['建立認知', '重點宣傳', '互動延伸', '資訊補充']
  const activeWeek = requestedWeek
  const activePhase = weekPhases[activeWeek - 1]
  const activeWeekProjects = projects.filter((project) => campaignSchedule.get(project.id)?.phase === activePhase)

  const loadJobs = useCallback(async () => {
    const response = await fetch(`/api/product-campaigns/${campaignId}/generation-jobs`, { cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    if (response.ok) setJobs(payload.jobs || [])
  }, [campaignId])

  useEffect(() => { if (campaignId && status === 'ready') void loadJobs() }, [campaignId, loadJobs, status])

  async function prepareJobs(projectIds?: string[], campaignWeek = 1) {
    const response = await fetch(`/api/product-campaigns/${campaignId}/generation-jobs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectIds, campaignWeek }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.detail || payload.error || '未能建立Jobs')
    const incoming = (payload.jobs || []) as GenerationJob[]
    setJobs(incoming)
    return incoming
  }

  async function runOne(job: GenerationJob, force = false) {
    setJobs((current) => current.map((item) => item.id === job.id ? { ...item, status: 'processing', progress: 15, error_message: undefined } : item))
    const response = await fetch(`/api/product-campaigns/generation-jobs/${job.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ force }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setJobs((current) => current.map((item) => item.id === job.id ? { ...item, status: 'failed', progress: 0, error_message: payload.detail || payload.error || '生成失敗' } : item))
      return false
    }
    setJobs((current) => current.map((item) => item.id === job.id ? payload.job : item))
    return true
  }

  async function runPending() {
    if (running) return
    setRunning(true); setMessage('素材會逐項生成並即時回傳；個別項目失敗亦不會影響其他內容。')
    try {
      const available = jobs.length ? jobs : await prepareJobs()
      const pending = available.filter((job) => job.status === 'queued' || (job.status === 'failed' && job.attempt < job.max_attempts))
      let succeeded = 0
      for (let index = 0; index < pending.length; index += 2) {
        const results = await Promise.all(pending.slice(index, index + 2).map((job) => runOne(job)))
        succeeded += results.filter(Boolean).length
      }
      await loadJobs()
      setMessage(!pending.length ? '目前未有可執行嘅素材工作。' : succeeded === pending.length ? '今輪素材生成已完成。' : `完成 ${succeeded}/${pending.length} 項；失敗項目可以獨立重試。`)
    } catch (error) { setMessage(error instanceof Error ? error.message : '未能啟動生成') }
    finally { setRunning(false) }
  }

  async function confirmWeek(week = activeWeek) {
    if (running) return
    const phase = weekPhases[week - 1]
    const weekIds = projects.filter((project) => campaignSchedule.get(project.id)?.phase === phase).map((project) => project.id)
    if (!weekIds.length) { setMessage(`暫時找不到 Week ${week} 內容，請先檢查製作計劃。`); return }
    setRunning(true); setWeekOneGenerating(true); setWeekOneProgress({ completed: 0, total: weekIds.length }); setGenerationActivity([`✓ 已確認 Week ${week} 製作計劃`, '正在整理產品資料、宣傳方向及格式要求…']); setMessage(`已確認計劃。SOON 正在製作 Week ${week} 的 ${weekIds.length} 項內容…`)
    try {
      const available = await prepareJobs(weekIds, week)
      const pending = available.filter((job) => weekIds.includes(job.content_project_id) && (job.status === 'queued' || (job.status === 'failed' && job.attempt < job.max_attempts)))
      let succeeded = available.filter((job) => weekIds.includes(job.content_project_id) && job.status === 'completed').length
      setWeekOneProgress({ completed: succeeded, total: weekIds.length })
      for (let index = 0; index < pending.length; index += 2) {
        const batch = pending.slice(index, index + 2)
        const names = batch.map((job) => projects.find((project) => project.id === job.content_project_id)?.title || '宣傳內容')
        setGenerationActivity((current) => [...current.slice(-4), ...names.map((name) => `正在製作「${name}」…`)])
        const results = await Promise.all(batch.map((job) => runOne(job)))
        succeeded += results.filter(Boolean).length
        setWeekOneProgress({ completed: succeeded, total: weekIds.length })
        setGenerationActivity((current) => [...current.slice(-4), `✓ 已完成 ${succeeded}/${weekIds.length} 項製作預覽`, succeeded === weekIds.length ? `正在準備 Week ${week} 審批頁面…` : '正在檢查產品圖片及內容要求…'])
        setMessage(`Week ${week} 正在製作：已完成 ${succeeded}/${weekIds.length} 項…`)
      }
      if (succeeded < weekIds.length) { await loadJobs(); setMessage(`Week ${week} 已完成 ${succeeded}/${weekIds.length} 項；失敗項目可重新嘗試。`); setWeekOneGenerating(false); return }
      router.push(`/onboarding/product-campaign/${campaignId}/delivery?week=${week}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : `未能製作 Week ${week} 內容`); setWeekOneGenerating(false) }
    finally { setRunning(false) }
  }

  async function retry(job: GenerationJob) { if (!running) { setRunning(true); await runOne(job); await loadJobs(); setRunning(false) } }
  async function regenerateWithProduct(job: GenerationJob) { if (!running) { setRunning(true); setMessage('正在用產品原圖重新生成呢一項素材…'); await runOne(job, true); await loadJobs(); setMessage('已完成單項重新生成。'); setRunning(false) } }

  async function recommendFormats() {
    if (formatRecommending) return
    setFormatRecommending(true); setMessage('SOON 正在重新分析每項內容最適合使用單張圖片、輪播貼文或短片…')
    try {
      const response = await fetch(`/api/product-campaigns/${campaignId}/creatives`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'recommend_formats' }) })
      const payload = await response.json().catch(() => ({})) as ApiPayload
      if (!response.ok) throw new Error(apiError(payload, '未能重新建議格式'))
      setProjects(payload.projects || [])
      setMessage('格式建議已更新；原有宣傳方向、標題及文案保持不變。')
    } catch (error) { setMessage(error instanceof Error ? error.message : '未能重新建議格式') }
    finally { setFormatRecommending(false) }
  }

  function openEditor(project: Project) {
    setEditing(project)
    setEditTitle(project.title)
    setEditConcept(project.production?.concept || '')
    if (project.creative_role === 'caption') setEditCopy(project.production?.captionDraft || '')
    else if (project.creative_role === 'hook') setEditCopy((project.production?.hooks || []).join('\n'))
    else if (project.creative_role === 'reel_script') setEditCopy(project.production?.script?.opening || '')
    else setEditCopy(project.production?.visualBrief?.overlayCopy || '')
  }

  async function saveEdit() {
    if (!editing || editSaving) return
    setEditSaving(true)
    const production = { ...(editing.production || {}), concept: editConcept.trim() }
    if (editing.creative_role === 'caption') production.captionDraft = editCopy.trim()
    else if (editing.creative_role === 'hook') production.hooks = editCopy.split('\n').map((line) => line.trim()).filter(Boolean)
    else if (editing.creative_role === 'reel_script') production.script = { ...(editing.production?.script || {}), opening: editCopy.trim() }
    else production.visualBrief = { ...(editing.production?.visualBrief || {}), overlayCopy: editCopy.trim() }
    try {
      const response = await fetch(`/api/product-campaigns/${campaignId}/creatives`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: editing.id, title: editTitle.trim(), production }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.detail || payload.error || '未能儲存修改')
      setProjects((current) => current.map((project) => project.id === editing.id ? { ...project, title: payload.project?.title || editTitle.trim(), production: payload.project?.production || production } : project))
      setEditing(null); setMessage('製作稿已更新。')
    } catch (error) { setMessage(error instanceof Error ? error.message : '未能儲存修改') }
    finally { setEditSaving(false) }
  }

  function editCopyLabel(project: Project) {
    if (project.creative_role === 'caption') return '貼文文案'
    if (project.creative_role === 'hook') return '開場句（每行一項）'
    if (project.creative_role === 'reel_script') return '短片開場'
    return '畫面文字'
  }

  const jobByProject = useMemo(() => new Map(jobs.map((job) => [job.content_project_id, job])), [jobs])
  const busy = status === 'loading' || status === 'generating'
  return <main className="creative-page"><DashboardSidebar activeItem="宣傳包" /><section className="creative-shell">
    <ProductionProgress current={1}/>
    <button className="back" type="button" onClick={() => router.push(`/onboarding/product-campaign/${campaignId}/angles`)}><SoonIcon name="arrow-right" size={15} style={{ transform: 'rotate(180deg)' }}/>返回宣傳方向</button>
    <header><small>宣傳內容包</small><h1>{campaignName}</h1><p>SOON 已根據確認的宣傳方向，準備好完整內容計劃。</p></header>
    {busy ? <section className="loading" aria-live="polite"><i /><h2>{status === 'generating' ? '正在建立你的宣傳內容包' : '正在載入宣傳活動'}</h2><p>{message}</p><div><span>內容策略</span><span>腳本及文案</span><span>視覺製作指引</span></div><small>內容較多時可能需要 1–2 分鐘，請保持此頁開啟。</small></section> : <>
      <div className={`notice ${status === 'error' ? 'error' : ''}`} role="status"><span>{message}</span>{status === 'error' ? <button type="button" onClick={() => void generate()}>再試一次</button> : <b>{projects.length} 項製作稿</b>}</div>
      <section className="plan-intro"><div><small>內容計劃</small><strong>先查看兩個宣傳方向</strong><span>了解每個方向將會製作的內容，再決定下一步。</span></div><div className="plan-actions"><b>{projects.length} 項內容</b><button type="button" disabled={formatRecommending} onClick={() => void recommendFormats()}>{formatRecommending ? '正在分析格式…' : '重新建議格式'}</button><button type="button" onClick={() => router.push(`/onboarding/product-campaign/${campaignId}/angles`)}>修改宣傳方向</button></div></section>
      <section className="angle-overview-grid">{grouped.map(([angleName, items], angleIndex) => <details className="angle-section" key={angleName}>
        <summary><div className="angle-heading"><span className="angle-letter">{String.fromCharCode(65 + angleIndex)}</span><div><small>宣傳方向 {String.fromCharCode(65 + angleIndex)}</small><h2>{angleName}</h2><b>{items.length} 項內容</b></div></div><div className="role-summary">{roleSummary(items).map((summary) => <span key={summary.role}><i><SoonIcon name={summary.icon} size={14}/></i><b>{summary.count}</b>{summary.label}</span>)}</div><em>查看製作計劃</em></summary>
        <div className="timeline-title">SOON 建議的 4 星期發布節奏</div><div className="campaign-timeline"><span><b>W1</b>建立認知</span><span><b>W2</b>重點宣傳</span><span><b>W3</b>互動延伸</span><span><b>W4</b>資訊補充</span></div>
        <div className="creative-grid">{[...items].sort((a, b) => (campaignSchedule.get(a.id)?.day || 99) - (campaignSchedule.get(b.id)?.day || 99)).map((project) => {
          const visual = project.production?.visualBrief
          const script = project.production?.script
          const job = jobByProject.get(project.id)
          const schedule = campaignSchedule.get(project.id)
          return <article key={project.id} className="creative-card">
            <div className="schedule-label"><b>第 {schedule?.day || '—'} 日</b><span>{schedule?.phase || '內容計劃'}</span></div>
            <div className="card-top"><span><i>{formatIcons[project.selected_format] || '•'}</i>{formatLabels[project.selected_format] || project.selected_format?.replace('_', ' ')}</span><em>{roleLabels[project.creative_role] || project.creative_role}</em></div>
            {project.brief?.formatReason ? <small className="format-reason">SOON 建議 · {project.brief.formatReason}</small> : null}
            {job?.output?.asset?.url ? <div className="asset-preview" role="img" aria-label={`${project.title} 已生成素材`} style={{ backgroundImage: `url("${job.output.asset.url}")` }}><span>{job.output.referenceMode === 'product_image' ? '✓ 已參考產品原圖' : job.output.referenceMode === 'concept_only' ? '概念圖 · 未有產品原圖' : job.job_type === 'video_storyboard' ? '分鏡主畫面' : '已生成素材'}</span></div> : null}
            <h3>{project.title}</h3><p>{project.production?.concept || project.brief?.purpose}</p>
            {project.production?.hooks?.length ? <div className="block"><b>開場句</b><ul>{project.production.hooks.slice(0, 3).map((hook) => <li key={hook}>{hook}</li>)}</ul></div> : null}
            {script?.opening ? <div className="block"><b>短片腳本 · {script.durationSeconds || 20} 秒</b><p>{script.opening}</p>{script.scenes?.slice(0, 3).map((scene) => <small key={`${scene.seconds}-${scene.visual}`}>{scene.seconds}：{scene.visual || scene.voiceover}</small>)}</div> : null}
            {project.selected_format === 'carousel' && project.production?.carouselPlan?.slides?.length ? <div className="block"><b>輪播結構 · {project.production.carouselPlan.slideCount || project.production.carouselPlan.slides.length} 頁</b>{project.production.carouselPlan.slides.slice(0, 4).map((slide, index) => <small key={`${index}-${slide.headline}`}><strong>{index + 1}</strong> {slide.headline || slide.purpose}</small>)}</div> : null}
            {visual?.composition || visual?.generationPrompt ? <div className="block"><b>視覺方向</b><p>{visual.composition || visual.generationPrompt}</p>{visual.overlayCopy ? <small>畫面文字：{visual.overlayCopy}</small> : null}</div> : null}
            {project.production?.captionDraft ? <div className="block"><b>貼文文案</b><p>{project.production.captionDraft}</p></div> : null}
            {job ? <div className={`job-status ${job.status}`}><div><b>{job.status === 'completed' ? '✓ 素材已完成' : job.status === 'failed' ? '生成失敗' : job.status === 'processing' ? '正在生成' : '等候生成'}</b><span>{job.progress}% · 第 {job.attempt}/{job.max_attempts} 次</span></div><progress max="100" value={job.progress} />{job.status === 'failed' ? <><small>{job.error_message}</small><button type="button" disabled={running || job.attempt >= job.max_attempts} onClick={() => void retry(job)}>重新嘗試</button></> : job.status === 'completed' ? <button type="button" disabled={running || job.attempt >= job.max_attempts} onClick={() => void regenerateWithProduct(job)}>用產品原圖重新生成</button> : null}</div> : null}
            <button type="button" onClick={() => openEditor(project)}>修改製作稿 →</button>
          </article>
        })}</div>
      </details>)}</section><section className="confirm-plan"><div><small>WEEK {activeWeek} · {activePhase}</small><strong>確認計劃，開始製作第 {activeWeek} 星期內容</strong><span>今次只會製作 Week {activeWeek} 的 {activeWeekProjects.length} 項內容；完成後仍可逐項修改及審批。</span></div><button type="button" disabled={running || !activeWeekProjects.length} onClick={() => void confirmWeek(activeWeek)}>{running ? `正在製作 Week ${activeWeek}…` : `確認計劃，製作 Week ${activeWeek} →`}</button></section>
    </>}
    {weekOneGenerating ? <div className="generation-overlay"><section className="generation-progress" aria-live="polite"><div className="ai-orb"><i /><i /><i /></div><small>SOON AI · WEEK {activeWeek}</small><h2>正在製作你的第 {activeWeek} 星期內容</h2><p>你會即時見到每項工作進度。請暫時保持此頁開啟。</p><div className="progress-track"><span style={{ width: `${weekOneProgress.total ? (weekOneProgress.completed / weekOneProgress.total) * 100 : 4}%` }} /></div><strong>{weekOneProgress.completed}/{weekOneProgress.total} 項製作預覽完成</strong><div className="activity-log">{generationActivity.map((activity, index) => <span className={index === generationActivity.length - 1 ? 'active' : ''} key={`${index}-${activity}`}>{activity}</span>)}</div></section></div> : null}
    {editing ? <div className="edit-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null) }}><section className="edit-panel" role="dialog" aria-modal="true" aria-label="修改製作稿"><header><div><small>{roleLabels[editing.creative_role] || editing.creative_role}</small><h2>修改製作稿</h2></div><button type="button" onClick={() => setEditing(null)} aria-label="關閉">×</button></header><label>標題<input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></label><label>核心概念<textarea rows={4} value={editConcept} onChange={(event) => setEditConcept(event.target.value)} /></label><label>{editCopyLabel(editing)}<textarea rows={editing.creative_role === 'caption' ? 8 : 5} value={editCopy} onChange={(event) => setEditCopy(event.target.value)} /></label><footer><button className="cancel" type="button" onClick={() => setEditing(null)}>取消</button><button type="button" disabled={editSaving || !editTitle.trim()} onClick={() => void saveEdit()}>{editSaving ? '正在儲存…' : '儲存修改'}</button></footer></section></div> : null}
  </section><style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} /></main>
}

const styles = `
  .creative-page{min-height:100vh;display:grid;grid-template-columns:240px minmax(0,1fr);background:#f5f5f6;color:#202126}.creative-shell{min-width:0;padding:34px clamp(18px,4vw,54px) 80px}.back{border:0;background:transparent;color:#737780;padding:0;font:inherit;cursor:pointer}.creative-shell>header{max-width:1160px;margin:30px auto 25px}.creative-shell>header small,.angle-heading>span,.generation-bar small,.plan-intro small{color:#8a7323;font-size:12px;font-weight:850;letter-spacing:.15em}.creative-shell>header h1{margin:7px 0;font-size:clamp(2.2rem,5vw,4rem);line-height:1;letter-spacing:-.05em}.creative-shell>header p{margin:0;color:#757981}.loading{max-width:900px;min-height:380px;display:grid;place-items:center;align-content:center;margin:auto;border:1px solid #e0e1e4;border-radius:22px;background:#fff;text-align:center}.loading i{width:38px;height:38px;border:3px solid #e8e8e8;border-top-color:#202126;border-radius:50%;animation:spin .8s linear infinite}.loading h2{margin:18px 0 4px}.loading p{margin:0;color:#777b83}.loading div{display:flex;gap:7px;margin-top:20px}.loading span{border-radius:999px;background:#f1f2f3;padding:7px 10px;color:#696d74;font-size:11px;font-weight:750}@keyframes spin{to{transform:rotate(360deg)}}.notice{max-width:1160px;display:flex;justify-content:space-between;gap:16px;margin:0 auto 18px;border:1px solid #d8e7dc;border-radius:12px;background:#f0f8f2;color:#286b3d;padding:12px 14px;font-size:13px;font-weight:700}.notice.error{border-color:#efcccc;background:#fff1f1;color:#993737}.notice button{border:0;background:transparent;color:inherit;font:inherit;font-weight:850;cursor:pointer}.generation-bar{max-width:1160px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:20px;margin:0 auto 16px;border-radius:18px;background:#202126;color:#fff;padding:22px}.generation-bar>div{display:grid;gap:5px}.generation-bar strong{font-size:1.2rem}.generation-bar span{max-width:760px;color:#b9bbc1;font-size:11px;line-height:1.5}.generation-bar button{min-height:46px;flex:0 0 auto;border:0;border-radius:11px;background:#f6d260;color:#202126;padding:0 17px;font:inherit;font-weight:850;cursor:pointer}.generation-bar button:disabled{opacity:.5;cursor:not-allowed}.plan-intro{max-width:1160px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:20px;margin:0 auto 10px;padding:10px 4px}.plan-intro>div{display:grid;gap:3px}.plan-intro strong{font-size:1rem}.plan-intro span{color:#777b83;font-size:11px}.plan-intro>b{border-radius:999px;background:#eceef1;padding:7px 10px;font-size:11px}.angle-section{max-width:1160px;margin:0 auto 10px;border:1px solid #dedfe2;border-radius:17px;background:#fff;overflow:hidden}.angle-section>summary{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,2fr) auto;align-items:center;gap:18px;padding:19px 20px;cursor:pointer;list-style:none}.angle-section>summary::-webkit-details-marker{display:none}.angle-heading{display:grid;grid-template-columns:1fr auto;align-items:end;margin:0}.angle-heading>span{grid-column:1/-1}.angle-heading h2{margin:4px 0 0;font-size:1.15rem;line-height:1.3}.angle-heading b{color:#7b7f86;font-size:11px}.role-summary{display:flex;flex-wrap:wrap;gap:5px}.role-summary span{border-radius:999px;background:#f3f4f5;color:#61656d;padding:6px 8px;font-size:9px;font-weight:750}.angle-section>summary>em{color:#50545b;font-size:11px;font-style:normal;font-weight:850}.angle-section>summary>em:after{content:' ＋'}.angle-section[open]>summary>em:after{content:' −'}.angle-section[open]>summary{border-bottom:1px solid #e8e9eb}.creative-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:16px}.creative-card{display:flex;min-width:0;flex-direction:column;border:1px solid #dedfe2;border-radius:15px;background:#fff;padding:16px}.card-top{display:flex;justify-content:space-between;gap:8px}.card-top span{border-radius:999px;background:#fff2bd;color:#6c560d;padding:5px 8px;font-size:10px;font-weight:900;text-transform:uppercase}.card-top em{color:#888c93;font-size:10px;font-style:normal;text-transform:capitalize}.asset-preview{height:190px;margin:13px 0 0;border-radius:12px;background-position:center;background-size:cover;position:relative;overflow:hidden}.asset-preview span{position:absolute;left:8px;bottom:8px;border-radius:999px;background:rgba(20,21,24,.78);color:#fff;padding:5px 7px;font-size:9px}.creative-card h3{margin:13px 0 7px;font-size:1.1rem;line-height:1.3}.creative-card>p{margin:0 0 13px;color:#696d74;font-size:12px;line-height:1.5}.block{border-top:1px solid #ececef;padding:11px 0}.block>b{font-size:11px;text-transform:uppercase;letter-spacing:.08em}.block p,.block li{color:#5f636a;font-size:11px;line-height:1.5}.block p{margin:5px 0}.block ul{margin:6px 0;padding-left:17px}.block small{display:block;margin-top:5px;color:#777b82;font-size:10px;line-height:1.45}.job-status{display:grid;gap:6px;margin:8px 0 12px;border-radius:10px;background:#f3f4f5;padding:9px}.job-status>div{display:flex;justify-content:space-between;font-size:10px}.job-status>div span{color:#7b7f86}.job-status progress{width:100%;height:5px}.job-status.failed{background:#fff0f0;color:#9a3535}.job-status small{font-size:9px;line-height:1.4}.job-status button{justify-self:start;border:0;background:transparent;color:inherit;padding:0;font:inherit;font-size:10px;font-weight:900;cursor:pointer}.creative-card>button{min-height:38px;margin-top:auto;border:1px solid #dedfe2;border-radius:9px;background:#fff;color:#3f434a;padding:0 12px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.creative-card>button:hover{background:#f4f5f6}@media(max-width:1100px){.creative-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.angle-section>summary{grid-template-columns:1fr}.angle-section>summary>em{justify-self:start}}@media(max-width:900px){.creative-page{grid-template-columns:1fr}.creative-page .sidebar{display:none}}@media(max-width:640px){.creative-grid{grid-template-columns:1fr;padding:12px}.generation-bar{align-items:stretch;flex-direction:column}.generation-bar button{width:100%}.plan-intro{align-items:flex-start}.angle-section>summary{padding:16px}}
  .angle-overview-grid{max-width:1160px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0 auto}.angle-overview-grid .angle-section{width:100%;margin:0}.angle-overview-grid .angle-section[open]{grid-column:1/-1}.angle-overview-grid .angle-section>summary{min-height:310px;display:flex;flex-direction:column;align-items:stretch;gap:18px;padding:24px}.angle-heading{display:flex;align-items:flex-start;gap:14px}.angle-heading>div{min-width:0;display:grid;gap:4px}.angle-heading>div small{color:#8a7323;font-size:10px;font-weight:850;letter-spacing:.11em}.angle-heading h2{margin:0;font-size:1.35rem}.angle-heading b{margin-top:3px}.angle-letter{width:46px;height:46px;flex:0 0 auto;display:grid;place-items:center;border-radius:14px;background:#202126;color:#f6d260!important;font-size:1.15rem!important;font-weight:900;letter-spacing:0!important}.role-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.role-summary span{display:grid;grid-template-columns:26px auto 1fr;align-items:center;gap:5px;border-radius:10px;background:#f5f5f6;padding:9px;color:#62666e;font-size:9px}.role-summary i{width:26px;height:26px;display:grid;place-items:center;border-radius:8px;background:#fff;color:#202126;font-size:13px;font-style:normal}.role-summary b{color:#202126;font-size:11px}.angle-overview-grid .angle-section>summary>em{display:flex;align-items:center;justify-content:space-between;margin-top:auto;border-top:1px solid #e8e9eb;padding-top:14px;color:#202126}.angle-overview-grid .angle-section[open]>summary{min-height:0}.angle-overview-grid .angle-section[open]>summary>em{margin-top:0}@media(max-width:820px){.angle-overview-grid{grid-template-columns:1fr}.angle-overview-grid .angle-section[open]{grid-column:auto}.angle-overview-grid .angle-section>summary{min-height:0}.role-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.role-summary{grid-template-columns:1fr}.plan-intro{flex-direction:column}.plan-intro>b{align-self:flex-start}}
  .plan-actions{display:flex;align-items:center;gap:8px}.plan-actions>b{border-radius:999px;background:#eceef1;padding:7px 10px;font-size:11px}.plan-actions button{border:1px solid #d8dade;border-radius:9px;background:#fff;color:#464a51;padding:8px 10px;font:inherit;font-size:10px;font-weight:800;cursor:pointer}.campaign-timeline{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:16px 16px 0}.campaign-timeline span{display:flex;align-items:center;gap:7px;border-radius:10px;background:#f4f5f6;color:#62666d;padding:9px;font-size:10px;font-weight:800}.campaign-timeline b{width:24px;height:24px;display:grid;place-items:center;border-radius:7px;background:#202126;color:#f6d260;font-size:8px}.schedule-label{display:flex;align-items:center;gap:7px;margin-bottom:10px;color:#777b83;font-size:9px}.schedule-label b{border-radius:999px;background:#202126;color:#fff;padding:5px 7px}.schedule-label span{font-weight:800}.card-top span{display:inline-flex;align-items:center;gap:6px}.card-top span i{width:20px;height:20px;display:grid;place-items:center;border-radius:6px;background:#fff;color:#202126;font-size:10px;font-style:normal}.edit-overlay{position:fixed;inset:0;z-index:100;background:rgba(20,21,24,.38);display:flex;justify-content:flex-end;backdrop-filter:blur(4px)}.edit-panel{width:min(480px,100%);height:100%;display:flex;flex-direction:column;gap:18px;background:#fff;color:#202126;padding:26px;overflow:auto;box-shadow:-20px 0 50px rgba(20,21,24,.16)}.edit-panel>header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid #e6e7e9;padding-bottom:18px}.edit-panel header small{color:#8a7323;font-size:10px;font-weight:850;letter-spacing:.1em}.edit-panel header h2{margin:5px 0 0;font-size:1.65rem}.edit-panel header button{width:38px;height:38px;border:1px solid #dedfe2;border-radius:50%;background:#fff;font-size:24px;cursor:pointer}.edit-panel label{display:grid;gap:7px;color:#4c5057;font-size:11px;font-weight:850}.edit-panel input,.edit-panel textarea{width:100%;box-sizing:border-box;border:1px solid #d9dade;border-radius:10px;background:#f8f8f9;color:#202126;padding:12px;font:inherit;font-size:13px;line-height:1.55;outline:none;resize:vertical}.edit-panel input:focus,.edit-panel textarea:focus{border-color:#202126;background:#fff;box-shadow:0 0 0 3px rgba(32,33,38,.07)}.edit-panel>footer{display:flex;justify-content:flex-end;gap:8px;margin-top:auto;border-top:1px solid #e6e7e9;padding-top:18px}.edit-panel>footer button{min-height:42px;border:0;border-radius:9px;background:#202126;color:#fff;padding:0 15px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.edit-panel>footer .cancel{border:1px solid #d8dade;background:#fff;color:#555960}.edit-panel>footer button:disabled{opacity:.45}@media(max-width:700px){.campaign-timeline{grid-template-columns:repeat(2,minmax(0,1fr))}.plan-actions{align-items:flex-end;flex-direction:column}.edit-panel{padding:20px}}
  .format-reason{display:block;margin:8px 0 0;color:#777b83;font-size:9px;line-height:1.45}.block small strong{display:inline-grid;width:18px;height:18px;place-items:center;margin-right:4px;border-radius:5px;background:#f1f2f3;color:#202126;font-size:8px}.timeline-title{padding:15px 16px 0;color:#7b7f86;font-size:10px;font-weight:800}.confirm-plan{max-width:1160px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:22px;margin:18px auto 0;border-radius:18px;background:#202126;color:#fff;padding:22px}.confirm-plan>div{display:grid;gap:5px}.confirm-plan small{color:#f6d260;font-size:10px;font-weight:900;letter-spacing:.12em}.confirm-plan strong{font-size:1.15rem}.confirm-plan span{color:#b9bbc1;font-size:11px}.confirm-plan button{min-height:48px;flex:0 0 auto;border:0;border-radius:11px;background:#f6d260;color:#202126;padding:0 18px;font:inherit;font-weight:900;cursor:pointer}.confirm-plan button:disabled{opacity:.55;cursor:wait}@media(max-width:700px){.confirm-plan{align-items:stretch;flex-direction:column}.confirm-plan button{width:100%}}
  .generation-overlay{position:fixed;inset:0;z-index:120;display:grid;place-items:center;background:rgba(246,246,247,.92);padding:20px;backdrop-filter:blur(12px)}.generation-progress{width:min(620px,100%);display:grid;justify-items:center;border:1px solid #dedfe2;border-radius:24px;background:#fff;padding:38px;box-shadow:0 28px 80px rgba(20,21,24,.12);text-align:center}.ai-orb{width:62px;height:62px;display:flex;align-items:center;justify-content:center;gap:4px;margin-bottom:20px;border-radius:20px;background:#202126}.ai-orb i{width:6px;height:18px;border-radius:6px;background:#f6d260;animation:thinking 1.1s ease-in-out infinite}.ai-orb i:nth-child(2){height:30px;animation-delay:.15s}.ai-orb i:nth-child(3){animation-delay:.3s}.generation-progress>small{color:#8a7323;font-size:10px;font-weight:900;letter-spacing:.14em}.generation-progress h2{margin:9px 0 6px;font-size:1.65rem}.generation-progress>p{margin:0;color:#777b83;font-size:12px}.progress-track{width:100%;height:8px;margin:24px 0 9px;border-radius:999px;background:#eceef0;overflow:hidden}.progress-track span{display:block;height:100%;border-radius:inherit;background:#202126;transition:width .45s ease}.generation-progress>strong{font-size:12px}.activity-log{width:100%;display:grid;gap:8px;margin-top:24px;text-align:left}.activity-log span{border-radius:10px;background:#f5f5f6;color:#7a7e85;padding:10px 12px;font-size:11px}.activity-log span.active{background:#fff7d7;color:#5f4b0a;font-weight:800}@keyframes thinking{0%,100%{transform:scaleY(.55);opacity:.55}50%{transform:scaleY(1);opacity:1}}@media(max-width:600px){.generation-progress{padding:28px 20px}.generation-progress h2{font-size:1.35rem}}
`
