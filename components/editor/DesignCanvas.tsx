'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

import { useFabricCanvas } from '@/hooks/useFabricCanvas'
import type { CanvasSize, DesignElement, DesignTool, ScheduledPost } from '@/components/editor/editorTypes'
import { getGoogleTypefaceLinks, getTypefaceFontFaceStyles } from '@/lib/typefaces'

export type FabricControls = ReturnType<typeof useFabricCanvas>

type DesignCanvasProps = {
  canvasSize: CanvasSize
  selectedPost: ScheduledPost
  designElements: DesignElement[]
  selectedElementId: string | null
  onSelectElement: (id: string) => void
  onDeselectElement: () => void
  onStartMove: (event: ReactPointerEvent<HTMLElement>, element: DesignElement) => void
  onStartResize: (event: ReactPointerEvent<HTMLElement>, element: DesignElement) => void
  onStartRotate: (event: ReactPointerEvent<HTMLElement>, element: DesignElement) => void
  onDuplicate: () => void
  onDelete: () => void
  onEditElement: (element: DesignElement) => void
  onSetActiveTool: (tool: DesignTool) => void
  onCloseDesignMode: () => void
  onCreditsChange?: (credits: number) => void
  onFabricReady?: (controls: FabricControls) => void
  canvasRef: RefObject<HTMLElement | null>
  workspaceId: string | null
}

function getDisplaySize(canvasSize: CanvasSize) {
  const aspectRatio = canvasSize.w / canvasSize.h
  const width = aspectRatio >= 1.55 ? 620 : aspectRatio >= 1 ? 500 : aspectRatio <= 0.6 ? 360 : 430
  return {
    height: Math.round(width / aspectRatio),
    width,
  }
}

