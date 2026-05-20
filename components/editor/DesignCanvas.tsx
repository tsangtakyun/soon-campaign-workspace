'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

import { useFabricCanvas } from '@/hooks/useFabricCanvas'
import type { CanvasSize, DesignElement, DesignTool, ScheduledPost } from '@/components/editor/editorTypes'

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
  onFabricReady?: (controls: FabricControls) => void
  canvasRef: RefObject<HTMLElement | null>
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
  onDeselectElement,
  onFabricReady,
  onSelectElement,
  canvasRef,
}: DesignCanvasProps) {
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

      <div className="ask-soon-button">AI Ask SOON</div>
      <div className="zoom-control">1 / 1 重新排序頁面　⌕ 100%</div>
    </section>
  )
}
