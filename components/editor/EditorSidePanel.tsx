'use client'

import { useEffect, useState } from 'react'

import { SHAPE_ITEMS } from '@/components/editor/editorData'
import type {
  CanvasSize,
  DesignElement,
  DesignElementKind,
  DesignTool,
  ElementSection,
  ScheduledPost,
  TextPreset,
} from '@/components/editor/editorTypes'

type EditorSidePanelProps = {
  activeDesignTool: DesignTool
  brandLogoUrl: string
  brandName: string
  brandColors: string[]
  brandFontFamily: string
  brandKitLoading: boolean
  canvasSize: CanvasSize
  selectedElement: DesignElement | null
  selectedPost: ScheduledPost
  uploadedImages: { url: string; label: string }[]
  isDraggingOver: boolean
  expandedElementSection: ElementSection | null
  onSetExpandedSection: (section: ElementSection | null) => void
  onAddElement: (kind: Exclude<DesignElementKind, 'text' | 'image'>, item: string) => void
  onAddText: (preset: TextPreset) => void
  onAddImage: (url: string, label: string) => void
  onImageUpload: (files: FileList | null) => void
  onTrackUploadedImage: (image: { url: string; label: string }) => void
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
  isSavingDesign: boolean
  onSaveDesign: () => void
  saveDesignMessage: string
  onCloseDesignMode: () => void
}

const COMMON_COLORS = [
  '#000000', '#FFFFFF', '#F5F5F5', '#6B7280', '#EF4444', '#F97316',
  '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#D946EF', '#EC4899', '#F43F5E', '#7C2D12', '#78350F', '#1F2937',
]

const EDITOR_FONT_OPTIONS = [
  { label: 'GenSenRounded2／系統圓體', value: 'GenSenRounded2' },
  { label: '獅尾圓體', value: 'SweiGothicCJKtc-Regular' },
  { label: 'Nani 字體', value: 'NaniFont-Regular' },
  { label: '清松手寫體', value: 'JasonHandwriting1-Regular' },
  { label: '奈海字體', value: 'NaikaiFont-Regular' },
  { label: '獅尾黑體', value: 'SweiFanSansCJKtc-Regular' },
  { label: '獅尾明體', value: 'SweiJaySerifCJKtc-Regular' },
  { label: '系統黑體', value: 'Arial, sans-serif' },
]

