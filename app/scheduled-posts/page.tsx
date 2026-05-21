'use client'

import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, type ChangeEvent, type FormEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react'

import { DashboardSidebar, dashboardSidebarStyles } from '@/components/dashboard/DashboardSidebar'
import { DesignToolbar } from '@/components/editor/DesignToolbar'
import { EditorSidePanel } from '@/components/editor/EditorSidePanel'
import { CHANNELS, FALLBACK_IMAGES, PLACEHOLDER_IMAGE } from '@/components/editor/editorData'
import { ClaimOnboardingSession } from '@/components/onboarding/ClaimOnboardingSession'
import {
  getOrCreateOnboardingSessionId,
  getStoredOnboardingSessionId,
  hasPersistedOnboardingSession,
  markOnboardingPersisted,
} from '@/lib/onboarding-session'
import type { Template, TemplateElement } from '@/lib/templates'
import type { FabricControls } from '@/components/editor/DesignCanvas'
import { createClient } from '@/lib/supabase'
import {
  resolveActiveWorkspace,
  WORKSPACE_CHANGED_EVENT,
} from '@/lib/workspace-client'
import type {
  CanvasSize,
  DesignElement,
  DesignElementKind,
  DesignTool,
  ElementSection,
  PreviewChannel,
  ScheduledPost,
  TemplatePresetId,
  TextPreset,
  TextStylePreset,
  TopicReference,
} from '@/components/editor/editorTypes'

const DesignCanvas = dynamic(
  () => import('@/components/editor/DesignCanvas').then((module) => module.DesignCanvas),
  { ssr: false }
)

const PUBLISH_PLATFORMS = [
  { channel: 'Instagram' as PreviewChannel, id: 'instagram', label: 'Instagram' },
  { channel: 'Facebook' as PreviewChannel, id: 'facebook', label: 'Facebook' },
  { channel: 'Threads' as PreviewChannel, id: 'threads', label: 'Threads' },
]

const AI_IMAGE_SUGGESTIONS = [
  { icon: '🖼️', label: '更改相片內容：', text: '在背景加入人物，令場景更豐富' },
  { icon: '🏙️', label: '調整背景：', text: '將背景換成現代辦公室' },
  { icon: '✏️', label: '更改文字疊加：', text: '將標題放大並移到頂部' },
  { icon: '🎨', label: '修改顏色：', text: '令整體配色更鮮明' },
  { icon: '🏷️', label: '修改品牌：', text: '將我的 logo 加到右下角' },
]

type PlatformConnection = {
  account_id?: string | null
  account_name?: string | null
  platform: string
}

type AttachAsset = {
  asset_type: string
  filename: string | null
  id: string
  source_url?: string | null
  url: string
}

function PlatformIcon({ channel }: { channel: PreviewChannel }) {
  if (channel === 'Instagram') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="25%" stopColor="#e6683c" />
            <stop offset="50%" stopColor="#dc2743" />
            <stop offset="75%" stopColor="#cc2366" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="url(#ig-grad)" />
        <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
      </svg>
    )
  }

  if (channel === 'Facebook') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <rect width="24" height="24" rx="4" fill="#1877F2" />
        <path d="M16 8h-2a1 1 0 00-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 014-4h2v3z" fill="white" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#000" />
      <path
        d="M16.5 11.5c-.3-1.5-1.5-2.5-3.5-2.5-2.2 0-3.8 1.6-3.8 3.8 0 2.3 1.5 3.7 3.8 3.7.9 0 1.8-.3 2.4-.8"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13.5 9.1c1.2.3 2 1.1 2.2 2.2.3 1.5-.3 3-1.7 3.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SocialActionIcon({
  type,
  size = 22,
  stroke = '#262626',
  strokeWidth = 1.8,
}: {
  type: 'heart' | 'comment' | 'share' | 'bookmark' | 'repost'
  size?: number
  stroke?: string
  strokeWidth?: number
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} stroke={stroke} strokeWidth={strokeWidth} fill="none" aria-hidden="true">
      {type === 'heart' ? (
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      ) : null}
      {type === 'comment' ? (
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      ) : null}
      {type === 'share' ? (
        <>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </>
      ) : null}
      {type === 'bookmark' ? (
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      ) : null}
      {type === 'repost' ? (
        <>
          <path d="M17 1l4 4-4 4" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <path d="M7 23l-4-4 4-4" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </>
      ) : null}
    </svg>
  )
}

function readTopicImages() {
  if (typeof window === 'undefined') return FALLBACK_IMAGES
  try {
    const raw = window.sessionStorage.getItem('soon-topic-review-v1')
    const topics = raw ? (JSON.parse(raw) as TopicReference[]) : []
    const images = topics
      .map((topic) => topic.image)
      .filter((image) => image && image !== PLACEHOLDER_IMAGE)
    return images.length ? images : FALLBACK_IMAGES
  } catch {
    return FALLBACK_IMAGES
  }
}

function resolveLogoSrc(value: string) {
  if (!value) return ''
  if (value.startsWith('blob:') || value.startsWith('data:')) return value
  return `/api/logo-image?url=${encodeURIComponent(value)}`
}

function readBrandKit() {
  if (typeof window === 'undefined') return { businessName: '品牌', logoUrl: '' }

  try {
    const rawProfile = window.sessionStorage.getItem('soon-business-profile-v1')
    if (rawProfile) {
      const profile = JSON.parse(rawProfile) as { businessName?: string; logoUrl?: string }
      return {
        businessName: profile.businessName || '品牌',
        logoUrl: resolveLogoSrc(profile.logoUrl || ''),
      }
    }
  } catch {
    // Fall through to website analysis fallback.
  }

  try {
    const rawAnalysis = window.sessionStorage.getItem('soon-website-analysis-v1')
    if (rawAnalysis) {
      const parsed = JSON.parse(rawAnalysis) as { analysis?: { businessName?: string; logoUrl?: string } }
      return {
        businessName: parsed.analysis?.businessName || '品牌',
        logoUrl: resolveLogoSrc(parsed.analysis?.logoUrl || ''),
      }
    }
  } catch {
    // Ignore malformed session data.
  }

  return { businessName: '品牌', logoUrl: '' }
}

function readSessionJson(key: string) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function buildOnboardingCompletePayload() {
  return {
    sessionId: getOrCreateOnboardingSessionId(),
    websiteAnalysis: readSessionJson('soon-website-analysis-v1'),
    businessProfile: readSessionJson('soon-business-profile-v1'),
    contentStrategy: readSessionJson('soon-content-strategy-v1'),
    campaignDetails: readSessionJson('soon-campaign-details-v1'),
    distributionPrefs: readSessionJson('soon-distribution-preferences-v1'),
    contentMix: readSessionJson('soon-content-mix-v1'),
    contentMood: readSessionJson('soon-content-mood-v1'),
    visualStyle: readSessionJson('soon-visual-style-v1'),
    typeface: readSessionJson('soon-typeface-v1'),
    photoControl: readSessionJson('soon-photo-control-v2'),
    topicReview: readSessionJson('soon-topic-review-v1'),
    campaignThemes: readSessionJson('soon-campaign-themes-v1'),
  }
}

async function completeOnboardingSnapshot() {
  if (hasPersistedOnboardingSession()) return true

  const payload = buildOnboardingCompletePayload()
  if (!payload.sessionId) return false
  if (!payload.businessProfile && !payload.websiteAnalysis) return false

  try {
    const response = await fetch('/api/onboarding/complete', {
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    if (!response.ok) {
      const message = await response.text().catch(() => '')
      console.warn('Failed to persist onboarding snapshot:', response.status, message)
      return false
    }

    const result = await response.json().catch(() => ({}))
    console.log('[onboarding/complete] success:', result)
    markOnboardingPersisted()
    return true
  } catch (error) {
    console.error('Failed to persist onboarding:', error)
    return false
  }
}

async function loadPersistedBrandKit(fallback: { businessName: string; logoUrl: string }) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const sessionId = getStoredOnboardingSessionId()

    let query = supabase.from('brand_kits').select('business_name,logo_url')
    if (user?.id) {
      const { workspaceId } = await resolveActiveWorkspace()
      query = workspaceId ? query.eq('workspace_id', workspaceId) : query.eq('user_id', user.id)
    } else if (sessionId) {
      query = query.eq('onboarding_session_id', sessionId)
    } else {
      return fallback
    }

    const { data, error } = await query.maybeSingle()
    if (error || !data) return fallback

    const nextLogo = data.logo_url ? resolveLogoSrc(data.logo_url) : fallback.logoUrl
    return {
      businessName: data.business_name || fallback.businessName,
      logoUrl: nextLogo,
    }
  } catch {
    return fallback
  }
}

function buildScheduledPosts(images: string[]): ScheduledPost[] {
  return [
    {
      id: 'still-1000',
      type: '靜態圖片',
      time: '10:00',
      title: '差點沒拍下來的片段',
      body: '最細小的片段，往往承載最真實的感覺。把那個笑聲、眼神或普通一刻分享出去，就會變成朋友想再看一次的回憶。',
      image: images[0] || FALLBACK_IMAGES[0],
      status: '新內容',
    },
    {
      id: 'blog-1400',
      type: '文章',
      time: '14:00',
      title: '一個簡單房間，幾段短片，突然就值得重播',
      body: '和朋友聚在一起，本來可以很平常。但當那些片段被剪成有節奏的日常故事，它就會變成你想再看、再分享的內容。',
      image: images[1] || FALLBACK_IMAGES[1],
      status: '新內容',
    },
    {
      id: 'short-1800',
      type: '短影片',
      time: '18:00',
      title: '今天值得留下的一秒',
      body: '晚上的內容會用更輕鬆的節奏，提醒觀眾每日都有值得記錄的微小時刻。',
      image: images[2] || FALLBACK_IMAGES[2],
      status: '草稿',
    },
  ]
}

function formatPostTime(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleTimeString('zh-HK', { hour: '2-digit', hour12: false, minute: '2-digit' })
}

function mapPersistedPostType(value: unknown): ScheduledPost['type'] {
  if (value === 'blog') return '文章'
  if (value === 'video') return '短影片'
  return '靜態圖片'
}

function mapPersistedPostStatus(value: unknown): ScheduledPost['status'] {
  if (value === 'approved') return '已批准'
  if (value === 'scheduled') return '已排程'
  if (value === 'published' || value === 'posted') return '已發布'
  return value === 'draft' ? '草稿' : '新內容'
}

function mapPersistedScheduledPost(row: Record<string, unknown>, index: number, fallbackPosts: ScheduledPost[]): ScheduledPost {
  const fallback = fallbackPosts[index % fallbackPosts.length]
  const postType = typeof row.post_type === 'string' ? row.post_type : undefined
  return {
    body: typeof row.body === 'string' && row.body ? row.body : fallback.body,
    id: typeof row.id === 'string' ? row.id : fallback.id,
    image: typeof row.image_url === 'string' && row.image_url ? row.image_url : fallback.image,
    postType,
    scheduledAt: typeof row.scheduled_at === 'string' ? row.scheduled_at : null,
    status: mapPersistedPostStatus(row.status),
    time: formatPostTime(row.scheduled_at, fallback.time),
    title: typeof row.title === 'string' && row.title ? row.title : fallback.title,
    type: mapPersistedPostType(postType),
  }
}

