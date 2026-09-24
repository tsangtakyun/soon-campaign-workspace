'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas, Circle, FabricImage, FabricObject, IText, Polygon, Rect, Textbox, Triangle } from 'fabric'

import type { CanvasSize, DesignElement } from '@/components/editor/editorTypes'
import { createClient } from '@/lib/supabase'

type FabricElementObject = FabricObject & {
  data?: {
    id?: string
    kind?: DesignElement['kind']
    item?: string
    label?: string
    editorImageFrame?: { width: number; height: number; fit: string; position: string }
  }
}

type UseFabricCanvasOptions = {
  autosaveKey?: string
  autosaveName?: string
  canvasId: string
  height: number
  width: number
  onSelectElement?: (id: string | null) => void
  onElementsChange?: (elements: DesignElement[]) => void
}

const BASE_CANVAS = { width: 430, height: 538 }
const loadedMagazineFonts = new Map<string, Promise<FontFace>>()

function resolveCanvasFontFamily(value?: string) {
  if (!value || value === 'inherit') return 'SweiGothicCJKtc-Regular'
  const normalized = value.toLowerCase()
  if (normalized.includes('gensenrounded') || normalized.includes('系統圓體')) return 'GenSenRounded2'
  return value
}

async function ensureCanvasFontLoaded(fontFamily: string, fontWeight: string | number = 'normal') {
  if (typeof document === 'undefined' || !document.fonts) return
  try {
    const magazine = fontFamily === 'SOON Magazine Sans' ? 'Sans' : fontFamily === 'SOON Magazine Serif' ? 'Serif' : null
    if (magazine) {
      const bold = fontWeight === 'bold' || Number(fontWeight) >= 600
      const file = `${magazine}-${bold ? magazine === 'Serif' ? 'Black' : 'Bold' : 'Regular'}.otf`
      const key = `${fontFamily}:${fontWeight}`
      if (!loadedMagazineFonts.has(key)) loadedMagazineFonts.set(key, new FontFace(fontFamily, `url(/fonts/magazine/${file})`, { weight: String(fontWeight) }).load())
      document.fonts.add(await loadedMagazineFonts.get(key)!)
    }
    await document.fonts.load(`${fontWeight} 32px "${fontFamily}"`, '繁體中文 ABC 123')
  } catch {
    // Fabric can still render with the browser fallback if a remote font is unavailable.
  }
}

function toCanvasPosition(element: DesignElement, size: Pick<CanvasSize, 'h' | 'w'>) {
  return {
    left: (element.x / 100) * size.w,
    top: (element.y / 100) * size.h,
  }
}

function elementScale(size: Pick<CanvasSize, 'h' | 'w'>) {
  return Math.min(size.w / BASE_CANVAS.width, size.h / BASE_CANVAS.height)
}

function buildStarPoints(outerRadius: number, innerRadius: number, points = 5) {
  return Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    const angle = (Math.PI / points) * index - Math.PI / 2
    return {
      x: outerRadius + Math.cos(angle) * radius,
      y: outerRadius + Math.sin(angle) * radius,
    }
  })
}

function buildDiamondPoints(size: number) {
  const half = size / 2
  return [
    { x: half, y: 0 },
    { x: size, y: half },
    { x: half, y: size },
    { x: 0, y: half },
  ]
}

function buildPentagonPoints(size: number) {
  const radius = size / 2
  return Array.from({ length: 5 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2
    return { x: radius + Math.cos(angle) * radius, y: radius + Math.sin(angle) * radius }
  })
}

function attachElementData<T extends FabricElementObject>(object: T, element: DesignElement) {
  object.set({
    angle: element.rotation,
    opacity: element.opacity / 100,
    originX: 'center',
    originY: 'center',
  })
  object.data = { id: element.id, item: element.item, kind: element.kind }
  return object
}

function applyControls(object: FabricElementObject) {
  object.set({
    borderColor: '#111111',
    cornerColor: '#ffffff',
    cornerSize: 12,
    cornerStrokeColor: '#111111',
    padding: 0,
    transparentCorners: false,
  })
}

