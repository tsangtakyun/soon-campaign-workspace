'use client'

import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react'

import { DesignCanvas } from '@/components/editor/DesignCanvas'
import { DesignToolbar } from '@/components/editor/DesignToolbar'
import { EditorSidePanel } from '@/components/editor/EditorSidePanel'
import { CHANNELS, FALLBACK_IMAGES, PLACEHOLDER_IMAGE } from '@/components/editor/editorData'
import type {
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

function createPostDesignElements(post: ScheduledPost): DesignElement[] {
  return [
    {
      id: `image-background-${post.id}`,
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
      imageUrl: post.image,
    },
    {
      id: `text-title-${post.id}`,
      kind: 'text',
      item: 'headline',
      label: '標題文字',
      x: 34,
      y: 13,
      size: 36,
      rotation: 0,
      opacity: 100,
      color: '#ffffff',
      zIndex: 10,
      textContent: post.title,
      fontFamily: 'Georgia, serif',
      fontSize: 36,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      width: 330,
      lineHeight: 0.96,
    },
    {
      id: `text-subtitle-${post.id}`,
      kind: 'text',
      item: 'subtitle',
      label: '副標題文字',
      x: 33,
      y: 25,
      size: 21,
      rotation: 0,
      opacity: 100,
      color: '#ffffff',
      zIndex: 11,
      textContent: 'is the one friends replay most.',
      fontFamily: 'inherit',
      fontSize: 21,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      width: 310,
      lineHeight: 1.08,
    },
    {
      id: `text-logo-${post.id}`,
      kind: 'text',
      item: 'logo',
      label: '品牌 Logo',
      x: 18,
      y: 91,
      size: 21,
      rotation: -4,
      opacity: 100,
      color: '#ffffff',
      zIndex: 12,
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

export default function ScheduledPostsPage() {
  const [compact, setCompact] = useState(false)
  const scheduledPosts = useMemo(() => buildScheduledPosts(readTopicImages()), [])
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null)
  const [previewChannel, setPreviewChannel] = useState<PreviewChannel>('Instagram')
  const [captions, setCaptions] = useState<Record<string, Partial<Record<PreviewChannel, string>>>>({})
  const [draftCaptions, setDraftCaptions] = useState<Partial<Record<PreviewChannel, string>>>({})
  const [captionModalOpen, setCaptionModalOpen] = useState(false)
  const [designMode, setDesignMode] = useState(false)
  const [activeDesignTool, setActiveDesignTool] = useState<DesignTool>('品牌')
  const [expandedElementSection, setExpandedElementSection] = useState<ElementSection | null>(null)
  const [designElements, setDesignElements] = useState<DesignElement[]>([])
  const [designElementsPostId, setDesignElementsPostId] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<{ url: string; label: string }[]>([])
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLElement | null>(null)
  const designHistoryIndexRef = useRef(-1)
  const designHistoryRef = useRef<string[]>([])
  const isRestoringDesignHistoryRef = useRef(false)

  const openDesignEditor = (post: ScheduledPost) => {
    if (designElementsPostId !== post.id) {
      const nextElements = createPostDesignElements(post)
      designHistoryRef.current = [JSON.stringify(nextElements)]
      designHistoryIndexRef.current = 0
      setDesignElements(nextElements)
      setDesignElementsPostId(post.id)
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

  const selectedCaption =
    selectedPost ? captions[selectedPost.id]?.[previewChannel] || selectedPost.body : ''
  const selectedElement = designElements.find((element) => element.id === selectedElementId) || null

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
        setSelectedElementId(null)
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
    setDesignElements((current) => [...current, nextElement])
    setSelectedElementId(id)
    setActiveDesignTool('文字')
  }

  const addTextStyleElement = (preset: TextStylePreset) => {
    const id = `text-style-${preset.label}-${Date.now()}`
    const fontWeight = preset.style.fontWeight === 'bold' || preset.style.fontWeight === 900 ? 'bold' : 'normal'
    const nextElement: DesignElement = {
      id,
      kind: 'text',
      item: preset.label,
      label: '文字',
      x: 50,
      y: 46,
      size: typeof preset.style.fontSize === 'number' ? preset.style.fontSize : 24,
      rotation: 0,
      opacity: 100,
      color: typeof preset.style.color === 'string' ? preset.style.color : '#111111',
      zIndex: 20 + designElements.length,
      textContent: preset.textContent,
      fontFamily: typeof preset.style.fontFamily === 'string' ? preset.style.fontFamily : 'inherit',
      fontSize: typeof preset.style.fontSize === 'number' ? preset.style.fontSize : 24,
      fontWeight,
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      width: 300,
      lineHeight: 1.25,
    }
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
    setDesignElements((current) => [...current, nextElement])
    setSelectedElementId(nextElement.id)
    setActiveDesignTool('媒體')
  }

  const updateImageElement = (id: string, changes: Partial<DesignElement>) => {
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
      setDesignElements((current) => [...current, nextElement])
      setSelectedElementId(nextElement.id)
      return
    }
    setDesignElements((current) =>
      current.map((element) => (element.id === selectedElementId ? { ...element, color } : element))
    )
  }

  const applyTemplatePreset = (templateId: TemplatePresetId) => {
    if (!selectedPost) return
    const currentImage =
      designElements.find((element) => element.kind === 'image' && element.imageUrl)?.imageUrl || selectedPost.image
    setDesignElements(createTemplateDesignElements(selectedPost, templateId, currentImage))
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
    setDesignElements((current) =>
      current.map((element) => (element.id === selectedElementId ? { ...element, ...updates } : element))
    )
  }

  const deleteSelectedElement = () => {
    if (!selectedElementId) return
    setDesignElements((current) => current.filter((element) => element.id !== selectedElementId))
    setSelectedElementId(null)
    setActiveDesignTool('元素')
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
    setDesignElements((current) => [...current, clone])
    setSelectedElementId(id)
  }

  const openElementEditor = (element: DesignElement) => {
    setSelectedElementId(element.id)
    setActiveDesignTool(element.kind === 'image' ? '媒體' : element.kind === 'text' ? '文字' : '元素')
  }

  const moveSelectedLayer = (direction: 'forward' | 'front' | 'backward' | 'back') => {
    if (!selectedElement) return
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
            <span>✦ 180 Credits</span>
            <button type="button">升級</button>
          </div>
        </header>

        <DesignToolbar
          activeDesignTool={activeDesignTool}
          onRedo={() => restoreDesignHistory('redo')}
          onToolChange={setActiveDesignTool}
          onUndo={() => restoreDesignHistory('undo')}
        />

        <section className="design-workbench">
          <DesignCanvas
            canvasRef={canvasRef}
            designElements={designElements}
            onCloseDesignMode={() => setDesignMode(false)}
            onDelete={deleteSelectedElement}
            onDeselectElement={() => setSelectedElementId(null)}
            onDuplicate={duplicateSelectedElement}
            onEditElement={openElementEditor}
            onSelectElement={setSelectedElementId}
            onSetActiveTool={setActiveDesignTool}
            onStartMove={startElementMove}
            onStartResize={startElementResize}
            onStartRotate={startElementRotate}
            selectedElementId={selectedElementId}
            selectedPost={selectedPost}
          />

          <EditorSidePanel
            activeDesignTool={activeDesignTool}
            expandedElementSection={expandedElementSection}
            isDraggingOver={isDraggingOver}
            onAddBrandText={addBrandTextElement}
            onAddElement={addDesignElement}
            onAddImage={addImageElement}
            onAddText={addTextElement}
            onAddTextStyle={addTextStyleElement}
            onApplyBrandColor={applyBrandColor}
            onApplyTemplate={applyTemplatePreset}
            onCloseDesignMode={() => setDesignMode(false)}
            onDelete={deleteSelectedElement}
            onDeselectElement={() => setSelectedElementId(null)}
            onImageUpload={handleImageUpload}
            onOpenCaptionEditor={() => openCaptionModal(selectedPost)}
            onMoveLayer={moveSelectedLayer}
            onSetActiveTool={setActiveDesignTool}
            onSetDraggingOver={setIsDraggingOver}
            onSetExpandedSection={setExpandedElementSection}
            onTrackUploadedImage={(image) => setUploadedImages((current) => [image, ...current])}
            onUpdateElement={(id, changes) => {
              setDesignElements((current) =>
                current.map((element) => (element.id === id ? { ...element, ...changes } : element))
              )
            }}
            selectedElement={selectedElement}
            selectedPost={selectedPost}
            uploadedImages={uploadedImages}
          />
        </section>

        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </main>
    )
  }

  if (selectedPost) {
    return (
      <main className="post-editor-page">
        <header className="editor-topbar">
          <div className="editor-post-title">
            <button type="button" onClick={() => setSelectedPost(null)} aria-label="返回日曆">
              ←
            </button>
            <span className={selectedPost.type === '文章' ? 'post-type article' : 'post-type image'}>
              {selectedPost.title}
            </span>
            <strong>需要連接帳戶</strong>
          </div>

          <div className="editor-top-actions">
            <button type="button" disabled>
              上一個
            </button>
            <button type="button">下一個 ›</button>
            <span>✦ 180 Credits</span>
            <button type="button" className="upgrade-button">升級</button>
          </div>
        </header>

        <section className="editor-shell">
          <aside className="ai-improve-panel">
            <div className="improve-copy">
              <p>SOON 可以這樣改善這則貼文：</p>
              <ol>
                <li><strong>更改相片內容：</strong>「在背景加入人物，令場景更豐富」</li>
                <li><strong>調整背景：</strong>「將背景換成現代辦公室」</li>
                <li><strong>更改文字疊加：</strong>「將標題放大並移到頂部」</li>
                <li><strong>修改顏色：</strong>「令整體配色更鮮明」</li>
                <li><strong>修改品牌：</strong>「將我的 logo 加到右下角」</li>
              </ol>
              <p>你想怎樣調整？</p>
            </div>

            <form className="ai-command-box">
              <textarea placeholder="要求 SOON 修改這則貼文..." />
              <div>
                <label aria-label="附加檔案">
                  <input type="file" />
                  <span>附件</span>
                </label>
                <button type="button" aria-label="送出要求">↑</button>
              </div>
            </form>
          </aside>

          <section className="preview-stage" aria-label="貼文預覽">
            <div className="view-switcher" aria-label="預覽平台">
              <span>預覽</span>
              {[
                ['Instagram', 'IG'],
                ['Facebook', 'FB'],
                ['LinkedIn', 'in'],
                ['X', 'X'],
                ['Google', 'G'],
              ].map(([channel, label]) => (
                <button
                  className={previewChannel === channel ? 'active' : ''}
                  key={channel}
                  onClick={() => setPreviewChannel(channel as PreviewChannel)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <article className={`phone-preview ${previewChannel.toLowerCase()}`}>
              <header>
                <div className="avatar">S</div>
                <strong>{previewChannel === 'Instagram' ? 'soon_log' : 'SOON-LOG'}</strong>
                <span>尚未連接帳戶</span>
              </header>
              <div className="phone-image">
                <img src={selectedPost.image} alt="" />
                <div className="phone-overlay">
                  <strong>{selectedPost.title}</strong>
                  <span>{selectedPost.type}</span>
                </div>
                <button className="edit-design-overlay" type="button" onClick={() => openDesignEditor(selectedPost)}>
                  ✎ 編輯設計
                </button>
              </div>
              <div className="phone-actions">
                <span>♡</span>
                <span>○</span>
                <span>⌲</span>
                <button type="button" onClick={() => openCaptionModal(selectedPost)}>編輯 caption</button>
              </div>
              <p>
                <strong>SOON-LOG</strong> {selectedCaption}
              </p>
            </article>

            <div className="result-actions">
              <span>你喜歡這個結果嗎？</span>
              <button type="button">不喜歡</button>
              <button type="button">喜歡</button>
              <button type="button" onClick={() => setSelectedPost(null)}>關閉</button>
            </div>
          </section>

          <aside className="post-settings-panel">
            <section>
              <p>發布時間</p>
              <button type="button">2026年5月8日 {selectedPost.time} ⌄</button>
            </section>

            <section>
              <p>發布到</p>
              {['Instagram', 'Facebook', 'LinkedIn', 'X / Twitter', 'Google Business'].map((channel) => (
                <button className={channel === 'Instagram' ? 'connected-channel' : ''} key={channel} type="button">
                  <span>{channel}</span>
                  <em>{channel === 'Instagram' ? '連接' : '＋'}</em>
                </button>
              ))}
            </section>

            <section>
              <p>宣傳活動</p>
              <strong>分享你的日常，建立真實連繫</strong>
              <span>生活內容</span>
            </section>

            <section>
              <p>快速編輯</p>
              <button type="button" onClick={() => openCaptionModal(selectedPost)}>調整 caption</button>
              <button type="button" onClick={() => openDesignEditor(selectedPost)}>編輯設計</button>
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
      <aside className="sidebar">
        <div className="workspace-switcher">
          <div className="workspace-mark">S</div>
          <strong>Tommy 的工作台</strong>
          <span>⌄</span>
        </div>

        <nav className="sidebar-nav" aria-label="工作台導覽">
          {[
            ['⌂', '首頁'],
            ['▣', '日曆'],
            ['▱', '宣傳活動'],
            ['↯', '整合', '0/4'],
            ['✤', '品牌素材庫'],
            ['☷', '內容偏好'],
            ['✓', '審批'],
            ['▥', '洞察'],
          ].map(([icon, label, meta]) => (
            <a className={label === '日曆' ? 'active' : ''} href="#" key={label}>
              <span>{icon}</span>
              <strong>{label}</strong>
              {meta ? <em>{meta}</em> : null}
            </a>
          ))}
        </nav>

        <div className="sidebar-group">
          <p>觸及</p>
          <a href="#">Ⓜ Meta Ads</a>
          <a href="#">SEO</a>
        </div>

        <div className="sidebar-footer">
          <a href="#">＋ 建立新項目</a>
          <a href="#">邀請團隊成員</a>
          <a href="#">幫助與學習</a>
        </div>
      </aside>

      <section className="calendar-shell">
        <header className="calendar-topbar">
          <div className="calendar-title">
            <h1>日曆</h1>
            <button type="button" aria-label="上一日">‹</button>
            <button type="button">今天</button>
            <button type="button" aria-label="下一日">›</button>
            <strong>5月8日</strong>
          </div>

          <div className="calendar-actions">
            <button type="button">＋ 建立</button>
            <button type="button">↻ 重新生成</button>
            <button type="button">⌁ 改善</button>
            <button type="button" onClick={() => setCompact((value) => !value)}>
              {compact ? '展開' : '緊湊'} ⌄
            </button>
            <span>✦ 180 Credits</span>
            <button type="button" className="upgrade-button">升級</button>
          </div>
        </header>

        <div className="connect-banner">
          <span>⚡ 你的貼文尚未自動發布。連接帳戶後，SOON 可以按排程自動發布。</span>
          <button type="button">連接</button>
        </div>

        <div className="calendar-date-pill">5月8日 星期五</div>

        <section className={compact ? 'schedule-column compact' : 'schedule-column'} aria-label="今日排程">
          {scheduledPosts.map((post) => (
            <article className="post-card" key={post.id} onClick={() => setSelectedPost(post)}>
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
      </section>

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </main>
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

  .sidebar {
    min-height: 100vh;
    border-right: 1px solid #e6e7ea;
    background: #f2f3f5;
    padding: 16px 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .workspace-switcher {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 8px 6px 18px;
    border-bottom: 1px solid #e2e3e6;
  }

  .workspace-mark {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    background: #ffd946;
    color: #111111;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 13px;
  }

  .workspace-switcher strong {
    font-size: 14px;
    font-weight: 550;
  }

  .workspace-switcher span {
    color: #9a9da4;
  }

  .sidebar-nav,
  .sidebar-group,
  .sidebar-footer {
    display: grid;
    gap: 5px;
  }

  .sidebar-nav a,
  .sidebar-group a,
  .sidebar-footer a {
    min-height: 34px;
    border-radius: 9px;
    color: #6f7278;
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    text-decoration: none;
    font-size: 14px;
  }

  .sidebar-nav a.active {
    background: #e5e7eb;
    color: #202126;
  }

  .sidebar-nav strong {
    font-weight: 500;
  }

  .sidebar-nav em {
    color: #9b9ea6;
    font-style: normal;
  }

  .sidebar-group p {
    margin: 8px 10px 4px;
    color: #9a9da4;
    font-size: 12px;
  }

  .sidebar-footer {
    margin-top: auto;
    border-top: 1px solid #e2e3e6;
    padding-top: 12px;
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
    border: 2px solid #d946ef;
    border-radius: 8px;
    background: #ffffff;
    overflow: hidden;
    cursor: pointer;
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  .post-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 34px rgba(32, 33, 38, 0.12);
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
    background: #d946ef;
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
    font-weight: 750;
    cursor: pointer;
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
  }

  .phone-actions span {
    font-size: 23px;
    line-height: 1;
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

  .post-settings-panel p {
    margin: 0;
    color: #9a9da4;
    font-size: 14px;
  }

  .post-settings-panel section > strong {
    color: #2f3138;
    font-size: 14px;
    line-height: 1.35;
  }

  .post-settings-panel section > span {
    color: #7b7f88;
    font-size: 13px;
  }

  .post-settings-panel button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }

  .post-settings-panel .connected-channel {
    background: #f6f7f9;
    border-color: #dee0e5;
  }

  .post-settings-panel em {
    color: #8a8d95;
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

  .media-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
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
    background: #f4f4f5;
    border: 1px solid #e3e5e8;
    border-radius: 10px;
    color: #80645e;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    font: inherit;
    font-size: 22px;
    font-weight: 900;
    justify-content: center;
    line-height: 0.86;
    min-height: 88px;
    min-width: 132px;
    padding: 12px 18px;
    transform: rotate(-2deg);
    transition: border-color 160ms ease, transform 160ms ease;
  }

  .brand-logo-placeholder:hover {
    border-color: #9297a1;
    transform: rotate(-2deg) translateY(-1px);
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
