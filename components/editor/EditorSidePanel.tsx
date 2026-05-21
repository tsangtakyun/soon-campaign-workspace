'use client'

import { useEffect, useState } from 'react'

import {
  BRAND_COLORS,
  FRAME_ITEMS,
  ICON_ITEMS,
  POST_PLATFORMS,
  SHAPE_ITEMS,
  STOCK_MEDIA,
  TEXT_STYLE_PRESETS,
} from '@/components/editor/editorData'
import { typefaces } from '@/lib/typefaces'
import type {
  CanvasSize,
  DesignElement,
  DesignElementKind,
  DesignTool,
  ElementSection,
  ScheduledPost,
  TemplatePresetId,
  TextPreset,
  TextStylePreset,
} from '@/components/editor/editorTypes'

type EditorSidePanelProps = {
  activeDesignTool: DesignTool
  brandLogoUrl: string
  brandName: string
  canvasSize: CanvasSize
  selectedElement: DesignElement | null
  selectedPost: ScheduledPost
  uploadedImages: { url: string; label: string }[]
  isDraggingOver: boolean
  expandedElementSection: ElementSection | null
  onSetExpandedSection: (section: ElementSection | null) => void
  onAddElement: (kind: Exclude<DesignElementKind, 'text' | 'image'>, item: string) => void
  onAddText: (preset: TextPreset) => void
  onAddTextStyle: (preset: TextStylePreset) => void
  onAddImage: (url: string, label: string) => void
  onImageUpload: (files: FileList | null) => void
  onTrackUploadedImage: (image: { url: string; label: string }) => void
  onApplyTemplate: (templateId: TemplatePresetId) => void
  onResizeCanvas: (size: CanvasSize) => void
  onSetDraggingOver: (value: boolean) => void
  onUpdateElement: (id: string, changes: Partial<DesignElement>) => void
  onMoveLayer: (direction: 'forward' | 'front' | 'backward' | 'back') => void
  onDelete: () => void
  onDeselectElement: () => void
  onSetActiveTool: (tool: DesignTool) => void
  onAddBrandText: (
    label: string,
    textContent: string,
    fontSize: number,
    fontWeight: DesignElement['fontWeight'],
    color: string
  ) => void
  onApplyBrandColor: (color: string) => void
  onOpenCaptionEditor: () => void
  onCloseDesignMode: () => void
  workspaceId: string | null
}

type BrandAsset = {
  asset_type: string
  filename: string
  id: string
  url: string
}

const TYPEFACE_DIRECTION_LABELS: Record<string, string> = {
  editorial: '質感字型',
  gothic: '黑體',
  handwriting: '手寫體',
  impact: '衝擊字型',
  poster: '海報字型',
  rounded: '圓體',
}

const uniqueTypefaces = typefaces.filter((typeface, index, list) => {
  return list.findIndex((candidate) => candidate.fontFamily === typeface.fontFamily) === index
})

function ElementShelf({
  expanded,
  items,
  kind,
  onPick,
  onToggle,
  title,
}: {
  expanded: boolean
  items: string[]
  kind: 'shape' | 'frame' | 'icon'
  onPick: (kind: Exclude<DesignElementKind, 'text' | 'image'>, item: string) => void
  onToggle: () => void
  title: string
}) {
  const visibleItems = expanded ? items : items.slice(0, 6)

  return (
    <section className={`element-shelf ${expanded ? 'expanded' : ''}`}>
      <div className="element-shelf-head">
        <h3>{title}</h3>
        <button type="button" onClick={onToggle}>
          {expanded ? '收起' : '查看全部'}
        </button>
      </div>

      <div className={`element-grid ${kind}`}>
        {visibleItems.map((item, index) => (
          <button
            className={`element-tile ${kind}-${item}`}
            key={`${kind}-${item}-${index}`}
            onClick={() => onPick(kind, item)}
            type="button"
          >
            {kind === 'icon' ? <span>{item}</span> : <span />}
          </button>
        ))}
      </div>
    </section>
  )
}