export function DesignCanvas({
  canvasSize,
  selectedPost,
  designElements,
  onCloseDesignMode,
  onCreditsChange,
  onDeselectElement,
  onFabricReady,
  onSelectElement,
  workspaceId,
  canvasRef,
}: DesignCanvasProps) {
  const [askSoonError, setAskSoonError] = useState('')
  const [askSoonLoading, setAskSoonLoading] = useState(false)
  const [askSoonOpen, setAskSoonOpen] = useState(false)
  const [askSoonPrompt, setAskSoonPrompt] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const loadedPostRef = useRef<string | null>(null)
  const displaySize = useMemo(() => getDisplaySize(canvasSize), [canvasSize])
  const controls = useFabricCanvas({
    autosaveKey: selectedPost.id,
    autosaveName: selectedPost.title,
    canvasId: 'fabric-design-canvas',
    height: displaySize.height,
    onSelectElement: (id) => {
      if (id) onSelectElement(id)
      else onDeselectElement()
    },
    width: displaySize.width,
  })

  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.textContent = getTypefaceFontFaceStyles()
    document.head.appendChild(styleEl)

    getGoogleTypefaceLinks().forEach((url) => {
      if (!document.querySelector(`link[href="${url}"]`)) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = url
        document.head.appendChild(link)
      }
    })

    return () => {
      document.head.removeChild(styleEl)
    }
  }, [])

  useEffect(() => {
    onFabricReady?.(controls)
  }, [controls, onFabricReady])

  useEffect(() => {
    if (loadedPostRef.current === selectedPost.id) return
    loadedPostRef.current = selectedPost.id
    void controls.loadDesignElements(designElements)
  }, [controls, designElements, selectedPost.id])

  useEffect(() => {
    const canvas = controls.fabricRef.current
    if (!canvas) return

    const onMouseDown = (option: { e: Event }) => {
      if (!(option.e instanceof MouseEvent) || option.e.button !== 2) return
      option.e.preventDefault()
      if (!canvas.getActiveObject()) return
      setContextMenu({ x: option.e.clientX, y: option.e.clientY })
    }

    canvas.on('mouse:down:before', onMouseDown)
    return () => {
      canvas.off('mouse:down:before', onMouseDown)
    }
  }, [controls.fabricRef])

  useEffect(() => {
    const onClick = () => setContextMenu(null)
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, button, [contenteditable="true"]')) return

      if ((event.key === 'Delete' || event.key === 'Backspace') && controls.fabricRef.current?.getActiveObject()) {
        event.preventDefault()
        controls.deleteSelected()
      }

      if ((event.key === 'Enter' || event.key === 'Escape') && controls.fabricRef.current?.getActiveObject()) {
        event.preventDefault()
        controls.fabricRef.current.discardActiveObject()
        controls.fabricRef.current.renderAll()
        onDeselectElement()
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) void controls.redo()
        else void controls.undo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [controls, onDeselectElement])

  const askSoonQuickPrompts = [
    ['大理石背景', '將背景換成白色大理石質感，保留人物'],
    ['日落漸層', '將背景換成橙紅日落漸層，保留人物'],
    ['簡約白色', '將背景換成簡約純白場景，保留人物'],
    ['自然場景', '將背景換成戶外自然綠色場景，保留人物'],
  ] as const

  const runAskSoonEdit = async () => {
    const prompt = askSoonPrompt.trim()
    if (!prompt || askSoonLoading) return
    if (!workspaceId) {
      setAskSoonError('找不到 workspace，請重新整理後再試。')
      return
    }

    setAskSoonError('')
    setAskSoonLoading(true)

    try {
      const imageBase64 = controls.exportPNG(2)
      if (!imageBase64) throw new Error('未能匯出目前畫布')

      const response = await fetch('/api/editor/ai-ask-soon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, prompt, workspaceId }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        balance?: number
        creditsRemaining?: number
        detail?: string
        error?: string
        imageUrl?: string
        required?: number
      }

      if (response.status === 402) {
        setAskSoonError(`Credits 不足，需要 ${data.required ?? 10} credits，現有 ${data.balance ?? 0}。`)
        return
      }
      if (!response.ok || !data.imageUrl) {
        throw new Error(data.detail || data.error || 'AI 改圖失敗')
      }

      const imageId = await controls.replaceCanvasWithImage(data.imageUrl)
      if (imageId) onSelectElement(imageId)
      if (typeof data.creditsRemaining === 'number') onCreditsChange?.(data.creditsRemaining)
      setAskSoonPrompt('')
      setAskSoonOpen(false)
    } catch (error) {
      setAskSoonError(error instanceof Error ? error.message : 'AI 改圖失敗，請重試。')
    } finally {
      setAskSoonLoading(false)
    }
  }

  return (
    <section className="design-canvas-area">
      <article
        className="design-canvas fabric-design-canvas-shell"
        ref={canvasRef}
        style={{
          aspectRatio: `${canvasSize.w} / ${canvasSize.h}`,
          width: `min(${displaySize.width}px, 62vh)`,
        }}
      >
        <canvas id="fabric-design-canvas" />
      </article>

      {contextMenu ? (
        <div
          className="fabric-context-menu"
          onPointerDown={(event) => event.stopPropagation()}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button type="button" onClick={() => { void controls.duplicateSelected(); setContextMenu(null) }}>
            複製
          </button>
          <button type="button" onClick={() => { controls.deleteSelected(); setContextMenu(null) }}>
            刪除
          </button>
          <button type="button" onClick={() => { controls.bringForward(); setContextMenu(null) }}>
            往前一層
          </button>
          <button type="button" onClick={() => { controls.sendBackward(); setContextMenu(null) }}>
            往後一層
          </button>
        </div>
      ) : null}

      <div className="canvas-side-actions">
        <button type="button">▣</button>
        <button type="button">＋</button>
      </div>

      <div className="design-result-bar">
        <span>你喜歡這個結果嗎？</span>
        <button type="button">不喜歡</button>
        <button type="button">喜歡</button>
        <button type="button" onClick={onCloseDesignMode}>關閉</button>
      </div>

      {askSoonOpen ? (
        <div
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            background: '#111827',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 14,
            bottom: 66,
            boxShadow: '0 18px 48px rgba(0,0,0,0.32)',
            color: '#f9fafb',
            left: 24,
            maxWidth: 320,
            padding: 14,
            position: 'absolute',
            width: 'calc(100% - 48px)',
            zIndex: 20,
          }}
        >
          <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>用 AI 改圖</strong>
            <button
              type="button"
              onClick={() => setAskSoonOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>
          <textarea
            value={askSoonPrompt}
            onChange={(event) => setAskSoonPrompt(event.target.value)}
            placeholder={'描述你想改嘅效果...\n例：將背景換成大理石'}
            rows={4}
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 10,
              color: '#f9fafb',
              font: 'inherit',
              fontSize: 13,
              lineHeight: 1.5,
              padding: 10,
              resize: 'vertical',
              width: '100%',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {askSoonQuickPrompts.map(([label, value]) => (
              <button
                key={label}
                type="button"
                onClick={() => setAskSoonPrompt((current) => (current.trim() ? `${value}\n${current}` : value))}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 999,
                  color: '#e5e7eb',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '5px 9px',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {askSoonError ? (
            <p style={{ color: '#fca5a5', fontSize: 12, margin: '10px 0 0' }}>{askSoonError}</p>
          ) : null}
          <button
            type="button"
            disabled={!askSoonPrompt.trim() || askSoonLoading}
            onClick={() => void runAskSoonEdit()}
            style={{
              background: !askSoonPrompt.trim() || askSoonLoading ? '#374151' : '#f9fafb',
              border: 'none',
              borderRadius: 10,
              color: !askSoonPrompt.trim() || askSoonLoading ? '#9ca3af' : '#111827',
              cursor: !askSoonPrompt.trim() || askSoonLoading ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 700,
              marginTop: 12,
              padding: '9px 12px',
              width: '100%',
            }}
          >
            {askSoonLoading ? 'AI 改圖中...' : 'AI 改圖 · 10 credits'}
          </button>
        </div>
      ) : null}

      <button
        className="ask-soon-button"
        type="button"
        onClick={() => {
          setAskSoonError('')
          setAskSoonOpen((open) => !open)
        }}
        style={{ border: 'none', cursor: 'pointer' }}
      >
        AI Ask SOON
      </button>
      <div className="zoom-control">1 / 1 重新排序頁面　⌕ 100%</div>
    </section>
  )
}