function normalizeHexInput(value: string) {
  const raw = value.trim().replace(/^#/, '')
  const expanded = /^[0-9a-f]{3}$/i.test(raw)
    ? raw.split('').map((character) => character + character).join('')
    : raw
  return /^[0-9a-f]{6}$/i.test(expanded) ? `#${expanded.toUpperCase()}` : null
}

function BrandLogo({
  brandKitLoading,
  brandLogoUrl,
  brandName,
  className,
  onAddImage,
}: Pick<EditorSidePanelProps, 'brandKitLoading' | 'brandLogoUrl' | 'brandName' | 'onAddImage'> & {
  className: string
}) {
  if (brandKitLoading) {
    return <div aria-label="正在載入品牌 Logo" className="brand-logo-skeleton" role="status" />
  }
  if (!brandLogoUrl) {
    return <div className="brand-logo-empty">品牌素材庫尚未上載 Logo</div>
  }
  return (
    <button
      className={className}
      onClick={() => onAddImage(brandLogoUrl, `${brandName || '品牌'} Logo`)}
      title="加入目前 Workspace Logo"
      type="button"
    >
      <img alt={`${brandName || '品牌'} logo`} className="brand-logo-image" src={brandLogoUrl} />
    </button>
  )
}

function ColorPalette({
  brandColors,
  brandKitLoading,
  currentColor,
  onPick,
}: Pick<EditorSidePanelProps, 'brandColors' | 'brandKitLoading'> & {
  currentColor?: string
  onPick: (color: string) => void
}) {
  const pickScreenColor = async () => {
    const EyeDropperConstructor = (
      window as typeof window & {
        EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
      }
    ).EyeDropper

    if (EyeDropperConstructor) {
      try {
        const result = await new EyeDropperConstructor().open()
        const normalized = normalizeHexInput(result.sRGBHex)
        if (normalized) onPick(normalized)
      } catch {
        // The user cancelled screen color picking.
      }
      return
    }

    const fallbackPicker = document.createElement('input')
    fallbackPicker.type = 'color'
    fallbackPicker.value = normalizeHexInput(currentColor || '') || '#000000'
    fallbackPicker.addEventListener('input', () => onPick(fallbackPicker.value), { once: true })
    fallbackPicker.click()
  }

  return (
    <div className="color-palette-groups">
      <div className="color-palette-group">
        <h4>品牌色</h4>
        {brandKitLoading ? (
          <div className="brand-colors-loading" role="status"><span /><span /><span /><span /></div>
        ) : brandColors.length ? (
          <div className="color-palette-swatches">
            {brandColors.map((color) => <ColorSwatch color={color} currentColor={currentColor} key={`brand-${color}`} onPick={onPick} />)}
          </div>
        ) : (
          <p className="brand-colors-empty">目前 Workspace 尚未設定品牌色</p>
        )}
      </div>
      <div className="color-palette-group">
        <div className="color-palette-heading">
          <h4>其他顏色</h4>
          <button className="eyedropper-button" onClick={() => void pickScreenColor()} type="button">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m19.35 4.65-1-1a2.1 2.1 0 0 0-3 0l-2.1 2.1-1.1-1.1-1.4 1.4 1.1 1.1-7.2 7.2a2 2 0 0 0-.55 1.05L3.5 20.5l5.1-.6a2 2 0 0 0 1.05-.55l7.2-7.2 1.1 1.1 1.4-1.4-1.1-1.1 2.1-2.1a2.1 2.1 0 0 0 0-3ZM8.25 17.9l-2.45.3.3-2.45 7.15-7.15 2.15 2.15-7.15 7.15Z" />
            </svg>
            點色
          </button>
        </div>
        <div className="color-palette-swatches">
          {COMMON_COLORS.map((color) => <ColorSwatch color={color} currentColor={currentColor} key={`common-${color}`} onPick={onPick} />)}
        </div>
      </div>
    </div>
  )
}

function ColorSwatch({ color, currentColor, onPick }: { color: string; currentColor?: string; onPick: (color: string) => void }) {
  return (
    <button
      aria-label={`套用顏色 ${color}`}
      className={`brand-color-swatch ${currentColor?.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
      onClick={() => onPick(color)}
      style={{ background: color }}
      title={color}
      type="button"
    />
  )
}

async function imageUrlForApi(source: string) {
  if (!source.startsWith('blob:')) return source

  const blob = await fetch(source).then((response) => response.blob())
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('無法讀取所選圖片'))
    reader.readAsDataURL(blob)
  })
}

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
  brandColors,
  brandFontFamily,
  brandKitLoading,
  canvasSize,
  selectedElement,
  selectedPost,
  uploadedImages,
  isDraggingOver,
  expandedElementSection,
  onSetExpandedSection,
  onAddElement,
  onAddText,
  onAddImage,
  onImageUpload,
  onTrackUploadedImage,
  onResizeCanvas,
  onSetDraggingOver,
  onUpdateElement,
  onMoveLayer,
  onDelete,
  onDeselectElement,
  onSetActiveTool,
  onAddBrandText,
  onApplyBrandColor,
  isSavingDesign,
  onSaveDesign,
  saveDesignMessage,
  onCloseDesignMode,
}: EditorSidePanelProps) {
  const [imageEditPrompt, setImageEditPrompt] = useState('')
  const [imageEditSize, setImageEditSize] = useState<'original' | 'landscape' | 'portrait'>('original')
  const [isEditingImage, setIsEditingImage] = useState(false)
  const [imageEditMessage, setImageEditMessage] = useState('')
  const [imageReferenceAssets, setImageReferenceAssets] = useState<Array<{ id: string; name: string; url: string }>>([])
  const [isDraggingImageReference, setIsDraggingImageReference] = useState(false)
  const [shapeHexInput, setShapeHexInput] = useState('')

  useEffect(() => {
    if (selectedElement?.kind === 'shape') setShapeHexInput(selectedElement.color.toUpperCase())
  }, [selectedElement?.color, selectedElement?.kind, selectedElement?.id])

  useEffect(() => {
    setImageReferenceAssets([])
    setImageEditMessage('')
  }, [selectedElement?.id])

  const addImageReferenceFiles = async (files: FileList | File[]) => {
    const remaining = Math.max(0, 4 - imageReferenceAssets.length)
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/')).slice(0, remaining)
    const nextAssets = await Promise.all(imageFiles.map((file) => new Promise<{ id: string; name: string; url: string }>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error(`未能讀取 ${file.name}`))
      reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, url: String(reader.result || '') })
      reader.readAsDataURL(file)
    })))
    setImageReferenceAssets((current) => [...current, ...nextAssets].slice(0, 4))
  }

  const generateImageEdit = async (element: DesignElement) => {
    if (!imageEditPrompt.trim() || isEditingImage) return

    setIsEditingImage(true)
    setImageEditMessage('')
    try {
      const source = await imageUrlForApi(element.imageUrl || selectedPost.image)
      const inferredSize = (element.width || element.size) > (element.height || element.size)
        ? 'landscape'
        : (element.width || element.size) < (element.height || element.size)
          ? 'portrait'
          : 'square'
      const requestedSize = imageEditSize === 'original' ? inferredSize : imageEditSize
      const response = await fetch('/api/photo-control/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          mode: 'balanced',
          originalImageUrl: source,
          referenceImageUrls: imageReferenceAssets.map((asset) => asset.url),
          requestedSize,
          prompt: [
            'Edit the supplied image according to the user instruction.',
            'Preserve the original subject, identity, important objects and realistic photographic look unless explicitly asked otherwise.',
            'Do not add text, logos, borders or interface elements.',
            imageReferenceAssets.length
              ? `Use input images 2 to ${imageReferenceAssets.length + 1} as visual references. Match only the subjects, products, composition or style explicitly requested by the user.`
              : '',
            `User instruction: ${imageEditPrompt.trim()}`,
          ].filter(Boolean).join(' '),
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.imageDataUrl) {
        throw new Error(result?.error === 'INSUFFICIENT_CREDITS' ? 'credits 不足，未能生成' : result?.error || 'AI 修改失敗')
      }

      const currentWidth = element.width || element.size || 430
      const nextHeight = requestedSize === 'landscape'
        ? Math.round(currentWidth * 2 / 3)
        : requestedSize === 'portrait'
          ? Math.round(currentWidth * 3 / 2)
          : currentWidth
      const label = `AI 修改：${imageEditPrompt.trim().slice(0, 18)}`
      onUpdateElement(element.id, { imageUrl: result.imageDataUrl, label, width: currentWidth, height: nextHeight })
      onTrackUploadedImage({ url: result.imageDataUrl, label })
      setImageEditMessage('已根據原圖完成修改並套用')
    } catch (error) {
      setImageEditMessage(error instanceof Error ? error.message : 'AI 修改失敗')
    } finally {
      setIsEditingImage(false)
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

            <section className="settings-section image-ai-edit-section">
              <span className="settings-label">AI 修改這張圖片</span>
              <p>描述想點樣改，例如「向左右延伸畫面，保留主體比例」</p>
              <div
                className={`image-reference-dropzone ${isDraggingImageReference ? 'dragging' : ''}`}
                onDragEnter={(event) => { event.preventDefault(); setIsDraggingImageReference(true) }}
                onDragLeave={() => setIsDraggingImageReference(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDraggingImageReference(false)
                  void addImageReferenceFiles(event.dataTransfer.files)
                }}
              >
                <span>參考素材（最多 4 張）</span>
                <label className="image-reference-upload">
                  <strong>＋ Drop 或點擊上載</strong>
                  <input
                    accept="image/*"
                    disabled={imageReferenceAssets.length >= 4}
                    multiple
                    onChange={(event) => {
                      if (event.target.files) void addImageReferenceFiles(event.target.files)
                      event.target.value = ''
                    }}
                    type="file"
                  />
                </label>
              </div>
              {imageReferenceAssets.length ? (
                <div className="image-reference-grid">
                  {imageReferenceAssets.map((asset, index) => (
                    <div className="image-reference-card" key={asset.id}>
                      <img alt={asset.name} src={asset.url} />
                      <span>@{index + 1}</span>
                      <button
                        aria-label={`移除參考素材 ${asset.name}`}
                        onClick={() => setImageReferenceAssets((current) => current.filter((item) => item.id !== asset.id))}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <textarea
                className="media-ai-input"
                onChange={(event) => setImageEditPrompt(event.target.value)}
                placeholder="根據這張圖片，我想……"
                rows={4}
                value={imageEditPrompt}
              />
              <div className="media-segment-row image-edit-size-row">
                {[
                  { label: '跟原圖', value: 'original' },
                  { label: '拉闊', value: 'landscape' },
                  { label: '拉高', value: 'portrait' },
                ].map((option) => (
                  <button
                    className={`media-segment-button ${imageEditSize === option.value ? 'active' : ''}`}
                    key={option.value}
                    onClick={() => setImageEditSize(option.value as typeof imageEditSize)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                className="media-generate-button"
                disabled={!imageEditPrompt.trim() || isEditingImage}
                onClick={() => generateImageEdit(selectedElement)}
                type="button"
              >
                {isEditingImage ? 'AI 修改中…' : '根據原圖修改 · 5 credits'}
              </button>
              {imageEditMessage ? <p className="image-edit-message" role="status">{imageEditMessage}</p> : null}
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

            <section className="settings-section">
              <label className="settings-label" htmlFor="selected-text-font">字型</label>
              <select
                className="text-font-select"
                id="selected-text-font"
                onChange={(event) => onUpdateElement(selectedElement.id, { fontFamily: event.target.value })}
                style={{ fontFamily: selectedElement.fontFamily || brandFontFamily }}
                value={selectedElement.fontFamily || brandFontFamily}
              >
                {!EDITOR_FONT_OPTIONS.some((font) => font.value === brandFontFamily) ? (
                  <option value={brandFontFamily}>{brandName || 'Workspace'} 品牌字體</option>
                ) : null}
                {EDITOR_FONT_OPTIONS.map((font) => (
                  <option key={font.value} style={{ fontFamily: font.value }} value={font.value}>
                    {font.value === brandFontFamily ? `${font.label}（品牌預設）` : font.label}
                  </option>
                ))}
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
                  aria-label="粗體"
                  aria-pressed={selectedElement.fontWeight === 'bold'}
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
                  aria-label="斜體"
                  aria-pressed={selectedElement.fontStyle === 'italic'}
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
                  aria-label="底線"
                  aria-pressed={selectedElement.textDecoration === 'underline'}
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
            {selectedElement.kind === 'shape' ? (
              <section className="settings-section shape-color-section">
                <label className="settings-label" htmlFor="selected-shape-color">填滿顏色</label>
                <div className="shape-color-controls">
                  <input
                    aria-label="選擇形狀顏色"
                    id="selected-shape-color"
                    type="color"
                    value={selectedElement.color}
                    onChange={(event) => onUpdateElement(selectedElement.id, { color: event.target.value })}
                  />
                  <input
                    aria-invalid={shapeHexInput.length > 0 && !normalizeHexInput(shapeHexInput)}
                    aria-label="手動輸入 HEX 色碼"
                    className="shape-hex-input"
                    onChange={(event) => {
                      const value = event.target.value
                      setShapeHexInput(value)
                      const normalized = normalizeHexInput(value)
                      if (normalized) onUpdateElement(selectedElement.id, { color: normalized })
                    }}
                    placeholder="#RRGGBB"
                    spellCheck={false}
                    value={shapeHexInput}
                  />
                </div>
                <ColorPalette
                  brandColors={brandColors}
                  brandKitLoading={brandKitLoading}
                  currentColor={selectedElement.color}
                  onPick={(color) => onUpdateElement(selectedElement.id, { color })}
                />
              </section>
            ) : null}

            <section className="property-list">
              <label className={selectedElement.kind === 'shape' ? 'shape-legacy-color-control' : undefined}>
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

        <section className="element-shelf">
          <div className="element-shelf-head">
            <h3>品牌 Logo</h3>
          </div>
          <BrandLogo brandKitLoading={brandKitLoading} brandLogoUrl={brandLogoUrl} brandName={brandName} className="media-brand-logo-button" onAddImage={onAddImage} />
        </section>

        <ElementShelf
          expanded={expandedElementSection === 'shapes'}
          items={SHAPE_ITEMS}
          kind="shape"
          onPick={onAddElement}
          onToggle={() => onSetExpandedSection(expandedElementSection === 'shapes' ? null : 'shapes')}
          title="形狀"
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
              <span className="text-preset-preview heading">大標題</span>
              <span className="text-preset-label">46 px · 粗體</span>
            </button>
            <button className="text-preset-btn" onClick={() => onAddText('subheading')} type="button">
              <span className="text-preset-preview subheading">副標題</span>
              <span className="text-preset-label">30 px · 粗體</span>
            </button>
            <button className="text-preset-btn" onClick={() => onAddText('body')} type="button">
              <span className="text-preset-preview body">內文</span>
              <span className="text-preset-label">20 px · 一般</span>
            </button>
            <button className="text-preset-btn" onClick={() => onAddText('caption')} type="button">
              <span className="text-preset-preview caption">說明</span>
              <span className="text-preset-label">14 px · 一般</span>
            </button>
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
          <h3>可用素材</h3>
          <div className="media-brand-kit-card">
            <BrandLogo brandKitLoading={brandKitLoading} brandLogoUrl={brandLogoUrl} brandName={brandName} className="media-brand-logo-button" onAddImage={onAddImage} />

            {uploadedImages.length > 0 ? (
              <div className="media-grid">
                {uploadedImages.map((image, index) => (
                  <button
                    className="media-thumb-btn"
                    key={`brand-kit-${image.url}-${index}`}
                    onClick={() => onAddImage(image.url, image.label)}
                    title={image.label}
                    type="button"
                  >
                    <img alt={image.label} className="media-thumb" src={image.url} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="media-brand-kit-copy">品牌 Logo 同之後上載嘅圖片會集中顯示喺呢度。</p>
            )}
          </div>
        </section>
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
        category: 'Facebook',
        sizes: [
          { name: 'Facebook Story', w: 1080, h: 1920 },
          { name: 'Facebook 封面', w: 820, h: 312 },
          { name: 'Facebook 貼文', w: 1200, h: 630 },
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

  if (activeDesignTool === '儲存') {
    return (
      <aside className="post-panel">
        <div className="brand-panel-head">
          <button type="button" onClick={() => onSetActiveTool('品牌')}>←</button>
          <h2>儲存設計</h2>
        </div>

        <div className="post-section">
          <p className="panel-helper-copy">儲存後，主頁會顯示目前畫布嘅最新版本。發布時間同平台會繼續喺主頁管理。</p>
          <button className="post-btn-primary" disabled={isSavingDesign} onClick={onSaveDesign} type="button">
            {isSavingDesign ? '儲存中…' : '儲存並返回主頁'}
          </button>
          <button className="post-btn-secondary" onClick={onCloseDesignMode} type="button">返回排程</button>
        </div>

        {saveDesignMessage ? <p className="panel-helper-copy" role="status">{saveDesignMessage}</p> : null}
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
            <BrandLogo brandKitLoading={brandKitLoading} brandLogoUrl={brandLogoUrl} brandName={brandName} className="brand-logo-placeholder" onAddImage={onAddImage} />
          </div>
        </section>

        <section>
          <h3>品牌顏色</h3>
          <ColorPalette brandColors={brandColors} brandKitLoading={brandKitLoading} onPick={onApplyBrandColor} />
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
