'use client'

import type { CSSProperties } from 'react'

import {
  BRAND_COLORS,
  FRAME_ITEMS,
  ICON_ITEMS,
  POST_PLATFORMS,
  SHAPE_ITEMS,
  STOCK_MEDIA,
  TEMPLATE_PRESETS,
  TEXT_STYLE_PRESETS,
} from '@/components/editor/editorData'
import type {
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
  selectedElement: DesignElement | null
  selectedPost: ScheduledPost
  selectedCaption: string
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
  selectedElement,
  selectedPost,
  selectedCaption,
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
}: EditorSidePanelProps) {
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
    return (
      <aside className="templates-panel">
        <div className="brand-panel-head">
          <button type="button" onClick={() => onSetActiveTool('品牌')}>←</button>
          <h2>模板</h2>
        </div>

        <p className="panel-helper-copy">套用模板會保留目前貼文相片，並重新排列文字、Logo 和視覺層次。</p>

        <div className="template-grid">
          {TEMPLATE_PRESETS.map((template) => (
            <button
              className="template-card"
              key={template.id}
              onClick={() => onApplyTemplate(template.id)}
              type="button"
            >
              <span className="template-preview" style={{ '--template-accent': template.accent } as CSSProperties}>
                <strong>{template.previewTitle}</strong>
                <em>{template.previewBody}</em>
              </span>
              <span className="template-card-copy">
                <strong>{template.title}</strong>
                <small>{template.description}</small>
              </span>
            </button>
          ))}
        </div>
      </aside>
    )
  }

  if (activeDesignTool === '發布') {
    return (
      <aside className="post-panel">
        <div className="brand-panel-head">
          <button type="button" onClick={() => onSetActiveTool('品牌')}>←</button>
          <h2>發布設定</h2>
        </div>

        <section className="post-panel-section">
          <h3>排程時間</h3>
          <button className="post-schedule-button" type="button">
            2026年5月8日 {selectedPost.time} ⌄
          </button>
        </section>

        <section className="post-panel-section">
          <h3>發布到</h3>
          <div className="post-platform-list">
            {POST_PLATFORMS.map((platform) => (
              <button className="post-platform-row" key={platform.id} type="button">
                <span>
                  <i>{platform.icon}</i>
                  {platform.label}
                </span>
                <em>{platform.status}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="post-panel-section">
          <h3>貼文預覽</h3>
          <article className="post-panel-preview">
            <img alt="" src={selectedPost.image} />
            <strong>{selectedPost.title}</strong>
            <p>{selectedCaption}</p>
          </article>
        </section>

        <section className="post-panel-actions">
          <button type="button" onClick={onOpenCaptionEditor}>調整 Caption</button>
          <button type="button" onClick={() => onSetActiveTool('媒體')}>更換媒體</button>
          <button type="button" onClick={onCloseDesignMode}>返回排程</button>
        </section>

        <button className="post-primary-action" type="button">
          確認排程
        </button>
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
            <button
              className="brand-logo-placeholder"
              onClick={() => onAddBrandText('品牌 Logo', 'SOON\nLOG', 30, 'bold', '#8B4513')}
              type="button"
            >
              <span>SOON</span>
              <span>LOG</span>
            </button>
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
