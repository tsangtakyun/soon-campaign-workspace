'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { resolveActiveWorkspace } from '@/lib/workspace-client'

export type ReviewPost = {
  approved_at: string | null
  body: string | null
  campaign_id: string | null
  captions: Record<string, unknown> | null
  id: string
  image_url: string | null
  post_type: string | null
  scheduled_at: string | null
  status: string | null
  title: string | null
  workspace_id: string | null
}

export type ReviewCampaign = {
  name: string | null
  strategy_emoji: string | null
}

type PostReviewClientProps = {
  campaign: ReviewCampaign | null
  nextId: string | null
  post: ReviewPost
  prevId: string | null
  workspaceId: string
}

type Platform = 'Instagram' | 'Facebook' | 'Threads'

const PLATFORMS: Platform[] = ['Instagram', 'Facebook', 'Threads']

function suggestionsForPostType(postType: string | null) {
  const type = (postType || '').toLowerCase()
  if (type === 'image' || type === 'still_image' || type === 'still-images') {
    return ['更換背景至戶外場景', '將標題移至頂部', '增加品牌 logo', '調整色調至更鮮明', '加入產品特寫']
  }
  if (type === 'video' || type === 'short_form_video' || type === 'feed_video' || type === 'feed-videos') {
    return ['加入開場字幕', '加入背景音樂', '剪短至15秒', '加入字幕', '加入 CTA 結尾']
  }
  if (type === 'carousel' || type === 'carousels') {
    return ['增加幻燈片數量至7張', '統一字型風格', '加入封面幻燈片', '每頁加入數據或統計', '優化最後一頁 CTA']
  }
  return ['優化文案節奏', '加入 emoji', '調整發布時間', '加入 hashtag', '縮短段落']
}

function formatScheduledAt(value: string | null) {
  if (!value) return '未排程'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未排程'
  return date.toLocaleString('zh-HK', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'long',
  })
}

function accountName(campaign: ReviewCampaign | null) {
  return campaign?.name || 'SOON Workspace'
}

function previewAspect(postType: string | null) {
  const type = (postType || '').toLowerCase()
  return type.includes('video') || type.includes('story') ? 'aspect-[9/16]' : 'aspect-square'
}

function isCarouselPost(postType: string | null) {
  const type = (postType || '').toLowerCase()
  return type === 'carousel' || type === 'carousels'
}

function captionExcerpt(value: string) {
  if (value.length <= 125) return value
  return `${value.slice(0, 125)}... 更多`
}