function localDateTimeValue(offsetHours = 1) {
  const date = new Date()
  date.setHours(date.getHours() + offsetHours, 0, 0, 0)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function isInCurrentWeek(post: ScheduledPost) {
  if (!post.scheduledAt) return false
  const scheduled = new Date(post.scheduledAt)
  if (Number.isNaN(scheduled.getTime())) return false
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return scheduled >= start && scheduled < end
}

function createPostDesignElements(post: ScheduledPost, canvasSize?: { w: number; h: number }): DesignElement[] {
  const isSquare = !canvasSize || canvasSize.w === canvasSize.h
  const displayW = 430
  const displayH = isSquare ? 430 : 538
  const titleY = isSquare ? 68 : 75
  const bodyY = isSquare ? 80 : 88
  const bodyPreview = post.body
    ? post.body.slice(0, 60) + (post.body.length > 60 ? '...' : '')
    : ''

  return [
    {
      id: `image-background-${post.id}`,
      kind: 'image',
      item: 'background',
      label: '背景圖片',
      x: 0,
      y: 0,
      size: displayW,
      width: displayW,
      height: displayH,
      rotation: 0,
      opacity: 100,
      color: '#ffffff',
      zIndex: 1,
      imageUrl: post.image,
    },
    {
      id: `text-title-${post.id}`,
      kind: 'text',
      item: 'headline',
      label: '標題文字',
      x: 5,
      y: titleY,
      size: 22,
      rotation: 0,
      opacity: 100,
      color: '#ffffff',
      zIndex: 3,
      textContent: post.title,
      fontFamily: 'Georgia, serif',
      fontSize: 22,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      width: 400,
      lineHeight: 1.12,
    },
    {
      id: `text-body-${post.id}`,
      kind: 'text',
      item: 'subtitle',
      label: '副標題文字',
      x: 5,
      y: bodyY,
      size: 13,
      rotation: 0,
      opacity: 80,
      color: '#ffffff',
      zIndex: 3,
      textContent: bodyPreview,
      fontFamily: 'inherit',
      fontSize: 13,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      width: 400,
      lineHeight: 1.25,
    },
  ]
}

function createTemplateDesignElements(post: ScheduledPost, templateId: TemplatePresetId, imageUrl: string): DesignElement[] {
  if (templateId === 'bold-focus') {
    return [
      {
        id: `image-background-${post.id}-${templateId}`,
        kind: 'image',
        item: 'background',
        label: '背景圖片',
        x: 50,
        y: 50,
        size: 430,
        width: 430,
        height: 538,
        rotation: 0,
        opacity: 100,
        color: '#ffffff',
        zIndex: 1,
        imageUrl,
      },
      {
        id: `shape-focus-${post.id}-${templateId}`,
        kind: 'shape',
        item: 'rounded',
        label: '焦點色塊',
        x: 43,
        y: 23,
        size: 210,
        rotation: -4,
        opacity: 82,
        color: '#111111',
        zIndex: 6,
      },
      {
        id: `text-title-${post.id}-${templateId}`,
        kind: 'text',
        item: 'headline',
        label: '標題文字',
        x: 42,
        y: 20,
        size: 42,
        rotation: 0,
        opacity: 100,
        color: '#ffffff',
        zIndex: 12,
        textContent: post.title,
        fontFamily: 'inherit',
        fontSize: 42,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        width: 330,
        lineHeight: 0.98,
      },
      {
        id: `text-subtitle-${post.id}-${templateId}`,
        kind: 'text',
        item: 'subtitle',
        label: '副標題文字',
        x: 44,
        y: 36,
        size: 18,
        rotation: 0,
        opacity: 100,
        color: '#ffffff',
        zIndex: 13,
        textContent: '平凡一刻，也可以變成朋友想重播的故事。',
        fontFamily: 'inherit',
        fontSize: 18,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        width: 300,
        lineHeight: 1.2,
      },
      {
        id: `text-logo-${post.id}-${templateId}`,
        kind: 'text',
        item: 'logo',
        label: '品牌 Logo',
        x: 18,
        y: 91,
        size: 21,
        rotation: -4,
        opacity: 100,
        color: '#ffffff',
        zIndex: 14,
        textContent: 'SOON\nLOG',
        fontFamily: 'inherit',
        fontSize: 21,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'center',
        width: 86,
        lineHeight: 0.8,
      },
    ]
  }

  if (templateId === 'clean-brand') {
    return [
      {
        id: `image-background-${post.id}-${templateId}`,
        kind: 'image',
        item: 'background',
        label: '背景圖片',
        x: 50,
        y: 47,
        size: 390,
        width: 390,
        height: 488,
        rotation: 0,
        opacity: 100,
        color: '#ffffff',
        zIndex: 1,
        imageUrl,
      },
      {
        id: `shape-caption-${post.id}-${templateId}`,
        kind: 'shape',
        item: 'rounded',
        label: '文字底板',
        x: 50,
        y: 79,
        size: 250,
        rotation: 0,
        opacity: 88,
        color: '#F5F0EB',
        zIndex: 7,
      },
      {
        id: `text-title-${post.id}-${templateId}`,
        kind: 'text',
        item: 'headline',
        label: '標題文字',
        x: 50,
        y: 75,
        size: 28,
        rotation: 0,
        opacity: 100,
        color: '#1A1A1A',
        zIndex: 12,
        textContent: post.title,
        fontFamily: 'inherit',
        fontSize: 28,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'center',
        width: 340,
        lineHeight: 1.05,
      },
      {
        id: `text-subtitle-${post.id}-${templateId}`,
        kind: 'text',
        item: 'subtitle',
        label: '副標題文字',
        x: 50,
        y: 86,
        size: 15,
        rotation: 0,
        opacity: 100,
        color: '#5f534e',
        zIndex: 13,
        textContent: '由 SOON LOG 幫你把日常整理成更有節奏的內容。',
        fontFamily: 'inherit',
        fontSize: 15,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'center',
        width: 310,
        lineHeight: 1.28,
      },
      {
        id: `text-logo-${post.id}-${templateId}`,
        kind: 'text',
        item: 'logo',
        label: '品牌 Logo',
        x: 18,
        y: 11,
        size: 19,
        rotation: -4,
        opacity: 100,
        color: '#ffffff',
        zIndex: 14,
        textContent: 'SOON\nLOG',
        fontFamily: 'inherit',
        fontSize: 19,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'center',
        width: 82,
        lineHeight: 0.8,
      },
    ]
  }

  return createPostDesignElements({ ...post, image: imageUrl })
}

const TEMPLATE_CANVAS = { w: 430, h: 538 }

function templateBox(element: TemplateElement) {
  const x = element.x ?? 0
  const y = element.y ?? 0
  const w = element.w ?? 0.5
  const h = element.h ?? 0.12

  return {
    height: h * TEMPLATE_CANVAS.h,
    width: w * TEMPLATE_CANVAS.w,
    x: (x + w / 2) * 100,
    y: (y + h / 2) * 100,
  }
}

function createImagePlaceholderElements(
  element: TemplateElement,
  index: number,
  id: string,
  box: ReturnType<typeof templateBox>
): DesignElement[] {
  const label = element.label || '圖片位置'

  return [
    {
      id,
      kind: 'shape',
      item: 'rounded',
      label,
      x: box.x,
      y: box.y,
      size: Math.min(box.width, box.height),
      width: box.width,
      height: box.height,
      rotation: 0,
      opacity: 100,
      color: '#e0e0e0',
      strokeColor: '#bbbbbb',
      strokeDashArray: [8, 4],
      strokeWidth: 2,
      zIndex: index,
    },
    {
      id: `${id}-label`,
      kind: 'text',
      item: 'placeholder-label',
      label: '圖片提示',
      x: box.x,
      y: box.y,
      size: 14,
      rotation: 0,
      opacity: 82,
      color: '#555555',
      zIndex: index + 0.1,
      textContent: label,
      fontFamily: 'inherit',
      fontSize: box.height < 70 ? 11 : 15,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      width: Math.max(80, box.width * 0.82),
      lineHeight: 1.15,
    },
  ]
}

function createContentTemplateElements(template: Template): DesignElement[] {
  return template.elements.flatMap((element, index): DesignElement[] => {
    const box = templateBox(element)
    const id = `${template.id}-${element.type}-${index}-${Date.now()}`

    if (element.type === 'background') {
      return [
        {
          id,
          kind: 'shape',
          item: 'square',
          label: '背景',
          x: 50,
          y: 50,
          size: TEMPLATE_CANVAS.w,
          width: TEMPLATE_CANVAS.w,
          height: TEMPLATE_CANVAS.h,
          rotation: 0,
          opacity: Math.round((element.bgOpacity ?? 1) * 100),
          color: element.bgColor || '#ffffff',
          zIndex: index,
        },
      ]
    }

    if (element.type === 'image') {
      return createImagePlaceholderElements(element, index, id, box)
    }

    if (element.type === 'image_placeholder') {
      return createImagePlaceholderElements(element, index, id, box)
    }

    if (element.type === 'text' || element.type === 'badge') {
      const textContent = element.content || element.text || '文字'
      const textColor = element.color || element.fill || '#000000'
      const textAlign = element.textAlign || element.align || 'left'

      return [
        {
          id,
          kind: 'text',
          item: element.type,
          label: element.type === 'badge' ? '標籤文字' : '文字',
          x: box.x,
          y: box.y,
          size: element.fontSize || 20,
          rotation: 0,
          opacity: 100,
          color: textColor,
          backgroundColor: element.backgroundColor,
          zIndex: index,
          textContent,
          fontFamily: 'inherit',
          fontSize: element.fontSize || 20,
          fontWeight: element.fontWeight || 'normal',
          fontStyle: element.fontStyle || 'normal',
          textDecoration: 'none',
          textAlign,
          width: box.width,
          lineHeight: 1.12,
        },
      ]
    }

    if (element.type === 'rect') {
      return [
        {
          id,
          kind: 'shape',
          item: element.rx ? 'rounded' : 'square',
          label: element.label || '圖形',
          x: box.x,
          y: box.y,
          size: Math.min(box.width, box.height),
          width: box.width,
          height: box.height,
          rotation: 0,
          opacity: Math.round((element.bgOpacity ?? 1) * 100),
          color: element.fill || element.bgColor || '#111111',
          strokeColor: element.stroke,
          strokeWidth: element.strokeWidth,
          zIndex: index,
        },
      ]
    }

    if (element.type === 'shape') {
      return [
        {
          id,
          kind: 'shape',
          item: 'rounded',
          label: '圖形',
          x: box.x,
          y: box.y,
          size: Math.min(box.width, box.height),
          width: box.width,
          height: box.height,
          rotation: 0,
          opacity: Math.round((element.bgOpacity ?? 1) * 100),
          color: element.bgColor || '#111111',
          zIndex: index,
        },
      ]
    }

    return []
  })
}

function ScheduledPostsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoPostId = searchParams.get('postId')
  const [compact, setCompact] = useState(false)
  const fallbackScheduledPosts = useMemo(() => buildScheduledPosts(readTopicImages()), [])
  const [persistedScheduledPosts, setPersistedScheduledPosts] = useState<ScheduledPost[]>([])
  const [postsLoaded, setPostsLoaded] = useState(false)
  const scheduledPosts = persistedScheduledPosts
  const currentWeekPosts = useMemo(() => scheduledPosts.filter(isInCurrentWeek), [scheduledPosts])
  const today = new Date()
  const dateLabel = today.toLocaleDateString('zh-HK', { month: 'long', day: 'numeric' })
  const dateWithDay = today.toLocaleDateString('zh-HK', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null)
  const [postStatuses, setPostStatuses] = useState<Record<string, 'draft' | 'approved' | 'scheduled' | 'published' | 'rejected'>>({})
  const [publishing, setPublishing] = useState(false)
  const [publishingPlatform, setPublishingPlatform] = useState<string | null>(null)
  const [publishResult, setPublishResult] = useState<'success' | 'error' | null>(null)
  const [publishMessage, setPublishMessage] = useState('')
  const [publishedPlatforms, setPublishedPlatforms] = useState<Record<string, boolean>>({})
  const [platformConnections, setPlatformConnections] = useState<Record<string, PlatformConnection>>({})
  const [previewChannel, setPreviewChannel] = useState<PreviewChannel>('Instagram')
  const [captions, setCaptions] = useState<Record<string, Partial<Record<PreviewChannel, string>>>>({})
  const [draftCaptions, setDraftCaptions] = useState<Partial<Record<PreviewChannel, string>>>({})
  const [captionModalOpen, setCaptionModalOpen] = useState(false)
  const [designMode, setDesignMode] = useState(false)
  const [activeDesignTool, setActiveDesignTool] = useState<DesignTool>('品牌')
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    label: 'Instagram 直向貼文',
    w: 1080,
    h: 1350,
  })
  const [expandedElementSection, setExpandedElementSection] = useState<ElementSection | null>(null)
  const [designElements, setDesignElements] = useState<DesignElement[]>([])
  const [designElementsPostId, setDesignElementsPostId] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<{ url: string; label: string }[]>([])
  const [brandKit, setBrandKit] = useState({ businessName: '品牌', logoUrl: '' })
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createPostType, setCreatePostType] = useState('still-images')
  const [createTitle, setCreateTitle] = useState('')
  const [createScheduledAt, setCreateScheduledAt] = useState(localDateTimeValue())
  const [toolbarMessage, setToolbarMessage] = useState('')
  const [toolbarBusy, setToolbarBusy] = useState(false)
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false)
  const [regenerateProgress, setRegenerateProgress] = useState({ current: 0, total: 0 })
  const [improvePanelOpen, setImprovePanelOpen] = useState(false)
  const [improveMode, setImproveMode] = useState<'copy' | 'image-prompt'>('copy')
  const [improveProgress, setImproveProgress] = useState({ current: 0, total: 0 })
  const [aiCommand, setAiCommand] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [attachAssets, setAttachAssets] = useState<AttachAsset[]>([])
  const [attachLoading, setAttachLoading] = useState(false)
  const [attachTab, setAttachTab] = useState<'all' | 'website' | 'uploaded'>('all')
  const [selectedAttach, setSelectedAttach] = useState<string | null>(null)
  const [attachedImage, setAttachedImage] = useState<{ url: string; filename: string } | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLElement | null>(null)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const fabricControlsRef = useRef<FabricControls | null>(null)
  const designElementsImageRef = useRef<string>('')
  const designHistoryIndexRef = useRef(-1)
  const designHistoryRef = useRef<string[]>([])
  const isRestoringDesignHistoryRef = useRef(false)
  const filteredAttachAssets = useMemo(() => {
    if (attachTab === 'website') return attachAssets.filter((asset) => asset.asset_type === 'website_image')
    if (attachTab === 'uploaded') return attachAssets.filter((asset) => asset.asset_type !== 'website_image')
    return attachAssets
  }, [attachAssets, attachTab])

  useEffect(() => {
    if (!autoPostId || !postsLoaded || scheduledPosts.length === 0) return
    const target = scheduledPosts.find((post) => post.id === autoPostId)
    if (target) {
      setAiStatus('idle')
      setAttachedImage(null)
      setSelectedPost(target)
      router.replace('/scheduled-posts', { scroll: false })
    }
  }, [autoPostId, postsLoaded, router, scheduledPosts])

  useEffect(() => {
    if (!showAttachModal || !activeWorkspaceId) return

    let cancelled = false
    setAttachLoading(true)
    fetch(`/api/brand-kit-data?workspace_id=${encodeURIComponent(activeWorkspaceId)}`, {
      cache: 'no-store',
    })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        const assets = Array.isArray(data?.assets) ? data.assets : []
        setAttachAssets(assets as AttachAsset[])
      })
      .catch(() => {
        if (!cancelled) setAttachAssets([])
      })
      .finally(() => {
        if (!cancelled) setAttachLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId, showAttachModal])

  const openDesignEditor = (post: ScheduledPost) => {
    const isSquare = post.type === '靜態圖片' || Boolean(post.postType && !post.postType.toLowerCase().includes('story'))
    const newCanvasSize = isSquare
      ? { label: 'Instagram 方形貼文', w: 1080, h: 1080 }
      : { label: 'Instagram 直向貼文', w: 1080, h: 1350 }

    setCanvasSize(newCanvasSize)

    if (designElementsPostId !== post.id || designElementsImageRef.current !== post.image) {
      const nextElements = createPostDesignElements(post, newCanvasSize)
      designHistoryRef.current = [JSON.stringify(nextElements)]
      designHistoryIndexRef.current = 0
      setDesignElements(nextElements)
      void fabricControlsRef.current?.loadDesignElements(nextElements)
      setDesignElementsPostId(post.id)
      designElementsImageRef.current = post.image
      setSelectedElementId(null)
    }
    setDesignMode(true)
  }

  const openCaptionModal = (post: ScheduledPost) => {
    const currentCaptions = captions[post.id] || {}
    setDraftCaptions(
      CHANNELS.reduce<Partial<Record<PreviewChannel, string>>>((draft, channel) => {
        draft[channel.id] = currentCaptions[channel.id] || post.body
        return draft
      }, {})
    )
    setCaptionModalOpen(true)
  }

  const saveCaptionDrafts = () => {
    if (!selectedPost) return
    setCaptions((current) => ({
      ...current,
      [selectedPost.id]: {
        ...current[selectedPost.id],
        ...draftCaptions,
      },
    }))
    setCaptionModalOpen(false)
  }

  const refreshCalendar = () => setRefreshKey((value) => value + 1)

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (toolbarBusy) return

    setToolbarBusy(true)
    setToolbarMessage('')

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('請先登入。')

      const { workspaceId } = await resolveActiveWorkspace()
      if (!workspaceId) throw new Error('找不到目前工作台。')

      const scheduledAt = new Date(createScheduledAt)
      if (Number.isNaN(scheduledAt.getTime())) throw new Error('請選擇有效的發布時間。')
      if (scheduledAt < new Date()) {
        const nextAvailableTime = localDateTimeValue()
        setCreateScheduledAt(nextAvailableTime)
        throw new Error('發布時間不能早於現在，已改為一小時後。')
      }

      const title = createTitle.trim()
      if (!title) throw new Error('請輸入標題。')

      const { error } = await supabase.from('campaign_posts').insert({
        user_id: user.id,
        workspace_id: workspaceId,
        source_key: `manual-${crypto.randomUUID()}`,
        title,
        body: 'SOON 會根據這個標題協助你完善內容。',
        post_type: createPostType,
        scheduled_at: scheduledAt.toISOString(),
        image_url: null,
        status: 'draft',
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setActiveWorkspaceIdState(workspaceId)
      setCreateModalOpen(false)
      setCreateTitle('')
      setCreateScheduledAt(localDateTimeValue())
      setToolbarMessage('已建立新貼文。')
      refreshCalendar()
    } catch (error) {
      setToolbarMessage(error instanceof Error ? error.message : '建立貼文失敗，請再試一次。')
    } finally {
      setToolbarBusy(false)
    }
  }

  async function regenerateImagesForPosts(
    posts: ScheduledPost[],
    onProgress?: (current: number, total: number) => void
  ) {
    setRegenerateProgress({ current: 0, total: posts.length })
    for (let index = 0; index < posts.length; index += 1) {
      const post = posts[index]
      setRegenerateProgress({ current: index + 1, total: posts.length })
      onProgress?.(index + 1, posts.length)
      const response = await fetch('/api/generate-post-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      })
      if (!response.ok) {
        const message = await response.text().catch(() => '')
        throw new Error(message || `圖片生成失敗：${post.title}`)
      }
    }
  }

  async function handleConfirmRegenerate() {
    if (toolbarBusy) return

    const posts = currentWeekPosts
    if (!activeWorkspaceId || !posts.length) {
      setToolbarMessage('本週沒有可重新生成的貼文。')
      setRegenerateConfirmOpen(false)
      return
    }

    setToolbarBusy(true)
    setToolbarMessage('')

    try {
      await regenerateImagesForPosts(posts)
      setToolbarMessage('本週圖片已重新生成。')
      setRegenerateConfirmOpen(false)
      refreshCalendar()
    } catch (error) {
      setToolbarMessage(error instanceof Error ? error.message : '重新生成失敗，請再試一次。')
    } finally {
      setToolbarBusy(false)
      setRegenerateProgress({ current: 0, total: 0 })
    }
  }

  async function handleImprovePosts() {
    if (toolbarBusy) return

    const posts = currentWeekPosts
    if (!activeWorkspaceId || !posts.length) {
      setToolbarMessage('本週沒有可改善的貼文。')
      setImprovePanelOpen(false)
      return
    }

    setToolbarBusy(true)
    setToolbarMessage('')
    setImproveProgress({ current: 1, total: improveMode === 'image-prompt' ? posts.length + 1 : 1 })

    try {
      const response = await fetch('/api/scheduled-posts/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: improveMode,
          postIds: posts.map((post) => post.id),
          workspaceId: activeWorkspaceId,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.detail || result?.error || '改善失敗，請再試一次。')
      }

      if (improveMode === 'image-prompt') {
        const updatedIds = Array.isArray(result?.updated) ? result.updated : posts.map((post) => post.id)
        const updatedPosts = posts.filter((post) => updatedIds.includes(post.id))
        await regenerateImagesForPosts(updatedPosts, (current, total) => {
          setImproveProgress({ current: current + 1, total: total + 1 })
        })
      }

      setToolbarMessage(improveMode === 'copy' ? '本週文案已改善。' : '本週圖片 prompt 已改善並重新生成圖片。')
      setImprovePanelOpen(false)
      refreshCalendar()
    } catch (error) {
      setToolbarMessage(error instanceof Error ? error.message : '改善失敗，請再試一次。')
    } finally {
      setToolbarBusy(false)
      setImproveProgress({ current: 0, total: 0 })
    }
  }

  const refreshSelectedPost = async (postId: string) => {
    setRefreshKey((value) => value + 1)

    const supabase = createClient()
    const { data: updatedPost } = await supabase
      .from('campaign_posts')
      .select('id,title,body,post_type,scheduled_at,image_url,status,marketing_campaigns(name,strategy_emoji)')
      .eq('id', postId)
      .single()

    if (updatedPost) {
      const mapped = mapPersistedScheduledPost(
        updatedPost as Record<string, unknown>,
        0,
        fallbackScheduledPosts
      )
      const rawImageUrl = (updatedPost as Record<string, unknown>).image_url
      if (typeof rawImageUrl === 'string' && rawImageUrl) {
        mapped.image = rawImageUrl
      }
      setSelectedPost(mapped)
    }
  }

  const generatePostImageFromCommand = async (command: string, referenceImageUrl: string | null) => {
    if (!selectedPost) throw new Error('No selected post')

    console.log('[generate-with-reference] sending:', {
      currentPostImageUrl: selectedPost.image,
      postId: selectedPost.id,
      referenceImageUrl,
      workspaceId: activeWorkspaceId,
    })
    const response = await fetch('/api/posts/generate-with-reference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPostImageUrl: selectedPost.image,
        postId: selectedPost.id,
        postBody: selectedPost.body,
        postTitle: selectedPost.title,
        referenceImageUrl,
        userCommand: command || 'Improve this image for professional social media marketing',
        workspaceId: activeWorkspaceId,
      }),
    })
    const result = await response.json()
    console.log('[generate-with-reference] response:', result)
    if (!response.ok) throw new Error(result.detail || 'Failed to generate image')
  }

  const handleAiCommandWithText = async (text: string) => {
    if (!selectedPost || aiLoading) return

    setAiCommand(text)
    setAiLoading(true)
    setAiStatus('processing')
    try {
      await generatePostImageFromCommand(text, null)
      setAiStatus('done')
      await refreshSelectedPost(selectedPost.id)
      window.setTimeout(() => setAiStatus('idle'), 4000)
    } catch {
      setAiStatus('error')
      window.setTimeout(() => setAiStatus('idle'), 4000)
    } finally {
      setAiLoading(false)
      setAiCommand('')
    }
  }

  const handleAiCommand = async () => {
    if ((!aiCommand.trim() && !attachedImage) || !selectedPost || aiLoading) return

    const command = aiCommand.trim()
    const isCaptionOnly = /caption|文案|標題文字|copy/i.test(command) && !attachedImage

    setAiLoading(true)
    setAiStatus('processing')
    try {
      if (isCaptionOnly) {
        const response = await fetch('/api/scheduled-posts/improve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'copy',
            postIds: [selectedPost.id],
            workspaceId: activeWorkspaceId,
            userCommand: command,
          }),
        })
        if (!response.ok) throw new Error('Failed to improve caption')
      } else {
        await generatePostImageFromCommand(
          command || 'Improve this image for professional social media marketing',
          attachedImage?.url ?? null
        )
      }

      setAiCommand('')
      setAttachedImage(null)
      setAiStatus('done')
      await refreshSelectedPost(selectedPost.id)
      window.setTimeout(() => setAiStatus('idle'), 4000)
    } catch {
      setAiStatus('error')
      window.setTimeout(() => setAiStatus('idle'), 4000)
    } finally {
      setAiLoading(false)
    }
  }

  const handleAttachUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !activeWorkspaceId) return

    setAttachLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('請先登入')

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const storagePath = `${user.id}/brand-kit/${activeWorkspaceId}/${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage
        .from('brand-assets')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('brand-assets').getPublicUrl(storagePath)
      const nextAsset: Omit<AttachAsset, 'id'> = {
        asset_type: 'upload',
        filename: file.name,
        source_url: null,
        url: publicUrlData.publicUrl,
      }
      const { data: inserted, error: insertError } = await supabase
        .from('brand_assets')
        .insert({
          ...nextAsset,
          is_used: false,
          user_id: user.id,
          workspace_id: activeWorkspaceId,
        })
        .select('id,url,filename,asset_type,source_url')
        .single()
      if (insertError) throw insertError

      const asset = inserted as AttachAsset
      setAttachAssets((current) => [asset, ...current])
      setSelectedAttach(asset.id)
      setAttachTab('uploaded')
    } finally {
      setAttachLoading(false)
      event.target.value = ''
    }
  }

  const approvePost = async (post: ScheduledPost) => {
    await publishPost(post)
  }

  const publishPost = async (post: ScheduledPost, platform?: string) => {
    if (publishing) return

    setPublishing(true)
    setPublishingPlatform(platform || 'all')
    setPublishResult(null)
    setPublishMessage('')

    try {
      const { workspaceId } = await resolveActiveWorkspace()
      if (!workspaceId) throw new Error('找不到目前工作台。')

      const response = await fetch('/api/posts/publish', {
        body: JSON.stringify({ platform, postId: post.id, workspaceId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result = await response.json().catch(() => ({}))
      const errors = Array.isArray(result?.errors) ? result.errors : []

      if (!result?.success || errors.length) {
        const message =
          errors
            .map((item: { message?: string; platform?: string }) =>
              item.platform ? `${item.platform}: ${item.message || '發布失敗'}` : item.message || '發布失敗'
            )
            .join('；') ||
          result?.detail ||
          result?.error ||
          '發布失敗，貼文已保留為已批准。'
        setPostStatuses((current) => ({ ...current, [post.id]: 'approved' }))
        setPublishResult('error')
        setPublishMessage(message)
        refreshCalendar()
        return
      }

      const status =
        result?.status === 'published'
          ? 'published'
          : result?.status === 'scheduled'
            ? 'scheduled'
            : 'approved'
      const scheduledAt = post.scheduledAt
        ? new Date(post.scheduledAt).toLocaleString('zh-HK', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : '預定時間'
      const platformText = Array.isArray(result?.platforms_published) && result.platforms_published.length
        ? `已發布到 ${result.platforms_published.join(', ')}。`
        : ''

      setPostStatuses((current) => ({ ...current, [post.id]: status }))
      if (Array.isArray(result?.platforms_published)) {
        setPublishedPlatforms((current) => {
          const next = { ...current }
          result.platforms_published.forEach((item: string) => {
            next[`${post.id}:${item}`] = true
          })
          return next
        })
      }
      setPublishResult('success')
      setPublishMessage(
        status === 'published'
          ? `✓ 已發布。${platformText}`
          : `貼文已批准，將於 ${scheduledAt} 自動發布。`
      )
      refreshCalendar()
    } catch (error) {
      setPostStatuses((current) => ({ ...current, [post.id]: 'approved' }))
      setPublishResult('error')
      setPublishMessage(error instanceof Error ? error.message : '發布失敗，貼文已保留為已批准。')
    } finally {
      setPublishing(false)
      setPublishingPlatform(null)
    }
  }

  const platformAccountName = (platformId: string) => {
    const connection = platformConnections[platformId]
    const name = connection?.account_name || connection?.account_id || ''
    if (!name) return ''
    return platformId === 'instagram' || platformId === 'threads' ? `@${name}` : name
  }

  const previewPlatformId =
    previewChannel === 'Instagram' ? 'instagram' : previewChannel === 'Threads' ? 'threads' : 'facebook'
  const previewUsername = platformAccountName(previewPlatformId) || 'SOON'
  const workspaceName = brandKit.businessName
  const workspaceInitial = workspaceName?.[0]?.toUpperCase() || 'S'

  const rejectPost = (post: ScheduledPost) => {
    setPostStatuses((current) => ({ ...current, [post.id]: 'rejected' }))
  }

  const goToNextPost = () => {
    if (!selectedPost) return
    const index = scheduledPosts.findIndex((post) => post.id === selectedPost.id)
    const nextPost = scheduledPosts[index + 1]
    if (nextPost) {
      setAiStatus('idle')
      setAttachedImage(null)
      setSelectedPost(nextPost)
    }
  }

  const goToPrevPost = () => {
    if (!selectedPost) return
    const index = scheduledPosts.findIndex((post) => post.id === selectedPost.id)
    const prevPost = scheduledPosts[index - 1]
    if (prevPost) {
      setAiStatus('idle')
      setAttachedImage(null)
      setSelectedPost(prevPost)
    }
  }

  const selectedCaption =
    selectedPost ? captions[selectedPost.id]?.[previewChannel] || selectedPost.body : ''
  const selectedElement = designElements.find((element) => element.id === selectedElementId) || null
  const selectedPostIndex = selectedPost
    ? scheduledPosts.findIndex((post) => post.id === selectedPost.id)
    : -1
  const currentPostStatus = selectedPost
    ? postStatuses[selectedPost.id] ||
      (selectedPost.status === '已發布'
        ? 'published'
        : selectedPost.status === '已排程'
          ? 'scheduled'
          : selectedPost.status === '已批准'
            ? 'approved'
            : selectedPost.status === '草稿'
              ? 'draft'
              : 'draft')
    : 'draft'
  const hasPrevPost = selectedPostIndex > 0
  const hasNextPost = selectedPostIndex >= 0 && selectedPostIndex < scheduledPosts.length - 1

  const getToolForElement = (element: DesignElement): DesignTool => {
    if (element.kind === 'text') return '文字'
    if (element.kind === 'image') return '媒體'
    return '元素'
  }

  const clearFabricSelection = () => {
    const canvas = fabricControlsRef.current?.fabricRef.current
    if (!canvas) return
    canvas.discardActiveObject()
    canvas.renderAll()
  }

  const deselectDesignElement = () => {
    clearFabricSelection()
    setSelectedElementId(null)
  }

  const selectDesignElement = (id: string) => {
    setSelectedElementId(id)
    const element = designElements.find((item) => item.id === id)
    if (element) {
      setActiveDesignTool(getToolForElement(element))
    }
  }

  const switchDesignTool = (tool: DesignTool) => {
    deselectDesignElement()
    setActiveDesignTool(tool)
  }

  useEffect(() => {
    let cancelled = false
    const fallback = readBrandKit()
    setBrandKit(fallback)

    async function persistAndLoadBrandKit() {
      await completeOnboardingSnapshot()
      const persisted = await loadPersistedBrandKit(fallback)
      if (!cancelled) setBrandKit(persisted)
    }

    void persistAndLoadBrandKit()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPlatformConnections() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user?.id) return

        const { workspaceId } = await resolveActiveWorkspace()
        if (!workspaceId) return

        const { data, error } = await supabase
          .from('social_connections')
          .select('platform,account_name,account_id')
          .eq('workspace_id', workspaceId)
          .in('platform', PUBLISH_PLATFORMS.map((platform) => platform.id))

        if (error) throw error
        if (cancelled) return

        const nextConnections: Record<string, PlatformConnection> = {}
        ;((data || []) as PlatformConnection[]).forEach((connection) => {
          nextConnections[connection.platform] = connection
        })
        setPlatformConnections(nextConnections)
      } catch (error) {
        console.warn('[scheduled-posts] failed to load social connections:', error)
      }
    }

    void loadPlatformConnections()

    function handleWorkspaceChanged() {
      void loadPlatformConnections()
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    }
  }, [refreshKey])

  useEffect(() => {
    let cancelled = false

    async function loadPersistedPostsAndCredits() {
      setPostsLoaded(false)
      setPersistedScheduledPosts([])

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const sessionId = getStoredOnboardingSessionId()
        let workspaceId: string | null = null

        let query = supabase
          .from('campaign_posts')
          .select('id,title,body,post_type,scheduled_at,image_url,status,marketing_campaigns(name,strategy_emoji)')
          .order('scheduled_at', { ascending: true })

        if (user?.id) {
          ;({ workspaceId } = await resolveActiveWorkspace())
          if (!workspaceId) {
            if (!cancelled) {
              setActiveWorkspaceIdState(null)
              setPersistedScheduledPosts([])
              setPostsLoaded(true)
            }
            return
          }

          if (!cancelled) setActiveWorkspaceIdState(workspaceId)
          query = query.eq('workspace_id', workspaceId)
          const { data: creditsData } = await supabase
            .from('user_credits')
            .select('balance')
            .eq('user_id', user.id)
            .maybeSingle()
          if (!cancelled && typeof creditsData?.balance === 'number') {
            setCreditBalance(creditsData.balance)
          }
        } else if (sessionId) {
          query = query.eq('onboarding_session_id', sessionId)
        } else {
          if (!cancelled) setPostsLoaded(true)
          return
        }

        const { data, error } = await query
        if (error) throw error

        if (!cancelled) {
          setPersistedScheduledPosts(
            ((data || []) as Record<string, unknown>[]).map((post, index) =>
              mapPersistedScheduledPost(post, index, fallbackScheduledPosts)
            )
          )
          setPostsLoaded(true)
        }
      } catch {
        if (!cancelled) {
          setPersistedScheduledPosts([])
          setPostsLoaded(true)
        }
      }
    }

    void loadPersistedPostsAndCredits()

    function handleWorkspaceChanged() {
      setRefreshKey((value) => value + 1)
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)

    return () => {
      cancelled = true
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged)
    }
  }, [fallbackScheduledPosts, refreshKey])

  useEffect(() => {
    const snapshot = JSON.stringify(designElements)
    if (isRestoringDesignHistoryRef.current) {
      isRestoringDesignHistoryRef.current = false
      return
    }

    const history = designHistoryRef.current
    const currentIndex = designHistoryIndexRef.current
    if (history[currentIndex] === snapshot) return

    const nextHistory = history.slice(0, currentIndex + 1)
    nextHistory.push(snapshot)
    if (nextHistory.length > 50) {
      nextHistory.shift()
    }

    designHistoryRef.current = nextHistory
    designHistoryIndexRef.current = nextHistory.length - 1
  }, [designElements])

  const restoreDesignHistory = (direction: 'undo' | 'redo') => {
    if (fabricControlsRef.current) {
      void (direction === 'undo' ? fabricControlsRef.current.undo() : fabricControlsRef.current.redo())
      return
    }

    const history = designHistoryRef.current
    const currentIndex = designHistoryIndexRef.current
    const nextIndex = direction === 'undo' ? currentIndex - 1 : currentIndex + 1
    if (nextIndex < 0 || nextIndex >= history.length) return

    const nextElements = JSON.parse(history[nextIndex]) as DesignElement[]
    designHistoryIndexRef.current = nextIndex
    isRestoringDesignHistoryRef.current = true
    setDesignElements(nextElements)
    setSelectedElementId((current) =>
      current && nextElements.some((element) => element.id === current) ? current : null
    )
  }

  useEffect(() => {
    if (!designMode) return

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, button, [contenteditable="true"]')) return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        restoreDesignHistory(event.shiftKey ? 'redo' : 'undo')
        return
      }

      if ((event.key === 'Backspace' || event.key === 'Delete') && selectedElementId) {
        event.preventDefault()
        deleteSelectedElement()
        return
      }

      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault()
        deselectDesignElement()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [designMode, selectedElementId])

  const addDesignElement = (kind: Exclude<DesignElementKind, 'text' | 'image'>, item: string) => {
    const id = `${kind}-${item}-${Date.now()}`
    const nextElement: DesignElement = {
      id,
      kind,
      item,
      label: kind === 'shape' ? '形狀' : kind === 'frame' ? '相框' : '圖示',
      x: 50,
      y: 48,
      size: kind === 'icon' ? 58 : 132,
      rotation: 0,
      opacity: 100,
      color: '#111111',
      zIndex: 15 + designElements.length,
    }
    void fabricControlsRef.current?.addDesignElement(nextElement)
    setDesignElements((current) => [...current, nextElement])
    setSelectedElementId(id)
    setActiveDesignTool('元素')
  }

  const addTextElement = (preset: TextPreset) => {
    const presets: Record<
      TextPreset,
      Pick<DesignElement, 'color' | 'fontSize' | 'fontWeight' | 'textContent' | 'width'>
    > = {
      heading: {
        color: '#ffffff',
        fontSize: 46,
        fontWeight: 'bold',
        textContent: '標題文字',
        width: 360,
      },
      subheading: {
        color: '#ffffff',
        fontSize: 30,
        fontWeight: 'bold',
        textContent: '副標題',
        width: 330,
      },
      body: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'normal',
        textContent: '內文文字，點擊右邊編輯',
        width: 300,
      },
      caption: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'normal',
        textContent: '說明文字',
        width: 240,
      },
    }
    const config = presets[preset]
    const id = `text-${preset}-${Date.now()}`
    const nextElement: DesignElement = {
      id,
      kind: 'text',
      item: preset,
      label: '文字',
      x: 50,
      y: 46,
      size: config.fontSize || 24,
      rotation: 0,
      opacity: 100,
      color: config.color || '#ffffff',
      zIndex: 20 + designElements.length,
      textContent: config.textContent,
      fontFamily: 'inherit',
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      width: config.width,
      lineHeight: 1.25,
    }
    void fabricControlsRef.current?.addDesignElement(nextElement)
    setDesignElements((current) => [...current, nextElement])
    setSelectedElementId(id)
    setActiveDesignTool('文字')
  }

  const addTextStyleElement = (preset: TextStylePreset) => {
    const id = `text-style-${preset.label}-${Date.now()}`
    const fontWeight = preset.style.fontWeight === 'bold' || preset.style.fontWeight === 900 ? 'bold' : 'normal'
    const fontStyle = preset.style.fontStyle === 'italic' ? 'italic' : 'normal'
    const textAlign =
      preset.style.textAlign === 'left' || preset.style.textAlign === 'right' || preset.style.textAlign === 'center'
        ? preset.style.textAlign
        : 'center'
    const opacity = typeof preset.style.opacity === 'number' ? Math.round(preset.style.opacity * 100) : 100
    const nextElement: DesignElement = {
      id,
      kind: 'text',
      item: preset.label,
      label: '文字',
      x: 50,
      y: 46,
      size: typeof preset.style.fontSize === 'number' ? preset.style.fontSize : 24,
      rotation: 0,
      opacity,
      color: typeof preset.style.color === 'string' ? preset.style.color : '#111111',
      backgroundColor: typeof preset.style.backgroundColor === 'string' ? preset.style.backgroundColor : undefined,
      zIndex: 20 + designElements.length,
      textContent: preset.textContent,
      fontFamily: typeof preset.style.fontFamily === 'string' ? preset.style.fontFamily : 'inherit',
      fontSize: typeof preset.style.fontSize === 'number' ? preset.style.fontSize : 24,
      fontWeight,
      fontStyle,
      textDecoration: 'none',
      textAlign,
      width: 300,
      lineHeight: 1.25,
    }
    void fabricControlsRef.current?.addDesignElement(nextElement)
    setDesignElements((current) => [...current, nextElement])
    setSelectedElementId(id)
    setActiveDesignTool('文字')
  }

  const addImageElement = (imageUrl: string, label = '圖片') => {
    const nextElement: DesignElement = {
      id: crypto.randomUUID(),
      kind: 'image',
      item: 'photo',
      label,
      x: 50,
      y: 50,
      size: 220,
      width: 300,
      height: 220,
      rotation: 0,
      opacity: 100,
      color: 'transparent',
      zIndex: 20 + designElements.length,
      imageUrl,
    }
    void fabricControlsRef.current?.addDesignElement(nextElement)
    setDesignElements((current) => [...current, nextElement])
    setSelectedElementId(nextElement.id)
    setActiveDesignTool('媒體')
  }

  const applyBackgroundImage = (imageUrl: string) => {
    void fabricControlsRef.current?.applyBackgroundImage(imageUrl)
    setSelectedElementId(null)
    setActiveDesignTool('背景')
  }

  const updateImageElement = (id: string, changes: Partial<DesignElement>) => {
    void fabricControlsRef.current?.updateDesignElement(id, changes)
    setDesignElements((current) =>
      current.map((element) => (element.id === id ? { ...element, ...changes } : element))
    )
  }

  const addBrandTextElement = (
    label: string,
    textContent: string,
    fontSize: number,
    fontWeight: DesignElement['fontWeight'],
    color: string
  ) => {
    const nextElement: DesignElement = {
      id: crypto.randomUUID(),
      kind: 'text',
      item: label,
      label,
      x: 50,
      y: fontWeight === 'bold' ? 40 : 60,
      size: fontSize,
      rotation: 0,
      opacity: 100,
      color,
      zIndex: 20 + designElements.length,
      textContent,
      fontFamily: 'inherit',
      fontSize,
      fontWeight,
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      width: fontWeight === 'bold' ? 400 : 360,
      lineHeight: fontWeight === 'bold' ? 1.12 : 1.45,
    }
    void fabricControlsRef.current?.addDesignElement(nextElement)
    setDesignElements((current) => [...current, nextElement])
    setSelectedElementId(nextElement.id)
    setActiveDesignTool('品牌')
  }

  const applyBrandColor = (color: string) => {
    if (!selectedElementId) {
      const nextElement: DesignElement = {
        id: crypto.randomUUID(),
        kind: 'shape',
        item: 'rounded',
        label: '品牌色塊',
        x: 50,
        y: 50,
        size: 132,
        rotation: 0,
        opacity: 100,
        color,
        zIndex: 20 + designElements.length,
      }
      void fabricControlsRef.current?.addDesignElement(nextElement)
      setDesignElements((current) => [...current, nextElement])
      setSelectedElementId(nextElement.id)
      return
    }
    void fabricControlsRef.current?.updateDesignElement(selectedElementId, { color })
    setDesignElements((current) =>
      current.map((element) => (element.id === selectedElementId ? { ...element, color } : element))
    )
  }

  const applyTemplatePreset = (template: Template) => {
    if (!selectedPost) return
    const nextElements = createContentTemplateElements(template)
    setDesignElements(nextElements)
    void fabricControlsRef.current?.loadDesignElements(nextElements)
    setSelectedElementId(null)
    setActiveDesignTool('模板')
  }

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const url = URL.createObjectURL(file)
      const label = file.name.replace(/\.[^.]+$/, '') || '圖片'
      setUploadedImages((current) => [{ url, label }, ...current])
      addImageElement(url, label)
    })
  }

  const updateSelectedElement = (updates: Partial<DesignElement>) => {
    if (!selectedElementId) return
    void fabricControlsRef.current?.updateDesignElement(selectedElementId, updates)
    setDesignElements((current) =>
      current.map((element) => (element.id === selectedElementId ? { ...element, ...updates } : element))
    )
  }

  const deleteSelectedElement = () => {
    void fabricControlsRef.current?.deleteSelected()
    if (!selectedElementId) return
    setDesignElements((current) => current.filter((element) => element.id !== selectedElementId))
    setSelectedElementId(null)
  }

  const duplicateSelectedElement = () => {
    if (!selectedElement) return
    const id = `${selectedElement.kind}-${selectedElement.item}-${Date.now()}`
    const clone = {
      ...selectedElement,
      id,
      x: Math.min(74, selectedElement.x + 6),
      y: Math.min(74, selectedElement.y + 6),
      zIndex: selectedElement.zIndex + 1,
    }
    void fabricControlsRef.current?.addDesignElement(clone)
    setDesignElements((current) => [...current, clone])
    setSelectedElementId(id)
  }

  const openElementEditor = (element: DesignElement) => {
    setSelectedElementId(element.id)
    setActiveDesignTool(element.kind === 'image' ? '媒體' : element.kind === 'text' ? '文字' : '元素')
  }

  const moveSelectedLayer = (direction: 'forward' | 'front' | 'backward' | 'back') => {
    if (!selectedElement) return
    if (direction === 'forward' || direction === 'front') {
      fabricControlsRef.current?.bringForward()
    } else {
      fabricControlsRef.current?.sendBackward()
    }
    setDesignElements((current) => {
      const zValues = current.map((element) => element.zIndex)
      const maxZ = Math.max(...zValues, 12)
      return current.map((element) => {
        if (element.id !== selectedElement.id) return element
        const nextZ = {
          forward: element.zIndex + 5,
          front: maxZ + 5,
          backward: element.zIndex - 5,
          back: 2,
        }[direction]
        return { ...element, zIndex: Math.max(2, Math.min(80, nextZ)) }
      })
    })
  }

  const resizeCanvas = (size: CanvasSize) => {
    const nextSize = {
      label: size.label,
      w: Math.max(100, Math.round(size.w)),
      h: Math.max(100, Math.round(size.h)),
    }
    setCanvasSize(nextSize)
    setSelectedElementId(null)
    setActiveDesignTool('尺寸')
  }

  const startElementMove = (event: ReactPointerEvent<HTMLElement>, element: DesignElement) => {
    if (!canvasRef.current) return
    event.preventDefault()
    setSelectedElementId(element.id)
    const rect = canvasRef.current.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const initialX = element.x
    const initialY = element.y

    const onMove = (moveEvent: PointerEvent) => {
      const nextX = initialX + ((moveEvent.clientX - startX) / rect.width) * 100
      const nextY = initialY + ((moveEvent.clientY - startY) / rect.height) * 100
      setDesignElements((current) =>
        current.map((item) =>
          item.id === element.id
            ? {
                ...item,
                x: Math.min(94, Math.max(6, nextX)),
                y: Math.min(94, Math.max(6, nextY)),
              }
            : item
        )
      )
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const startElementResize = (event: ReactPointerEvent<HTMLElement>, element: DesignElement) => {
    if (!canvasRef.current) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedElementId(element.id)
    const rect = canvasRef.current.getBoundingClientRect()
    const centerX = rect.left + (element.x / 100) * rect.width
    const centerY = rect.top + (element.y / 100) * rect.height
    const initialSize = element.size
    const initialDistance = Math.max(1, Math.hypot(event.clientX - centerX, event.clientY - centerY))

    const onMove = (moveEvent: PointerEvent) => {
      const nextDistance = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY)
      setDesignElements((current) =>
        current.map((item) =>
          item.id === element.id
            ? {
                ...item,
                ...(item.kind === 'text'
                  ? {
                      fontSize: Math.min(200, Math.max(8, Math.round((initialSize || 24) * (nextDistance / initialDistance)))),
                      size: Math.min(200, Math.max(8, Math.round((initialSize || 24) * (nextDistance / initialDistance)))),
                      width: Math.min(520, Math.max(140, Math.round((element.width || 300) * (nextDistance / initialDistance)))),
                    }
                  : item.kind === 'image'
                    ? {
                        height: Math.min(760, Math.max(180, Math.round((element.height || 538) * (nextDistance / initialDistance)))),
                        size: Math.min(760, Math.max(180, Math.round((initialSize || 430) * (nextDistance / initialDistance)))),
                        width: Math.min(640, Math.max(150, Math.round((element.width || 430) * (nextDistance / initialDistance)))),
                      }
                  : {
                      size: Math.min(260, Math.max(34, Math.round(initialSize * (nextDistance / initialDistance)))),
                    }),
              }
            : item
        )
      )
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const startElementRotate = (event: ReactPointerEvent<HTMLElement>, element: DesignElement) => {
    if (!canvasRef.current) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedElementId(element.id)
    const rect = canvasRef.current.getBoundingClientRect()
    const centerX = rect.left + (element.x / 100) * rect.width
    const centerY = rect.top + (element.y / 100) * rect.height

    const onMove = (moveEvent: PointerEvent) => {
      const radians = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX)
      const degrees = Math.round((radians * 180) / Math.PI + 90)
      setDesignElements((current) =>
        current.map((item) => (item.id === element.id ? { ...item, rotation: degrees } : item))
      )
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  if (selectedPost && designMode) {
    return (
      <main className="design-editor-page">
        <ClaimOnboardingSession />
        <header className="design-topbar">
          <div className="design-nav">
            <button type="button" aria-label="選單">☰</button>
            <button type="button" onClick={() => setDesignMode(false)} aria-label="返回貼文">
              ←
            </button>
            <button type="button" aria-label="日期">▣</button>
          </div>

          <div className="design-title">
            <span>▱</span>
            <strong>{selectedPost.title}</strong>
            <em>草稿</em>
          </div>

          <div className="design-account">
            <span>✦ {creditBalance ?? "—"} credits 剩餘</span>
            <button type="button">升級</button>
          </div>
        </header>

        <DesignToolbar
          activeDesignTool={activeDesignTool}
          onRedo={() => restoreDesignHistory('redo')}
          onToolChange={switchDesignTool}
          onUndo={() => restoreDesignHistory('undo')}
        />

        <section className="design-workbench">
          <DesignCanvas
            canvasSize={canvasSize}
            canvasRef={canvasRef}
            designElements={designElements}
            onFabricReady={(controls) => {
              fabricControlsRef.current = controls
            }}
            onCloseDesignMode={() => setDesignMode(false)}
            onDelete={deleteSelectedElement}
            onDeselectElement={deselectDesignElement}
            onDuplicate={duplicateSelectedElement}
            onEditElement={openElementEditor}
            onSelectElement={selectDesignElement}
            onSetActiveTool={setActiveDesignTool}
            onStartMove={startElementMove}
            onStartResize={startElementResize}
            onStartRotate={startElementRotate}
            selectedElementId={selectedElementId}
            selectedPost={selectedPost}
          />

          <EditorSidePanel
            activeDesignTool={activeDesignTool}
            brandLogoUrl={brandKit.logoUrl}
            brandName={brandKit.businessName}
            canvasSize={canvasSize}
            expandedElementSection={expandedElementSection}
            isDraggingOver={isDraggingOver}
            onAddBrandText={addBrandTextElement}
            onAddElement={addDesignElement}
            onAddImage={addImageElement}
            onAddText={addTextElement}
            onAddTextStyle={addTextStyleElement}
            onApplyBackgroundImage={applyBackgroundImage}
            onApplyBrandColor={applyBrandColor}
            onApplyTemplate={applyTemplatePreset}
            onCloseDesignMode={() => setDesignMode(false)}
            onCreditsChange={setCreditBalance}
            onDelete={deleteSelectedElement}
            onDeselectElement={deselectDesignElement}
            onImageUpload={handleImageUpload}
            onOpenCaptionEditor={() => openCaptionModal(selectedPost)}
            onMoveLayer={moveSelectedLayer}
            onResizeCanvas={resizeCanvas}
            onSetActiveTool={setActiveDesignTool}
            onSetDraggingOver={setIsDraggingOver}
            onSetExpandedSection={setExpandedElementSection}
            onTrackUploadedImage={(image) => setUploadedImages((current) => [image, ...current])}
            onUpdateElement={(id, changes) => {
              void fabricControlsRef.current?.updateDesignElement(id, changes)
              setDesignElements((current) =>
                current.map((element) => (element.id === id ? { ...element, ...changes } : element))
              )
            }}
            selectedElement={selectedElement}
            selectedPost={selectedPost}
            uploadedImages={uploadedImages}
            workspaceId={activeWorkspaceId}
          />
        </section>

        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </main>
    )
  }

  if (selectedPost) {
    return (
      <main className="post-editor-page">
        <ClaimOnboardingSession />
        <header className="post-editor-topbar">
          <div className="post-editor-topbar-left">
            <button
              aria-label="返回日曆"
              className="post-editor-back-btn"
              onClick={() => {
                setAiStatus('idle')
                setAttachedImage(null)
                setSelectedPost(null)
              }}
              type="button"
            >
              ←
            </button>
            <div className="post-editor-title-group">
              <img alt="" className="post-editor-thumb" src={selectedPost.image} />
              <span className="post-editor-campaign-name">{selectedPost.title}</span>
              <span className={`post-editor-status-badge ${currentPostStatus}`}>
                {currentPostStatus === 'approved'
                  ? '已批准'
                  : currentPostStatus === 'scheduled'
                    ? '已排程'
                    : currentPostStatus === 'published'
                      ? '已發布'
                  : currentPostStatus === 'rejected'
                    ? '不發布'
                    : '草稿'}
              </span>
            </div>
          </div>

          <div className="post-editor-topbar-center">
            <button
              className="post-editor-nav-btn"
              disabled={!hasPrevPost}
              onClick={goToPrevPost}
              type="button"
            >
              ← 上一個
            </button>
            <button
              className="post-editor-action-btn reject"
              disabled={publishing}
              onClick={() => rejectPost(selectedPost)}
              type="button"
            >
              不發布
            </button>
            <button
              className="post-editor-action-btn approve"
              disabled={publishing || currentPostStatus === 'published'}
              onClick={() => void approvePost(selectedPost)}
              type="button"
            >
              {publishing
                ? '發布中...'
                : currentPostStatus === 'published'
                  ? '✓ 已發布'
                  : '批准'}
            </button>
            <button
              className="post-editor-nav-btn"
              disabled={!hasNextPost}
              onClick={goToNextPost}
              type="button"
            >
              下一個 →
            </button>
          </div>

          <div className="post-editor-topbar-right">
            <span>✦ {creditBalance ?? "—"} credits 剩餘</span>
            <button className="upgrade-button" type="button">
              升級
            </button>
          </div>
        </header>

        {showAttachModal && (
          <div
            style={{
              alignItems: 'center',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              inset: 0,
              justifyContent: 'center',
              position: 'fixed',
              zIndex: 1000,
            }}
            onClick={() => setShowAttachModal(false)}
          >
            <div
              style={{
                background: 'white',
                borderRadius: 16,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '80vh',
                overflow: 'hidden',
                width: 560,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                disabled={!activeWorkspaceId || attachLoading}
                style={{ display: 'none' }}
                onChange={handleAttachUpload}
              />
              <div style={{ borderBottom: '1px solid #e5e7eb', padding: '20px 24px 0' }}>
                <div style={{ alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>選擇圖片</h3>
                    <p
                      style={{
                        color: '#6b7280',
                        fontSize: 13,
                        margin: '4px 0 0 0',
                      }}
                    >
                      以下圖片來自你的品牌素材庫
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAttachModal(false)}
                    style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20 }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 0 }}>
                  {([
                    ['all', '全部'],
                    ['website', '網站圖片'],
                    ['uploaded', '上傳'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAttachTab(key)}
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: attachTab === key ? '2px solid #111827' : '2px solid transparent',
                        color: attachTab === key ? '#111827' : '#6b7280',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: attachTab === key ? 600 : 400,
                        padding: '8px 16px',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ borderBottom: '1px solid #f3f4f6', padding: '12px 24px' }}>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={!activeWorkspaceId || attachLoading}
                  style={{
                    alignItems: 'center',
                    background: 'white',
                    border: '1px dashed #d1d5db',
                    borderRadius: 8,
                    color: '#374151',
                    cursor: activeWorkspaceId && !attachLoading ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    fontSize: 14,
                    gap: 8,
                    opacity: activeWorkspaceId && !attachLoading ? 1 : 0.5,
                    padding: '8px 16px',
                  }}
                >
                  📤 從本機上傳
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {attachLoading ? (
                  <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>載入中...</div>
                ) : filteredAttachAssets.length === 0 ? (
                  <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>暫時沒有圖片</div>
                ) : (
                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {filteredAttachAssets.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedAttach(asset.id === selectedAttach ? null : asset.id)}
                        style={{
                          aspectRatio: '1',
                          border: selectedAttach === asset.id ? '3px solid #111827' : '3px solid transparent',
                          borderRadius: 8,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                        title={asset.filename || asset.source_url || asset.url}
                      >
                        <img
                          src={asset.url}
                          alt={asset.filename || asset.asset_type}
                          style={{ height: '100%', objectFit: 'cover', width: '100%' }}
                        />
                        {selectedAttach === asset.id && (
                          <div
                            style={{
                              alignItems: 'center',
                              background: '#111827',
                              borderRadius: '50%',
                              color: 'white',
                              display: 'flex',
                              fontSize: 12,
                              height: 20,
                              justifyContent: 'center',
                              position: 'absolute',
                              right: 6,
                              top: 6,
                              width: 20,
                            }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'flex-end',
                  padding: '16px 24px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAttachModal(false)}
                  style={{
                    background: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    color: '#111827',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    padding: '8px 20px',
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={!selectedAttach}
                  onClick={() => {
                    const asset = attachAssets.find((item) => item.id === selectedAttach)
                    if (asset) {
                      setAiStatus('idle')
                      setAttachedImage({ url: asset.url, filename: asset.filename || '已選圖片' })
                    }
                    setShowAttachModal(false)
                    setSelectedAttach(null)
                  }}
                  style={{
                    background: selectedAttach ? '#111827' : '#e5e7eb',
                    border: 'none',
                    borderRadius: 8,
                    color: selectedAttach ? 'white' : '#9ca3af',
                    cursor: selectedAttach ? 'pointer' : 'not-allowed',
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '8px 20px',
                  }}
                >
                  確認選擇
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="editor-shell">
          <aside className="ai-improve-panel">
            <div className="improve-copy">
              <p>SOON 可以這樣改善這則貼文：</p>
              <ol style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {AI_IMAGE_SUGGESTIONS.map((suggestion) => (
                  <li
                    key={suggestion.label}
                    onClick={() => {
                      void handleAiCommandWithText(suggestion.text)
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = '#f3f4f6'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = 'transparent'
                    }}
                    style={{
                      alignItems: 'flex-start',
                      borderRadius: '6px',
                      cursor: aiLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      gap: '8px',
                      padding: '4px 6px',
                      transition: 'background 150ms',
                    }}
                  >
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{suggestion.icon}</span>
                    <span><strong>{suggestion.label}</strong>「{suggestion.text}」</span>
                  </li>
                ))}
              </ol>
              <p>你想怎樣調整？</p>
            </div>

            <form
              className="ai-command-box"
              onSubmit={(event) => {
                event.preventDefault()
                void handleAiCommand()
              }}
            >
              {attachedImage && (
                <div
                  style={{
                    alignItems: 'center',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    color: '#374151',
                    display: 'flex',
                    fontSize: '12px',
                    gap: '6px',
                    justifyContent: 'flex-start',
                    margin: '10px 10px 0',
                    minHeight: 'auto',
                    padding: '6px 10px',
                  }}
                >
                  <img
                    src={attachedImage.url}
                    alt=""
                    style={{ borderRadius: 4, height: 28, objectFit: 'cover', width: 28 }}
                  />
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {attachedImage.filename}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      fontSize: '14px',
                      height: 'auto',
                      lineHeight: 1,
                      padding: '0 2px',
                      width: 'auto',
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
              <textarea
                placeholder="要求 SOON 修改這則貼文..."
                value={aiCommand}
                onChange={(event) => setAiCommand(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void handleAiCommand()
                  }
                }}
              />
              <div>
                <button
                  type="button"
                  aria-label="附加檔案"
                  onClick={() => setShowAttachModal(true)}
                  style={{
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    borderRadius: 6,
                    color: '#6b7280',
                    cursor: 'pointer',
                    display: 'flex',
                    fontSize: 13,
                    gap: 4,
                    padding: '4px 8px',
                    width: 'auto',
                  }}
                >
                  📎 附件
                </button>
                <button
                  type="submit"
                  aria-label="送出要求"
                  disabled={(!aiCommand.trim() && !attachedImage) || aiLoading}
                  style={{
                    alignItems: 'center',
                    background: aiLoading ? '#e5e7eb' : (!aiCommand.trim() && !attachedImage ? '#e5e7eb' : '#111827'),
                    border: 'none',
                    borderRadius: '50%',
                    color: aiLoading ? '#9ca3af' : 'white',
                    cursor: (!aiCommand.trim() && !attachedImage) || aiLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    fontSize: 16,
                    height: 32,
                    justifyContent: 'center',
                    padding: 0,
                    transition: 'background 200ms',
                    width: 32,
                  }}
                >
                  {aiLoading ? (
                    <span
                      style={{
                        animation: 'spin 0.8s linear infinite',
                        border: '2px solid #9ca3af',
                        borderRadius: '50%',
                        borderTopColor: '#374151',
                        display: 'inline-block',
                        height: 14,
                        width: 14,
                      }}
                    />
                  ) : '↑'}
                </button>
              </div>
            </form>
            {aiStatus === 'processing' && (
              <p style={{ color: '#6b7280', fontSize: 12, margin: '6px 0 0' }}>
                ⏳ AI 正在根據你的指令修改圖片，需時約 20-30 秒...
              </p>
            )}
            {aiStatus === 'done' && (
              <p style={{ color: '#16a34a', fontSize: 12, margin: '6px 0 0' }}>
                ✅ 已更新！請查看最新版本。
              </p>
            )}
            {aiStatus === 'error' && (
              <p style={{ color: '#dc2626', fontSize: 12, margin: '6px 0 0' }}>
                ❌ 出現問題，請重試。
              </p>
            )}
          </aside>

          <section className="preview-stage" aria-label="貼文預覽">
            <div className="view-switcher" aria-label="預覽平台">
              <span>預覽</span>
              {PUBLISH_PLATFORMS.map((platform) => (
                <button
                  className={previewChannel === platform.channel ? 'active' : ''}
                  key={platform.id}
                  onClick={() => setPreviewChannel(platform.channel)}
                  aria-label={platform.label}
                  type="button"
                >
                  <PlatformIcon channel={platform.channel} />
                </button>
              ))}
            </div>

            <article
              className={`phone-preview ${previewChannel.toLowerCase()}`}
              style={{
                background: 'transparent',
                border: 0,
                borderRadius: 0,
                boxShadow: 'none',
                maxWidth: previewChannel === 'Facebook' ? 470 : previewChannel === 'Threads' ? 380 : 400,
                overflow: 'visible',
                width: '100%',
              }}
            >
              {previewChannel === 'Threads' ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e5e5',
                    borderRadius: 12,
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 15,
                    margin: '0 auto',
                    maxWidth: 380,
                    overflow: 'hidden',
                    width: '100%',
                  }}
                >
                  <div style={{ alignItems: 'center', display: 'flex', gap: 8, padding: '12px 12px 4px' }}>
                    <div
                      style={{
                        alignItems: 'center',
                        background: '#000000',
                        borderRadius: '50%',
                        color: '#ffffff',
                        display: 'flex',
                        flexShrink: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        height: 36,
                        justifyContent: 'center',
                        width: 36,
                      }}
                    >
                      {workspaceInitial}
                    </div>
                    <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{previewUsername}</div>
                    <span style={{ color: '#999999', fontSize: 12 }}>1小時</span>
                    <span style={{ color: '#999999' }}>•••</span>
                  </div>
                  <div style={{ color: '#000000', fontSize: 15, lineHeight: 1.4, padding: '0 12px 8px 56px' }}>
                    {selectedCaption}
                  </div>
                  <div style={{ background: '#cccccc', height: 20, margin: '0 0 8px 29px', width: 2 }} />
                  <div className="phone-image" style={{ aspectRatio: '4 / 5', margin: '0 16px 12px', borderRadius: 12 }}>
                    <img src={selectedPost.image} alt="" style={{ height: '100%', objectFit: 'cover', width: '100%' }} />
                    <div className="phone-overlay">
                      <strong>{selectedPost.title}</strong>
                      <span>{selectedPost.type}</span>
                    </div>
                    <button className="edit-design-overlay" type="button" onClick={() => openDesignEditor(selectedPost)}>
                      ✎ 編輯設計
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 18, padding: '0 64px 10px' }}>
                    <SocialActionIcon type="heart" size={20} stroke="#000000" strokeWidth={1.5} />
                    <SocialActionIcon type="comment" size={20} stroke="#000000" strokeWidth={1.5} />
                    <SocialActionIcon type="repost" size={20} stroke="#000000" strokeWidth={1.5} />
                    <SocialActionIcon type="share" size={20} stroke="#000000" strokeWidth={1.5} />
                  </div>
                  <div style={{ color: '#777777', fontSize: 14, padding: '0 64px 16px' }}>回覆 · 123 讚</div>
                </div>
              ) : previewChannel === 'Facebook' ? (
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 8,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    color: '#050505',
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    fontSize: 15,
                    margin: '0 auto',
                    maxWidth: 470,
                    overflow: 'hidden',
                    width: '100%',
                  }}
                >
                  <header style={{ alignItems: 'center', display: 'flex', gap: 8, padding: '12px 12px 8px 12px' }}>
                    <div
                      style={{
                        alignItems: 'center',
                        background: '#1877F2',
                        borderRadius: '50%',
                        color: '#ffffff',
                        display: 'flex',
                        flexShrink: 0,
                        fontSize: 16,
                        fontWeight: 700,
                        height: 40,
                        justifyContent: 'center',
                        width: 40,
                      }}
                    >
                      {workspaceInitial}
                    </div>
                    <div>
                      <div style={{ color: '#050505', fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{previewUsername}</div>
                      <div style={{ color: '#65676b', fontSize: 12, lineHeight: 1.2 }}>剛剛 · 🌐</div>
                    </div>
                    <div style={{ flex: 1 }} />
                    <span style={{ color: '#65676b', cursor: 'pointer', fontSize: 18 }}>•••</span>
                  </header>
                  <p style={{ lineHeight: 1.35, margin: 0, padding: '4px 14px 12px' }}>{selectedCaption}</p>
                  <div className="phone-image" style={{ aspectRatio: '16 / 9' }}>
                    <img src={selectedPost.image} alt="" style={{ height: '100%', objectFit: 'cover', width: '100%' }} />
                    <div className="phone-overlay">
                      <strong>{selectedPost.title}</strong>
                      <span>{selectedPost.type}</span>
                    </div>
                    <button className="edit-design-overlay" type="button" onClick={() => openDesignEditor(selectedPost)}>
                      ✎ 編輯設計
                    </button>
                  </div>
                  <div style={{ borderTop: '1px solid #e4e6eb', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '4px 8px' }}>
                    {['👍 讚好', '💬 留言', '↗ 分享'].map((label) => (
                      <button
                        key={label}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.background = '#e4e6eb'
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.background = 'transparent'
                        }}
                        style={{
                          background: 'transparent',
                          border: 0,
                          borderRadius: 6,
                          color: '#65676b',
                          cursor: 'pointer',
                          font: 'inherit',
                          fontSize: 15,
                          fontWeight: 600,
                          padding: '8px 0',
                        }}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #dbdbdb',
                    borderRadius: 0,
                    color: '#262626',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    margin: '0 auto',
                    maxWidth: 400,
                    overflow: 'hidden',
                    width: '100%',
                  }}
                >
                  <header style={{ alignItems: 'center', display: 'flex', gap: 10, minHeight: 56, padding: '10px 14px' }}>
                    <div
                      style={{
                        alignItems: 'center',
                        background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #7c3aed, #ec4899) border-box',
                        border: '2px solid transparent',
                        borderRadius: '50%',
                        color: '#262626',
                        display: 'flex',
                        fontWeight: 700,
                        height: 32,
                        justifyContent: 'center',
                        width: 32,
                      }}
                    >
                      {workspaceInitial}
                    </div>
                    <strong style={{ color: '#262626', fontSize: 14, fontWeight: 600 }}>{previewUsername}</strong>
                    <span style={{ color: '#262626', fontWeight: 700, marginLeft: 'auto' }}>•••</span>
                  </header>
                  <div className="phone-image" style={{ aspectRatio: '1 / 1' }}>
                    <img src={selectedPost.image} alt="" style={{ height: '100%', objectFit: 'cover', width: '100%' }} />
                    <div className="phone-overlay">
                      <strong>{selectedPost.title}</strong>
                      <span>{selectedPost.type}</span>
                    </div>
                    <button className="edit-design-overlay" type="button" onClick={() => openDesignEditor(selectedPost)}>
                      ✎ 編輯設計
                    </button>
                  </div>
                  <div style={{ alignItems: 'center', display: 'flex', gap: 14, padding: '12px 12px 8px' }}>
                    <SocialActionIcon type="heart" />
                    <SocialActionIcon type="comment" />
                    <SocialActionIcon type="share" />
                    <div style={{ marginLeft: 'auto' }}>
                      <SocialActionIcon type="bookmark" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 5, padding: '0 12px 14px' }}>
                    <strong style={{ fontWeight: 600 }}>讚好 123 人</strong>
                    <p style={{ lineHeight: 1.35, margin: 0 }}>
                      <strong style={{ fontWeight: 600 }}>{previewUsername}</strong> {selectedCaption}
                    </p>
                    <span style={{ color: '#8e8e8e' }}>查看全部 12 則留言</span>
                    <span style={{ color: '#8e8e8e', fontSize: 11 }}>1 小時前</span>
                  </div>
                </div>
              )}
            </article>

            <div className="result-actions">
              <span>你喜歡這個結果嗎？</span>
              <button type="button">不喜歡</button>
              <button type="button">喜歡</button>
              <button
                type="button"
                onClick={() => {
                  setAiStatus('idle')
                  setAttachedImage(null)
                  setSelectedPost(null)
                }}
              >
                關閉
              </button>
            </div>
          </section>

          <aside className="post-settings-panel">
            <section>
              <p>宣傳活動</p>
              <strong>分享你的日常，建立真實連繫</strong>
              <span>生活內容</span>
            </section>

            <section>
              <p>快速編輯</p>
              <button type="button" onClick={() => openCaptionModal(selectedPost)}>
                調整 caption <em>›</em>
              </button>
              <button type="button" onClick={() => openDesignEditor(selectedPost)}>
                編輯設計 <em>›</em>
              </button>
            </section>

            <section>
              <p>發布時間</p>
              <button type="button">2026年5月8日 {selectedPost.time} ⌄</button>
            </section>

            <section>
              <p>發布到</p>
              {PUBLISH_PLATFORMS.map((platform) => {
                const connection = platformConnections[platform.id]
                const isPublishingThis = publishingPlatform === platform.id
                const hasPublished = Boolean(publishedPlatforms[`${selectedPost.id}:${platform.id}`])
                return connection ? (
                  <button
                    className="connected-channel publish-btn"
                    disabled={publishing || hasPublished}
                    key={platform.id}
                    onClick={() => void publishPost(selectedPost, platform.id)}
                    type="button"
                  >
                    <span>
                      {platform.label}
                      <small>{platformAccountName(platform.id)}</small>
                    </span>
                    <em>{hasPublished ? '✓ 已發布' : isPublishingThis ? '發布中...' : '立即發布'}</em>
                  </button>
                ) : (
                  <button
                    className="connect-channel-btn"
                    key={platform.id}
                    onClick={() => router.push('/onboarding/integrations')}
                    type="button"
                  >
                    <span>{platform.label}</span>
                    <em>連接</em>
                  </button>
                )
              })}
              {publishResult === 'success' ? (
                <div className="publish-success">{publishMessage || '✓ 已成功發布。'}</div>
              ) : null}
              {publishResult === 'error' ? (
                <div className="publish-error">{publishMessage || '✗ 發布失敗，請確認帳戶已連接並重試'}</div>
              ) : null}
            </section>

            <section>
              <p>重新設計</p>
              <button type="button">重新生成設計</button>
              <button type="button">更換媒體</button>
            </section>
          </aside>
        </section>

        {captionModalOpen ? (
          <div className="caption-modal-backdrop" role="presentation">
            <section className="caption-modal" role="dialog" aria-modal="true" aria-label="編輯 caption">
              <header>
                <div>
                  <h2>編輯 Caption</h2>
                  <p>為不同平台調整同一則貼文的語氣。儲存後，預覽會即時更新。</p>
                </div>
                <button type="button" onClick={() => setCaptionModalOpen(false)} aria-label="關閉">
                  ×
                </button>
              </header>

              <div className="caption-grid">
                {CHANNELS.map((channel) => {
                  const value = draftCaptions[channel.id] || ''
                  return (
                    <article className="caption-column" key={channel.id}>
                      <div className="caption-channel-head">
                        <span>{channel.icon}</span>
                        <strong>{channel.label}</strong>
                        <button type="button">連接</button>
                      </div>
                      <p>{channel.note}</p>
                      <button className="caption-regenerate" type="button" aria-label={`重新生成 ${channel.label} caption`}>
                        ↻
                      </button>
                      <textarea
                        value={value}
                        onChange={(event) =>
                          setDraftCaptions((current) => ({
                            ...current,
                            [channel.id]: event.target.value,
                          }))
                        }
                      />
                      <small>
                        字數：{value.length}/{channel.limit}
                      </small>
                    </article>
                  )
                })}
              </div>

              <footer>
                <button type="button" onClick={() => setCaptionModalOpen(false)}>
                  取消
                </button>
                <button type="button" onClick={saveCaptionDrafts}>
                  儲存 Caption
                </button>
              </footer>
            </section>
          </div>
        ) : null}

        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </main>
    )
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="日曆" />

      <section className="calendar-shell">
        <header className="calendar-topbar">
          <div className="calendar-title">
            <h1>日曆</h1>
            <button type="button" aria-label="上一日">‹</button>
            <button type="button">今天</button>
            <button type="button" aria-label="下一日">›</button>
            <strong>{dateLabel}</strong>
          </div>

          <div className="calendar-actions">
            <button type="button" onClick={() => setCreateModalOpen(true)}>＋ 建立</button>
            <button type="button" onClick={() => setRegenerateConfirmOpen(true)}>↻ 重新生成</button>
            <button type="button" onClick={() => setImprovePanelOpen(true)}>⌁ 改善</button>
            <button type="button" onClick={() => setCompact((value) => !value)}>
              {compact ? '展開' : '緊湊'} ⌄
            </button>
            <span>✦ {creditBalance ?? "—"} credits 剩餘</span>
            <button type="button" className="upgrade-button">升級</button>
          </div>
        </header>

        <div className="connect-banner">
          <span>⚡ 你的貼文尚未自動發布。連接帳戶後，SOON 可以按排程自動發布。</span>
          <button type="button" onClick={() => router.push('/onboarding/integrations')}>
            連接
          </button>
        </div>

        <div className="calendar-date-pill">{dateWithDay}</div>

        <section className={compact ? 'schedule-column compact' : 'schedule-column'} aria-label="今日排程">
          {!postsLoaded
            ? Array.from({ length: 3 }).map((_, index) => (
                <article className="post-card post-card-skeleton" key={`loading-post-${index}`} aria-hidden="true">
                  <div className="post-card-head">
                    <span />
                    <strong />
                  </div>
                  <p className="post-preview" />
                  <div className="post-image-wrap" />
                  <div className="post-copy">
                    <h2 />
                    <p />
                  </div>
                </article>
              ))
            : scheduledPosts.map((post) => (
                <article
                  className="post-card"
                  key={post.id}
                  onClick={() => {
                    setAiStatus('idle')
                    setAttachedImage(null)
                    setSelectedPost(post)
                  }}
                >
                  <div className="post-card-head">
                    <span className={post.type === '文章' ? 'post-type article' : 'post-type image'}>{post.type}</span>
                    <strong>{post.time}</strong>
                  </div>
                  <p className="post-preview">{post.body}</p>
                  <div className="post-image-wrap">
                    <img src={post.image} alt="" />
                    <span>{post.status}</span>
                  </div>
                  <div className="post-copy">
                    <h2>{post.title}</h2>
                    <p>{post.body}</p>
                  </div>
                </article>
              ))}
        </section>
        {toolbarMessage ? <div className="toolbar-message">{toolbarMessage}</div> : null}
      </section>

      {createModalOpen ? (
        <div className="toolbar-modal-backdrop" role="presentation" onMouseDown={() => setCreateModalOpen(false)}>
          <section className="toolbar-modal" role="dialog" aria-modal="true" aria-labelledby="create-post-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <h2 id="create-post-title">建立新貼文</h2>
              <button type="button" onClick={() => setCreateModalOpen(false)} aria-label="關閉">×</button>
            </header>
            <form onSubmit={handleCreatePost} className="toolbar-form">
              <label>
                <span>貼文類型</span>
                <select value={createPostType} onChange={(event) => setCreatePostType(event.target.value)}>
                  <option value="still-images">靜態圖片</option>
                  <option value="carousels">輪播貼文</option>
                  <option value="short-form-video">短影片</option>
                  <option value="emails">文章 / 電郵內容</option>
                </select>
              </label>
              <label>
                <span>標題</span>
                <input value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder="輸入貼文主題" />
              </label>
              <label>
                <span>發布日期與時間</span>
                <input
                  type="datetime-local"
                  min={localDateTimeValue(0)}
                  value={createScheduledAt}
                  onChange={(event) => {
                    const value = event.target.value
                    const selectedTime = new Date(value)
                    if (value && !Number.isNaN(selectedTime.getTime()) && selectedTime < new Date()) {
                      setCreateScheduledAt(localDateTimeValue())
                      setToolbarMessage('發布時間不能早於現在，已改為一小時後。')
                      return
                    }
                    setCreateScheduledAt(value)
                  }}
                />
              </label>
              <footer>
                <button type="button" onClick={() => setCreateModalOpen(false)}>取消</button>
                <button type="submit" disabled={toolbarBusy}>{toolbarBusy ? '建立中...' : '建立貼文'}</button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {regenerateConfirmOpen ? (
        <div className="toolbar-modal-backdrop" role="presentation" onMouseDown={() => setRegenerateConfirmOpen(false)}>
          <section className="toolbar-modal" role="dialog" aria-modal="true" aria-labelledby="regenerate-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <h2 id="regenerate-title">重新生成圖片</h2>
              <button type="button" onClick={() => setRegenerateConfirmOpen(false)} aria-label="關閉">×</button>
            </header>
            <p>重新為本週所有貼文生成圖片？這會消耗 credits。</p>
            <div className="affected-post-list">
              {currentWeekPosts.length ? currentWeekPosts.map((post) => <span key={post.id}>{post.title}</span>) : <span>本週沒有貼文</span>}
            </div>
            {toolbarBusy && regenerateProgress.total ? (
              <strong className="toolbar-progress">正在重新生成... ({regenerateProgress.current}/{regenerateProgress.total})</strong>
            ) : null}
            <footer>
              <button type="button" onClick={() => setRegenerateConfirmOpen(false)}>取消</button>
              <button type="button" disabled={toolbarBusy || !currentWeekPosts.length} onClick={handleConfirmRegenerate}>
                確認重新生成
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {improvePanelOpen ? (
        <div className="toolbar-modal-backdrop" role="presentation" onMouseDown={() => setImprovePanelOpen(false)}>
          <section className="toolbar-modal improve-modal" role="dialog" aria-modal="true" aria-labelledby="improve-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <h2 id="improve-title">改善本週內容</h2>
              <button type="button" onClick={() => setImprovePanelOpen(false)} aria-label="關閉">×</button>
            </header>
            <div className="improve-options">
              <label>
                <input type="radio" checked={improveMode === 'copy'} onChange={() => setImproveMode('copy')} />
                <span>改善所有本週文案</span>
              </label>
              <label>
                <input type="radio" checked={improveMode === 'image-prompt'} onChange={() => setImproveMode('image-prompt')} />
                <span>改善所有本週圖片 prompt</span>
              </label>
            </div>
            <p>以下貼文會受影響：</p>
            <div className="affected-post-list">
              {currentWeekPosts.length ? currentWeekPosts.map((post) => <span key={post.id}>{post.title}</span>) : <span>本週沒有貼文</span>}
            </div>
            {toolbarBusy && improveProgress.total ? (
              <strong className="toolbar-progress">正在改善... ({improveProgress.current}/{improveProgress.total})</strong>
            ) : null}
            <footer>
              <button type="button" onClick={() => setImprovePanelOpen(false)}>取消</button>
              <button type="button" disabled={toolbarBusy || !currentWeekPosts.length} onClick={handleImprovePosts}>
                確認改善
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      <style dangerouslySetInnerHTML={{ __html: `${dashboardSidebarStyles}\n${styles}` }} />
    </main>
  )
}

export default function ScheduledPostsPage() {
  return (
    <Suspense fallback={null}>
      <ScheduledPostsPageContent />
    </Suspense>
  )
}

const styles = `
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

  .calendar-shell {
    min-width: 0;
    background: #ffffff;
  }

  .calendar-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 18px;
  }

  .calendar-title,
  .calendar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .calendar-title h1 {
    margin: 0 8px 0 0;
    font-size: 18px;
    font-weight: 650;
  }

  .calendar-title button,
  .calendar-actions button {
    border: 0;
    background: transparent;
    color: #202126;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  .calendar-title strong {
    font-size: 15px;
    font-weight: 550;
  }

  .calendar-actions span {
    font-size: 14px;
  }

  .calendar-actions .upgrade-button {
    border: 1px solid #e2d8ff;
    border-radius: 8px;
    color: #7c3aed;
    padding: 7px 11px;
  }

  .toolbar-message {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 1200;
    border: 1px solid #dfe1e6;
    border-radius: 10px;
    background: #ffffff;
    color: #202126;
    box-shadow: 0 14px 40px rgba(32, 33, 38, 0.14);
    padding: 10px 14px;
    font-size: 13px;
  }

  .connect-banner {
    min-height: 48px;
    background: #fff7e8;
    border-bottom: 1px solid #efe3cc;
    color: #4c453b;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 18px;
    font-size: 14px;
  }

  .connect-banner button {
    border: 0;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    padding: 8px 14px;
    cursor: pointer;
  }

  .calendar-date-pill {
    width: fit-content;
    margin: 16px auto 14px;
    border-radius: 8px;
    background: #f2f3f5;
    color: #202126;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 650;
  }

  .schedule-column {
    width: min(100%, 320px);
    margin: 0 auto 80px;
    display: grid;
    gap: 10px;
  }

  .schedule-column.compact {
    width: min(100%, 280px);
  }

  .post-card {
    border: 1px solid #e8e9ec;
    border-radius: 10px;
    background: #ffffff;
    overflow: hidden;
    cursor: pointer;
    transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
  }

  .post-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(32, 33, 38, 0.09);
    border-color: #c8c9ce;
  }

  .post-card-skeleton {
    cursor: default;
    pointer-events: none;
  }

  .post-card-skeleton .post-card-head span,
  .post-card-skeleton .post-card-head strong,
  .post-card-skeleton .post-preview,
  .post-card-skeleton .post-copy h2,
  .post-card-skeleton .post-copy p {
    display: block;
    border-radius: 999px;
    background: #eceef2;
  }

  .post-card-skeleton .post-card-head span {
    width: 72px;
    height: 14px;
  }

  .post-card-skeleton .post-card-head strong {
    width: 48px;
    height: 14px;
  }

  .post-card-skeleton .post-preview {
    height: 52px;
    margin: 10px;
    padding: 0;
  }

  .post-card-skeleton .post-image-wrap {
    background: #f1f2f4;
  }

  .post-card-skeleton .post-copy h2 {
    height: 22px;
    width: 78%;
  }

  .post-card-skeleton .post-copy p {
    height: 32px;
    width: 100%;
  }

  .post-card-head {
    min-height: 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    border-bottom: 1px solid #ececef;
  }

  .post-type {
    color: #202126;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .post-type::before {
    content: '▧';
    color: #ef5148;
  }

  .post-type.article::before {
    content: '▤';
    color: #2e9a55;
  }

  .post-card-head strong {
    font-size: 13px;
    font-weight: 550;
  }

  .post-preview {
    margin: 0;
    padding: 10px;
    color: #45474e;
    font-size: 13px;
    line-height: 1.35;
  }

  .post-image-wrap {
    position: relative;
    aspect-ratio: 1 / 1;
    background: #f1f1f1;
    overflow: hidden;
  }

  .post-image-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .post-image-wrap span {
    position: absolute;
    left: 8px;
    bottom: 8px;
    border-radius: 6px;
    background: #7c3aed;
    color: #ffffff;
    padding: 3px 7px;
    font-size: 12px;
  }

  .post-copy {
    padding: 12px;
  }

  .post-copy h2 {
    margin: 0;
    color: #202126;
    font-size: 21px;
    line-height: 1.05;
    font-weight: 850;
  }

  .post-copy p {
    margin: 10px 0 0;
    color: #555861;
    font-size: 12px;
    line-height: 1.42;
  }

  .schedule-column.compact .post-preview,
  .schedule-column.compact .post-copy p {
    display: none;
  }

  .post-editor-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
  }

  .editor-topbar {
    height: 58px;
    border-bottom: 1px solid #e7e8eb;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 14px;
  }

  .editor-post-title,
  .editor-top-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .editor-post-title button,
  .editor-top-actions button,
  .post-settings-panel button,
  .result-actions button {
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .editor-post-title .post-type {
    max-width: min(42vw, 420px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 650;
  }

  .editor-post-title strong {
    border-radius: 7px;
    background: #fee2e2;
    color: #c2410c;
    padding: 7px 10px;
    font-size: 13px;
  }

  .editor-top-actions button:disabled {
    color: #b9bbc2;
    cursor: default;
  }

  .editor-top-actions .upgrade-button {
    color: #7c3aed;
    border-color: #e3d8ff;
  }

  .post-editor-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 58px;
    padding: 10px 20px;
    border-bottom: 1px solid #e8e9ec;
    background: #ffffff;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .post-editor-topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
  }

  .post-editor-back-btn {
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    padding: 6px 10px;
    font: inherit;
    font-size: 16px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .post-editor-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .post-editor-thumb {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .post-editor-campaign-name {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .post-editor-status-badge {
    font-size: 12px;
    padding: 3px 9px;
    border-radius: 6px;
    font-weight: 500;
    white-space: nowrap;
  }

  .post-editor-status-badge.draft {
    background: #f0f1f3;
    color: #6f737d;
  }

  .post-editor-status-badge.approved {
    background: #d1fae5;
    color: #065f46;
  }

  .post-editor-status-badge.scheduled {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .post-editor-status-badge.published {
    background: #202126;
    color: #ffffff;
  }

  .post-editor-status-badge.rejected {
    background: #fee2e2;
    color: #991b1b;
  }

  .post-editor-topbar-center {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .post-editor-nav-btn {
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    padding: 7px 14px;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    color: #6f737d;
    transition: background 150ms;
  }

  .post-editor-nav-btn:hover {
    background: #f5f5f7;
  }

  .post-editor-nav-btn:disabled {
    color: #b9bbc2;
    cursor: default;
    background: #ffffff;
  }

  .post-editor-action-btn {
    padding: 8px 20px;
    border-radius: 8px;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: opacity 150ms;
  }

  .post-editor-action-btn.reject {
    background: #f0f1f3;
    color: #202126;
  }

  .post-editor-action-btn.approve {
    background: #16a34a;
    color: #ffffff;
  }

  .post-editor-action-btn:hover {
    opacity: 0.85;
  }

  .post-editor-action-btn.approve:hover {
    background: #15803d;
    opacity: 1;
  }

  .post-editor-action-btn:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .post-editor-topbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    justify-content: flex-end;
    font-size: 14px;
    color: #202126;
  }

  .post-editor-topbar-right .upgrade-button {
    border: 1px solid #e3d8ff;
    border-radius: 8px;
    background: #ffffff;
    color: #7c3aed;
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .editor-shell {
    min-height: calc(100vh - 58px);
    display: grid;
    grid-template-columns: 340px minmax(420px, 1fr) 300px;
  }

  .ai-improve-panel,
  .post-settings-panel {
    background: #ffffff;
    border-right: 1px solid #e7e8eb;
    padding: 24px 18px;
  }

  .post-settings-panel {
    border-right: 0;
    border-left: 1px solid #e7e8eb;
    display: grid;
    align-content: start;
    gap: 18px;
  }

  .improve-copy {
    min-height: calc(100vh - 230px);
    display: grid;
    align-content: center;
    gap: 22px;
  }

  .improve-copy p {
    margin: 0;
    color: #292b31;
    font-size: 17px;
    line-height: 1.45;
  }

  .improve-copy ol {
    margin: 0;
    padding-left: 22px;
    display: grid;
    gap: 14px;
    color: #292b31;
    font-size: 16px;
    line-height: 1.55;
  }

  .improve-copy strong {
    font-weight: 780;
  }

  .ai-command-box {
    border: 1px solid #e1e3e8;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 16px 36px rgba(32, 33, 38, 0.08);
    overflow: hidden;
  }

  .ai-command-box textarea {
    width: 100%;
    min-height: 82px;
    border: 0;
    resize: none;
    padding: 16px;
    color: #202126;
    background: transparent;
    font: inherit;
    font-size: 14px;
    outline: 0;
  }

  .ai-command-box div {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 10px;
  }

  .ai-command-box input {
    display: none;
  }

  .ai-command-box label span,
  .ai-command-box button {
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #5f636d;
    font: inherit;
    font-size: 13px;
    padding: 7px 10px;
    cursor: pointer;
  }

  .ai-command-box button {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: #202126;
    color: #ffffff;
    padding: 0;
  }

  .preview-stage {
    position: relative;
    display: grid;
    place-items: center;
    padding: 42px 24px 92px;
  }

  .view-switcher {
    position: absolute;
    left: max(20px, calc(50% - 310px));
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    gap: 9px;
    justify-items: center;
  }

  .view-switcher span {
    color: #979aa2;
    font-size: 13px;
  }

  .view-switcher button {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid #e1e3e8;
    background: #ffffff;
    color: #3f424a;
    display: grid;
    place-items: center;
    font-weight: 750;
    cursor: pointer;
  }

  .view-switcher button svg {
    display: block;
  }

  .view-switcher button.active {
    border-color: #202126;
    box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #202126;
  }

  .phone-preview {
    width: 280px;
    border-radius: 22px;
    background: #ffffff;
    border: 1px solid #e1e3e8;
    box-shadow: 0 24px 60px rgba(32, 33, 38, 0.16);
    overflow: hidden;
  }

  .phone-preview header {
    min-height: 48px;
    display: grid;
    grid-template-columns: 28px 1fr;
    column-gap: 9px;
    align-items: center;
    padding: 10px 14px;
  }

  .phone-preview header strong,
  .phone-preview header span {
    grid-column: 2;
    line-height: 1.1;
  }

  .phone-preview header strong {
    font-size: 13px;
    font-weight: 750;
  }

  .phone-preview header span {
    color: #979aa2;
    font-size: 11px;
  }

  .avatar {
    grid-row: 1 / 3;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #f0eef7;
    color: #9f7aea;
    display: grid;
    place-items: center;
    font-weight: 850;
  }

  .phone-image {
    position: relative;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    background: #eceef2;
    cursor: pointer;
  }

  .phone-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 180ms ease, filter 180ms ease;
  }

  .phone-image:hover img {
    transform: scale(1.015);
    filter: brightness(0.62);
  }

  .phone-overlay {
    position: absolute;
    inset: auto 18px 18px;
    color: #ffffff;
    text-shadow: 0 3px 16px rgba(0, 0, 0, 0.45);
    display: grid;
    gap: 6px;
  }

  .phone-overlay strong {
    max-width: 210px;
    font-size: 25px;
    line-height: 0.95;
    font-weight: 900;
  }

  .phone-overlay span {
    width: fit-content;
    border-radius: 6px;
    background: #d946ef;
    padding: 4px 7px;
    font-size: 11px;
    font-weight: 750;
  }

  .edit-design-overlay {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) translateY(4px);
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 10px;
    background: #ffffff;
    color: #202126;
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
    opacity: 0;
    pointer-events: none;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    padding: 10px 14px;
    white-space: nowrap;
    transition: opacity 160ms ease, transform 160ms ease;
    cursor: pointer;
  }

  .phone-image:hover .edit-design-overlay,
  .edit-design-overlay:focus-visible {
    opacity: 1;
    pointer-events: auto;
    transform: translate(-50%, -50%);
  }

  .phone-actions {
    min-height: 42px;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 8px 14px;
    color: #202126;
  }

  .phone-actions span {
    font-size: 13px;
    font-weight: 650;
    line-height: 1;
  }

  .phone-actions svg {
    flex: 0 0 auto;
  }

  .phone-actions .bookmark-icon {
    margin-left: auto;
  }

  .phone-actions.facebook-actions {
    justify-content: space-around;
    border-top: 1px solid #f0f1f3;
    color: #555963;
  }

  .phone-actions button {
    margin-left: auto;
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 12px;
    padding: 7px 9px;
    cursor: pointer;
    transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
  }

  .phone-actions button:hover,
  .phone-actions button:focus-visible {
    border-color: #202126;
    background: #f8f8f9;
    box-shadow: 0 6px 18px rgba(32, 33, 38, 0.1);
  }

  .phone-preview p {
    margin: 0;
    padding: 0 14px 18px;
    color: #464952;
    font-size: 13px;
    line-height: 1.35;
  }

  .phone-preview.facebook,
  .phone-preview.linkedin {
    width: 360px;
    border-radius: 14px;
  }

  .phone-preview.facebook .avatar {
    background: #1877F2;
    color: #ffffff;
  }

  .phone-preview.facebook .phone-image {
    aspect-ratio: 16 / 9;
  }

  .phone-preview.threads .avatar {
    background: #000000;
    color: #ffffff;
  }

  .phone-preview.instagram .avatar {
    background: linear-gradient(135deg, #7c3aed, #ec4899);
    color: #ffffff;
  }

  .phone-preview.x,
  .phone-preview.google {
    width: 330px;
    border-radius: 18px;
  }

  .result-actions {
    position: absolute;
    left: 50%;
    bottom: 26px;
    transform: translateX(-50%);
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 20px 50px rgba(32, 33, 38, 0.14);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    white-space: nowrap;
  }

  .result-actions span {
    font-size: 14px;
  }

  .post-settings-panel section {
    border-bottom: 1px solid #e7e8eb;
    padding-bottom: 16px;
    display: grid;
    gap: 8px;
  }

  .post-settings-panel section > p {
    margin: 0 0 4px;
    color: #9a9da4;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .post-settings-panel section > strong {
    display: block;
    color: #202126;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.35;
  }

  .post-settings-panel section > span {
    display: block;
    color: #6f737d;
    font-size: 13px;
    margin-top: 2px;
  }

  .post-settings-panel section > button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    gap: 10px;
    transition: background 150ms ease;
  }

  .post-settings-panel section > button:hover {
    background: #f5f5f7;
  }

  .post-settings-panel section > button small {
    color: #6f737d;
    display: block;
    font-size: 11px;
    font-weight: 500;
    margin-top: 2px;
  }

  .post-settings-panel .connected-channel {
    background: #f6f7f9;
    border-color: #dee0e5;
  }

  .post-settings-panel .publish-btn {
    background: #f0fdf4;
    border-color: #d1fae5;
  }

  .post-settings-panel .publish-btn:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  .post-settings-panel .connect-channel-btn {
    color: #6f737d;
  }

  .post-settings-panel .connect-channel-btn em {
    color: #202126;
    font-weight: 600;
  }

  .threads-preview-note {
    border-top: 1px solid #f0f1f3;
    color: #6f737d;
    font-size: 12px;
    font-weight: 650;
    padding: 10px 14px 0;
  }

  .publish-success,
  .publish-error {
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.35;
    margin-top: 6px;
    padding: 8px 12px;
  }

  .publish-success {
    background: #f0fdf4;
    border: 1px solid #d1fae5;
    color: #065f46;
  }

  .publish-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .post-settings-panel em {
    color: #8a8d95;
    font-style: normal;
  }

  .post-settings-panel section > button em {
    color: #9a9da4;
    font-style: normal;
  }

  .caption-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(247, 248, 250, 0.72);
    backdrop-filter: blur(10px);
    display: grid;
    place-items: center;
    padding: 28px;
  }

  .toolbar-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2100;
    background: rgba(247, 248, 250, 0.72);
    backdrop-filter: blur(10px);
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .toolbar-modal {
    width: min(520px, 100%);
    border-radius: 16px;
    background: #ffffff;
    color: #202126;
    box-shadow: 0 28px 90px rgba(32, 33, 38, 0.24);
    display: grid;
    gap: 18px;
    padding: 22px;
  }

  .toolbar-modal.improve-modal {
    width: min(620px, 100%);
  }

  .toolbar-modal header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 16px;
  }

  .toolbar-modal h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 650;
  }

  .toolbar-modal header button {
    border: 0;
    background: transparent;
    color: #202126;
    cursor: pointer;
    font: inherit;
    font-size: 24px;
    line-height: 1;
  }

  .toolbar-modal p {
    margin: 0;
    color: #555963;
    font-size: 14px;
    line-height: 1.45;
  }

  .toolbar-form {
    display: grid;
    gap: 14px;
  }

  .toolbar-form label,
  .improve-options label {
    display: grid;
    gap: 7px;
    color: #202126;
    font-size: 13px;
  }

  .toolbar-form label span {
    color: #6f737d;
    font-weight: 600;
  }

  .toolbar-form input,
  .toolbar-form select {
    min-height: 40px;
    border: 1px solid #dfe1e6;
    border-radius: 9px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    padding: 0 11px;
  }

  .toolbar-modal footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .toolbar-modal footer button {
    border: 1px solid #dfe1e6;
    border-radius: 9px;
    background: #ffffff;
    color: #202126;
    cursor: pointer;
    font: inherit;
    font-size: 14px;
    padding: 9px 13px;
  }

  .toolbar-modal footer button:last-child {
    border-color: #111111;
    background: #111111;
    color: #ffffff;
  }

  .toolbar-modal footer button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .affected-post-list {
    max-height: 180px;
    overflow: auto;
    display: grid;
    gap: 6px;
    border: 1px solid #eceef2;
    border-radius: 10px;
    padding: 10px;
    background: #fafafa;
  }

  .affected-post-list span {
    color: #3d4048;
    font-size: 13px;
    line-height: 1.35;
  }

  .toolbar-progress {
    border-radius: 9px;
    background: #f2f3f5;
    color: #202126;
    font-size: 13px;
    font-weight: 600;
    padding: 9px 10px;
  }

  .improve-options {
    display: grid;
    gap: 8px;
  }

  .improve-options label {
    grid-template-columns: 18px 1fr;
    align-items: center;
    border: 1px solid #eceef2;
    border-radius: 10px;
    padding: 10px;
  }

  .caption-modal {
    width: min(1180px, 100%);
    max-height: min(760px, calc(100vh - 56px));
    border-radius: 18px;
    background: #ffffff;
    color: #202126;
    box-shadow: 0 28px 90px rgba(32, 33, 38, 0.24);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    overflow: hidden;
  }

  .caption-modal header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 18px;
    padding: 32px 36px 18px;
  }

  .caption-modal h2 {
    margin: 0;
    color: #17181c;
    font-size: 28px;
    line-height: 1.1;
    font-weight: 650;
  }

  .caption-modal header p {
    margin: 10px 0 0;
    color: #70737c;
    font-size: 14px;
    line-height: 1.45;
  }

  .caption-modal header > button {
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #202126;
    font: inherit;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
  }

  .caption-grid {
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(260px, 1fr);
    gap: 18px;
    padding: 10px 36px 24px;
  }

  .caption-column {
    min-width: 260px;
    display: grid;
    grid-template-rows: auto auto auto minmax(260px, 1fr) auto;
    gap: 10px;
  }

  .caption-channel-head {
    display: grid;
    grid-template-columns: 26px 1fr auto;
    align-items: center;
    gap: 10px;
  }

  .caption-channel-head span {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    background: #f2f3f6;
    color: #2864dc;
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 850;
  }

  .caption-column:nth-child(1) .caption-channel-head span {
    color: #ffffff;
    background: linear-gradient(135deg, #f97316, #ec4899, #7c3aed);
  }

  .caption-column:nth-child(4) .caption-channel-head span {
    color: #ffffff;
    background: #111111;
  }

  .caption-column:nth-child(5) .caption-channel-head span {
    color: #4285f4;
    background: #ffffff;
    border: 1px solid #e1e3e8;
  }

  .caption-channel-head strong {
    font-size: 17px;
    font-weight: 650;
  }

  .caption-channel-head button {
    border: 1px solid #e1e3e8;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 7px 10px;
    cursor: pointer;
  }

  .caption-column p {
    min-height: 44px;
    margin: 0;
    color: #676a73;
    font-size: 13px;
    line-height: 1.35;
  }

  .caption-regenerate {
    justify-self: end;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #202126;
    font-size: 18px;
    cursor: pointer;
  }

  .caption-column textarea {
    width: 100%;
    min-height: 280px;
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #2b2d34;
    padding: 14px;
    resize: none;
    outline: 0;
    font: inherit;
    font-size: 14px;
    line-height: 1.35;
  }

  .caption-column textarea:focus {
    border-color: #202126;
    box-shadow: 0 0 0 3px rgba(32, 33, 38, 0.08);
  }

  .caption-column small {
    justify-self: end;
    color: #70737c;
    font-size: 12px;
  }

  .caption-modal footer {
    min-height: 66px;
    border-top: 1px solid #eef0f3;
    background: rgba(255, 255, 255, 0.96);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 24px;
  }

  .caption-modal footer button {
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 15px;
    padding: 10px 14px;
    cursor: pointer;
  }

  .caption-modal footer button:last-child {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
  }

  .design-editor-page {
    min-height: 100vh;
    background: #f4f5f7;
    color: #202126;
  }

  .design-topbar {
    height: 58px;
    border-bottom: 1px solid #e3e5e8;
    background: #ffffff;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr) 260px;
    align-items: center;
    gap: 18px;
    padding: 0 14px;
  }

  .design-nav,
  .design-title,
  .design-account {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .design-nav button,
  .design-account button,
  .design-toolbar button,
  .brand-panel button,
  .design-result-bar button {
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    cursor: pointer;
  }

  .design-nav button {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .design-title {
    justify-content: center;
  }

  .design-title strong {
    max-width: min(48vw, 520px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    font-weight: 650;
  }

  .design-title em {
    border-radius: 999px;
    background: #eef0f4;
    color: #6f737d;
    font-size: 13px;
    font-style: normal;
    padding: 5px 10px;
  }

  .design-account {
    justify-content: flex-end;
  }

  .design-account span {
    font-size: 14px;
  }

  .design-account button {
    color: #7c3aed;
    border-color: #e3d8ff;
    padding: 8px 13px;
  }

  .design-toolbar {
    height: 66px;
    border-bottom: 1px solid #e3e5e8;
    background: #ffffff;
    display: flex;
    align-items: stretch;
    justify-content: center;
    gap: 0;
  }

  .history-tools {
    position: absolute;
    left: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 66px;
  }

  .design-toolbar button {
    min-width: 92px;
    border: 0;
    border-left: 1px solid #eceef2;
    border-radius: 0;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 4px;
    color: #4d5058;
  }

  .history-tools button {
    min-width: 34px;
    width: 34px;
    border: 0;
    color: #afb2ba;
    font-size: 20px;
  }

  .design-toolbar button.active {
    background: #f0f1f4;
    color: #202126;
    border-radius: 8px;
    margin: 8px 0;
  }

  .design-toolbar button span {
    font-size: 19px;
    line-height: 1;
  }

  .design-toolbar button strong {
    font-size: 13px;
    font-weight: 520;
  }

  .design-workbench {
    min-height: calc(100vh - 124px);
    display: grid;
    grid-template-columns: minmax(0, 1fr) 390px;
  }

  .design-canvas-area {
    position: relative;
    display: grid;
    place-items: center;
    padding: 48px 32px 84px;
  }

  .design-canvas {
    position: relative;
    width: min(430px, 62vh);
    aspect-ratio: 4 / 5;
    background: #ddd;
    overflow: hidden;
    box-shadow: 0 16px 44px rgba(32, 33, 38, 0.12);
  }

  .fabric-design-canvas-shell .canvas-container,
  .fabric-design-canvas-shell canvas {
    width: 100% !important;
    height: 100% !important;
  }

  .fabric-design-canvas-shell .canvas-container {
    position: relative !important;
    z-index: 2;
  }

  .fabric-context-menu {
    position: fixed;
    z-index: 2000;
    min-width: 150px;
    border: 1px solid #e0e2e6;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 14px 36px rgba(32, 33, 38, 0.18);
    display: grid;
    gap: 2px;
    padding: 6px;
  }

  .fabric-context-menu button {
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #202126;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    padding: 9px 10px;
    text-align: left;
  }

  .fabric-context-menu button:hover {
    background: #f2f3f5;
  }

  .canvas-image-layer {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
  }

  .canvas-element.image {
    place-items: stretch;
  }

  .design-canvas::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.16), transparent 42%, rgba(0, 0, 0, 0.2));
    z-index: 1;
    pointer-events: none;
  }

  .canvas-element {
    position: absolute;
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: move;
    transform-origin: center;
  }

  .canvas-element > span:first-child {
    display: block;
    width: 100%;
    height: 100%;
    background: currentColor;
  }

  .canvas-element.frame > span:first-child,
  .canvas-element[class*="frame-"] > span:first-child {
    background-image: url('/assets/content-strategies/photos/lifestyle-content.jpg');
    background-size: cover;
    background-position: center;
  }

  .canvas-element.icon > span:first-child {
    display: grid;
    place-items: center;
    background: transparent;
    font-size: 0.82em;
    line-height: 1;
    color: currentColor;
  }

  .canvas-element.text {
    place-items: center;
  }

  .canvas-text-layer {
    display: block;
    background: transparent;
    cursor: move;
    min-height: 1em;
    overflow-wrap: anywhere;
    pointer-events: none;
    text-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
    user-select: none;
    white-space: pre-wrap;
  }

  .canvas-element.selected {
    outline: 2px solid #101114;
    outline-offset: 3px;
  }

  .handle {
    position: absolute;
    width: 14px;
    height: 14px;
    border: 2px solid #101114;
    border-radius: 5px;
    background: #ffffff;
    box-shadow: 0 3px 9px rgba(0, 0, 0, 0.18);
  }

  .handle.nw {
    left: -9px;
    top: -9px;
  }

  .handle.ne {
    right: -9px;
    top: -9px;
  }

  .handle.sw {
    left: -9px;
    bottom: -9px;
  }

  .handle.se {
    right: -9px;
    bottom: -9px;
  }

  .rotate-handle {
    position: absolute;
    left: 50%;
    bottom: -52px;
    transform: translateX(-50%);
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: #ffffff;
    color: #101114;
    display: grid;
    place-items: center;
    font-style: normal;
    font-size: 22px;
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
  }

  .element-mini-toolbar {
    position: absolute;
    left: 50%;
    top: -58px;
    transform: translateX(-50%);
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
    display: flex;
    align-items: center;
    gap: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  .element-mini-toolbar button {
    border: 0;
    background: transparent;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 9px 11px;
    cursor: pointer;
  }

  .element-mini-toolbar button:hover {
    background: #f2f3f5;
  }

  .design-canvas-copy {
    position: absolute;
    z-index: 8;
    left: 28px;
    top: 32px;
    width: 72%;
    color: #ffffff;
    text-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
    display: grid;
    gap: 12px;
  }

  .design-canvas-copy strong {
    font-size: 36px;
    line-height: 0.94;
    font-weight: 900;
  }

  .design-canvas-copy span {
    font-size: 21px;
    line-height: 1.08;
  }

  .soon-logo-stub {
    position: absolute;
    z-index: 9;
    left: 30px;
    bottom: 24px;
    color: #ffffff;
    font-size: 21px;
    line-height: 0.8;
    font-weight: 900;
    transform: rotate(-4deg);
    text-shadow: 0 3px 10px rgba(0, 0, 0, 0.28);
  }

  .canvas-side-actions {
    position: absolute;
    left: calc(50% - min(430px, 62vh) / 2 - 44px);
    top: 50%;
    display: grid;
    gap: 10px;
  }

  .canvas-side-actions button {
    width: 30px;
    height: 30px;
    border: 0;
    background: transparent;
    color: #3f424a;
    font-size: 20px;
    cursor: pointer;
  }

  .design-result-bar,
  .zoom-control,
  .ask-soon-button {
    position: absolute;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 12px 34px rgba(32, 33, 38, 0.1);
  }

  .design-result-bar {
    left: 50%;
    bottom: 22px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
  }

  .design-result-bar span {
    font-size: 14px;
  }

  .design-result-bar button {
    padding: 8px 10px;
  }

  .zoom-control {
    right: 18px;
    bottom: 24px;
    padding: 12px 16px;
    color: #2f3239;
    font-size: 13px;
  }

  .ask-soon-button {
    left: 16px;
    bottom: 24px;
    background: #111111;
    color: #ffffff;
    padding: 12px 16px;
    font-size: 15px;
    font-weight: 700;
  }

  .brand-panel {
    border-left: 1px solid #e0e2e6;
    background: #ffffff;
    padding: 22px;
    display: grid;
    align-content: start;
    gap: 24px;
    max-height: calc(100vh - 124px);
    overflow-y: auto;
  }

  .brand-panel-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-panel-head button {
    width: 34px;
    height: 34px;
  }

  .brand-panel h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 650;
  }

  .brand-panel section {
    display: grid;
    gap: 10px;
  }

  .brand-panel h3,
  .brand-panel p {
    margin: 0;
  }

  .brand-panel h3 {
    font-size: 15px;
    font-weight: 650;
  }

  .brand-panel p {
    color: #777b84;
    font-size: 13px;
  }

  .logo-card {
    height: 96px;
    border: 1px solid #e3e5e8;
    border-radius: 10px;
    background: #f4f4f5;
    color: #80645e;
    display: grid;
    place-items: center;
    text-align: center;
    font-size: 26px;
    line-height: 0.82;
    font-weight: 900;
    transform: rotate(-2deg);
  }

  .color-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .color-row span {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid #dfe1e5;
  }

  .color-row button {
    margin-left: auto;
    border: 0;
    padding: 8px 0;
  }

  .brand-panel section > button {
    min-height: 46px;
    text-align: left;
    padding: 0 12px;
  }

  .media-panel {
    border-left: 1px solid #e0e2e6;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-height: calc(100vh - 124px);
    overflow-y: auto;
    padding: 24px 30px 32px;
  }

  .media-upload-zone {
    align-items: center;
    border: 2px dashed #d3d6dc;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 138px;
    justify-content: center;
    padding: 22px 16px;
    text-align: center;
    transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
  }

  .media-upload-zone:hover,
  .media-upload-zone.dragging {
    background: #f7f8fa;
    border-color: #858a95;
  }

  .media-upload-icon {
    color: #8d929d;
    font-size: 28px;
    line-height: 1;
  }

  .media-upload-label {
    color: #202126;
    font-size: 14px;
    font-weight: 760;
  }

  .media-upload-hint {
    color: #8a8f99;
    font-size: 12px;
  }

  .media-panel-section {
    display: grid;
    gap: 12px;
  }

  .media-panel-section h3 {
    color: #202126;
    font-size: 15px;
    font-weight: 700;
    margin: 0;
  }

  .media-ai-card,
  .media-brand-kit-card {
    background: #fafbfc;
    border: 1px solid #e1e3e8;
    border-radius: 14px;
    display: grid;
    gap: 12px;
    padding: 14px;
  }

  .media-ai-input {
    background: #ffffff;
    border: 1px solid #dfe2e8;
    border-radius: 10px;
    color: #1f2329;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.45;
    min-height: 84px;
    padding: 10px 12px;
    resize: vertical;
    width: 100%;
  }

  .media-ai-input::placeholder {
    color: #999faa;
  }

  .media-control-row {
    display: grid;
    gap: 7px;
  }

  .media-control-label {
    color: #606672;
    font-size: 12px;
    font-weight: 700;
  }

  .media-segment-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .media-segment-button {
    background: #ffffff;
    border: 1px solid #dfe2e8;
    border-radius: 999px;
    color: #3a3f47;
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
    min-height: 32px;
    padding: 0 12px;
    transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
  }

  .media-segment-button.active {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
  }

  .media-generate-button {
    background: #111111;
    border: 0;
    border-radius: 10px;
    color: #ffffff;
    cursor: pointer;
    font-size: 13px;
    font-weight: 800;
    min-height: 40px;
    padding: 0 14px;
    transition: opacity 160ms ease, transform 160ms ease;
  }

  .media-generate-button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .media-generate-button:disabled {
    cursor: not-allowed;
    opacity: 0.36;
  }

  .background-ai-section {
    display: grid;
    gap: 8px;
  }

  .background-ai-card {
    gap: 10px;
  }

  .background-ai-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .background-ai-chip {
    background: #ffffff;
    border: 1px solid #dfe2e8;
    border-radius: 999px;
    color: #3a3f47;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    padding: 6px 11px;
  }

  .background-ai-status {
    align-items: center;
    color: #606672;
    display: flex;
    font-size: 12px;
    gap: 8px;
  }

  .background-ai-spinner {
    animation: background-ai-spin 0.8s linear infinite;
    border: 2px solid #dfe2e8;
    border-radius: 999px;
    border-top-color: #111111;
    display: inline-block;
    height: 14px;
    width: 14px;
  }

  @keyframes background-ai-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .background-ai-preview {
    display: grid;
    gap: 8px;
  }

  .background-ai-preview-card {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    color: #555b66;
    overflow: hidden;
  }

  .background-ai-preview-card img {
    display: block;
    height: 96px;
    object-fit: cover;
    width: 100%;
  }

  .background-ai-preview-card span {
    display: block;
    font-size: 11px;
    padding: 7px 8px;
  }

  .background-ai-apply-button {
    background: #111111;
    border: 0;
    border-radius: 8px;
    color: #ffffff;
    cursor: pointer;
    font-size: 12px;
    font-weight: 800;
    min-height: 34px;
  }

  .background-ai-divider {
    background: #e8eaef;
    height: 1px;
    margin: 14px 0 4px;
  }

  .media-brand-logo-button {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e1e3e8;
    border-radius: 12px;
    color: #8B4513;
    cursor: pointer;
    display: inline-flex;
    flex-direction: column;
    font-size: 16px;
    font-weight: 900;
    justify-content: center;
    min-height: 72px;
    padding: 10px 18px;
    width: 112px;
  }

  .brand-logo-image {
    display: block;
    height: 56px;
    max-width: 100%;
    object-fit: contain;
    width: 96px;
  }

  .brand-logo-empty {
    align-items: center;
    background: #f7f8fa;
    border: 1px dashed #d8dce4;
    border-radius: 12px;
    color: #8a909b;
    display: flex;
    font-size: 12px;
    font-weight: 700;
    justify-content: center;
    min-height: 72px;
    padding: 10px 14px;
    text-align: center;
    width: 132px;
  }

  .media-brand-kit-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .media-brand-kit-copy {
    color: #7a808b;
    font-size: 12px;
    line-height: 1.45;
    margin: 0;
  }

  .media-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .media-grid.compact {
    gap: 6px;
  }

  .media-thumb-btn {
    aspect-ratio: 1;
    background: #f4f5f7;
    border: 1px solid #e1e3e8;
    border-radius: 8px;
    cursor: pointer;
    overflow: hidden;
    padding: 0;
    transition: border-color 160ms ease, transform 160ms ease;
  }

  .media-thumb-btn:hover {
    border-color: #9297a1;
    transform: translateY(-1px);
  }

  .media-thumb {
    display: block;
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .templates-panel,
  .backgrounds-panel,
  .resize-panel,
  .post-panel {
    border-left: 1px solid #e0e2e6;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-height: calc(100vh - 124px);
    overflow-y: auto;
    padding: 24px 30px 32px;
  }

  .panel-helper-copy {
    color: #737782;
    font-size: 13px;
    line-height: 1.5;
    margin: 0;
  }

  .panel-search-row {
    width: 100%;
  }

  .panel-search-input {
    background: #fafafa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 8px 12px;
    width: 100%;
  }

  .panel-section-title {
    color: #202126;
    font-size: 15px;
    font-weight: 700;
    margin: 0;
  }

  .templates-filter-row {
    display: flex;
    gap: 6px;
  }

  .templates-filter-select {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    color: #202126;
    cursor: pointer;
    flex: 1;
    font: inherit;
    font-size: 12px;
    min-width: 0;
    padding: 6px 8px;
  }

  .templates-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .template-thumb-btn {
    background: none;
    border: 0;
    color: #202126;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 0;
    text-align: left;
  }

  .template-thumb-preview {
    align-items: center;
    aspect-ratio: 1;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    display: flex;
    font-size: 11px;
    font-weight: 700;
    justify-content: center;
    overflow: hidden;
    text-align: center;
    transition: opacity 150ms ease, transform 150ms ease;
    width: 100%;
  }

  .template-thumb-preview img {
    display: block;
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .template-thumb-btn:hover .template-thumb-preview {
    opacity: 0.82;
    transform: translateY(-1px);
  }

  .template-thumb-label {
    font-size: 10px;
    padding: 0 4px;
  }

  .template-thumb-name {
    color: #555b66;
    font-size: 11px;
    padding: 0 2px;
  }

  .template-grid {
    display: grid;
    gap: 12px;
  }

  .template-card {
    background: #ffffff;
    border: 1px solid #e1e3e8;
    border-radius: 12px;
    color: #202126;
    cursor: pointer;
    display: grid;
    gap: 12px;
    padding: 12px;
    text-align: left;
    transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  }

  .template-card:hover {
    border-color: #9aa0aa;
    box-shadow: 0 10px 24px rgba(18, 20, 24, 0.08);
    transform: translateY(-1px);
  }

  .template-preview {
    aspect-ratio: 4 / 3;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--template-accent) 70%, #ffffff), #f3f4f6),
      #f3f4f6;
    border-radius: 10px;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    overflow: hidden;
    padding: 14px;
    position: relative;
  }

  .template-preview::before {
    background: rgba(17, 17, 17, 0.26);
    border-radius: 999px;
    content: "";
    height: 88px;
    position: absolute;
    right: -22px;
    top: -24px;
    width: 88px;
  }

  .template-preview strong {
    font-size: 20px;
    line-height: 1;
    position: relative;
    z-index: 1;
  }

  .template-preview em {
    font-size: 12px;
    font-style: normal;
    margin-top: 6px;
    opacity: 0.88;
    position: relative;
    z-index: 1;
  }

  .template-card-copy {
    display: grid;
    gap: 4px;
  }

  .template-card-copy strong {
    font-size: 14px;
  }

  .template-card-copy small {
    color: #777b84;
    font-size: 12px;
    line-height: 1.4;
  }

  .post-panel-section {
    display: grid;
    gap: 10px;
  }

  .post-panel-section h3 {
    color: #202126;
    font-size: 15px;
    font-weight: 700;
    margin: 0;
  }

  .post-schedule-button,
  .post-platform-row,
  .post-panel-actions button,
  .post-primary-action {
    background: #ffffff;
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    color: #202126;
    cursor: pointer;
    font: inherit;
  }

  .post-schedule-button {
    min-height: 44px;
    padding: 0 12px;
    text-align: left;
  }

  .post-platform-list {
    display: grid;
    gap: 8px;
  }

  .post-platform-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
    min-height: 44px;
    padding: 0 12px;
  }

  .post-platform-row span {
    align-items: center;
    display: flex;
    gap: 10px;
  }

  .post-platform-row i {
    align-items: center;
    background: #f4f5f7;
    border-radius: 8px;
    display: inline-flex;
    font-size: 11px;
    font-style: normal;
    font-weight: 800;
    height: 26px;
    justify-content: center;
    width: 26px;
  }

  .post-platform-row em {
    color: #858a95;
    font-size: 12px;
    font-style: normal;
  }

  .post-panel-preview {
    border: 1px solid #e1e3e8;
    border-radius: 12px;
    display: grid;
    gap: 10px;
    margin: 0;
    overflow: hidden;
    padding: 12px;
  }

  .post-panel-preview img {
    aspect-ratio: 1;
    border-radius: 9px;
    object-fit: cover;
    width: 100%;
  }

  .post-panel-preview strong {
    color: #202126;
    font-size: 14px;
    line-height: 1.25;
  }

  .post-panel-preview p {
    color: #656a74;
    display: -webkit-box;
    font-size: 12px;
    line-height: 1.42;
    margin: 0;
    overflow: hidden;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
  }

  .post-panel-actions {
    display: grid;
    gap: 8px;
  }

  .post-panel-actions button {
    min-height: 42px;
  }

  .post-primary-action {
    background: #111111;
    color: #ffffff;
    min-height: 46px;
  }

  .bg-color-grid {
    display: grid;
    gap: 6px;
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  .bg-swatch {
    aspect-ratio: 1;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
    overflow: hidden;
    padding: 0;
    position: relative;
    transition: transform 100ms ease;
  }

  .bg-swatch:hover,
  .bg-gradient-swatch:hover {
    transform: scale(1.08);
  }

  .custom-color-swatch {
    align-items: center;
    background: #f0f0f0;
    color: #666b74;
    display: flex;
    font-size: 14px;
    justify-content: center;
  }

  .custom-color-swatch input {
    height: 0;
    opacity: 0;
    position: absolute;
    width: 0;
  }

  .bg-gradient-grid {
    display: grid;
    gap: 6px;
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .bg-gradient-swatch {
    aspect-ratio: 1;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
    padding: 0;
    transition: transform 100ms ease;
  }

  .bg-texture-grid,
  .bg-scene-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bg-texture-btn {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    color: #555b66;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    font: inherit;
    font-size: 11px;
    gap: 5px;
    padding: 8px;
    transition: background 150ms ease, border-color 150ms ease;
  }

  .bg-texture-btn:hover {
    background: #f7f8fa;
    border-color: #b8bdc7;
  }

  .bg-texture-preview {
    aspect-ratio: 2;
    background:
      linear-gradient(135deg, rgba(255,255,255,0.7), rgba(0,0,0,0.08)),
      #e1e3e8;
    border-radius: 4px;
    width: 100%;
  }

  .resize-current {
    background: #f5f5f5;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 14px;
  }

  .resize-current-label {
    color: #888d97;
    font-size: 11px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .resize-current-value {
    color: #111111;
    font-size: 14px;
    font-weight: 650;
  }

  .resize-current-dims {
    color: #666b74;
    font-size: 12px;
  }

  .resize-custom {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .resize-custom-inputs {
    align-items: center;
    display: flex;
    gap: 6px;
  }

  .resize-custom-inputs input {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    color: #202126;
    font: inherit;
    font-size: 13px;
    min-width: 0;
    padding: 6px 8px;
    text-align: center;
    width: 72px;
  }

  .resize-custom-inputs span {
    color: #999da6;
    font-size: 13px;
  }

  .resize-apply-btn {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    color: #202126;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    padding: 6px 12px;
  }

  .resize-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .resize-size-row {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    color: #202126;
    cursor: pointer;
    display: flex;
    font: inherit;
    justify-content: space-between;
    padding: 10px 12px;
    text-align: left;
    transition: background 150ms ease;
  }

  .resize-size-row:hover,
  .resize-apply-btn:hover {
    background: #f8f8f8;
  }

  .resize-size-name {
    font-size: 13px;
  }

  .resize-size-dims {
    color: #888d97;
    font-size: 12px;
    white-space: nowrap;
  }

  .post-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .post-datetime-input {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    width: 100%;
  }

  .post-action-row {
    display: flex;
    gap: 8px;
  }

  .post-btn-secondary {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    color: #202126;
    cursor: pointer;
    flex: 1;
    font: inherit;
    font-size: 13px;
    padding: 9px;
    transition: background 150ms ease;
  }

  .post-btn-secondary:hover {
    background: #ebebeb;
  }

  .post-btn-primary {
    background: #000000;
    border: 0;
    border-radius: 8px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 14px;
    font-weight: 650;
    padding: 11px;
    transition: opacity 150ms ease;
    width: 100%;
  }

  .post-btn-primary:hover {
    opacity: 0.85;
  }

  .post-platforms {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .post-platform-icon {
    font-size: 13px;
    font-weight: 800;
  }

  .post-platform-name {
    color: #333842;
    flex: 1;
    font-size: 13px;
  }

  .post-connect-btn {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    color: #202126;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    padding: 4px 12px;
    transition: background 150ms ease;
  }

  .post-connect-btn:hover {
    background: #f0f0f0;
  }

  .settings-image-preview {
    background: #f4f5f7;
    border-radius: 10px;
    display: block;
    max-height: 128px;
    object-fit: cover;
    width: 100%;
  }

  .brand-logo-row,
  .brand-colors-row,
  .brand-fonts-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .brand-fonts-list {
    flex-direction: column;
  }

  .brand-logo-placeholder {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e3e5e8;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    font: inherit;
    justify-content: center;
    min-height: 88px;
    min-width: 132px;
    padding: 12px 18px;
    transition: border-color 160ms ease, transform 160ms ease;
  }

  .brand-logo-placeholder:hover {
    border-color: #9297a1;
    transform: translateY(-1px);
  }

  .brand-color-swatch {
    border: 2px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px #c8ccd3;
    cursor: pointer;
    height: 34px;
    padding: 0;
    width: 34px;
  }

  .brand-color-swatch:hover {
    box-shadow: 0 0 0 2px #202126;
  }

  .brand-font-btn {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    color: #202126;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    min-height: 48px;
    padding: 10px 14px;
    transition: background 160ms ease, border-color 160ms ease;
  }

  .brand-font-btn:hover {
    background: #f7f8fa;
    border-color: #9297a1;
  }

  .brand-font-label,
  .panel-coming-soon {
    color: #8a8f99;
    font-size: 12px;
  }

  .placeholder-panel {
    align-items: center;
    background: #ffffff;
    border-left: 1px solid #e0e2e6;
    display: flex;
    justify-content: center;
    padding: 32px;
  }

  .elements-panel {
    border-left: 1px solid #e0e2e6;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 24px 30px 32px;
    max-height: calc(100vh - 124px);
    overflow-y: auto;
  }

  .text-panel {
    border-left: 1px solid #e0e2e6;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-height: calc(100vh - 124px);
    overflow-y: auto;
    padding: 24px 30px 32px;
  }

  .text-panel-section {
    display: grid;
    gap: 14px;
  }

  .text-panel-section h3 {
    color: #202126;
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  .text-preset-list {
    display: grid;
    gap: 8px;
  }

  .text-preset-btn {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    color: #202126;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    min-height: 58px;
    padding: 10px 14px;
    transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
  }

  .text-preset-btn:hover,
  .text-style-card:hover {
    background: #f6f7f8;
    border-color: #b9bdc6;
    transform: translateY(-1px);
  }

  .text-preset-preview {
    flex: 1;
    text-align: left;
  }

  .text-preset-preview.heading {
    font-size: 24px;
    font-weight: 850;
  }

  .text-preset-preview.subheading {
    font-size: 18px;
    font-weight: 760;
  }

  .text-preset-preview.body {
    font-size: 15px;
  }

  .text-preset-preview.caption,
  .text-preset-label {
    color: #828690;
    font-size: 12px;
  }

  .text-style-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .text-style-card {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    color: #202126;
    cursor: pointer;
    display: grid;
    min-height: 82px;
    overflow: hidden;
    padding: 10px;
    transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
  }

  .text-style-card span {
    justify-self: center;
  }

  .element-settings-panel {
    border-left: 1px solid #e0e2e6;
    background: #ffffff;
    padding: 22px;
    display: grid;
    align-content: start;
    gap: 24px;
    max-height: calc(100vh - 124px);
    overflow-y: auto;
  }

  .element-settings-panel input,
  .element-settings-panel textarea,
  .element-settings-panel button {
    color-scheme: light;
  }

  .property-list {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
  }

  .property-list label {
    min-height: 48px;
    border-bottom: 1px solid #eef0f3;
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    color: #202126;
    font-size: 14px;
    font-weight: 650;
  }

  .property-list label:last-child {
    border-bottom: 0;
  }

  .property-list span {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .property-list i {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: inline-block;
  }

  .property-list input[type="color"] {
    width: 32px;
    height: 32px;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }

  .property-list input[type="range"] {
    width: 104px;
  }

  .property-list button {
    border: 0;
    border-radius: 999px;
    background: #e5e7eb;
    color: #5f636d;
    padding: 5px 10px;
    font: inherit;
    font-size: 12px;
  }

  .property-list em {
    color: #6f737d;
    font-style: normal;
    font-weight: 500;
  }

  .alignment-panel,
  .transform-panel,
  .order-panel {
    display: grid;
    gap: 12px;
  }

  .alignment-panel h3,
  .transform-panel h3,
  .order-panel h3 {
    margin: 0;
    color: #202126;
    font-size: 15px;
    font-weight: 700;
  }

  .alignment-panel div {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }

  .alignment-panel button {
    height: 34px;
    border: 0;
    border-radius: 8px;
    background: #f4f5f7;
    color: #202126;
    font-size: 17px;
    cursor: pointer;
  }

  .transform-panel div {
    display: grid;
    grid-template-columns: 1fr 58px;
    align-items: center;
    gap: 10px;
  }

  .transform-panel input[type="number"] {
    width: 58px;
    height: 34px;
    border: 1px solid #e1e3e8;
    border-radius: 8px;
    text-align: center;
    font: inherit;
  }

  .order-panel div {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .order-panel p {
    margin: -2px 0 0;
    color: #747884;
    font-size: 12px;
    font-weight: 650;
  }

  .order-panel button,
  .delete-element-button,
  .finish-selection-button {
    min-height: 38px;
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    cursor: pointer;
  }

  .delete-element-button {
    color: #b42318;
  }

  .finish-selection-button {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
    font-weight: 760;
  }

  .finish-selection-button:hover {
    background: #2b2b2f;
    border-color: #2b2b2f;
  }

  .settings-section {
    border-bottom: 1px solid #eef0f3;
    display: grid;
    gap: 8px;
    padding: 0 0 16px;
  }

  .settings-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
    gap: 14px;
  }

  .settings-label {
    color: #60646f;
    font-size: 13px;
    font-weight: 650;
  }

  .settings-textarea {
    background: #ffffff !important;
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    color: #202126 !important;
    caret-color: #202126;
    color-scheme: light;
    font: inherit;
    font-size: 14px;
    min-height: 96px;
    outline: 0;
    padding: 10px 12px;
    resize: vertical;
    width: 100%;
  }

  .settings-textarea:focus {
    border-color: #202126;
    box-shadow: 0 0 0 3px rgba(32, 33, 38, 0.08);
  }

  .settings-stepper,
  .settings-toggle-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .settings-stepper button,
  .settings-toggle-group button {
    border: 1px solid #e1e3e8;
    border-radius: 8px;
    background: #f6f7f8;
    color: #202126;
    cursor: pointer;
    font: inherit;
    min-height: 32px;
    padding: 6px 10px;
  }

  .settings-toggle-group button.active {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
  }

  .settings-stepper input {
    background: #ffffff;
    border: 1px solid #e1e3e8;
    border-radius: 8px;
    color: #202126;
    color-scheme: light;
    font: inherit;
    height: 32px;
    text-align: center;
    width: 58px;
  }

  .settings-section input[type="color"] {
    border: 0;
    background: transparent;
    cursor: pointer;
    height: 34px;
    padding: 0;
    width: 42px;
  }

  .elements-panel input {
    width: 100%;
    height: 54px;
    border: 1px solid #e1e3e8;
    border-radius: 12px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 19px;
    padding: 0 16px;
    outline: 0;
    margin: 22px 0 34px;
  }

  .elements-panel input:focus {
    border-color: #202126;
    box-shadow: 0 0 0 3px rgba(32, 33, 38, 0.08);
  }

  .element-shelf {
    display: block;
    margin: 0 0 38px;
  }

  .element-shelf-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 0 18px;
  }

  .element-shelf h3 {
    margin: 0;
    font-size: 20px;
    line-height: 1.2;
    font-weight: 650;
  }

  .element-shelf-head button {
    border: 0;
    background: transparent;
    color: #2f3239;
    font: inherit;
    font-size: 18px;
    line-height: 1.2;
    cursor: pointer;
    padding: 4px 0;
  }

  .element-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-rows: auto;
    gap: 22px 24px;
  }

  .element-grid.icon {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    grid-auto-rows: 40px;
    gap: 16px 14px;
  }

  .element-shelf.expanded .element-grid.icon {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .element-tile {
    position: relative;
    aspect-ratio: 1;
    width: 100%;
    border: 0;
    border-radius: 12px;
    background: transparent;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: background 150ms ease, transform 150ms ease;
  }

  .element-tile:hover {
    background: #f2f3f6;
    transform: translateY(-1px);
  }

  .element-tile > span {
    display: block;
  }

  .element-grid.shape .element-tile > span,
  .element-grid.frame .element-tile > span {
    aspect-ratio: 1 / 1;
    width: 78%;
    height: auto;
    background: #111111;
    box-shadow: 0 10px 22px rgba(32, 33, 38, 0.08);
  }

  .element-grid.frame .element-tile > span {
    background-image: url('/assets/content-strategies/photos/lifestyle-content.jpg');
    background-size: cover;
    background-position: center;
    opacity: 0.82;
  }

  .element-grid.icon .element-tile {
    aspect-ratio: auto;
    height: 40px;
    font-size: 27px;
    color: #111111;
  }

  .shape-circle > span,
  .frame-frameCircle > span {
    border-radius: 50%;
  }

  .shape-square > span,
  .frame-frameSquare > span {
    border-radius: 0;
  }

  .shape-rounded > span,
  .frame-frameRound > span {
    border-radius: 18px;
  }

  .shape-triangle > span,
  .frame-frameTriangle > span {
    clip-path: polygon(50% 4%, 96% 92%, 4% 92%);
  }

  .shape-diamond > span,
  .frame-frameDiamond > span {
    clip-path: polygon(50% 4%, 96% 50%, 50% 96%, 4% 50%);
  }

  .shape-pentagon > span,
  .frame-framePentagon > span {
    clip-path: polygon(50% 3%, 96% 36%, 78% 96%, 22% 96%, 4% 36%);
  }

  .shape-hexagon > span,
  .frame-frameHexagon > span {
    clip-path: polygon(25% 5%, 75% 5%, 98% 50%, 75% 95%, 25% 95%, 2% 50%);
  }

  .shape-octagon > span,
  .frame-frameOctagon > span {
    clip-path: polygon(30% 4%, 70% 4%, 96% 30%, 96% 70%, 70% 96%, 30% 96%, 4% 70%, 4% 30%);
  }

  .shape-parallelogram > span,
  .frame-frameSlant > span {
    clip-path: polygon(22% 5%, 96% 5%, 78% 95%, 4% 95%);
  }

  .shape-trapezoid > span {
    clip-path: polygon(22% 5%, 78% 5%, 96% 95%, 4% 95%);
  }

  .shape-semicircle > span,
  .frame-frameArch > span {
    clip-path: inset(0 0 0 0 round 999px 999px 0 0);
  }

  .shape-pill > span,
  .frame-framePill > span {
    aspect-ratio: auto;
    border-radius: 999px;
    height: 48%;
  }

  .shape-spark > span {
    clip-path: polygon(50% 0, 61% 35%, 98% 36%, 68% 58%, 79% 96%, 50% 73%, 21% 96%, 32% 58%, 2% 36%, 39% 35%);
  }

  .shape-star > span,
  .frame-frameStar > span {
    clip-path: polygon(50% 2%, 61% 34%, 95% 34%, 68% 54%, 79% 88%, 50% 68%, 21% 88%, 32% 54%, 5% 34%, 39% 34%);
  }

  .shape-starAlt > span {
    clip-path: polygon(50% 0, 58% 34%, 90% 16%, 72% 48%, 100% 58%, 66% 64%, 84% 96%, 52% 78%, 36% 100%, 36% 66%, 2% 74%, 28% 50%, 4% 24%, 40% 36%);
  }

  .shape-burst > span,
  .frame-frameBurst > span {
    clip-path: polygon(50% 0, 57% 19%, 74% 8%, 75% 29%, 96% 25%, 84% 43%, 100% 55%, 79% 62%, 88% 82%, 66% 78%, 58% 100%, 45% 82%, 27% 96%, 27% 74%, 4% 78%, 17% 58%, 0 45%, 22% 39%, 12% 18%, 34% 24%);
  }

  .shape-plus > span,
  .frame-frameCross > span {
    clip-path: polygon(38% 0, 62% 0, 62% 38%, 100% 38%, 100% 62%, 62% 62%, 62% 100%, 38% 100%, 38% 62%, 0 62%, 0 38%, 38% 38%);
  }

  .shape-arrowLeft > span,
  .frame-frameArrowLeft > span {
    clip-path: polygon(0 50%, 40% 8%, 40% 32%, 100% 32%, 100% 68%, 40% 68%, 40% 92%);
  }

  .shape-arrowRight > span,
  .frame-frameArrowRight > span {
    clip-path: polygon(100% 50%, 60% 8%, 60% 32%, 0 32%, 0 68%, 60% 68%, 60% 92%);
  }

  .shape-arrowUp > span,
  .frame-frameArrowUp > span {
    clip-path: polygon(50% 0, 92% 40%, 68% 40%, 68% 100%, 32% 100%, 32% 40%, 8% 40%);
  }

  .shape-arrowDown > span,
  .frame-frameArrowDown > span {
    clip-path: polygon(50% 100%, 92% 60%, 68% 60%, 68% 0, 32% 0, 32% 60%, 8% 60%);
  }

  .shape-moon > span {
    border-radius: 50%;
    box-shadow: inset 22px 0 0 #ffffff;
  }

  .shape-cloud > span {
    border-radius: 42% 42% 30% 30%;
    clip-path: polygon(8% 55%, 17% 39%, 35% 39%, 45% 20%, 65% 24%, 72% 42%, 88% 43%, 96% 58%, 88% 78%, 10% 78%);
  }

  .shape-bookmark > span {
    clip-path: polygon(16% 0, 84% 0, 84% 100%, 50% 78%, 16% 100%);
  }

  @media (max-width: 700px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .sidebar {
      display: none;
    }

    .calendar-topbar,
    .calendar-actions {
      flex-wrap: wrap;
    }

    .editor-shell {
      grid-template-columns: 1fr;
    }

    .view-switcher {
      position: static;
      transform: none;
      display: flex;
      margin-bottom: 16px;
    }

    .post-settings-panel {
      border-left: 0;
    }
  }
`
