'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import { getStoredOnboardingSessionId } from '@/lib/onboarding-session'
import { createClient } from '@/lib/supabase'
import {
  getActiveWorkspaceId,
  isBechillWorkspace,
  setActiveWorkspaceId,
  type WorkspaceSummary,
  WORKSPACE_CHANGED_EVENT,
} from '@/lib/workspace-client'

type HomePost = {
  id: string
  sourceKey?: string
  type: string
  typeKind: 'image' | 'article' | 'video'
  title: string
  body: string
  time: string
  image: string | null
  media?: string[]
  status: string
  recordType?: 'campaign_post' | 'content_project'
  production?: Record<string, unknown>
}

type HomeCampaign = {
  id: string
  name: string
  type: string
  timing: string
  status: string
  statusKind: 'generating' | 'done'
  image: string | null
}

type PublishedPostSummary = {
  count: number
  latestTitle: string
  latestTime: string
}

const fallbackUpcomingPosts: HomePost[] = [
  {
    id: '1',
    type: '靜態圖片',
    typeKind: 'image',
    title: '差點沒拍下來的片段',
    body: '最細小的片段，往往承載最真實的感覺。把那個笑聲、眼神或普通一刻分享出去，就會變成朋友想再看一次的回憶。',
    time: '今天 10:00',
    image: '/photo-control/coffee-full-freedom.jpg',
    status: '新內容',
  },
  {
    id: '2',
    type: '文章',
    typeKind: 'article',
    title: '一個簡單房間，幾段短片，突然就值得重播',
    body: '和朋友聚在一起，本來可以很平常。但當那些片段被剪成有節奏的日常故事，它就會變成你想再看、再分享的內容。',
    time: '今天 14:00',
    image: '/assets/content-strategies/photos/behind-the-scenes.jpg',
    status: '新內容',
  },
  {
    id: '3',
    type: '短影片',
    typeKind: 'video',
    title: '今天值得留下的一秒',
    body: '晚上的內容會用更輕鬆的節奏，提醒觀眾每日都有值得記錄的微小時刻。',
    time: '今天 18:00',
    image: '/assets/content-strategies/photos/lifestyle-content.jpg',
    status: '草稿',
  },
]

const fallbackCampaigns: HomeCampaign[] = [
  {
    id: '1',
    name: 'Moms, Memories, and Moments That Matter',
    type: '生活內容',
    timing: '5月10日 - 5月16日',
    status: '今日生成中',
    statusKind: 'generating',
    image: '/assets/content-strategies/photos/lifestyle-content.jpg',
  },
  {
    id: '2',
    name: '差點沒拍下來的片段',
    type: '分享日常',
    timing: '5月1日 - 5月8日',
    status: '已完成',
    statusKind: 'done',
    image: '/photo-control/coffee-full-freedom.jpg',
  },
]

const TRIAL_CREDITS = 200

function formatDashboardTime(value: unknown) {
  if (typeof value !== 'string') return '今天 10:00'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '今天 10:00'

  const today = new Date()
  const time = date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return `今天 ${time}`
  }
  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`
}

function formatDashboardDate(value: unknown) {
  if (typeof value !== 'string') return '準備中'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '準備中'
  return `${date.getMonth() + 1}月${date.getDate()}日開始`
}

function formatPublishedTime(value: unknown) {
  if (typeof value !== 'string') return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-HK', {
    dateStyle: 'medium',
    hour12: false,
    timeStyle: 'short',
  })
}

function summarizePublishedPosts(posts: any[] | null | undefined): PublishedPostSummary {
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
  const publishedPosts = (posts || [])
    .filter((post) => post?.status === 'published' || post?.status === 'posted')
    .map((post) => {
      const publishedAt = typeof post?.posted_at === 'string' ? post.posted_at : post?.scheduled_at
      const publishedTime = typeof publishedAt === 'string' ? new Date(publishedAt).getTime() : NaN
      return { post, publishedAt, publishedTime }
    })
    .filter((item) => Number.isFinite(item.publishedTime) && item.publishedTime >= sevenDaysAgo && item.publishedTime <= now)
    .sort((a, b) => b.publishedTime - a.publishedTime)

  const latest = publishedPosts[0]
  return {
    count: publishedPosts.length,
    latestTime: latest ? formatPublishedTime(latest.publishedAt) : '',
    latestTitle: latest?.post?.title || '',
  }
}

function mapPostType(type: unknown): Pick<HomePost, 'type' | 'typeKind'> {
  if (type === 'emails' || type === 'email' || type === 'blog') return { type: '電郵內容', typeKind: 'article' }
  if (type === 'carousels' || type === 'carousel') return { type: '輪播貼文', typeKind: 'image' }
  if (type === 'feed-videos' || type === 'video') return { type: '動態影片', typeKind: 'video' }
  if (type === 'short-form-video') return { type: '短影片', typeKind: 'video' }
  if (type === 'stories') return { type: '限時動態', typeKind: 'image' }
  return { type: '靜態圖片', typeKind: 'image' }
}

function mapPostStatus(status: unknown) {
  if (status === 'ready' || status === 'pending_approval') return '待審批'
  if (status === 'approved') return '已確認'
  if (status === 'scheduled') return '已排程'
  if (status === 'published' || status === 'posted') return '已發布'
  if (status === 'rejected') return '要修改'
  if (status === 'withdrawn') return '已撤回'
  if (status === 'publishing') return '發布中'
  return status === 'draft' ? '草稿' : '新內容'
}

function readPostMedia(post: any) {
  const assets = Array.isArray(post?.captions?.assets) ? post.captions.assets : []
  return assets
    .map((asset: any) => asset?.url)
    .filter((url: unknown): url is string => typeof url === 'string' && url.length > 0)
}

function mapCampaignStatus(status: unknown): Pick<HomeCampaign, 'status' | 'statusKind'> {
  if (status === 'completed') return { status: '已完成', statusKind: 'done' }
  if (status === 'posting') return { status: '發布中', statusKind: 'generating' }
  return { status: '今日生成中', statusKind: 'generating' }
}

function isPlaceholderImage(value: string | null) {
  return !value || value.startsWith('data:image/svg+xml') || value.includes('placeholder')
}

const clientChangeRecords = [
  {
    date: '2026年8月7日（五）',
    title: '客戶提出修改',
    desc: '04《休息不是懶惰》需要改表情，其餘內容維持原狀。',
  },
  {
    date: '2026年8月12日（三）',
    title: '客戶確認 Week 1',
    desc: '本週 5 條 IG Post 已確認，01 已發布，其餘 4 條準備按排程發布。',
  },
  {
    date: '2026年8月12日（三）',
    title: '排程時間更新',
    desc: '02-05 已更新為 8月13日至8月16日每日 18:00 發布。',
  },
]

type ApprovalDecision = 'ok' | 'edit' | 'no'

type ApprovalPost = {
  id?: string
  no: string
  kind: string
  meta: string
  goal: string
  title: string
  badge?: string
  status?: 'published' | 'confirmed'
  publishedAt?: string
  media: string[]
  caption: string
  note: string
  recordType?: 'campaign_post' | 'content_project'
  production?: Record<string, unknown>
  reviewNote?: string
}

type ReviewNote = { id: string; project_id?: string | null; post_id?: string | null; original_text: string; reviewer?: string | null; created_at: string; resolved?: boolean }

type ApprovalWeek = {
  brandLine: string
  completedText: string
  deadline: string
  label: string
  remark: string
  summary: string
  posts: ApprovalPost[]
  whatsappPrefix: string
  workspaceId?: string | null
  permissions?: DashboardPermissions
}

type DashboardPermissions = { canApprove: boolean; canEdit: boolean; canPublish: boolean }

const approvalLabels: Record<ApprovalDecision, string> = {
  ok: '可以出',
  edit: '要修改',
  no: '換過',
}

const approvalQuickNotes = [
  '文案太長',
  '語氣不符',
  '想換金句',
  '配色想調整',
  '文字太小',
  '想加 CTA',
  '修改 hashtag',
  '想看多個版本',
]

const bechillApprovalWeek: ApprovalWeek = {
  brandLine: '笨chill × SOON ・ 內容審批',
  completedText: '01 已發布，其餘內容會留在這裡準備按排程發布。',
  label: 'Week 1（2026年8月10-16日）',
  deadline: '客人已確認本週全部內容',
  summary: '2026年8月 Week 1 ・ 第四版 ・ 5 條 IG Post',
  remark: '01 已發布，其餘 4 條準備按排程發布',
  whatsappPrefix: '【笨chill × SOON】內容審批',
  posts: [
    {
      no: '01',
      kind: '金句 Carousel',
      meta: '3 格輪播 ・ 已發布：2026年8月12日（三）18:00 HKT',
      goal: '主打 Save · 共鳴',
      title: '《煩惱可以分兩種》',
      badge: '已發布',
      status: 'published',
      publishedAt: '2026年8月12日（三）18:00 HKT',
      media: ['a/01_worries_1.webp', 'a/01_worries_2.webp', 'a/01_worries_3.webp'],
      caption:
        'Tag 一個很多煩惱的朋友\n-\n煩惱可以分兩種：\n解決到嘅，慢慢做。\n解決唔到嘅，坐低先。\n可以舒服，點解要辛苦。',
      note: '中英對照排版，三格遞進：有煩惱 → 解決到 → 解決唔到。',
    },
    {
      no: '02',
      kind: '金句 Carousel',
      meta: '7 格輪播 ・ 建議出帖：8月13日（四）18:00',
      goal: '主打 Save · 共鳴',
      title: '《乖乖等你》',
      badge: '已確認',
      status: 'confirmed',
      media: [
        'a/02_wait_1.webp',
        'a/02_wait_2.webp',
        'a/02_wait_3.webp',
        'a/02_wait_4.webp',
        'a/02_wait_5.webp',
        'a/02_wait_6.webp',
        'a/02_wait_7.webp',
      ],
      caption:
        '你諗起邊個？\n\n有些人會陪你一段路。\n有些人會在某個時間明白你。\n有些關係很好，只是未必能一直留在原地。\n但笨chill 不太懂講大道理。\n牠一直在你回來之前，乖乖等你。\n-\n你同你屋企寵物之間，有冇一件好窩心嘅小事？\n留言講俾我哋聽',
      note: '六格鋪陳（情人／朋友／同事／親人／難過／OT），第七格改成笨chill 開心迎接主人，收「或許我不能陪你一輩子，但我會用我的一輩子陪你」。',
    },
    {
      no: '03',
      kind: '金句 Carousel',
      meta: '4 格輪播 ・ 建議出帖：8月14日（五）18:00',
      goal: '主打 Save · 共鳴',
      title: '《有你嘅世界》',
      badge: '已確認',
      status: 'confirmed',
      media: ['a/03_world_1.webp', 'a/03_world_2.webp', 'a/03_world_3.webp', 'a/03_world_4.webp'],
      caption:
        'Tag 一個成日好忙嘅朋友\n你開心，世界照樣轉。\n你唔開心，世界一樣照樣轉。\n唔係你唔重要，\n係唔使咩都攬上身。\n舒服啲啦 —— 世界唔會因為你抖五分鐘而停。',
      note: '四格遞進：開心／唔開心 → 其實一樣 → 做咩俾咁大壓力自己。',
    },
    {
      no: '04',
      kind: '金句 Carousel',
      meta: '7 格輪播 ・ 建議出帖：8月15日（六）18:00',
      goal: '主打 Save · 共鳴',
      title: '《休息不是懶惰》',
      badge: '已確認',
      status: 'confirmed',
      media: [
        'a/04_rest_1.webp',
        'a/04_rest_2.webp',
        'a/04_rest_3.webp',
        'a/04_rest_4.webp',
        'a/04_rest_5.webp',
        'a/04_rest_6.webp',
        'a/04_rest_7.webp',
      ],
      caption:
        'Tag 一個最近需要休息嘅朋友\n\n「休息並不是懶惰。在夏日某天躺在樹下草地上，聽水聲潺潺，或看雲在天上飄過，絕不是浪費時間。」\n\n“Rest is not idleness, and to lie sometimes on the grass under trees on a summer’s day, listening to the murmur of the water, or watching the clouds float across the sky, is by no means a waste of time.”\n\nJohn Lubbock',
      note: '中英對照，七格：由「最累的不是忙」鋪到「休息不是懶惰」，尾格以 John Lubbock 收。',
    },
    {
      no: '05',
      kind: '金句 Carousel',
      meta: '4 格輪播 ・ 建議出帖：8月16日（日）18:00',
      goal: '主打 Share · 吸新粉',
      title: '《沖完涼的髮型》',
      badge: '已確認',
      status: 'confirmed',
      media: ['a/05_hair_1.webp', 'a/05_hair_2.webp', 'a/05_hair_3.webp', 'a/05_hair_4.webp'],
      caption: '你喜歡笨chill沖完涼的髮型嗎？',
      note: '第 4 格為笨chill 真實相片，用真人真狗畫面吸引新粉絲。',
    },
  ],
}

function approvalImageSrc(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  return `https://soon-approval.vercel.app/${path}`
}