export function PostReviewClient({ campaign, nextId, post, prevId, workspaceId }: PostReviewClientProps) {
  const router = useRouter()
  const [activePlatform, setActivePlatform] = useState<Platform>('Instagram')
  const [caption, setCaption] = useState(post.body || '')
  const [draftCaption, setDraftCaption] = useState(post.body || '')
  const [captionModalOpen, setCaptionModalOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<'approve' | 'reject' | 'caption' | null>(null)
  const [imageHovered, setImageHovered] = useState(false)
  const [message, setMessage] = useState('')

  const suggestions = useMemo(() => suggestionsForPostType(post.post_type), [post.post_type])
  const title = post.title || '未命名貼文'
  const workspaceName = accountName(campaign)

  useEffect(() => {
    let cancelled = false

    async function verifyActiveWorkspace() {
      const { workspaceId: activeWorkspaceId } = await resolveActiveWorkspace()
      if (cancelled || !activeWorkspaceId) return
      if (activeWorkspaceId !== workspaceId) {
        router.replace('/onboarding/approvals')
      }
    }

    void verifyActiveWorkspace()
    return () => {
      cancelled = true
    }
  }, [router, workspaceId])

  async function approvePost() {
    if (busyAction) return
    setBusyAction('approve')
    setMessage('')

    try {
      const response = await fetch('/api/posts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          workspaceId,
          platform: null,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok && response.status !== 207) {
        throw new Error(result?.detail || result?.error || '批准失敗，請再試一次。')
      }
      if (result?.success === false) {
        throw new Error(result?.errors?.[0]?.message || result?.detail || result?.error || '批准失敗，請再試一次。')
      }
      router.push('/onboarding/approvals')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '批准失敗，請再試一次。')
    } finally {
      setBusyAction(null)
    }
  }

  async function rejectPost() {
    if (busyAction) return
    setBusyAction('reject')
    setMessage('')

    try {
      const response = await fetch('/api/posts/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, workspaceId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.success) {
        throw new Error(result?.detail || result?.error || '不發布失敗，請再試一次。')
      }
      router.push('/onboarding/approvals')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '不發布失敗，請再試一次。')
    } finally {
      setBusyAction(null)
    }
  }

  async function saveCaption() {
    if (busyAction) return
    setBusyAction('caption')
    setMessage('')

    try {
      const response = await fetch('/api/posts/update-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: draftCaption,
          postId: post.id,
          workspaceId,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.success) {
        throw new Error(result?.detail || result?.error || '儲存文案失敗，請再試一次。')
      }
      setCaption(draftCaption.trim())
      setCaptionModalOpen(false)
      setMessage('文案已儲存。')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '儲存文案失敗，請再試一次。')
    } finally {
      setBusyAction(null)
    }
  }

  function handleEditDesign() {
    router.push('/scheduled-posts')
  }

  function renderHoverImage(aspectRatio: string) {
    return (
      <div
        style={{
          aspectRatio,
          backgroundColor: '#f3f4f6',
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
        }}
        onMouseEnter={() => setImageHovered(true)}
        onMouseLeave={() => setImageHovered(false)}
      >
        {post.image_url ? (
          <img
            src={post.image_url}
            alt=""
            style={{
              display: 'block',
              filter: imageHovered ? 'brightness(0.62)' : 'brightness(1)',
              height: '100%',
              objectFit: 'cover',
              transform: imageHovered ? 'scale(1.015)' : 'scale(1)',
              transition: 'transform 200ms ease, filter 200ms ease',
              width: '100%',
            }}
          />
        ) : (
          <div
            style={{
              alignItems: 'center',
              color: '#d1d5db',
              display: 'flex',
              fontSize: '48px',
              height: '100%',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            ▧
          </div>
        )}
        {imageHovered ? (
          <button
            onClick={(event) => {
              event.stopPropagation()
              handleEditDesign()
            }}
            style={{
              background: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              color: '#111827',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              left: '50%',
              padding: '8px 16px',
              position: 'absolute',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              whiteSpace: 'nowrap',
            }}
            type="button"
          >
            ✎ 編輯設計
          </button>
        ) : null}
      </div>
    )
  }

  function renderInstagramPreview() {
    const aspectClass = previewAspect(post.post_type)
    return (
      <article
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(17, 24, 39, 0.12)',
          maxWidth: '384px',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <header style={{ alignItems: 'center', display: 'flex', gap: '8px', padding: '12px' }}>
          <div
            style={{
              alignItems: 'center',
              backgroundColor: '#e5e7eb',
              borderRadius: '999px',
              color: '#4b5563',
              display: 'flex',
              flexShrink: 0,
              fontSize: '14px',
              fontWeight: 700,
              height: '32px',
              justifyContent: 'center',
              width: '32px',
            }}
          >
            {workspaceName.slice(0, 1).toUpperCase()}
          </div>
          <span style={{ color: '#111827', fontSize: '14px', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workspaceName}
          </span>
          <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>•••</span>
        </header>
        {renderHoverImage(aspectClass === 'aspect-[9/16]' ? '9 / 16' : '1 / 1')}
        <div style={{ alignItems: 'center', color: '#1f2937', display: 'flex', fontSize: '20px', gap: '16px', padding: '12px 16px' }}>
          <span>♡</span>
          <span>○</span>
          <span>▷</span>
          <span style={{ marginLeft: 'auto' }}>⊘</span>
        </div>
        <p style={{ color: '#111827', fontSize: '14px', lineHeight: 1.55, margin: 0, padding: '0 16px 16px' }}>
          <strong style={{ color: '#111827', marginRight: '4px' }}>{workspaceName}</strong>
          {captionExcerpt(caption || 'SOON 會根據你的品牌資料生成內容。')}
        </p>
      </article>
    )
  }

  function renderFacebookPreview() {
    return (
      <article
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(17, 24, 39, 0.12)',
          maxWidth: '448px',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <header style={{ alignItems: 'center', display: 'flex', gap: '10px', padding: '12px 14px 8px' }}>
          <div
            style={{
              alignItems: 'center',
              backgroundColor: '#e5e7eb',
              borderRadius: '999px',
              color: '#4b5563',
              display: 'flex',
              flexShrink: 0,
              fontSize: '14px',
              fontWeight: 700,
              height: '40px',
              justifyContent: 'center',
              width: '40px',
            }}
          >
            {workspaceName.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <strong style={{ color: '#111827', display: 'block', fontSize: '14px', lineHeight: 1.2 }}>{workspaceName}</strong>
            <span style={{ color: '#6b7280', fontSize: '12px' }}>3 days ago · 🌐</span>
          </div>
          <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>•••</span>
        </header>
        <p style={{ color: '#111827', fontSize: '14px', lineHeight: 1.55, margin: 0, padding: '8px 14px 12px' }}>
          {captionExcerpt(caption || 'SOON 會根據你的品牌資料生成內容。')}
        </p>
        {isCarouselPost(post.post_type) && post.image_url ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: '#e5e7eb' }}>
            {renderHoverImage('1 / 1')}
            {renderHoverImage('1 / 1')}
          </div>
        ) : (
          renderHoverImage('16 / 9')
        )}
        <footer style={{ alignItems: 'center', borderTop: '1px solid #e5e7eb', color: '#4b5563', display: 'flex', fontSize: '13px', gap: '18px', justifyContent: 'space-around', padding: '10px 14px' }}>
          <span>👍 讚好</span>
          <span>💬 留言</span>
          <span>↗ 分享</span>
        </footer>
      </article>
    )
  }

  function renderThreadsPreview() {
    return (
      <article
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(17, 24, 39, 0.12)',
          maxWidth: '320px',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <header style={{ alignItems: 'center', display: 'flex', gap: '8px', padding: '12px' }}>
          <div
            style={{
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '999px',
              color: '#4b5563',
              display: 'flex',
              flexShrink: 0,
              fontSize: '14px',
              fontWeight: 700,
              height: '32px',
              justifyContent: 'center',
              width: '32px',
            }}
          >
            {workspaceName.slice(0, 1).toUpperCase()}
          </div>
          <span style={{ color: '#111827', fontSize: '14px', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workspaceName}
          </span>
          <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>•••</span>
        </header>
        {renderHoverImage('1 / 1')}
        <p style={{ color: '#111827', fontSize: '14px', lineHeight: 1.55, margin: 0, padding: '12px 14px 6px' }}>
          {captionExcerpt(caption || 'SOON 會根據你的品牌資料生成內容。')}
        </p>
        <button
          style={{
            background: 'transparent',
            border: 0,
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '0 14px 14px',
            textAlign: 'left',
          }}
          type="button"
        >
          回覆
        </button>
      </article>
    )
  }

  return (
    <main
      className="min-h-screen bg-white text-gray-900 flex flex-col"
      style={{
        backgroundColor: '#ffffff',
        color: '#111827',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <header
        className="border-b border-gray-200 px-6 py-3 flex items-center gap-3 bg-white flex-shrink-0"
        style={{
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          flexShrink: 0,
          gap: '12px',
          padding: '12px 24px',
        }}
      >
        <button
          className="text-sm font-medium text-gray-600 hover:text-gray-950"
          style={{
            background: 'transparent',
            border: 0,
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            padding: 0,
          }}
          onClick={() => router.push('/onboarding/approvals')}
          type="button"
        >
          ← 返回審批
        </button>
        <h1
          className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900"
          style={{
            color: '#111827',
            flex: 1,
            fontSize: '14px',
            fontWeight: 600,
            margin: 0,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h1>
        <div className="flex items-center gap-2" style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
          <button
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!prevId}
            onClick={() => prevId && router.push(`/onboarding/approvals/${prevId}`)}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              color: '#374151',
              cursor: prevId ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              opacity: prevId ? 1 : 0.4,
              padding: '6px 12px',
            }}
            type="button"
          >
            上一個
          </button>
          <button
            className="rounded-lg border border-red-400 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
            disabled={Boolean(busyAction)}
            onClick={() => void rejectPost()}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              color: '#dc2626',
              cursor: busyAction ? 'wait' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              opacity: busyAction ? 0.6 : 1,
              padding: '6px 12px',
            }}
            type="button"
          >
            {busyAction === 'reject' ? '處理中...' : '不發布'}
          </button>
          <button
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-wait disabled:opacity-60"
            disabled={Boolean(busyAction)}
            onClick={() => void approvePost()}
            style={{
              backgroundColor: '#16a34a',
              border: '1px solid #16a34a',
              borderRadius: '8px',
              color: '#ffffff',
              cursor: busyAction ? 'wait' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              opacity: busyAction ? 0.6 : 1,
              padding: '6px 12px',
            }}
            type="button"
          >
            {busyAction === 'approve' ? '批准中...' : '批准'}
          </button>
          <button
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!nextId}
            onClick={() => nextId && router.push(`/onboarding/approvals/${nextId}`)}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              color: '#374151',
              cursor: nextId ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              opacity: nextId ? 1 : 0.4,
              padding: '6px 12px',
            }}
            type="button"
          >
            下一個
          </button>
        </div>
      </header>

      <div
        className="flex flex-1 overflow-hidden"
        style={{ display: 'flex', flex: 1, height: 'calc(100vh - 57px)', overflow: 'hidden' }}
      >
        <aside
          className="w-60 border-r border-gray-200 overflow-y-auto p-5 bg-white flex-shrink-0"
          style={{
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            flexShrink: 0,
            overflowY: 'auto',
            padding: '20px',
            width: '240px',
          }}
        >
          <h2 className="text-sm font-semibold text-gray-950" style={{ color: '#111827', fontSize: '14px', fontWeight: 600, margin: 0 }}>
            SOON 可以改善：
          </h2>
          <ol className="mt-4 space-y-3 text-sm text-gray-700" style={{ color: '#374151', fontSize: '14px', margin: '16px 0 0', padding: 0 }}>
            {suggestions.map((suggestion, index) => (
              <li className="flex gap-3" key={suggestion} style={{ display: 'flex', gap: '12px', listStyle: 'none', marginBottom: '12px' }}>
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600"
                  style={{
                    alignItems: 'center',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '999px',
                    color: '#4b5563',
                    display: 'flex',
                    flexShrink: 0,
                    fontSize: '12px',
                    fontWeight: 600,
                    height: '24px',
                    justifyContent: 'center',
                    width: '24px',
                  }}
                >
                  {index + 1}
                </span>
                <span className="leading-6" style={{ lineHeight: '24px' }}>{suggestion}</span>
              </li>
            ))}
          </ol>

          <div
            className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-3"
            style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', marginTop: '24px', padding: '12px' }}
          >
            <textarea
              className="h-28 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="請 SOON 修改..."
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: '#111827',
                fontSize: '14px',
                height: '112px',
                padding: '8px 12px',
                resize: 'none',
                width: '100%',
              }}
            />
            <div className="mt-2 flex justify-end" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-950 text-white"
                style={{
                  alignItems: 'center',
                  backgroundColor: '#111827',
                  border: 0,
                  borderRadius: '999px',
                  color: '#ffffff',
                  display: 'flex',
                  height: '32px',
                  justifyContent: 'center',
                  width: '32px',
                }}
                type="button"
              >
                ↑
              </button>
            </div>
          </div>
        </aside>

        <section
          className="flex-1 overflow-y-auto bg-gray-50 flex flex-col items-center p-6"
          style={{
            alignItems: 'center',
            backgroundColor: '#f9fafb',
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          <div className="mx-auto flex w-full flex-col items-center" style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', maxWidth: activePlatform === 'Facebook' ? '448px' : activePlatform === 'Threads' ? '320px' : '384px', width: '100%' }}>
            <div
              className="flex gap-0 border-b border-gray-200 mb-6 w-full max-w-sm"
              style={{ borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 0, marginBottom: '24px', maxWidth: '384px', width: '100%' }}
            >
              {PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  onClick={() => setActivePlatform(platform)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activePlatform === platform ? '2px solid #111827' : '2px solid transparent',
                    color: activePlatform === platform ? '#111827' : '#6b7280',
                    cursor: 'pointer',
                    flex: 1,
                    fontSize: '14px',
                    fontWeight: activePlatform === platform ? 600 : 400,
                    padding: '8px 16px',
                  }}
                  type="button"
                >
                  {platform}
                </button>
              ))}
            </div>

            {activePlatform === 'Instagram' ? renderInstagramPreview() : null}
            {activePlatform === 'Facebook' ? renderFacebookPreview() : null}
            {activePlatform === 'Threads' ? renderThreadsPreview() : null}

            <div className="mt-5 flex items-center gap-3 text-sm text-gray-600" style={{ alignItems: 'center', color: '#4b5563', display: 'flex', fontSize: '14px', gap: '12px', marginTop: '20px' }}>
              <span>喜歡結果？</span>
              <button className="rounded-full border border-gray-200 bg-white px-3 py-2" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '999px', padding: '8px 12px' }} type="button">
                👎
              </button>
              <button className="rounded-full border border-gray-200 bg-white px-3 py-2" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '999px', padding: '8px 12px' }} type="button">
                👍
              </button>
            </div>

            {message ? (
              <div className="mt-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151', fontSize: '14px', marginTop: '16px', padding: '8px 12px', width: '100%' }}>
                {message}
              </div>
            ) : null}
          </div>
        </section>

        <aside
          className="w-72 border-l border-gray-200 overflow-y-auto p-5 bg-white flex-shrink-0"
          style={{
            backgroundColor: '#ffffff',
            borderLeft: '1px solid #e5e7eb',
            flexShrink: 0,
            overflowY: 'auto',
            padding: '20px',
            width: '288px',
          }}
        >
          <div className="space-y-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3" style={{ color: '#6b7280', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', margin: '0 0 12px', textTransform: 'uppercase' }}>發布資訊</h2>
            <dl className="mt-4 space-y-4 text-sm" style={{ color: '#374151', fontSize: '14px', margin: 0 }}>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400" style={{ color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>發布時間</dt>
                <dd className="mt-1 text-gray-900" style={{ color: '#111827', margin: '4px 0 0' }}>{formatScheduledAt(post.scheduled_at)}</dd>
              </div>
              <div style={{ marginTop: '14px' }}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400" style={{ color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>發布至</dt>
                <dd className="mt-2 flex flex-wrap gap-2" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 0 0' }}>
                  {PLATFORMS.map((platform) => (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500" key={platform} style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '999px', color: '#6b7280', fontSize: '12px', padding: '4px 10px' }}>
                      {platform}
                    </span>
                  ))}
                </dd>
              </div>
              <div style={{ marginTop: '14px' }}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400" style={{ color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>Campaign</dt>
                <dd className="mt-1 text-gray-900" style={{ color: '#111827', margin: '4px 0 0' }}>
                  {campaign?.strategy_emoji || '▱'} {campaign?.name || '未命名活動'}
                </dd>
              </div>
            </dl>
          </section>

          <hr className="my-6 border-gray-200" style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: 0 }} />

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3" style={{ color: '#6b7280', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', margin: '0 0 12px', textTransform: 'uppercase' }}>快速編輯</h2>
            <div className="space-y-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
                onClick={() => {
                  setDraftCaption(caption)
                  setCaptionModalOpen(true)
                }}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '8px 12px',
                  textAlign: 'left',
                  width: '100%',
                }}
                type="button"
              >
                調整文案
              </button>
              <button
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-800"
                onClick={handleEditDesign}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#111827',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '8px 12px',
                  textAlign: 'left',
                  width: '100%',
                }}
                type="button"
              >
                編輯設計
              </button>
            </div>
          </section>

          <hr className="my-6 border-gray-200" style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: 0 }} />

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3" style={{ color: '#6b7280', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', margin: '0 0 12px', textTransform: 'uppercase' }}>重新生成</h2>
            <div className="mt-3 space-y-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="w-full cursor-not-allowed rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-400"
                disabled
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#9ca3af',
                  cursor: 'not-allowed',
                  fontSize: '14px',
                  padding: '8px 12px',
                  textAlign: 'left',
                  width: '100%',
                }}
                title="即將推出"
                type="button"
              >
                重新生成設計
              </button>
              <button
                className="w-full cursor-not-allowed rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-400"
                disabled
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#9ca3af',
                  cursor: 'not-allowed',
                  fontSize: '14px',
                  padding: '8px 12px',
                  textAlign: 'left',
                  width: '100%',
                }}
                title="即將推出"
                type="button"
              >
                更換媒體
              </button>
            </div>
          </section>
          </div>
        </aside>
      </div>

      {captionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" style={{ alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', inset: 0, justifyContent: 'center', padding: '16px', position: 'fixed', zIndex: 50 }}>
          <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-label="調整文案" style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.22)', maxWidth: '512px', padding: '20px', width: '100%' }}>
            <header className="flex items-start justify-between gap-4" style={{ alignItems: 'flex-start', display: 'flex', gap: '16px', justifyContent: 'space-between' }}>
              <div>
                <h2 className="text-lg font-semibold text-gray-950" style={{ color: '#111827', fontSize: '18px', fontWeight: 600, margin: 0 }}>調整文案</h2>
                <p className="mt-1 text-sm text-gray-500" style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0' }}>儲存後會更新這則貼文的 caption。</p>
              </div>
              <button className="text-2xl leading-none text-gray-400 hover:text-gray-700" onClick={() => setCaptionModalOpen(false)} style={{ background: 'transparent', border: 0, color: '#9ca3af', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }} type="button">
                ×
              </button>
            </header>
            <textarea
              className="mt-4 h-48 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm leading-6 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
              onChange={(event) => setDraftCaption(event.target.value)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                color: '#111827',
                fontSize: '14px',
                height: '192px',
                lineHeight: 1.6,
                marginTop: '16px',
                padding: '8px 12px',
                resize: 'none',
                width: '100%',
              }}
              value={draftCaption}
            />
            <footer className="mt-4 flex justify-end gap-2" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700" onClick={() => setCaptionModalOpen(false)} style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151', cursor: 'pointer', fontSize: '14px', padding: '8px 16px' }} type="button">
                取消
              </button>
              <button
                className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                disabled={busyAction === 'caption'}
                onClick={() => void saveCaption()}
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #111827',
                  borderRadius: '8px',
                  color: '#ffffff',
                  cursor: busyAction === 'caption' ? 'wait' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: busyAction === 'caption' ? 0.6 : 1,
                  padding: '8px 16px',
                }}
                type="button"
              >
                {busyAction === 'caption' ? '儲存中...' : '儲存'}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  )
}