async function createFabricObject(element: DesignElement, size: Pick<CanvasSize, 'h' | 'w'>) {
  const scale = elementScale(size)
  const position = toCanvasPosition(element, size)
  const common = {
    ...position,
    angle: element.rotation,
    opacity: element.opacity / 100,
    originX: 'center' as const,
    originY: 'center' as const,
  }

  if (element.kind === 'image') {
    const image = await FabricImage.fromURL(element.imageUrl || '', { crossOrigin: 'anonymous' })
    if (element.item === 'background') {
      const coverScale = Math.max(size.w / (image.width || 1), size.h / (image.height || 1))
      image.set({
        ...common,
        left: size.w / 2,
        top: size.h / 2,
        scaleX: coverScale,
        scaleY: coverScale,
      })
    } else {
      const targetWidth = (element.width || element.size || 300) * scale
      const targetHeight = element.height ? element.height * scale : 0
      const containScale = targetHeight
        ? Math.min(targetWidth / (image.width || 1), targetHeight / (image.height || 1))
        : targetWidth / (image.width || 1)
      image.set({ scaleX: containScale, scaleY: containScale })
      image.set(common)
    }
    return attachElementData(image as FabricElementObject, element)
  }

  if (element.kind === 'text') {
    const fontFamily = resolveCanvasFontFamily(element.fontFamily)
    const fontWeight = element.fontWeight || 'normal'
    await ensureCanvasFontLoaded(fontFamily, fontWeight)
    const text = new Textbox(element.textContent || element.label, {
      ...common,
      fill: element.color,
      fontFamily,
      fontSize: (element.fontSize || element.size || 24) * scale,
      fontStyle: element.fontStyle || 'normal',
      fontWeight,
      lineHeight: element.lineHeight || 1.3,
      splitByGrapheme: true,
      textAlign: element.textAlign || 'center',
      underline: element.textDecoration === 'underline',
      width: (element.width || 300) * scale,
    })
    return attachElementData(text as FabricElementObject, element)
  }

  if (element.kind === 'icon') {
    const icon = new IText(element.item, {
      ...common,
      fill: element.color,
      fontFamily: 'Arial, sans-serif',
      fontSize: element.size * scale,
      fontWeight: 'bold',
      textAlign: 'center',
    })
    return attachElementData(icon as FabricElementObject, element)
  }

  const objectSize = element.size * scale
  const defaults = {
    ...common,
    fill: element.kind === 'frame' ? 'rgba(255,255,255,0.22)' : element.color,
    stroke: element.kind === 'frame' ? 'rgba(255,255,255,0.75)' : undefined,
    strokeWidth: element.kind === 'frame' ? Math.max(2, 3 * scale) : 0,
  }

  let shape: FabricElementObject
  if (element.item === 'circle') {
    shape = new Circle({ ...defaults, radius: objectSize / 2 }) as FabricElementObject
  } else if (element.item === 'triangle') {
    shape = new Triangle({ ...defaults, height: objectSize, width: objectSize }) as FabricElementObject
  } else if (element.item === 'diamond') {
    shape = new Polygon(buildDiamondPoints(objectSize), defaults) as FabricElementObject
  } else if (element.item === 'pentagon') {
    shape = new Polygon(buildPentagonPoints(objectSize), defaults) as FabricElementObject
  } else if (element.item === 'star') {
    shape = new Polygon(buildStarPoints(objectSize / 2, objectSize / 4), defaults) as FabricElementObject
  } else {
    const rectWidth = (element.width || element.size) * scale
    const rectHeight = (element.height || element.size) * scale
    shape = new Rect({
      ...defaults,
      height: rectHeight,
      rx: element.item === 'rounded' ? objectSize * 0.18 : 0,
      ry: element.item === 'rounded' ? objectSize * 0.18 : 0,
      width: rectWidth,
    }) as FabricElementObject
  }

  return attachElementData(shape, element)
}