function ApprovalBoard({ week }: { week: ApprovalWeek }) {
  const [decisions, setDecisions] = useState<(ApprovalDecision | null)[]>(
    () => week.posts.map(() => null)
  )
  const [notes, setNotes] = useState(() => week.posts.map((post) => post.reviewNote || ''))
  const [slides, setSlides] = useState(() => week.posts.map(() => 0))
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([])
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({})
  const [editingCaptionPostId, setEditingCaptionPostId] = useState<string | null>(null)
  const [savingCaptionPostId, setSavingCaptionPostId] = useState<string | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [decisionErrors, setDecisionErrors] = useState<Record<number, string>>({})
  const [failedDecisions, setFailedDecisions] = useState<Record<number, ApprovalDecision>>({})
  const [preview, setPreview] = useState<{ src: string; caption: string } | null>(null)
  const [toast, setToast] = useState('')
  const visiblePosts = week.posts.filter(
    (post) => post.status !== 'published' && (!post.id || !hiddenPostIds.includes(post.id))
  )

  const completed = visiblePosts.filter((post) => {
    const index = week.posts.findIndex((item) => item === post)
    if (post.status === 'confirmed') return true
    const decision = decisions[index]
    return decision === 'ok' || (decision && notes[index].trim())
  }).length
  const progressPercent = visiblePosts.length ? (completed / visiblePosts.length) * 100 : 0

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }

  function setDecision(index: number, decision: ApprovalDecision) {
    setDecisions((current) => current.map((item, itemIndex) => (itemIndex === index ? decision : item)))
  }

  async function persistDecision(index: number, decision: ApprovalDecision, previousDecision: ApprovalDecision | null) {
    const post = week.posts[index]
    if (!post?.id || !week.workspaceId) return

    setSavingIndex(index)
    setDecisionErrors((current) => {
      const next = { ...current }
      delete next[index]
      return next
    })
    try {
      const isContentProject = post.recordType === 'content_project'
      const response = await fetch(isContentProject ? '/api/content-projects/approve' : decision === 'ok' ? '/api/posts/approve' : '/api/posts/reject', {
        body: JSON.stringify(isContentProject ? {
          projectId: post.id,
          workspaceId: week.workspaceId,
          decision: decision === 'ok' ? 'approved' : 'changes_requested',
          note: notes[index].trim(),
        } : { postId: post.id, workspaceId: week.workspaceId, note: notes[index].trim() }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.success) throw new Error(result?.detail || result?.error || '儲存失敗')
      setFailedDecisions((current) => {
        const next = { ...current }
        delete next[index]
        return next
      })
      showToast(decision === 'ok' ? '已儲存：可以出' : '已儲存：需要跟進')
    } catch (error) {
      const message = error instanceof Error ? error.message : '未能儲存審批狀態'
      setDecisions((current) => current.map((item, itemIndex) => itemIndex === index ? previousDecision : item))
      setFailedDecisions((current) => ({ ...current, [index]: decision }))
      setDecisionErrors((current) => ({ ...current, [index]: message }))
      showToast(message)
    } finally {
      setSavingIndex((current) => current === index ? null : current)
    }
  }

  function handleDecision(index: number, decision: ApprovalDecision) {
    if (savingIndex === index) return
    const previousDecision = decisions[index]
    setDecision(index, decision)
    void persistDecision(index, decision, previousDecision)
  }

  async function deleteApprovalPost(post: ApprovalPost) {
    if (!post.id || !week.workspaceId || deletingPostId) return
    const confirmed = window.confirm(`確定刪除「${post.title}」？\n\n內容會由首頁及審批頁移除。`)
    if (!confirmed) return

    setDeletingPostId(post.id)
    try {
      const isContentProject = post.recordType === 'content_project'
      const response = await fetch(isContentProject ? '/api/content-projects' : '/api/posts/reject', {
        body: JSON.stringify(isContentProject
          ? { projectId: post.id, workspaceId: week.workspaceId, stage: 'archived' }
          : { postId: post.id, workspaceId: week.workspaceId }),
        headers: { 'Content-Type': 'application/json' },
        method: isContentProject ? 'PATCH' : 'POST',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.success) throw new Error(result?.detail || result?.error || '刪除失敗')

      setHiddenPostIds((current) => [...current, post.id as string])
      showToast('內容已刪除')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '未能刪除內容')
    } finally {
      setDeletingPostId(null)
    }
  }

  function captionKey(post: ApprovalPost, index: number) {
    return post.id || post.no || String(index)
  }

  function startCaptionEdit(post: ApprovalPost, index: number) {
    const key = captionKey(post, index)
    setCaptionDrafts((current) => ({ ...current, [key]: current[key] ?? post.caption }))
    setEditingCaptionPostId(key)
  }

  async function saveCaptionEdit(post: ApprovalPost, index: number) {
    const key = captionKey(post, index)
    if (savingCaptionPostId || !post.id) return

    const nextCaption = (captionDrafts[key] ?? post.caption).trim()
    if (!nextCaption) {
      showToast('Caption 不可以留空')
      return
    }

    setSavingCaptionPostId(key)
    try {
      if (post.recordType === 'content_project' && week.workspaceId) {
        const response = await fetch('/api/content-projects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: post.id,
            workspaceId: week.workspaceId,
            production: { ...(post.production || {}), captionDraft: nextCaption },
          }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || !result?.success) throw new Error(result?.detail || result?.error || 'Caption 儲存失敗')
      } else {
        const supabase = createClient()
        const { error } = await supabase
          .from('campaign_posts')
          .update({ body: nextCaption, updated_at: new Date().toISOString() })
          .eq('id', post.id)
        if (error) throw error
      }

      post.caption = nextCaption
      setEditingCaptionPostId(null)
      showToast('Caption 已更新')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Caption 儲存失敗')
    } finally {
      setSavingCaptionPostId(null)
    }
  }

  function setNote(index: number, value: string) {
    setNotes((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  function addQuickNote(index: number, value: string) {
    setNotes((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        return item.trim() ? `${item.trim().replace(/[、,]$/, '')}、${value}` : value
      })
    )
  }

  function moveSlide(postIndex: number, direction: number) {
    const total = week.posts[postIndex].media.length
    setSlides((current) =>
      current.map((slide, itemIndex) => {
        if (itemIndex !== postIndex) return slide
        return Math.max(0, Math.min(total - 1, slide + direction))
      })
    )
  }

  function goToSlide(postIndex: number, slideIndex: number) {
    setSlides((current) => current.map((slide, itemIndex) => (itemIndex === postIndex ? slideIndex : slide)))
  }

  function buildApprovalText() {
    const date = new Date()
    const time = date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', hour12: false })
    const workspaceId = getActiveWorkspaceId()
    const approvalUrl =
      typeof window !== 'undefined' && workspaceId
        ? `${window.location.origin}/workspace/${workspaceId}`
        : 'https://sooncreator.network/onboarding'
    const lines = [
      week.whatsappPrefix,
      week.label,
      `提交時間：${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${time}`,
      `審批連結：${approvalUrl}`,
      '',
    ]

    visiblePosts.forEach((post) => {
      const index = week.posts.findIndex((item) => item === post)
      const decision = decisions[index]
      lines.push(`${post.no}. ${post.kind}${post.title}`)
      lines.push(
        post.status === 'confirmed'
            ? '已確認：可以出'
            : decision
              ? approvalLabels[decision]
              : '（未決定）'
      )
      if (decision && decision !== 'ok' && notes[index].trim()) lines.push(`→ ${notes[index].trim()}`)
      lines.push('')
    })

    const ok = visiblePosts.filter(
      (post) => post.status === 'confirmed' || decisions[week.posts.findIndex((item) => item === post)] === 'ok'
    ).length
    lines.push(`小結：${ok}/${visiblePosts.length} 條可以出，${visiblePosts.length - ok} 條要跟進。`)
    lines.push('—— 由 SOON 審批頁自動產生')
    return lines.join('\n')
  }

  async function copyApprovalText() {
    try {
      await navigator.clipboard.writeText(buildApprovalText())
      showToast('已複製，可貼上 WhatsApp')
    } catch {
      showToast('未能複製，請再試一次')
    }
  }

  function sendToWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildApprovalText())}`, '_blank', 'noopener')
  }

  return (
    <section className="approval-board" aria-label={`${week.label} SOON Approval`}>
      <header className="approval-board-hero">
        <div>
          <p>{week.brandLine}</p>
          <h2>{week.label}</h2>
        </div>
        <div className="approval-board-meta">
          <span>{week.summary}</span>
          <strong>{week.deadline}</strong>
          <small>{week.remark}</small>
        </div>
      </header>

      <div className="approval-progress-card">
        <div>
          <strong>
            本週確認 {completed}/{visiblePosts.length} 條
          </strong>
          <span>{week.completedText}</span>
        </div>
        <div className="approval-progress-track">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="approval-progress-actions">
          <button type="button" onClick={copyApprovalText}>
            複製文字
          </button>
          <button type="button" className="send" onClick={sendToWhatsApp}>
            傳送到 WhatsApp 工作小組
          </button>
        </div>
      </div>

      <div className="approval-posts">
        {week.posts.map((post, postIndex) => {
          const slide = slides[postIndex]
          const decision = decisions[postIndex]
          const isSavingDecision = savingIndex === postIndex
          const decisionError = decisionErrors[postIndex]
          const currentImage = approvalImageSrc(post.media[slide])
          const isPublished = post.status === 'published'
          const isConfirmed = post.status === 'confirmed'
          const needsNote = decision === 'edit' || decision === 'no'
          const captionEditKey = captionKey(post, postIndex)
          const isEditingCaption = editingCaptionPostId === captionEditKey
          const captionDraft = captionDrafts[captionEditKey] ?? post.caption

          if (isPublished || (post.id && hiddenPostIds.includes(post.id))) return null

          return (
            <article key={post.no} className={`approval-post ${decision ? `is-${decision}` : ''} ${isConfirmed ? 'is-confirmed' : ''}`}>
              <div className="approval-post-head">
                <div className="approval-tagrow">
                  <span className="approval-media-icon" aria-hidden="true">
                    <span />
                  </span>
                  <div>
                    <strong>{post.kind}</strong>
                    <span className="approval-meta">{post.meta}</span>
                  </div>
                  <div className="approval-head-actions">
                    <small>{post.goal}</small>
                    {post.id && week.workspaceId && week.permissions?.canApprove !== false ? (
                      <button
                        type="button"
                        className="approval-delete-btn"
                        disabled={deletingPostId === post.id}
                        onClick={() => void deleteApprovalPost(post)}
                        aria-label={`刪除內容：${post.title}`}
                        title="刪除內容"
                      >
                        {deletingPostId === post.id ? <span aria-hidden="true">…</span> : (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                          </svg>
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
                <h3>{post.title}</h3>
              </div>

              <div className="approval-gallery">
                <button
                  type="button"
                  className="approval-nav prev"
                  aria-label="上一格"
                  disabled={slide === 0}
                  onClick={() => moveSlide(postIndex, -1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="approval-nav next"
                  aria-label="下一格"
                  disabled={slide === post.media.length - 1}
                  onClick={() => moveSlide(postIndex, 1)}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="approval-image-button"
                  onClick={() =>
                    setPreview({
                      src: currentImage,
                      caption: `${post.title} ・ 第 ${slide + 1} / ${post.media.length} 格`,
                    })
                  }
                >
                  <img src={currentImage} alt={`${post.title} 第 ${slide + 1} 格`} loading="lazy" />
                  <span>{`${slide + 1} / ${post.media.length}`}</span>
                </button>
                <div className="approval-dots">
                  {post.media.map((_, slideIndex) => (
                    <button
                      key={slideIndex}
                      type="button"
                      className={slideIndex === slide ? 'on' : ''}
                      aria-label={`第 ${slideIndex + 1} 格`}
                      onClick={() => goToSlide(postIndex, slideIndex)}
                    />
                  ))}
                </div>
              </div>

              <div className="approval-post-body">
                <p className="approval-label">CAPTION</p>
                {isEditingCaption ? (
                  <div className="approval-caption-editor">
                    <textarea
                      value={captionDraft}
                      onChange={(event) =>
                        setCaptionDrafts((current) => ({ ...current, [captionEditKey]: event.target.value }))
                      }
                      aria-label={`${post.title} caption`}
                    />
                    <div className="approval-caption-editor-actions">
                      <button type="button" onClick={() => setEditingCaptionPostId(null)}>
                        取消
                      </button>
                      <button
                        type="button"
                        disabled={savingCaptionPostId === captionEditKey || !post.id}
                        onClick={() => void saveCaptionEdit(post, postIndex)}
                      >
                        {savingCaptionPostId === captionEditKey ? '儲存中...' : '儲存'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="approval-caption-block">
                    <div className="approval-caption">{captionDraft}</div>
                    <button type="button" className="approval-caption-edit-btn" disabled={week.permissions?.canEdit === false} onClick={() => startCaptionEdit(post, postIndex)}>
                      編輯 caption
                    </button>
                  </div>
                )}
                <p className="approval-label">備註</p>
                <p className="approval-note">{post.note}</p>
              </div>

              <div className="approval-decide">
                {isConfirmed ? (
                  <div className="approval-confirmed-note">
                    客人已確認，準備按排程發布。
                  </div>
                ) : (
                  <div className="approval-segment">
                    {(Object.keys(approvalLabels) as ApprovalDecision[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        data-value={value}
                        aria-pressed={decision === value}
                        disabled={week.permissions?.canApprove === false || isSavingDecision}
                        onClick={() => handleDecision(postIndex, value)}
                      >
                        {isSavingDecision && decision === value ? '儲存中…' : approvalLabels[value]}
                      </button>
                    ))}
                  </div>
                )}
                {!isConfirmed && week.permissions?.canApprove === false ? <p className="approval-permission-note">只有 Admin 或客戶審批人可以確認</p> : null}
                {!isConfirmed && decisionError ? (
                  <div className="approval-decision-error" role="alert">
                    <span>{decisionError}</span>
                    <button
                      type="button"
                      disabled={isSavingDecision}
                      onClick={() => handleDecision(postIndex, failedDecisions[postIndex])}
                    >
                      重試
                    </button>
                  </div>
                ) : null}
                {!isConfirmed && needsNote ? (
                  <div className="approval-note-box">
                    <textarea
                      value={notes[postIndex]}
                      onChange={(event) => setNote(postIndex, event.target.value)}
                      placeholder="請說明修改方向，例：第 3 格文字太小、最後一格想換一句 caption。"
                    />
                    <div className="approval-quick">
                      {approvalQuickNotes.map((quickNote) => (
                        <button key={quickNote} type="button" onClick={() => addQuickNote(postIndex, quickNote)}>
                          {quickNote}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      {preview ? (
        <button type="button" className="approval-lightbox" onClick={() => setPreview(null)}>
          <img src={preview.src} alt={preview.caption} />
          <span>{preview.caption}</span>
        </button>
      ) : null}

      {toast ? <div className="approval-toast">{toast}</div> : null}
    </section>
  )
}

function BechillApprovalBoard() {
  return <ApprovalBoard week={bechillApprovalWeek} />
}

function ImportedApprovalBoard({
  brandName,
  posts,
  workspaceId,
  reviewNotes,
  permissions,
}: {
  brandName: string
  posts: HomePost[]
  workspaceId: string | null
  reviewNotes: ReviewNote[]
  permissions: DashboardPermissions
}) {
  const approvalPosts: ApprovalPost[] = posts
    .map((post, index) => {
      const persistedStatus: ApprovalPost['status'] =
        post.status === '已確認' || post.status === '已排程' ? 'confirmed' : undefined

      return {
        id: post.id,
        no: String(index + 1).padStart(2, '0'),
        kind: post.type,
        meta: `${post.media?.length || 1} 格輪播 ・ 建議出帖：${post.time}`,
        goal: post.status,
        title: post.title,
        badge: post.status,
        status: persistedStatus,
        media: post.media?.length ? post.media : post.image ? [post.image] : [],
        caption: post.body,
        note: '由 SOON import 流程加入，等待檢查內容、圖片及 caption。',
        recordType: post.recordType,
        production: post.production,
        reviewNote: reviewNotes.find((note) => note.project_id === post.id || note.post_id === post.id)?.original_text || '',
      }
    })
    .filter((post) => post.media.length > 0)

  return (
    <ApprovalBoard
      week={{
        brandLine: `${brandName || 'Egg.soon'} × SOON ・ 內容審批`,
        completedText: '內容已匯入 SOON，等待檢查及確認。',
        deadline: approvalPosts[0]?.meta || '等待確認排程時間',
        label: '待檢查及審批',
        remark: '完成後可以複製審批文字或傳送到 WhatsApp 工作小組。',
        summary: `${approvalPosts.length} 條內容已匯入`,
        posts: approvalPosts,
        whatsappPrefix: `【${brandName || 'Egg.soon'} × SOON】內容審批`,
        workspaceId,
        permissions,
      }}
    />
  )
}

export default function OnboardingHomePage() {
  const router = useRouter()
  const [brandName, setBrandName] = useState('')
  const [dashboardPosts, setDashboardPosts] = useState<HomePost[]>([])
  const [dashboardCampaigns, setDashboardCampaigns] = useState<HomeCampaign[]>([])
  const [reviewNotes, setReviewNotes] = useState<ReviewNote[]>([])
  const [dashboardPermissions, setDashboardPermissions] = useState<DashboardPermissions>({ canApprove: false, canEdit: false, canPublish: false })
  const [publishedPostSummary, setPublishedPostSummary] = useState<PublishedPostSummary>({
    count: 0,
    latestTime: '',
    latestTitle: '',
  })
  const [connectedSocialAccount, setConnectedSocialAccount] = useState<string | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null)
  const [isBechillActive, setIsBechillActive] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const hasGeneratingImagesRef = useRef(false)
  const generatingPostIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      try {
        setDashboardLoading(true)
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const sessionId = getStoredOnboardingSessionId()
        let workspaceId: string | null = null
        let activeWorkspaceName: string | null = null

        if (!user?.id && !sessionId) {
          if (!cancelled) {
            setDashboardPosts([])
            setDashboardCampaigns([])
            setPublishedPostSummary({ count: 0, latestTime: '', latestTitle: '' })
            setCreditBalance(TRIAL_CREDITS)
            setActiveWorkspaceIdState(null)
            setIsBechillActive(false)
            setDashboardLoading(false)
          }
          return
        }

        if (user?.id) {
          const storedWorkspaceId = getActiveWorkspaceId()
          const workspaceResponse = await fetch('/api/workspaces', { cache: 'no-store' })
          const workspacePayload = await workspaceResponse.json().catch(() => null)
          const workspaceData = Array.isArray(workspacePayload?.workspaces)
            ? (workspacePayload.workspaces as WorkspaceSummary[])
            : []

          const activeWorkspace =
            workspaceData.find((workspace) => workspace.id === storedWorkspaceId) ||
            workspaceData[0] ||
            null

          workspaceId = activeWorkspace?.id || null
          activeWorkspaceName = activeWorkspace?.brandName || activeWorkspace?.name || null
          if (!cancelled) {
            setActiveWorkspaceIdState(workspaceId)
            setIsBechillActive(isBechillWorkspace(activeWorkspace))
          }

          console.log('[dashboard] active workspace debug', {
            userId: user.id,
            storedWorkspaceId,
            workspaceId,
            activeWorkspace,
            workspaceCount: workspaceData.length,
          })

          if (workspaceId && storedWorkspaceId !== workspaceId) {
            setActiveWorkspaceId(workspaceId)
          }

        }

        let postsData: any[] | null = null
        let campaignsData: any[] | null = null
        let brandKitData: any = null
        let connectionsData: any[] | null = null
        let creditsData: any = null
        let contentProjectsData: any[] = []
        let postsError: any = null
        let campaignsError: any = null

        if (user?.id && workspaceId) {
          const dashboardResponse = await fetch(`/api/dashboard-data?workspace_id=${encodeURIComponent(workspaceId)}`, {
            cache: 'no-store',
          })
          const dashboardPayload = await dashboardResponse.json().catch(() => null)

          if (!dashboardResponse.ok) {
            throw new Error(dashboardPayload?.error || 'Failed to load dashboard data')
          }

          postsData = dashboardPayload?.posts || []
          campaignsData = dashboardPayload?.campaigns || []
          brandKitData = dashboardPayload?.brandKit || null
          connectionsData = dashboardPayload?.connections || []
          creditsData = dashboardPayload?.credits || null
          contentProjectsData = dashboardPayload?.contentProjects || []
          setReviewNotes(Array.isArray(dashboardPayload?.reviewNotes) ? dashboardPayload.reviewNotes : [])
          setDashboardPermissions(dashboardPayload?.permissions || { canApprove: false, canEdit: false, canPublish: false })
        } else {
          let postsQuery = supabase
            .from('campaign_posts')
            .select('id,campaign_id,title,body,post_type,scheduled_at,posted_at,image_url,status,source_key,captions,marketing_campaigns(name,strategy_emoji)')
            .order('scheduled_at', { ascending: true })
            .limit(30)

          let campaignsQuery = supabase
            .from('marketing_campaigns')
            .select('id,name,strategy_title,strategy_emoji,starts_on,status')
            .order('created_at', { ascending: false })
            .limit(5)

          let brandKitQuery = supabase.from('brand_kits').select('business_name,logo_url')
          let connectionsQuery = supabase
            .from('social_connections')
            .select('platform,account_name')
            .order('connected_at', { ascending: false })
            .limit(1)
          let creditsQuery = supabase.from('user_credits').select('balance')

          if (user?.id) {
            postsQuery = postsQuery.eq('user_id', user.id)
            campaignsQuery = campaignsQuery.eq('user_id', user.id)
            brandKitQuery = brandKitQuery.eq('user_id', user.id)
            connectionsQuery = connectionsQuery.eq('user_id', user.id)
            creditsQuery = creditsQuery.eq('user_id', user.id)
          } else if (sessionId) {
            postsQuery = postsQuery.eq('onboarding_session_id', sessionId)
            campaignsQuery = campaignsQuery.eq('onboarding_session_id', sessionId)
            brandKitQuery = brandKitQuery.eq('onboarding_session_id', sessionId)
            connectionsQuery = connectionsQuery.eq('onboarding_session_id', sessionId)
          }

          const [postsResult, campaignsResult, brandKitResult, connectionsResult, creditsResult] =
            await Promise.all([
              postsQuery,
              campaignsQuery,
              brandKitQuery.maybeSingle(),
              connectionsQuery,
              user?.id ? creditsQuery.maybeSingle() : Promise.resolve({ data: null }),
            ])

          postsData = postsResult.data
          campaignsData = campaignsResult.data
          brandKitData = brandKitResult.data
          connectionsData = connectionsResult.data
          creditsData = creditsResult.data
          postsError = postsResult.error
          campaignsError = campaignsResult.error
        }

        if (cancelled) return

          setBrandName(brandKitData?.business_name || activeWorkspaceName || '')

        if (connectionsData?.length) {
          const connection = connectionsData[0]
          setConnectedSocialAccount(
            connection.account_name
              ? `${connection.platform === 'instagram' ? 'Instagram' : connection.platform}：@${connection.account_name}`
              : connection.platform
          )
        } else {
          setConnectedSocialAccount(null)
        }

        if (typeof creditsData?.balance === 'number') {
          setCreditBalance(creditsData.balance)
        } else {
          setCreditBalance(TRIAL_CREDITS)
        }

        setPublishedPostSummary(summarizePublishedPosts(postsData))

        const contentProjectPosts: HomePost[] = contentProjectsData
          .map((project: any) => {
            const production = project?.production && typeof project.production === 'object' ? project.production : {}
            const generatedPages = Array.isArray(production.generatedPages) ? production.generatedPages : []
            const media = generatedPages
              .map((page: any) => page?.url)
              .filter((url: unknown): url is string => typeof url === 'string' && url.length > 0)
            return {
              id: project.id,
              recordType: 'content_project' as const,
              production,
              sourceKey: `content-project-${project.id}`,
              type: '輪播貼文',
              typeKind: 'image' as const,
              title: project.title || '未命名 Carousel',
              body: typeof production.captionDraft === 'string' ? production.captionDraft : '',
              time: formatDashboardTime(production.submittedForApprovalAt || project.updated_at),
              image: media[0] || null,
              media,
              status: production.approvalStatus === 'approved' ? '已確認' : production.approvalStatus === 'changes_requested' ? '要修改' : '待審批',
            }
          })
          .filter((post: HomePost) => post.media?.length)

        if (!postsError && postsData?.length) {
          const postsMissingImages = postsData.filter((post: any) => isPlaceholderImage(post.image_url || null))
          const firstWeekMissingImages = postsMissingImages.filter((post: any) =>
            String(post.source_key || '').startsWith('campaign-1-')
          )
          const displayPosts = postsData
            .filter((post: any) => {
              const sourceKey = String(post.source_key || '')
              if (['published', 'posted', 'rejected', 'withdrawn', 'publishing'].includes(post.status)) return false
              return (
                sourceKey.startsWith('campaign-1-') ||
                !isPlaceholderImage(post.image_url || null) ||
                readPostMedia(post).length > 0
              )
            })
            .slice(0, 10)

          hasGeneratingImagesRef.current = firstWeekMissingImages.length > 0
          setDashboardPosts([
            ...contentProjectPosts,
            ...displayPosts.map((post: any, index: number) => {
              const type = mapPostType(post.post_type)
              const media = readPostMedia(post)
              const image = isPlaceholderImage(post.image_url || null)
                ? media[0] || null
                : post.image_url
              return {
                id: post.id,
                sourceKey: post.source_key,
                ...type,
                title: post.title || fallbackUpcomingPosts[index % fallbackUpcomingPosts.length].title,
                body: post.body || fallbackUpcomingPosts[index % fallbackUpcomingPosts.length].body,
                time: formatDashboardTime(post.scheduled_at),
                image,
                media,
                status: mapPostStatus(post.status),
                recordType: 'campaign_post' as const,
              }
            }),
          ].slice(0, 10))

          if (firstWeekMissingImages.length) {
            void (async () => {
              for (const post of firstWeekMissingImages) {
                if (cancelled || typeof post.id !== 'string') return
                if (generatingPostIdsRef.current.has(post.id)) continue

                generatingPostIdsRef.current.add(post.id)
                try {
                  console.log('[dashboard] generating missing post image:', {
                    postId: post.id,
                    sourceKey: post.source_key,
                  })
                  const response = await fetch('/api/generate-post-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postId: post.id }),
                  })
                  const result = await response.json().catch(() => ({}))
                  if (!response.ok) {
                    console.warn('[dashboard] post image generation failed:', {
                      postId: post.id,
                      result,
                    })
                  }
                } catch (error) {
                  console.warn('[dashboard] post image generation error:', {
                    postId: post.id,
                    error,
                  })
                } finally {
                  generatingPostIdsRef.current.delete(post.id)
                }
              }

              if (!cancelled) void loadDashboard()
            })()
          }
        } else {
          hasGeneratingImagesRef.current = false
          setDashboardPosts(contentProjectPosts.slice(0, 10))
        }

        if (!campaignsError && campaignsData?.length) {
          const campaignImages = new Map<string, string>()
          postsData?.forEach((post: any) => {
            if (
              typeof post.campaign_id === 'string' &&
              typeof post.image_url === 'string' &&
              !isPlaceholderImage(post.image_url) &&
              !campaignImages.has(post.campaign_id)
            ) {
              campaignImages.set(post.campaign_id, post.image_url)
            }
          })

          setDashboardCampaigns(
            campaignsData.map((campaign: any, index: number) => {
              const status = mapCampaignStatus(campaign.status)
              return {
                id: campaign.id,
                name: campaign.name || fallbackCampaigns[index % fallbackCampaigns.length].name,
                type: campaign.strategy_title || '生活內容',
                timing: formatDashboardDate(campaign.starts_on),
                image: campaignImages.get(campaign.id) || null,
                ...status,
              }
            })
          )
        } else {
          setDashboardCampaigns([])
        }
      } catch (error) {
        console.error('[dashboard] failed to load dashboard data:', error)
        if (!cancelled) {
          hasGeneratingImagesRef.current = false
          setDashboardPosts([])
          setDashboardCampaigns([])
          setPublishedPostSummary({ count: 0, latestTime: '', latestTitle: '' })
          setActiveWorkspaceIdState(null)
          setIsBechillActive(false)
        }
      } finally {
        if (!cancelled) setDashboardLoading(false)
      }
    }

    void loadDashboard()

    function handleWorkspaceChanged() {
      hasGeneratingImagesRef.current = false
      generatingPostIdsRef.current.clear()
      void loadDashboard()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)

    const pollId = window.setInterval(() => {
      if (hasGeneratingImagesRef.current) void loadDashboard()
    }, 10000)

    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
      window.clearInterval(pollId)
    }
  }, [])

  const displayedCredits = creditBalance ?? TRIAL_CREDITS

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="首頁" />

      <section className="home-shell">
        <header className="home-topbar">
          <div className="home-topbar-left">
            <h1>歡迎回來，{brandName || '你的工作台'}</h1>
          </div>
          <div className="home-topbar-right">
            <button
              className={`credits-badge ${displayedCredits < 50 ? 'warning' : ''}`}
              onClick={() => router.push('/pricing')}
              type="button"
            >
              {dashboardLoading ? '載入 credits...' : `✦ ${displayedCredits} credits 剩餘`}
            </button>
            <button type="button" className="upgrade-button">
              升級
            </button>
          </div>
        </header>

        <div className={`connect-banner ${connectedSocialAccount ? 'connected' : ''}`}>
          {dashboardLoading ? (
            <span>正在載入你的工作台...</span>
          ) : connectedSocialAccount ? (
            <>
              <span>✓ 已連接 {connectedSocialAccount}。SOON 可以在發布權限開通後按排程自動發布。</span>
              <button type="button" onClick={() => router.push('/onboarding/integrations')}>
                管理
              </button>
            </>
          ) : (
            <>
              <span>⚡ 你的貼文尚未自動發布。連接帳戶後，SOON 可以按排程自動發布。</span>
              <button type="button" onClick={() => router.push('/onboarding/integrations')}>
                連接
              </button>
            </>
          )}
        </div>

        <div className="home-body">
          <section className="home-main">
            {isBechillActive ? (
              <BechillApprovalBoard />
            ) : dashboardPosts.length ? (
              <ImportedApprovalBoard brandName={brandName || 'Egg.soon'} posts={dashboardPosts} workspaceId={activeWorkspaceId} reviewNotes={reviewNotes} permissions={dashboardPermissions} />
            ) : (
              <section className="workspace-empty-panel">
                <span>SOON WORKSPACE</span>
                <h2>{brandName || '這個工作台'} 內容準備中</h2>
                <p>這裡只會顯示目前工作台的內容。Egg.soon 尚未加入內容審批、已發布貼文或修改紀錄。</p>
              </section>
            )}
          </section>

          <aside className="home-aside">
            <section className="home-aside-section">
              <h3>過去 7 天</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-number">{isBechillActive ? '1' : publishedPostSummary.count}</span>
                  <span className="stat-label">已發布貼文</span>
                </div>
              </div>
              {isBechillActive ? (
                <div className="published-post-mini">
                  <strong>《煩惱可以分兩種》</strong>
                  <span>2026年8月12日 18:00 HKT</span>
                </div>
              ) : publishedPostSummary.latestTitle ? (
                <div className="published-post-mini">
                  <strong>{publishedPostSummary.latestTitle}</strong>
                  <span>{publishedPostSummary.latestTime || '最近 7 天已發布'}</span>
                </div>
              ) : null}
              <p className="stats-hint">
                {connectedSocialAccount ? '已連接帳戶，完整互動數據可到洞察頁查看。' : '連接帳戶後即可查看更完整數據分析'}
              </p>
            </section>

            <section className="home-aside-section">
              <h3>客戶修改紀錄</h3>
              <div className="client-record-list">
                {reviewNotes.length ? (
                  reviewNotes.map((item) => (
                    <div key={item.id} className="client-record-item">
                      <span className="client-record-dot" aria-hidden="true" />
                      <div className="client-record-content">
                        <span>{new Date(item.created_at).toLocaleString('zh-HK')}</span>
                        <strong>{item.resolved ? '已處理' : '待跟進'}</strong>
                        <p>{item.original_text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="stats-hint">暫時未有 Egg.soon 客戶修改紀錄。</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${homeStyles}` }} />
    </main>
  )
}