export function EditorSidePanel({
  activeDesignTool,
  brandLogoUrl,
  brandName,
  canvasSize,
  selectedElement,
  selectedPost,
  uploadedImages,
  isDraggingOver,
  expandedElementSection,
  onSetExpandedSection,
  onAddElement,
  onAddText,
  onAddTextStyle,
  onAddImage,
  onImageUpload,
  onTrackUploadedImage,
  onApplyTemplate,
  onResizeCanvas,
  onSetDraggingOver,
  onUpdateElement,
  onMoveLayer,
  onDelete,
  onDeselectElement,
  onSetActiveTool,
  onAddBrandText,
  onApplyBrandColor,
  onOpenCaptionEditor,
  onCloseDesignMode,
  workspaceId,
}: EditorSidePanelProps) {
  const [aiImagePrompt, setAiImagePrompt] = useState('')
  const [aiImageSize, setAiImageSize] = useState<'square' | 'landscape' | 'portrait'>('square')
  const [aiImageStyle, setAiImageStyle] = useState<'photo' | 'illustration'>('photo')
  const [aiImageLoading, setAiImageLoading] = useState(false)
  const [aiImageError, setAiImageError] = useState('')
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([])
  const [selectedTextFontFamily, setSelectedTextFontFamily] = useState(
    selectedElement?.kind === 'text' ? selectedElement.fontFamily || 'inherit' : 'inherit'
  )

  useEffect(() => {
    setSelectedTextFontFamily(
      selectedElement?.kind === 'text' ? selectedElement.fontFamily || 'inherit' : 'inherit'
    )
  }, [selectedElement?.id])

  useEffect(() => {
    if (!workspaceId) {
      setBrandAssets([])
      return
    }

    let cancelled = false
    fetch(`/api/brand-kit-data?workspace_id=${encodeURIComponent(workspaceId)}`, {
      cache: 'no-store',
    })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        const assets = Array.isArray(data?.assets) ? data.assets : []
        setBrandAssets(assets as BrandAsset[])
      })
      .catch(() => {
        if (!cancelled) setBrandAssets([])
      })

    return () => {
      cancelled = true
    }
  }, [workspaceId])

  const generateAiImage = async () => {
    if (!aiImagePrompt.trim()) return
    setAiImageLoading(true)
    setAiImageError('')

    try {
      const res = await fetch('/api/editor/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiImagePrompt,
          size: aiImageSize,
          style: aiImageStyle,
        }),
      })
      const data = (await res.json()) as { detail?: string; error?: string; imageUrl?: string }
      if (res.status === 402) {
        const creditData = data as { balance?: number; required?: number }
        setAiImageError(`Credits 不足（需要 ${creditData.required ?? 5} credits，現有 ${creditData.balance ?? 0}）`)
        return
      }
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.detail || data.error || 'Failed')
      }

      const label = `AI：${aiImagePrompt.trim().slice(0, 18)}`
      onTrackUploadedImage({ url: data.imageUrl, label })
      onAddImage(data.imageUrl, label)
      setAiImagePrompt('')
    } catch (err) {
      setAiImageError(err instanceof Error ? err.message : '生成失敗，請重試')
    } finally {
      setAiImageLoading(false)
    }
  }

  if (selectedElement) {
    return (
      <aside className="element-settings-panel">
        <div className="brand-panel-head">
          <button
            type="button"
            onClick={() => {
              onDeselectElement()
              onSetActiveTool(selectedElement.kind === 'text' ? '文字' : selectedElement.kind === 'image' ? '媒體' : '元素')
            }}
          >
            ←
          </button>
          <h2>{selectedElement.kind === 'text' ? '文字設定' : selectedElement.kind === 'image' ? '圖片設定' : selectedElement.kind === 'shape' ? '形狀設定' : selectedElement.label}</h2>
        </div>

        {selectedElement.kind === 'image' ? (
          <>
            <section className="settings-section">
              <label className="settings-label">圖片預覽</label>
              <img
                alt=""
                className="settings-image-preview"
                src={selectedElement.imageUrl || selectedPost.image}
              />
            </section>

            <section className="property-list">
              <label>
                <span>更換圖片</span>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (event) => {
                      const file = (event.target as HTMLInputElement).files?.[0]
                      if (!file) return
                      const url = URL.createObjectURL(file)
                      const label = file.name.replace(/\.[^.]+$/, '') || '圖片'
                      onUpdateElement(selectedElement.id, {
                        imageUrl: url,
                        label,
                      })
                      onTrackUploadedImage({ url, label })
                    }
                    input.click()
                  }}
                >
                  替換圖片
                </button>
              </label>
              <label>
                <span>透明度</span>
                <input
                  max="100"
                  min="20"
                  type="range"
                  value={selectedElement.opacity}
                  onChange={(event) => onUpdateElement(selectedElement.id, { opacity: Number(event.target.value) })}
                />
                <em>{selectedElement.opacity}%</em>
              </label>
            </section>

            <section className="alignment-panel">
              <h3>對齊畫布</h3>
              <div>
                <button type="button" onClick={() => onUpdateElement(selectedElement.id, { x: 50 })}>↔</button>
                <button type="button" onClick={() => onUpdateElement(selectedElement.id, { y: 50 })}>↕</button>
                <button type="button" onClick={() => onUpdateElement(selectedElement.id, { y: 18 })}>↑</button>
                <button type="button" onClick={() => onUpdateElement(selectedElement.id, { y: 82 })}>↓</button>
                <button type="button" onClick={() => onUpdateElement(selectedElement.id, { x: 18 })}>←</button>
                <button type="button" onClick={() => onUpdateElement(selectedElement.id, { x: 82 })}>→</button>
              </div>
            </section>

            <section className="transform-panel">
              <h3>旋轉</h3>
              <div>
                <input
                  max="180"
                  min="-180"
                  type="range"
                  value={selectedElement.rotation}
                  onChange={(event) => onUpdateElement(selectedElement.id, { rotation: Number(event.target.value) })}
                />
                <input
                  aria-label="旋轉角度"
                  type="number"
                  value={selectedElement.rotation}
                  onChange={(event) => onUpdateElement(selectedElement.id, { rotation: Number(event.target.value || 0) })}
                />
              </div>
              <h3>圖片闊度</h3>
              <div>
                <input
                  max="640"
                  min="150"
                  type="range"
                  value={selectedElement.width || selectedElement.size}
                  onChange={(event) => {
                    const nextWidth = Number(event.target.value)
                    const ratio = (selectedElement.height || 538) / (selectedElement.width || 430)
                    onUpdateElement(selectedElement.id, { width: nextWidth, height: Math.round(nextWidth * ratio), size: nextWidth })
                  }}
                />
                <input
                  aria-label="圖片闊度"
                  type="number"
                  value={selectedElement.width || selectedElement.size}
                  onChange={(event) => {
                    const nextWidth = Number(event.target.value || 150)
                    const ratio = (selectedElement.height || 538) / (selectedElement.width || 430)
                    onUpdateElement(selectedElement.id, { width: nextWidth, height: Math.round(nextWidth * ratio), size: nextWidth })
                  }}
                />
              </div>
              <h3>圖片高度</h3>
              <div>
                <input
                  max="760"
                  min="120"
                  type="range"
                  value={selectedElement.height || selectedElement.size}
                  onChange={(event) => onUpdateElement(selectedElement.id, { height: Number(event.target.value) })}
                />
                <input
                  aria-label="圖片高度"
                  type="number"
                  value={selectedElement.height || selectedElement.size}
                  onChange={(event) => onUpdateElement(selectedElement.id, { height: Number(event.target.value || 120) })}
                />
              </div>
            </section>

            <section className="order-panel">
              <h3>圖層順序</h3>
              <div>
                <button type="button" onClick={() => onMoveLayer('forward')}>向上一層</button>
                <button type="button" onClick={() => onMoveLayer('front')}>移到最上</button>
                <button type="button" onClick={() => onMoveLayer('backward')}>向下一層</button>
                <button type="button" onClick={() => onMoveLayer('back')}>移到最底</button>
              </div>
              <p>現時層級：{selectedElement.zIndex}</p>
            </section>

            <button className="finish-selection-button" type="button" onClick={onDeselectElement}>
              完成並確認位置
            </button>

            <button className="delete-element-button" type="button" onClick={onDelete}>
              刪除圖片
            </button>
          </>
        ) : selectedElement.kind === 'text' ? (
          <>
            <section className="settings-section">
              <label className="settings-label" htmlFor="selected-text-content">文字內容</label>
              <textarea
                className="settings-textarea"
                id="selected-text-content"
                onChange={(event) => onUpdateElement(selectedElement.id, { textContent: event.target.value })}
                onPointerDown={(event) => event.stopPropagation()}
                rows={4}
                value={selectedElement.textContent || ''}
              />
            </section>

            <section className="settings-section settings-row">
              <label className="settings-label" htmlFor="selected-text-font-family">字型</label>
              <select
                id="selected-text-font-family"
                onChange={(event) => {
                  const nextFontFamily = event.target.value
                  setSelectedTextFontFamily(nextFontFamily)
                  onUpdateElement(selectedElement.id, { fontFamily: nextFontFamily })
                }}
                style={{
                  background: '#111827',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 8,
                  color: '#f9fafb',
                  fontSize: 13,
                  minWidth: 0,
                  padding: '8px 10px',
                  width: '100%',
                }}
                value={selectedTextFontFamily}
              >
                <option value="inherit">預設字型</option>
                {Object.entries(TYPEFACE_DIRECTION_LABELS).map(([directionId, label]) => {
                  const directionTypefaces = uniqueTypefaces.filter((typeface) => typeface.directionId === directionId)
                  if (!directionTypefaces.length) return null

                  return (
                    <optgroup key={directionId} label={label}>
                      {directionTypefaces.map((typeface) => (
                        <option key={typeface.fontFamily} value={typeface.fontFamily}>
                          {typeface.nameEn} ({typeface.name})
                        </option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
            </section>

            <section className="settings-section settings-row">
              <label className="settings-label" htmlFor="selected-text-size">字體大小</label>
              <div className="settings-stepper">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      fontSize: Math.max(8, (selectedElement.fontSize || selectedElement.size || 24) - 2),
                      size: Math.max(8, (selectedElement.fontSize || selectedElement.size || 24) - 2),
                    })
                  }
                >
                  −
                </button>
                <input
                  id="selected-text-size"
                  max="200"
                  min="8"
                  onChange={(event) => {
                    const nextSize = Number(event.target.value || 8)
                    onUpdateElement(selectedElement.id, { fontSize: nextSize, size: nextSize })
                  }}
                  type="number"
                  value={selectedElement.fontSize || selectedElement.size || 24}
                />
                <button
                  type="button"
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      fontSize: Math.min(200, (selectedElement.fontSize || selectedElement.size || 24) + 2),
                      size: Math.min(200, (selectedElement.fontSize || selectedElement.size || 24) + 2),
                    })
                  }
                >
                  ＋
                </button>
              </div>
            </section>

            <section className="settings-section settings-row">
              <span className="settings-label">字體樣式</span>
              <div className="settings-toggle-group">
                <button
                  className={selectedElement.fontWeight === 'bold' ? 'active' : ''}
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold',
                    })
                  }
                  type="button"
                >
                  <b>B</b>
                </button>
                <button
                  className={selectedElement.fontStyle === 'italic' ? 'active' : ''}
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic',
                    })
                  }
                  type="button"
                >
                  <i>I</i>
                </button>
                <button
                  className={selectedElement.textDecoration === 'underline' ? 'active' : ''}
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline',
                    })
                  }
                  type="button"
                >
                  <u>U</u>
                </button>
              </div>
            </section>

            <section className="settings-section settings-row">
              <span className="settings-label">對齊</span>
              <div className="settings-toggle-group">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    className={selectedElement.textAlign === align ? 'active' : ''}
                    key={align}
                    onClick={() => onUpdateElement(selectedElement.id, { textAlign: align })}
                    type="button"
                  >
                    {align === 'left' ? '左' : align === 'center' ? '中' : '右'}
                  </button>
                ))}
              </div>
            </section>

            <section className="settings-section settings-row">
              <label className="settings-label" htmlFor="selected-text-color">顏色</label>
              <input
                id="selected-text-color"
                onChange={(event) => onUpdateElement(selectedElement.id, { color: event.target.value })}
                type="color"
                value={selectedElement.color}
              />
            </section>

            <section className="settings-section">
              <label className="settings-label" htmlFor="selected-text-opacity">
                透明度 {selectedElement.opacity}%
              </label>
              <input
                id="selected-text-opacity"
                max="100"
                min="10"
                onChange={(event) => onUpdateElement(selectedElement.id, { opacity: Number(event.target.value) })}
                type="range"
                value={selectedElement.opacity}
              />
            </section>

            <section className="settings-section">
              <label className="settings-label" htmlFor="selected-text-rotation">
                旋轉 {selectedElement.rotation}°
              </label>
              <input
                id="selected-text-rotation"
                max="180"
                min="-180"
                onChange={(event) => onUpdateElement(selectedElement.id, { rotation: Number(event.target.value) })}
                type="range"
                value={selectedElement.rotation}
              />
            </section>

            <section className="order-panel">
              <h3>圖層順序</h3>
              <div>
                <button type="button" onClick={() => onMoveLayer('forward')}>向上一層</button>
                <button type="button" onClick={() => onMoveLayer('front')}>移到最上</button>
                <button type="button" onClick={() => onMoveLayer('backward')}>向下一層</button>
                <button type="button" onClick={() => onMoveLayer('back')}>移到最底</button>
              </div>
              <p>現時層級：{selectedElement.zIndex}</p>
            </section>

            <button className="finish-selection-button" type="button" onClick={onDeselectElement}>
              完成並確認位置
            </button>

            <button className="delete-element-button" type="button" onClick={onDelete}>
              刪除文字
            </button>
          </>
        ) : (
          <>
            <section className="property-list">
              <label>
                <span><i style={{ background: selectedElement.color }} />顏色</span>
                <input
                  aria-label="元素顏色"
                  type="color"
                  value={selectedElement.color}
                  onChange={(event) => onUpdateElement(selectedElement.id, { color: event.target.value })}
                />
              </label>
              <label>
                <span>邊框</span>
                <button type="button">關</button>
              </label>
              <label>
                <span>圓角</span>
                <button type="button">關</button>
              </label>
              <label>
                <span>陰影</span>
                <button type="button">關</button>
              </label>
              <label>
                <span>透明度</span>
                <input
                  max="100"
                  min="20"
                  type="range"
                  value={selectedElement.opacity}
                  onChange={(event) => onUpdateElement(selectedElement.id, { opacity: Number(event.target.value) })}
                />
                <em>{selectedElement.opacity}%</em>
              </label>
            </section>

            <section className="alignment-panel">
              <h3>對齊畫布</h3>
              <div>
                <button type="button" onClick={() => onUpdateElement(selectedElement.id, { x: 50 })}>↔</button>
                <button type="button" onClick={() => onUpdateElement(selectedElement.id, { y: 50 })}>↕</button>
                <button type="button" onClick={() => onUpdateElement(selectedElement.id, { y: 18 })}>↑</button>
                <button type="button" onClick={() => onUpdateElement(selectedElement.id, { y: 82 })}>↓</button>
                <button type="button" onClick={() => onUpdateElement(selectedElement.id, { x: 18 })}>←</button>
                <button type="button" onClick={() => onUpdateElement(selectedElement.id, { x: 82 })}>→</button>
              </div>
            </section>

            <section className="transform-panel">
              <h3>旋轉</h3>
              <div>
                <input
                  max="180"
                  min="-180"
                  type="range"
                  value={selectedElement.rotation}
                  onChange={(event) => onUpdateElement(selectedElement.id, { rotation: Number(event.target.value) })}
                />
                <input
                  aria-label="旋轉角度"
                  type="number"
                  value={selectedElement.rotation}
                  onChange={(event) => onUpdateElement(selectedElement.id, { rotation: Number(event.target.value || 0) })}
                />
              </div>
              <h3>大小</h3>
              <div>
                <input
                  max="240"
                  min="32"
                  type="range"
                  value={selectedElement.size}
                  onChange={(event) => onUpdateElement(selectedElement.id, { size: Number(event.target.value) })}
                />
                <input
                  aria-label="元素大小"
                  type="number"
                  value={selectedElement.size}
                  onChange={(event) => onUpdateElement(selectedElement.id, { size: Number(event.target.value || 32) })}
                />
              </div>
            </section>

            <section className="order-panel">
              <h3>圖層順序</h3>
              <div>
                <button type="button" onClick={() => onMoveLayer('forward')}>向上一層</button>
                <button type="button" onClick={() => onMoveLayer('front')}>移到最上</button>
                <button type="button" onClick={() => onMoveLayer('backward')}>向下一層</button>
                <button type="button" onClick={() => onMoveLayer('back')}>移到最底</button>
              </div>
              <p>現時層級：{selectedElement.zIndex}</p>
            </section>

            <button className="finish-selection-button" type="button" onClick={onDeselectElement}>
              完成並確認位置
            </button>

            <button className="delete-element-button" type="button" onClick={onDelete}>
              刪除 {selectedElement.label}
            </button>
          </>
        )}
      </aside>
    )
  }

  if (activeDesignTool === '元素') {
    return (
      <aside className="elements-panel">
        <div className="brand-panel-head">
          <button type="button" onClick={() => onSetActiveTool('品牌')}>←</button>
          <h2>加入元素</h2>
        </div>
        <input aria-label="搜尋元素" placeholder="搜尋所有元素..." />

        <ElementShelf
          expanded={expandedElementSection === 'shapes'}
          items={SHAPE_ITEMS}
          kind="shape"
          onPick={onAddElement}
          onToggle={() => onSetExpandedSection(expandedElementSection === 'shapes' ? null : 'shapes')}
          title="形狀"
        />

        <ElementShelf
          expanded={expandedElementSection === 'frames'}
          items={FRAME_ITEMS}
          kind="frame"
          onPick={onAddElement}
          onToggle={() => onSetExpandedSection(expandedElementSection === 'frames' ? null : 'frames')}
          title="相框"
        />

        <ElementShelf
          expanded={expandedElementSection === 'icons'}
          items={ICON_ITEMS}
          kind="icon"
          onPick={onAddElement}
          onToggle={() => onSetExpandedSection(expandedElementSection === 'icons' ? null : 'icons')}
          title="圖示"
        />
      </aside>
    )
  }

  if (activeDesignTool === '文字') {
    return (
      <aside className="text-panel">
        <div className="brand-panel-head">
          <button type="button" onClick={() => onSetActiveTool('品牌')}>←</button>
          <h2>加入文字</h2>
        </div>

        <section className="text-panel-section">
          <h3>文字</h3>
          <div className="text-preset-list">
            <button className="text-preset-btn" onClick={() => onAddText('heading')} type="button">
              <span className="text-preset-preview heading">標題</span>
              <span className="text-preset-label">大標題</span>
            </button>
            <button className="text-preset-btn" onClick={() => onAddText('subheading')} type="button">
              <span className="text-preset-preview subheading">副標題</span>
              <span className="text-preset-label">副標題</span>
            </button>
            <button className="text-preset-btn" onClick={() => onAddText('body')} type="button">
              <span className="text-preset-preview body">內文文字</span>
              <span className="text-preset-label">內文</span>
            </button>
            <button className="text-preset-btn" onClick={() => onAddText('caption')} type="button">
              <span className="text-preset-preview caption">說明文字</span>
              <span className="text-preset-label">說明</span>
            </button>
          </div>
        </section>

        <section className="text-panel-section">
          <h3>文字樣式</h3>
          <div className="text-style-grid">
            {TEXT_STYLE_PRESETS.map((preset) => (
              <button
                className="text-style-card"
                key={preset.label}
                onClick={() => onAddTextStyle(preset)}
                type="button"
              >
                <span style={preset.style}>{preset.label}</span>
              </button>
            ))}
          </div>
        </section>
      </aside>
    )
  }

  if (activeDesignTool === '媒體') {
    return (
      <aside className="media-panel">
        <div className="brand-panel-head">
          <button type="button" onClick={() => onSetActiveTool('品牌')}>←</button>
          <h2>媒體</h2>
        </div>

        <div
          className={`media-upload-zone ${isDraggingOver ? 'dragging' : ''}`}
          onClick={() => document.getElementById('media-file-input')?.click()}
          onDragLeave={() => onSetDraggingOver(false)}
          onDragOver={(event) => {
            event.preventDefault()
            onSetDraggingOver(true)
          }}
          onDrop={(event) => {
            event.preventDefault()
            onSetDraggingOver(false)
            onImageUpload(event.dataTransfer.files)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              document.getElementById('media-file-input')?.click()
            }
          }}
          role="button"
          tabIndex={0}
        >
          <span className="media-upload-icon">↑</span>
          <span className="media-upload-label">拖放或點擊上載圖片</span>
          <span className="media-upload-hint">JPG、PNG、WEBP、GIF</span>
        </div>

        <input
          accept="image/*"
          id="media-file-input"
          multiple
          onChange={(event) => onImageUpload(event.target.files)}
          style={{ display: 'none' }}
          type="file"
        />

        <section className="media-panel-section">
          <h3>AI 生成圖片</h3>
          <div className="media-ai-card">
            <textarea
              className="media-ai-input"
              onChange={(event) => setAiImagePrompt(event.target.value)}
              placeholder="描述你想生成嘅圖片，例如：日光咖啡店入面兩個朋友開心分享短片"
              value={aiImagePrompt}
            />

            <div className="media-control-row">
              <span className="media-control-label">尺寸</span>
              <div className="media-segment-row">
                {[
                  { label: '方形', value: 'square' },
                  { label: '橫向', value: 'landscape' },
                  { label: '直向', value: 'portrait' },
                ].map((option) => (
                  <button
                    className={`media-segment-button ${aiImageSize === option.value ? 'active' : ''}`}
                    key={option.value}
                    onClick={() => setAiImageSize(option.value as typeof aiImageSize)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="media-control-row">
              <span className="media-control-label">風格</span>
              <div className="media-segment-row">
                {[
                  { label: '照片', value: 'photo' },
                  { label: '插畫', value: 'illustration' },
                ].map((option) => (
                  <button
                    className={`media-segment-button ${aiImageStyle === option.value ? 'active' : ''}`}
                    key={option.value}
                    onClick={() => setAiImageStyle(option.value as typeof aiImageStyle)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="media-generate-button"
              disabled={!aiImagePrompt.trim() || aiImageLoading}
              onClick={() => void generateAiImage()}
              type="button"
            >
              {aiImageLoading ? '⏳ 生成中，約需 15 秒...' : '生成並插入 · 5 credits'}
            </button>
            {aiImageError ? (
              <p style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>
                ❌ {aiImageError}
              </p>
            ) : null}
          </div>
        </section>

        <section className="media-panel-section">
          <h3>品牌素材庫</h3>
          <div className="media-brand-kit-card">
            {brandLogoUrl ? (
              <button
                className="media-brand-logo-button"
                onClick={() => onAddImage(brandLogoUrl, `${brandName || '品牌'} Logo`)}
                type="button"
              >
                <img alt={`${brandName || '品牌'} logo`} className="brand-logo-image" src={brandLogoUrl} />
              </button>
            ) : (
              <div className="brand-logo-empty">未偵測到 logo</div>
            )}

            <div className="media-brand-kit-row" aria-label="品牌顏色">
              {BRAND_COLORS.map((color) => (
                <button
                  className="brand-color-swatch"
                  key={`media-brand-${color}`}
                  onClick={() => onApplyBrandColor(color)}
                  style={{ background: color }}
                  title={color}
                  type="button"
                />
              ))}
            </div>

            {brandAssets.length > 0 ? (
              <div className="media-grid compact">
                {brandAssets.map((asset) => (
                  <button
                    className="media-thumb-btn"
                    key={asset.id}
                    onClick={() => {
                      onTrackUploadedImage({ url: asset.url, label: asset.filename })
                      onAddImage(asset.url, asset.filename)
                    }}
                    title={asset.filename}
                    type="button"
                  >
                    <img alt={asset.filename} className="media-thumb" src={asset.url} />
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ color: '#9ca3af', fontSize: 12 }}>暫無素材</p>
            )}
          </div>
        </section>

        {uploadedImages.length > 0 ? (
          <section className="media-panel-section">
            <h3>已上載</h3>
            <div className="media-grid">
              {uploadedImages.map((image, index) => (
                <button
                  className="media-thumb-btn"
                  key={`${image.url}-${index}`}
                  onClick={() => onAddImage(image.url, image.label)}
                  title={image.label}
                  type="button"
                >
                  <img alt={image.label} className="media-thumb" src={image.url} />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="media-panel-section">
          <h3>示例圖片</h3>
          <div className="media-grid">
            {STOCK_MEDIA.map((stock) => (
              <button
                className="media-thumb-btn"
                key={stock.url}
                onClick={() => onAddImage(stock.url, stock.label)}
                title={stock.label}
                type="button"
              >
                <img alt={stock.label} className="media-thumb" loading="lazy" src={stock.url} />
              </button>
            ))}
          </div>
        </section>
      </aside>
    )
  }

  if (activeDesignTool === '模板') {
    const placeholderTemplates = [
      { label: '簡約白底', bg: '#ffffff', color: '#000000', templateId: 'clean-brand' as TemplatePresetId },
      { label: '深色時尚', bg: '#1a1a1a', color: '#ffffff', templateId: 'bold-focus' as TemplatePresetId },
      { label: '暖橙活力', bg: '#ff6b35', color: '#ffffff', templateId: 'warm-story' as TemplatePresetId },
      { label: '粉藍清新', bg: '#a8d8ea', color: '#333333', templateId: 'clean-brand' as TemplatePresetId },
      { label: '墨綠高級', bg: '#2d5016', color: '#ffffff', templateId: 'bold-focus' as TemplatePresetId },
      { label: '玫瑰金', bg: '#b76e79', color: '#ffffff', templateId: 'warm-story' as TemplatePresetId },
      { label: '天空藍', bg: '#87ceeb', color: '#333333', templateId: 'clean-brand' as TemplatePresetId },
      { label: '奶油黃', bg: '#fff9c4', color: '#333333', templateId: 'warm-story' as TemplatePresetId },
    ]

    return (
      <aside className="templates-panel">
        <div className="brand-panel-head">
          <button type="button" onClick={() => onSetActiveTool('品牌')}>←</button>
          <h2>模板</h2>
        </div>

        <div className="panel-search-row">
          <input className="panel-search-input" placeholder="搜尋模板..." type="search" />
        </div>

        <div className="templates-filter-row">
          <select className="templates-filter-select" defaultValue="">
            <option value="">類型</option>
            <option value="post">貼文</option>
            <option value="story">Story</option>
            <option value="reel">Reel</option>
            <option value="banner">橫幅</option>
          </select>
          <select className="templates-filter-select" defaultValue="">
            <option value="">分類</option>
            <option value="business">商業</option>
            <option value="fashion">時裝</option>
            <option value="food">飲食</option>
            <option value="travel">旅遊</option>
            <option value="lifestyle">生活</option>
          </select>
          <select className="templates-filter-select" defaultValue="">
            <option value="">風格</option>
            <option value="minimal">簡約</option>
            <option value="bold">大膽</option>
            <option value="elegant">優雅</option>
          </select>
        </div>

        <div className="templates-grid">
          {placeholderTemplates.map((template) => (
            <button
              className="template-thumb-btn"
              key={template.label}
              onClick={() => onApplyTemplate(template.templateId)}
              title={template.label}
              type="button"
            >
              <div
                className="template-thumb-preview"
                style={{ background: template.bg, color: template.color }}
              >
                <span className="template-thumb-label">{template.label}</span>
              </div>
              <span className="template-thumb-name">{template.label}</span>
            </button>
          ))}
        </div>

        <p className="panel-coming-soon">更多模板即將推出</p>
      </aside>
    )
  }

  if (activeDesignTool === '背景') {
    const backgroundColors = [
      '#FFFFFF',
      '#000000',
      '#F5F5F5',
      '#E8E8E8',
      '#FFA500',
      '#FF0000',
      '#FF69B4',
      '#9C27B0',
      '#2196F3',
      '#1565C0',
      '#4CAF50',
      '#8B4513',
    ]
    const gradients = [
      'linear-gradient(135deg, #000000, #ffffff)',
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #f6d365, #fda085)',
      'linear-gradient(135deg, #ffecd2, #fcb69f)',
      'linear-gradient(135deg, #d4fc79, #96e6a1)',
      'linear-gradient(135deg, #fbc2eb, #a6c1ee)',
      'linear-gradient(135deg, #0c3483, #a2b6df)',
      'linear-gradient(135deg, #434343, #000000)',
    ]

    return (
      <aside className="backgrounds-panel">
        <div className="brand-panel-head">
          <button type="button" onClick={() => onSetActiveTool('品牌')}>←</button>
          <h2>背景</h2>
        </div>

        <input className="panel-search-input" placeholder="搜尋背景..." type="search" />

        <h3 className="panel-section-title">顏色</h3>
        <div className="bg-color-grid">
          {backgroundColors.map((hex) => (
            <button
              className="bg-swatch"
              key={hex}
              style={{ background: hex, border: hex === '#FFFFFF' ? '1px solid #e0e0e0' : 'none' }}
              title={hex}
              type="button"
            />
          ))}
          <label className="bg-swatch custom-color-swatch" title="自定義">
            <span>＋</span>
            <input aria-label="自定義背景色" type="color" />
          </label>
        </div>

        <h3 className="panel-section-title">漸層</h3>
        <div className="bg-gradient-grid">
          {gradients.map((gradient) => (
            <button
              className="bg-gradient-swatch"
              key={gradient}
              style={{ background: gradient }}
              type="button"
            />
          ))}
        </div>

        <h3 className="panel-section-title">材質</h3>
        <div className="bg-texture-grid">
          {['Wood', 'Marble', 'Concrete', 'Flatlays'].map((name) => (
            <button className="bg-texture-btn" key={name} type="button">
              <div className="bg-texture-preview" />
              <span>{name}</span>
            </button>
          ))}
        </div>

        <h3 className="panel-section-title">場景</h3>
        <div className="bg-scene-grid">
          {['Podiums', 'Nature', 'Cosmetics', 'Studio', 'Drinks', 'Food'].map((name) => (
            <button className="bg-texture-btn" key={name} type="button">
              <div className="bg-texture-preview" />
              <span>{name}</span>
            </button>
          ))}
        </div>

        <p className="panel-coming-soon">材質及場景圖片即將推出</p>
      </aside>
    )
  }

  if (activeDesignTool === '尺寸') {
    const resizeGroups = [
      {
        category: 'Instagram',
        sizes: [
          { name: 'Instagram 方形貼文', w: 1080, h: 1080 },
          { name: 'Instagram Story', w: 1080, h: 1920 },
          { name: 'Instagram Reel', w: 1080, h: 1920 },
          { name: 'Instagram 直向貼文', w: 1080, h: 1350 },
          { name: 'Instagram 橫向貼文', w: 1200, h: 630 },
        ],
      },
      {
        category: 'TikTok',
        sizes: [
          { name: 'TikTok 貼文', w: 1080, h: 1920 },
          { name: 'TikTok 縮圖', w: 1080, h: 1920 },
        ],
      },
      {
        category: 'YouTube',
        sizes: [
          { name: 'YouTube Short', w: 1080, h: 1920 },
          { name: 'YouTube 頻道橫幅', w: 2560, h: 1440 },
          { name: 'YouTube 縮圖', w: 1280, h: 720 },
        ],
      },
      {
        category: 'Facebook',
        sizes: [
          { name: 'Facebook Story', w: 1080, h: 1920 },
          { name: 'Facebook 封面', w: 820, h: 312 },
          { name: 'Facebook 貼文', w: 1200, h: 630 },
        ],
      },
      {
        category: 'X / Twitter',
        sizes: [
          { name: 'X 封面圖', w: 1500, h: 500 },
          { name: 'X 貼文圖片', w: 1200, h: 675 },
        ],
      },
      {
        category: 'LinkedIn',
        sizes: [
          { name: 'LinkedIn 封面', w: 1584, h: 396 },
          { name: 'LinkedIn 貼文', w: 1200, h: 627 },
        ],
      },
    ]

    return (
      <aside className="resize-panel">
        <div className="brand-panel-head">
          <button type="button" onClick={() => onSetActiveTool('品牌')}>←</button>
          <h2>尺寸</h2>
        </div>

        <div className="resize-current">
          <span className="resize-current-label">目前</span>
          <span className="resize-current-value">{canvasSize.label}</span>
          <span className="resize-current-dims">{canvasSize.w} × {canvasSize.h}</span>
        </div>

        <form
          className="resize-custom"
          onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            const width = Number(formData.get('width'))
            const height = Number(formData.get('height'))
            if (!Number.isFinite(width) || !Number.isFinite(height) || width < 100 || height < 100) return
            onResizeCanvas({ label: '自定義尺寸', w: width, h: height })
          }}
        >
          <label className="settings-label">自定義（像素）</label>
          <div className="resize-custom-inputs">
            <input defaultValue={canvasSize.w} max={5000} min={100} name="width" placeholder="寬" type="number" />
            <span>×</span>
            <input defaultValue={canvasSize.h} max={5000} min={100} name="height" placeholder="高" type="number" />
            <button className="resize-apply-btn" type="submit">套用</button>
          </div>
        </form>

        {resizeGroups.map((group) => (
          <div className="resize-group" key={group.category}>
            <h3 className="panel-section-title">{group.category}</h3>
            {group.sizes.map((size) => (
              <button
                className={`resize-size-row ${canvasSize.w === size.w && canvasSize.h === size.h ? 'active' : ''}`}
                key={size.name}
                onClick={() => onResizeCanvas({ label: size.name, w: size.w, h: size.h })}
                type="button"
              >
                <span className="resize-size-name">{size.name}</span>
                <span className="resize-size-dims">{size.w} × {size.h}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>
    )
  }

  if (activeDesignTool === '發布') {
    const defaultPublishTime = new Date(Date.now() + 3600000).toISOString().slice(0, 16)

    return (
      <aside className="post-panel">
        <div className="brand-panel-head">
          <button type="button" onClick={() => onSetActiveTool('品牌')}>←</button>
          <h2>發布設定</h2>
        </div>

        <div className="post-section">
          <label className="settings-label">發布時間</label>
          <div className="post-datetime-row">
            <input className="post-datetime-input" defaultValue={defaultPublishTime} type="datetime-local" />
          </div>
          <div className="post-action-row">
            <button className="post-btn-secondary" type="button">預覽</button>
            <button className="post-btn-secondary" type="button">日曆</button>
          </div>
        </div>

        <div className="post-section">
          <label className="settings-label">Crosspost</label>
          <div className="post-platforms">
            {POST_PLATFORMS.map((platform) => (
              <div className="post-platform-row" key={platform.id}>
                <span className="post-platform-icon">{platform.icon}</span>
                <span className="post-platform-name">{platform.label}</span>
                <button className="post-connect-btn" type="button">連接</button>
              </div>
            ))}
          </div>
        </div>

        <div className="post-section">
          <button className="post-btn-primary" type="button">立即發布</button>
          <button className="post-btn-secondary" onClick={onOpenCaptionEditor} type="button">調整 Caption</button>
          <button className="post-btn-secondary" onClick={onCloseDesignMode} type="button">返回排程</button>
        </div>

        <p className="panel-coming-soon">發布功能即將正式開放</p>
      </aside>
    )
  }

  if (activeDesignTool === '品牌') {
    return (
      <aside className="brand-panel">
        <div className="brand-panel-head">
          <button type="button" onClick={onCloseDesignMode}>←</button>
          <h2>品牌樣式</h2>
        </div>

        <section>
          <h3>Logo</h3>
          <div className="brand-logo-row">
            {brandLogoUrl ? (
              <button
                className="brand-logo-placeholder"
                onClick={() => onAddImage(brandLogoUrl, `${brandName || '品牌'} Logo`)}
                type="button"
              >
                <img alt={`${brandName || '品牌'} logo`} className="brand-logo-image" src={brandLogoUrl} />
              </button>
            ) : (
              <div className="brand-logo-empty">未偵測到 logo</div>
            )}
          </div>
        </section>

        <section>
          <h3>品牌顏色</h3>
          <div className="brand-colors-row">
            {BRAND_COLORS.map((color) => (
              <button
                aria-label={`套用品牌顏色 ${color}`}
                className="brand-color-swatch"
                key={color}
                onClick={() => onApplyBrandColor(color)}
                style={{ background: color }}
                title={color}
                type="button"
              />
            ))}
          </div>
        </section>

        <section>
          <h3>品牌字體</h3>
          <div className="brand-fonts-list">
            <button
              className="brand-font-btn"
              onClick={() => onAddBrandText('品牌標題', 'SOON LOG', 48, 'bold', '#1A1A1A')}
              type="button"
            >
              <span style={{ fontSize: 20, fontWeight: 'bold' }}>Title</span>
              <span className="brand-font-label">大標題樣式</span>
            </button>
            <button
              className="brand-font-btn"
              onClick={() => onAddBrandText('品牌內文', '品牌內文文字', 20, 'normal', '#444444')}
              type="button"
            >
              <span style={{ fontSize: 15 }}>Body</span>
              <span className="brand-font-label">內文樣式</span>
            </button>
          </div>
        </section>

        <section>
          <h3>媒體</h3>
          <button type="button" onClick={() => onSetActiveTool('媒體')}>查看全部</button>
        </section>

        <p className="panel-coming-soon">品牌素材庫將於下一版本開放上載</p>
      </aside>
    )
  }

  return (
    <aside className="placeholder-panel">
      <p className="panel-coming-soon">即將推出</p>
    </aside>
  )
}