export function useFabricCanvas({ autosaveKey, autosaveName, canvasId, height, onSelectElement, onElementsChange, width }: UseFabricCanvasOptions) {
  const onElementsChangeRef = useRef(onElementsChange)
  onElementsChangeRef.current = onElementsChange
  const autosaveKeyRef = useRef(autosaveKey)
  const autosaveNameRef = useRef(autosaveName)
  const autosaveTimerRef = useRef<number | null>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const historyIndexRef = useRef(-1)
  const historyRef = useRef<string[]>([])
  const isRestoringRef = useRef(false)
  const onSelectElementRef = useRef(onSelectElement)
  const sizeRef = useRef({ h: height, w: width })

  useEffect(() => {
    onSelectElementRef.current = onSelectElement
  }, [onSelectElement])

  useEffect(() => {
    autosaveKeyRef.current = autosaveKey
    autosaveNameRef.current = autosaveName
  }, [autosaveKey, autosaveName])

  const scheduleAutosave = useCallback((canvas: Canvas) => {
    if (typeof window === 'undefined') return
    const key = autosaveKeyRef.current
    if (!key) return

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
    }

    const canvasJson = canvas.toObject(['data'])
    const canvasWidth = canvas.width || width
    const canvasHeight = canvas.height || height
    const designName = autosaveNameRef.current || 'Untitled'

    autosaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const supabase = createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) return

          const storageKey = `soon-design-id:${key}`
          let designId = window.localStorage.getItem(storageKey)
          if (!designId) {
            designId = crypto.randomUUID()
            window.localStorage.setItem(storageKey, designId)
          }

          await supabase.from('designs').upsert({
            id: designId,
            user_id: user.id,
            name: designName,
            canvas_json: canvasJson,
            canvas_width: canvasWidth,
            canvas_height: canvasHeight,
            is_draft: true,
            updated_at: new Date().toISOString(),
          })
        } catch (error) {
          console.error('Failed to autosave design:', error)
        }
      })()
    }, 30000)
  }, [height, width])

  const snapshotHistory = useCallback((canvas: Canvas) => {
    if (isRestoringRef.current) return
    onElementsChangeRef.current?.(canvas.getObjects().map((entry, zIndex): DesignElement => {
      const object = entry as FabricElementObject
      const text = entry instanceof IText ? entry : null
      const center = object.getCenterPoint()
      const scale = elementScale({ w: canvas.width, h: canvas.height })
      return { id: object.data?.id || `layer-${zIndex}`, kind: object.data?.kind || (text ? 'text' : entry instanceof FabricImage ? 'image' : 'shape'),
        item: object.data?.item || (text ? 'body' : 'photo'), label: object.data?.label || text?.text || '圖層',
        x: center.x / canvas.width * 100, y: center.y / canvas.height * 100, size: object.getScaledWidth() / scale,
        width: object.getScaledWidth() / scale, height: object.getScaledHeight() / scale, rotation: object.angle, opacity: object.opacity * 100,
        color: typeof object.fill === 'string' ? object.fill : '#000000', zIndex,
        ...(text ? { textContent: text.text, fontFamily: text.fontFamily, fontSize: text.fontSize * text.scaleY / scale,
          fontWeight: text.fontWeight === 'bold' || Number(text.fontWeight) >= 600 ? 'bold' as const : 'normal' as const,
          fontStyle: text.fontStyle === 'italic' ? 'italic' as const : 'normal' as const, textAlign: text.textAlign as 'left' | 'center' | 'right', lineHeight: text.lineHeight } : {}),
        ...(entry instanceof FabricImage ? { imageUrl: entry.getSrc() } : {}),
      }
    }))
    const json = JSON.stringify(canvas.toObject(['data']))
    const stack = historyRef.current.slice(0, historyIndexRef.current + 1)
    if (stack[stack.length - 1] === json) return
    stack.push(json)
    if (stack.length > 50) stack.shift()
    historyRef.current = stack
    historyIndexRef.current = stack.length - 1
    scheduleAutosave(canvas)
  }, [scheduleAutosave])

  useEffect(() => {
    const canvas = new Canvas(canvasId, {
      backgroundColor: '#ffffff',
      height,
      preserveObjectStacking: true,
      selection: true,
      width,
    })

    fabricRef.current = canvas
    sizeRef.current = { h: height, w: width }

    const onMutation = () => snapshotHistory(canvas)
    const onSelection = () => {
      const object = canvas.getActiveObject() as FabricElementObject | undefined
      onSelectElementRef.current?.(object?.data?.id || null)
    }

    canvas.on('object:added', onMutation)
    canvas.on('object:modified', onMutation)
    canvas.on('object:removed', onMutation)
    canvas.on('text:changed', onMutation)
    canvas.on('selection:created', onSelection)
    canvas.on('selection:updated', onSelection)
    canvas.on('selection:cleared', () => onSelectElementRef.current?.(null))

    snapshotHistory(canvas)

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
      }
      canvas.dispose()
      fabricRef.current = null
    }
  }, [canvasId, snapshotHistory])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const previous = sizeRef.current
    if (previous.w === width && previous.h === height) return
    const scaleX = width / previous.w
    const scaleY = height / previous.h
    canvas.setDimensions({ height, width })
    canvas.getObjects().forEach((object) => {
      object.set({
        left: (object.left || 0) * scaleX,
        scaleX: (object.scaleX || 1) * scaleX,
        scaleY: (object.scaleY || 1) * scaleY,
        top: (object.top || 0) * scaleY,
      })
      object.setCoords()
    })
    sizeRef.current = { h: height, w: width }
    canvas.renderAll()
    snapshotHistory(canvas)
  }, [height, snapshotHistory, width])

  const loadDesignElements = useCallback(
    async (elements: DesignElement[]) => {
      const canvas = fabricRef.current
      if (!canvas) return
      isRestoringRef.current = true
      canvas.clear()
      canvas.backgroundColor = '#ffffff'
      const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
      const objects = await Promise.all(sorted.map((element) => createFabricObject(element, sizeRef.current)))
      objects.forEach((object) => {
        applyControls(object)
        canvas.add(object)
      })
      canvas.discardActiveObject()
      canvas.renderAll()
      isRestoringRef.current = false
      snapshotHistory(canvas)
    },
    [snapshotHistory]
  )

  const loadCanvasJSON = useCallback(async (value: Record<string, unknown>) => {
    const canvas = fabricRef.current
    if (!canvas) return
    isRestoringRef.current = true
    try {
      const entries = (value.objects || []) as Array<{ fontFamily?: string; fontWeight?: string | number }>
      await Promise.all(entries.filter(o => o.fontFamily).map(o => ensureCanvasFontLoaded(o.fontFamily!, o.fontWeight)))
      await canvas.loadFromJSON(value)
      const sx = canvas.width / (Number(value.coordinateWidth) || canvas.width)
      const sy = canvas.height / (Number(value.coordinateHeight) || canvas.height)
      canvas.getObjects().forEach((entry, index) => {
        const object = entry as FabricElementObject
        object.data = { ...object.data, id: object.data?.id || `layer-${index}` }
        const frame = object.data.editorImageFrame
        if (entry instanceof FabricImage && frame) {
          const source = entry.getOriginalSize()
          const parts = frame.position.split(/\s+/)
          const fraction = (part?: string) => part?.endsWith('%') ? Math.max(0, Math.min(1, parseFloat(part) / 100)) : part === 'left' || part === 'top' ? 0 : part === 'right' || part === 'bottom' ? 1 : 0.5
          const px = fraction(parts[0]), py = fraction(parts[1])
          const ratio = frame.fit === 'contain' ? Math.min(frame.width / source.width, frame.height / source.height) : Math.max(frame.width / source.width, frame.height / source.height)
          if (frame.fit === 'contain') entry.set({ width: source.width, height: source.height, scaleX: ratio, scaleY: ratio, left: entry.left + (frame.width - source.width * ratio) * px, top: entry.top + (frame.height - source.height * ratio) * py })
          else entry.set({ width: frame.width / ratio, height: frame.height / ratio, scaleX: ratio, scaleY: ratio, cropX: (source.width - frame.width / ratio) * px, cropY: (source.height - frame.height / ratio) * py })
          delete object.data.editorImageFrame
        }
        object.set({ left: object.left * sx, top: object.top * sy, scaleX: object.scaleX * sx, scaleY: object.scaleY * sy })
        applyControls(object)
        object.setCoords()
      })
      canvas.discardActiveObject()
      canvas.renderAll()
    } finally { isRestoringRef.current = false }
    snapshotHistory(canvas)
  }, [snapshotHistory])

  const addDesignElement = useCallback(async (element: DesignElement) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const object = await createFabricObject(element, sizeRef.current)
    applyControls(object)
    canvas.add(object)
    canvas.setActiveObject(object)
    canvas.renderAll()
  }, [])

  const updateDesignElement = useCallback(async (id: string, changes: Partial<DesignElement>) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activeObject = canvas.getActiveObject() as FabricElementObject | undefined
    const object =
      (canvas.getObjects().find((candidate) => (candidate as FabricElementObject).data?.id === id) as
        | FabricElementObject
        | undefined) ||
      (activeObject?.data?.id === id ? activeObject : undefined) ||
      (changes.textContent !== undefined && activeObject && 'text' in activeObject ? activeObject : undefined)
    if (!object) return

    if (changes.imageUrl && object.type === 'image') {
      const replacement = await FabricImage.fromURL(changes.imageUrl, { crossOrigin: 'anonymous' })
      const center = object.getCenterPoint()
      const index = canvas.getObjects().indexOf(object)
      const ratio = Math.max(object.getScaledWidth() / replacement.width, object.getScaledHeight() / replacement.height)
      const cropWidth = object.getScaledWidth() / ratio, cropHeight = object.getScaledHeight() / ratio
      replacement.set({
        angle: object.angle,
        data: object.data,
        left: center.x,
        opacity: object.opacity,
        originX: 'center',
        originY: 'center',
        cropX: (replacement.width - cropWidth) / 2,
        cropY: (replacement.height - cropHeight) / 2,
        width: cropWidth, height: cropHeight,
        scaleX: ratio,
        scaleY: ratio,
        top: center.y,
      })
      applyControls(replacement as FabricElementObject)
      canvas.remove(object)
      canvas.insertAt(index, replacement)
      canvas.setActiveObject(replacement)
      canvas.renderAll()
      return
    }

    const nextProps: Record<string, unknown> = {}
    if (changes.rotation !== undefined) nextProps.angle = changes.rotation
    if (changes.color !== undefined && object.type !== 'image') nextProps.fill = changes.color
    if (changes.fontSize !== undefined) nextProps.fontSize = changes.fontSize * elementScale(sizeRef.current) / object.scaleY
    if (changes.fontFamily !== undefined || changes.fontWeight !== undefined) {
      const fontFamily = resolveCanvasFontFamily(changes.fontFamily || String(object.get('fontFamily') || ''))
      const fontWeight = changes.fontWeight || String(object.get('fontWeight') || 'normal')
      await ensureCanvasFontLoaded(fontFamily, fontWeight)
      nextProps.fontFamily = fontFamily
    }
    if (changes.fontStyle !== undefined) nextProps.fontStyle = changes.fontStyle
    if (changes.fontWeight !== undefined) nextProps.fontWeight = changes.fontWeight
    if (changes.textDecoration !== undefined) nextProps.underline = changes.textDecoration === 'underline'
    if (changes.lineHeight !== undefined) nextProps.lineHeight = changes.lineHeight
    if (changes.opacity !== undefined) nextProps.opacity = changes.opacity / 100
    if (changes.textAlign !== undefined) nextProps.textAlign = changes.textAlign
    if (changes.width !== undefined) nextProps.width = changes.width * elementScale(sizeRef.current) / object.scaleX

    if (changes.textContent !== undefined && 'text' in object) {
      object.set({ text: changes.textContent })
      if (object instanceof IText) {
        object.initDimensions()
      }
    }

    object.set(nextProps)
    if (object instanceof IText && (changes.fontFamily !== undefined || changes.fontWeight !== undefined)) {
      object.initDimensions()
    }
    object.setCoords()
    canvas.requestRenderAll()
    snapshotHistory(canvas)
  }, [snapshotHistory])

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const active = canvas.getActiveObjects()
    if (!active.length) return
    canvas.discardActiveObject()
    active.forEach((object) => canvas.remove(object))
    canvas.renderAll()
  }, [])

  const duplicateSelected = useCallback(async () => {
    const canvas = fabricRef.current
    const active = canvas?.getActiveObject()
    if (!canvas || !active) return
    const cloned = await active.clone()
    cloned.set({ left: (cloned.left || 0) + 22, top: (cloned.top || 0) + 22 })
    if ((cloned as FabricElementObject).data?.id) {
      ;(cloned as FabricElementObject).data = {
        ...(cloned as FabricElementObject).data,
        id: `${(cloned as FabricElementObject).data?.id}-copy-${Date.now()}`,
      }
    }
    applyControls(cloned as FabricElementObject)
    canvas.add(cloned)
    canvas.setActiveObject(cloned)
    canvas.renderAll()
  }, [])

  const undo = useCallback(async () => {
    const canvas = fabricRef.current
    if (!canvas || historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    isRestoringRef.current = true
    await canvas.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current]))
    canvas.renderAll()
    isRestoringRef.current = false
  }, [])

  const redo = useCallback(async () => {
    const canvas = fabricRef.current
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    isRestoringRef.current = true
    await canvas.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current]))
    canvas.renderAll()
    isRestoringRef.current = false
  }, [])

  const bringForward = useCallback(() => {
    const canvas = fabricRef.current
    const object = canvas?.getActiveObject()
    if (!canvas || !object) return
    canvas.bringObjectForward(object)
    canvas.renderAll()
    snapshotHistory(canvas)
  }, [snapshotHistory])

  const sendBackward = useCallback(() => {
    const canvas = fabricRef.current
    const object = canvas?.getActiveObject()
    if (!canvas || !object) return
    canvas.sendObjectBackwards(object)
    canvas.renderAll()
    snapshotHistory(canvas)
  }, [snapshotHistory])

  const exportPNG = useCallback((multiplier = 2) => {
    return fabricRef.current?.toDataURL({ format: 'png', multiplier }) || ''
  }, [])

  return useMemo(
    () => ({
      addDesignElement,
      bringForward,
      deleteSelected,
      duplicateSelected,
      exportPNG,
      fabricRef,
      loadCanvasJSON,
      loadDesignElements,
      redo,
      sendBackward,
      undo,
      updateDesignElement,
    }),
    [
      addDesignElement,
      bringForward,
      deleteSelected,
      duplicateSelected,
      exportPNG,
      loadCanvasJSON,
      loadDesignElements,
      redo,
      sendBackward,
      undo,
      updateDesignElement,
    ]
  )
}