const homeStyles = `
  .site-nav {
    display: none;
  }

  .dashboard-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .home-shell {
    min-width: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .home-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 20px;
  }

  .home-topbar-left h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }

  .home-topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .credits-badge {
    border: 0;
    background: transparent;
    font-size: 14px;
    color: #202126;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
  }

  .credits-badge.warning {
    color: #b91c1c;
    font-weight: 650;
  }

  .upgrade-button {
    border: 1px solid #7c3aed;
    border-radius: 9px;
    background: #ffffff;
    color: #7c3aed;
    font: inherit;
    font-size: 14px;
    padding: 7px 14px;
    cursor: pointer;
  }

  .connect-banner {
    min-height: 46px;
    background: #fff7e8;
    border-bottom: 1px solid #f5e5c7;
    color: #4d4030;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 20px;
    font-size: 14px;
  }

  .connect-banner.connected {
    background: #f0fdf4;
    border-bottom-color: #d1fae5;
    color: #065f46;
  }

  .connect-banner button {
    border: 0;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    padding: 7px 14px;
    cursor: pointer;
  }

  .connect-banner.connected button {
    background: #065f46;
  }

  .home-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    align-items: start;
    padding: 28px 20px 60px;
    gap: 28px;
  }

  .home-main {
    display: flex;
    flex-direction: column;
    gap: 36px;
  }

  .workspace-empty-panel {
    min-height: 260px;
    border: 1px dashed #d9dbe1;
    border-radius: 12px;
    background: #fbfbfc;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    padding: 28px;
  }

  .workspace-empty-panel span {
    color: #8b8f99;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.03em;
  }

  .workspace-empty-panel h2 {
    margin: 0;
    color: #202126;
    font-size: 22px;
    font-weight: 750;
  }

  .workspace-empty-panel p {
    max-width: 540px;
    margin: 0;
    color: #6f737d;
    font-size: 14px;
    line-height: 1.6;
  }

  .home-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .home-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .home-section-head h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 650;
  }

  .home-section-head span {
    display: block;
    margin-top: 4px;
    color: #777b84;
    font-size: 13px;
  }

  .home-section-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .home-section-head button,
  .home-section-actions button {
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 7px 12px;
    cursor: pointer;
    transition: background 150ms ease;
  }

  .home-section-head button:hover,
  .home-section-actions button:hover {
    background: #f5f5f7;
  }

  .home-create-btn {
    background: #111111 !important;
    color: #ffffff !important;
    border-color: #111111 !important;
  }

  .imported-approval-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .imported-approval-card {
    border: 1px solid #e7e8eb;
    border-radius: 12px;
    background: #ffffff;
    display: grid;
    grid-template-columns: minmax(180px, 280px) minmax(0, 1fr);
    overflow: hidden;
    cursor: pointer;
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }

  .imported-approval-card:hover {
    border-color: #c8c9ce;
    box-shadow: 0 12px 28px rgba(32, 33, 38, 0.08);
  }

  .imported-approval-image {
    position: relative;
    min-height: 280px;
    background: #f3f4f6;
    display: grid;
    place-items: center;
    color: #8b8f99;
    font-size: 13px;
    font-weight: 800;
  }

  .imported-approval-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    background: #f5f5f6;
  }

  .imported-approval-image em {
    position: absolute;
    left: 10px;
    top: 10px;
    border-radius: 999px;
    background: rgba(17, 17, 17, 0.72);
    color: #ffffff;
    font-size: 11px;
    font-style: normal;
    font-weight: 750;
    padding: 5px 8px;
  }

  .imported-approval-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 18px;
    padding: 18px;
  }

  .imported-approval-copy span {
    color: #787c85;
    font-size: 13px;
  }

  .imported-approval-copy strong {
    display: block;
    margin-top: 8px;
    color: #202126;
    font-size: 24px;
    line-height: 1.18;
    font-weight: 820;
  }

  .imported-approval-copy p {
    margin: 0;
    color: #555861;
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-line-clamp: 8;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .imported-approval-copy footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .imported-approval-copy footer span {
    border-radius: 999px;
    background: #fff7e6;
    color: #92400e;
    font-size: 12px;
    font-weight: 750;
    padding: 6px 9px;
  }

  .imported-approval-copy footer button {
    border: 0;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    font-weight: 650;
    padding: 8px 12px;
  }

  .upcoming-posts-list {
    display: flex;
    gap: 14px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 2px 2px 12px;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
  }

  .upcoming-posts-list::-webkit-scrollbar {
    height: 8px;
  }

  .upcoming-posts-list::-webkit-scrollbar-thumb {
    background: #d7d9df;
    border-radius: 99px;
  }

  .upcoming-posts-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .upcoming-post-card {
    position: relative;
    display: flex;
    flex: 0 0 220px;
    width: 220px;
    height: 320px;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    background: #ffffff;
    transition: box-shadow 150ms ease, border-color 150ms ease;
    cursor: pointer;
    overflow: hidden;
    scroll-snap-align: start;
  }

  .upcoming-post-card:hover {
    border-color: #c8c9ce;
    box-shadow: 0 4px 16px rgba(32, 33, 38, 0.06);
  }

  .upcoming-post-card-skeleton {
    cursor: default;
  }

  .upcoming-post-card-skeleton:hover {
    border-color: #e8e9ec;
    box-shadow: none;
  }

  .skeleton-line,
  .skeleton-block,
  .skeleton-pill {
    display: block;
    background: linear-gradient(90deg, #f1f2f4 0%, #ffffff 45%, #f1f2f4 100%);
    background-size: 220% 100%;
    animation: image-skeleton 1.2s ease-in-out infinite;
  }

  .skeleton-line {
    height: 12px;
    border-radius: 99px;
    width: 100%;
  }

  .skeleton-line.short {
    width: 72px;
  }

  .skeleton-line.tiny {
    width: 92px;
  }

  .skeleton-line.title {
    width: 80%;
    height: 16px;
  }

  .skeleton-line.body {
    width: 100%;
    height: 34px;
    border-radius: 8px;
  }

  .skeleton-block {
    background-color: #f1f2f4;
  }

  .skeleton-pill {
    width: 82px;
    height: 24px;
    border-radius: 999px;
  }

  .dashboard-empty-state {
    min-height: 180px;
    flex: 1 0 320px;
    border: 1px dashed #d9dbe1;
    border-radius: 12px;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    padding: 24px;
    color: #6f737d;
  }

  .dashboard-empty-state strong {
    color: #202126;
    font-size: 14px;
  }

  .dashboard-empty-state span {
    font-size: 13px;
    line-height: 1.5;
  }

  .approval-board {
    --approval-ink: #202126;
    --approval-muted: #6f737d;
    --approval-soft: #f7f7f8;
    --approval-line: #e8e9ec;
    --approval-strong: #111111;
    --approval-accent: #7c3aed;
    color: var(--approval-ink);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .approval-board-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 0.55fr);
    gap: 18px;
    align-items: end;
    border: 1px solid var(--approval-line);
    border-radius: 8px;
    background: #ffffff;
    color: var(--approval-ink);
    padding: 18px;
  }

  .approval-board-hero p {
    margin: 0 0 6px;
    color: var(--approval-muted);
    font-size: 12px;
    font-weight: 750;
  }

  .approval-board-hero h2 {
    max-width: 620px;
    margin: 0;
    font-size: 23px;
    line-height: 1.24;
    letter-spacing: 0;
  }

  .approval-board-meta {
    display: flex;
    flex-direction: column;
    gap: 7px;
    color: var(--approval-muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .approval-board-meta strong {
    color: var(--approval-ink);
    font-weight: 750;
  }

  .approval-board-meta small {
    color: var(--approval-muted);
    font-size: 12px;
  }

  .approval-progress-card,
  .approval-post {
    border: 1px solid var(--approval-line);
    border-radius: 8px;
    background: #ffffff;
  }

  .approval-progress-card {
    position: sticky;
    top: 74px;
    z-index: 4;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(140px, 0.35fr) auto;
    gap: 16px;
    align-items: center;
    padding: 14px 16px;
    box-shadow: 0 10px 28px rgba(32, 33, 38, 0.06);
  }

  .approval-progress-card strong {
    display: block;
    font-size: 14px;
    font-weight: 800;
  }

  .approval-progress-card span {
    color: var(--approval-muted);
    font-size: 12px;
  }

  .approval-progress-track {
    height: 7px;
    overflow: hidden;
    border-radius: 999px;
    background: #f1f2f4;
  }

  .approval-progress-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--approval-strong);
    transition: width 180ms ease;
  }

  .approval-progress-actions {
    display: flex;
    gap: 8px;
  }

  .approval-progress-actions button {
    min-height: 38px;
    border: 1px solid var(--approval-line);
    border-radius: 8px;
    background: #ffffff;
    color: var(--approval-ink);
    font: inherit;
    font-size: 13px;
    font-weight: 750;
    padding: 0 13px;
    cursor: pointer;
  }

  .approval-progress-actions .send {
    border-color: #111111;
    background: #111111;
    color: #ffffff;
  }

  .approval-progress-actions .send:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  .approval-posts {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .approval-post {
    overflow: hidden;
    transition: border-color 160ms ease;
  }

  .approval-post.is-ok {
    border-color: #b7dfc8;
  }

  .approval-post.is-edit {
    border-color: #f5d37b;
  }

  .approval-post.is-no {
    border-color: #f2b7b3;
  }

  .approval-post.is-confirmed {
    border-color: #d9dbe1;
    background: #fbfbfc;
  }

  .approval-post-head {
    padding: 15px 17px 13px;
  }

  .approval-delete-btn {
    border: 1px solid #e0e2e7;
    border-radius: 50%;
    background: #fff;
    color: #737780;
    cursor: pointer;
    font: inherit;
    font-size: 18px;
    font-weight: 750;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    width: 40px;
    padding: 0;
    white-space: nowrap;
  }

  .approval-delete-btn:hover {
    background: #ffefef;
    border-color: #f1b7b7;
    color: #b42318;
  }

  .approval-delete-btn svg {
    width: 19px;
    height: 19px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
  }

  .approval-delete-btn:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  .approval-tagrow {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    min-width: 0;
  }

  .approval-head-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 0 0 auto;
  }

  .approval-media-icon {
    width: 54px;
    min-width: 54px;
    height: 54px;
    border: 1px solid #d8dbe2;
    border-radius: 16px;
    background: linear-gradient(145deg, #ffffff 0%, #f3f5f8 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 8px 18px rgba(32, 33, 38, 0.1);
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 54px;
    overflow: hidden;
    position: relative;
  }

  .approval-media-icon::before {
    content: '';
    position: absolute;
    width: 27px;
    height: 22px;
    border: 2px solid #202126;
    border-radius: 7px;
    opacity: 0.16;
    transform: translate(5px, 5px);
  }

  .approval-media-icon::after {
    content: '';
    position: absolute;
    width: 28px;
    height: 23px;
    border: 2px solid #202126;
    border-radius: 7px;
    background: #ffffff;
    transform: translate(-2px, -2px);
  }

  .approval-media-icon span {
    position: relative;
    z-index: 1;
    width: 28px;
    height: 23px;
    display: block;
  }

  .approval-media-icon span::before {
    content: '';
    position: absolute;
    top: 6px;
    right: 6px;
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: #202126;
  }

  .approval-media-icon span::after {
    content: '';
    position: absolute;
    left: 6px;
    bottom: 5px;
    width: 16px;
    height: 8px;
    background: #202126;
    clip-path: polygon(0 100%, 38% 30%, 58% 58%, 76% 15%, 100% 100%);
  }

  .approval-tagrow strong {
    display: block;
    font-size: 13px;
    line-height: 1.15;
  }

  .approval-meta {
    display: block;
    color: var(--approval-muted);
    font-size: 12px;
  }

  .approval-tagrow small {
    border-radius: 14px;
    background: #f1f2f4;
    color: #202126;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 750;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    width: 112px;
    padding: 0 14px;
  }

  .approval-post h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    line-height: 1.25;
  }

  .approval-gallery {
    position: relative;
    background: #f3f4f6;
  }

  .approval-image-button {
    width: 100%;
    display: block;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: zoom-in;
    position: relative;
  }

  .approval-image-button img {
    width: 100%;
    max-height: 620px;
    object-fit: contain;
    display: block;
  }

  .approval-image-button span {
    position: absolute;
    top: 10px;
    left: 10px;
    border-radius: 8px;
    background: rgba(46, 36, 34, 0.72);
    color: #ffffff;
    font-size: 11px;
    font-weight: 750;
    padding: 4px 9px;
  }

  .approval-nav {
    position: absolute;
    top: 50%;
    z-index: 2;
    width: 38px;
    height: 38px;
    transform: translateY(-50%);
    border: 0;
    border-radius: 8px;
    background: rgba(46, 36, 34, 0.62);
    color: #ffffff;
    font: inherit;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
  }

  .approval-nav.prev {
    left: 10px;
  }

  .approval-nav.next {
    right: 10px;
  }

  .approval-nav:disabled {
    opacity: 0.24;
    cursor: default;
  }

  .approval-dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 10px 0 12px;
  }

  .approval-dots button {
    width: 7px;
    height: 7px;
    border: 0;
    border-radius: 999px;
    background: #d9c9c5;
    padding: 0;
    cursor: pointer;
  }

  .approval-dots button.on {
    width: 20px;
    background: var(--approval-strong);
  }

  .approval-post-body {
    padding: 14px 17px 2px;
  }

  .approval-label {
    margin: 11px 0 6px;
    color: var(--approval-muted);
    font-size: 11px;
    font-weight: 800;
  }

  .approval-caption {
    border-radius: 11px;
    background: #f7f7f8;
    color: #4b5563;
    font-size: 13px;
    line-height: 1.7;
    padding: 11px 13px;
    white-space: pre-wrap;
  }

  .approval-caption-block {
    display: grid;
    gap: 8px;
  }

  .approval-caption-edit-btn,
  .approval-caption-editor-actions button {
    justify-self: flex-start;
    border: 1px solid #e0e2e7;
    border-radius: 8px;
    background: #ffffff;
    color: #333842;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 750;
    min-height: 32px;
    padding: 0 10px;
  }

  .approval-caption-edit-btn:hover,
  .approval-caption-editor-actions button:hover {
    background: #f7f8fa;
  }

  .approval-caption-editor {
    display: grid;
    gap: 8px;
  }

  .approval-caption-editor textarea {
    width: 100%;
    min-height: 160px;
    resize: vertical;
    border: 1.5px solid var(--approval-line);
    border-radius: 10px;
    outline: 0;
    color: var(--approval-ink);
    font: inherit;
    font-size: 13px;
    line-height: 1.6;
    padding: 11px 13px;
  }

  .approval-caption-editor textarea:focus {
    border-color: #111111;
  }

  .approval-caption-editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 7px;
  }

  .approval-caption-editor-actions button:last-child {
    border-color: #111111;
    background: #111111;
    color: #ffffff;
  }

  .approval-caption-editor-actions button:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  .approval-note {
    margin: 0 0 10px;
    color: var(--approval-muted);
    font-size: 12px;
    line-height: 1.6;
  }

  .approval-decide {
    margin-top: 13px;
    border-top: 1px solid var(--approval-line);
    background: #fafafa;
    padding: 14px 17px 17px;
  }

  .approval-segment {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 7px;
  }

  .approval-segment button {
    min-height: 42px;
    border: 1.5px solid var(--approval-line);
    border-radius: 8px;
    background: #ffffff;
    color: #4a3b37;
    font: inherit;
    font-size: 13px;
    font-weight: 750;
    cursor: pointer;
  }

  .approval-segment button[aria-pressed='true'][data-value='ok'] {
    border-color: #3e8e6e;
    background: #e8f4ee;
    color: #3e8e6e;
  }

  .approval-segment button[aria-pressed='true'][data-value='edit'] {
    border-color: #b77a2b;
    background: #faf0df;
    color: #b77a2b;
  }

  .approval-segment button[aria-pressed='true'][data-value='no'] {
    border-color: #b2544f;
    background: #f9e8e7;
    color: #b2544f;
  }

  .approval-confirmed-note {
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    background: #f0fdf4;
    color: #15803d;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.5;
    padding: 10px 12px;
  }

  .approval-decision-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 10px;
    border: 1px solid #fecaca;
    border-radius: 8px;
    background: #fef2f2;
    color: #991b1b;
    font-size: 13px;
    line-height: 1.45;
    padding: 9px 11px;
  }

  .approval-decision-error button {
    flex: 0 0 auto;
    border: 1px solid #fca5a5;
    border-radius: 7px;
    background: #ffffff;
    color: #991b1b;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 5px 10px;
  }

  .approval-note-box {
    margin-top: 11px;
  }

  .approval-note-box textarea {
    width: 100%;
    min-height: 78px;
    resize: vertical;
    border: 1.5px solid var(--approval-line);
    border-radius: 8px;
    outline: 0;
    color: var(--approval-ink);
    font: inherit;
    font-size: 14px;
    padding: 11px 13px;
  }

  .approval-note-box textarea:focus {
    border-color: #111111;
  }

  .approval-quick {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .approval-quick button {
    border: 1px dashed var(--approval-line);
    border-radius: 999px;
    background: #ffffff;
    color: var(--approval-muted);
    font: inherit;
    font-size: 12px;
    padding: 5px 11px;
    cursor: pointer;
  }

  .approval-lightbox {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    border: 0;
    background: rgba(23, 17, 15, 0.96);
    padding: 28px;
    cursor: zoom-out;
  }

  .approval-lightbox img {
    width: min(100%, 820px);
    max-height: 82vh;
    object-fit: contain;
  }

  .approval-lightbox span {
    color: #e2d2ce;
    font-size: 12px;
  }

  .approval-toast {
    position: fixed;
    left: 50%;
    bottom: 24px;
    z-index: 95;
    transform: translateX(-50%);
    border-radius: 999px;
    background: #1c1413;
    color: #ffffff;
    font-size: 13px;
    padding: 11px 18px;
  }

  .upcoming-post-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    min-height: 24px;
  }

  .upcoming-post-edit-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    border: 1px solid #e2e3e7;
    border-radius: 7px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 5px 9px;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    box-shadow: 0 6px 16px rgba(32, 33, 38, 0.1);
    transition: opacity 150ms ease, background 150ms ease;
  }

  .upcoming-post-card:hover .upcoming-post-edit-btn,
  .upcoming-post-edit-btn:focus-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .upcoming-post-edit-btn:hover {
    background: #f5f5f7;
  }

  .upcoming-post-img {
    width: 100%;
    height: 150px;
    margin-top: auto;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
    background: #f3f4f6;
  }

  .upcoming-post-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    animation: image-fade-in 220ms ease both;
  }

  .upcoming-post-img.generating {
    position: relative;
  }

  .upcoming-post-img.generating span {
    display: block;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #f1f2f4 0%, #ffffff 45%, #f1f2f4 100%);
    background-size: 220% 100%;
    animation: image-skeleton 1.2s ease-in-out infinite;
  }

  @keyframes image-skeleton {
    0% { background-position: 120% 0; }
    100% { background-position: -120% 0; }
  }

  @keyframes image-fade-in {
    from { opacity: 0; transform: scale(1.015); }
    to { opacity: 1; transform: scale(1); }
  }

  .upcoming-post-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .post-type-badge {
    font-size: 12px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .post-type-badge::before {
    content: '▧';
    color: #ef5148;
  }

  .post-type-badge.article::before {
    content: '▤';
    color: #2e9a55;
  }

  .post-type-badge.video::before {
    content: '▶';
    color: #7c3aed;
  }

  .upcoming-post-time {
    font-size: 12px;
    color: #6f737d;
  }

  .post-status-badge {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 6px;
    font-weight: 600;
  }

  .post-status-badge.new {
    background: #7c3aed;
    color: #ffffff;
  }

  .post-status-badge.draft {
    background: #f1f2f4;
    color: #6f737d;
  }

  .upcoming-post-content h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.28;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 38px;
  }

  .upcoming-post-content p {
    margin: 0;
    font-size: 12px;
    color: #6f737d;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .campaigns-table {
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    overflow: hidden;
  }

  .campaigns-table-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 160px 120px 32px;
    gap: 12px;
    padding: 10px 16px;
    background: #f8f8f9;
    border-bottom: 1px solid #e8e9ec;
    font-size: 12px;
    font-weight: 600;
    color: #6f737d;
  }

  .campaign-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 160px 120px 32px;
    gap: 12px;
    padding: 14px 16px;
    align-items: center;
    border-bottom: 1px solid #f0f1f3;
    transition: background 150ms;
    cursor: pointer;
  }

  .campaign-row:last-child {
    border-bottom: none;
  }

  .campaign-row:hover {
    background: #fafafa;
  }

  .campaign-row-skeleton {
    cursor: default;
  }

  .campaign-row-skeleton:hover {
    background: #ffffff;
  }

  .campaign-row-skeleton .campaign-info > div {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 180px;
  }

  .campaign-empty-row {
    padding: 22px 16px;
    font-size: 13px;
    color: #6f737d;
    background: #ffffff;
  }

  .campaign-info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .campaign-thumb {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .campaign-thumb-placeholder {
    display: inline-flex;
    border: 1px solid #e8e9ec;
    background:
      linear-gradient(135deg, rgba(212, 168, 67, 0.16), rgba(32, 33, 38, 0.04)),
      #f7f7f8;
  }

  .campaign-info strong {
    display: block;
    font-size: 13px;
    font-weight: 550;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .campaign-info span,
  .campaign-timing {
    font-size: 12px;
    color: #6f737d;
  }

  .campaign-status {
    font-size: 12px;
    padding: 3px 9px;
    border-radius: 6px;
    font-weight: 500;
    white-space: nowrap;
  }

  .campaign-status.generating {
    background: #fef3c7;
    color: #92400e;
  }

  .campaign-status.done {
    background: #d1fae5;
    color: #065f46;
  }

  .campaign-arrow {
    border: 0;
    background: transparent;
    color: #9a9da4;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
  }

  .home-aside {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .home-aside-section {
    border: 1px solid #e8e9ec;
    border-radius: 12px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .home-aside-section h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 650;
  }

  .stats-grid {
    display: flex;
    gap: 16px;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-number {
    font-size: 28px;
    font-weight: 700;
    color: #202126;
  }

  .stat-label,
  .stats-hint {
    font-size: 12px;
    color: #6f737d;
  }

  .stats-hint {
    margin: 0;
    color: #9a9da4;
    line-height: 1.4;
  }

  .published-post-mini {
    display: flex;
    flex-direction: column;
    gap: 4px;
    border: 1px solid #e8e9ec;
    border-radius: 8px;
    background: #fafafa;
    padding: 10px 12px;
  }

  .published-post-mini strong {
    color: #202126;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.35;
  }

  .published-post-mini span {
    color: #6f737d;
    font-size: 12px;
  }

  .client-record-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .client-record-item {
    position: relative;
    display: grid;
    grid-template-columns: 12px minmax(0, 1fr);
    gap: 10px;
    align-items: flex-start;
  }

  .client-record-dot {
    width: 8px;
    height: 8px;
    margin-top: 6px;
    border-radius: 999px;
    background: #111111;
    flex-shrink: 0;
  }

  .client-record-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .client-record-content span {
    color: #9a9da4;
    font-size: 11px;
    line-height: 1.2;
  }

  .client-record-content strong {
    font-size: 13px;
    font-weight: 650;
  }

  .client-record-content p {
    margin: 0;
    font-size: 12px;
    color: #6f737d;
    line-height: 1.4;
  }

  @media (max-width: 980px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .home-body {
      grid-template-columns: 1fr;
      padding: 18px 12px 42px;
      gap: 18px;
    }

    .approval-board-hero {
      grid-template-columns: 1fr;
      gap: 12px;
      padding: 14px;
    }

    .approval-board-hero h2 {
      font-size: 22px;
    }

    .approval-progress-card {
      position: static;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      padding: 14px;
    }

    .approval-progress-card strong,
    .approval-progress-card span {
      word-break: keep-all;
      overflow-wrap: normal;
    }

    .approval-progress-track {
      width: 100%;
    }

    .approval-progress-actions {
      display: grid;
      grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
      gap: 8px;
    }

    .approval-progress-actions button {
      width: 100%;
      min-width: 0;
      min-height: 46px;
      padding: 0 10px;
      white-space: normal;
      line-height: 1.25;
    }

    .campaigns-table-head,
    .campaign-row {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`
