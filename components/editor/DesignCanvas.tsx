'use client'

import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

import type { CanvasSize, DesignElement, DesignTool, ScheduledPost } from '@/components/editor/editorTypes'

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
  canvasRef: RefObject<HTMLElement | null>
}

export function DesignCanvas({
  canvasSize,
  selectedPost,
  designElements,
  selectedElementId,
  onSelectElement,
  onDeselectElement,
  onStartMove,
  onStartResize,
  onStartRotate,
  onDuplicate,
  onDelete,
  onEditElement,
  onSetActiveTool,
  onCloseDesignMode,
  canvasRef,
}: DesignCanvasProps) {
  const aspectRatio = canvasSize.w / canvasSize.h
  const displayWidth = aspectRatio >= 1.55 ? 620 : aspectRatio >= 1 ? 500 : aspectRatio <= 0.6 ? 360 : 430

  const confirmSelectionFromBlankArea = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('.canvas-element, .element-mini-toolbar, button, input, textarea, select, a')) return
    onDeselectElement()
  }

  return (
    <section className="design-canvas-area" onPointerDown={confirmSelectionFromBlankArea}>
      <article
        className="design-canvas"
        ref={canvasRef}
        style={{
          aspectRatio: `${canvasSize.w} / ${canvasSize.h}`,
          width: `min(${displayWidth}px, 62vh)`,
        }}
      >
        {designElements.map((element) => (
          <div
            className={`canvas-element ${element.kind} ${selectedElementId === element.id ? 'selected' : ''} ${element.kind}-${element.item}`}
            key={element.id}
            onClick={() => onSelectElement(element.id)}
            onDoubleClick={(event) => {
              event.stopPropagation()
              onSelectElement(element.id)
              onEditElement(element)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                onSelectElement(element.id)
              }
            }}
            onPointerDown={(event) => {
              if (event.detail >= 2) {
                event.preventDefault()
                event.stopPropagation()
                onSelectElement(element.id)
                onEditElement(element)
                return
              }
              onStartMove(event, element)
            }}
            role="button"
            style={{
              left: `${element.x}%`,
              top: `${element.y}%`,
              width:
                element.kind === 'image' && element.item === 'background'
                  ? '100%'
                  : element.kind === 'text' || element.kind === 'image'
                    ? `${element.width || 300}px`
                    : `${element.size}px`,
              height:
                element.kind === 'image' && element.item === 'background'
                  ? '100%'
                  : element.kind === 'text'
                    ? 'auto'
                    : element.kind === 'image'
                      ? `${element.height || element.size}px`
                      : `${element.size}px`,
              opacity: element.opacity / 100,
              transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
              zIndex: element.zIndex,
              color: element.color,
            }}
            tabIndex={0}
          >
            {element.kind === 'text' ? (
              <div
                className="canvas-text-layer"
                style={{
                  color: element.color,
                  fontFamily: element.fontFamily || 'inherit',
                  fontSize: element.fontSize || element.size || 24,
                  fontStyle: element.fontStyle || 'normal',
                  fontWeight: element.fontWeight || 'normal',
                  lineHeight: element.lineHeight || 1.35,
                  textAlign: element.textAlign || 'center',
                  textDecoration: element.textDecoration || 'none',
                  width: element.width || 300,
                }}
              >
                {element.textContent}
              </div>
            ) : element.kind === 'image' ? (
              <img className="canvas-image-layer" src={element.imageUrl || selectedPost.image} alt="" />
            ) : element.kind === 'icon' ? (
              <span>{element.item}</span>
            ) : (
              <span style={element.kind === 'shape' ? { background: element.color } : undefined} />
            )}
            {selectedElementId === element.id ? (
              <>
                <i className="handle nw" onPointerDown={(event) => onStartResize(event, element)} />
                <i className="handle ne" onPointerDown={(event) => onStartResize(event, element)} />
                <i className="handle sw" onPointerDown={(event) => onStartResize(event, element)} />
                <i className="handle se" onPointerDown={(event) => onStartResize(event, element)} />
                <i className="rotate-handle" onPointerDown={(event) => onStartRotate(event, element)}>↻</i>
                <div className="element-mini-toolbar" onPointerDown={(event) => event.stopPropagation()}>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onSetActiveTool(element.kind === 'image' ? '媒體' : element.kind === 'text' ? '文字' : '元素') }}>Edit</button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicate() }}>Copy</button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onDelete() }}>Delete</button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onDeselectElement() }}>完成</button>
                  <button type="button" onClick={(event) => event.stopPropagation()}>...</button>
                </div>
              </>
            ) : null}
          </div>
        ))}
      </article>

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
      <div className="zoom-control">1 / 1 重新排序頁面　⌕ 33%</div>
    </section>
  )
}
