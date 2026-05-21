'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas, Circle, FabricImage, FabricObject, IText, Polygon, Rect, Triangle } from 'fabric'

import type { CanvasSize, DesignElement } from '@/components/editor/editorTypes'
import { createClient } from '@/lib/supabase'

type FabricElementObject = FabricObject & {
  data?: {
    id?: string
    kind?: DesignElement['kind']
    item?: string
  }
}

type UseFabricCanvasOptions = {
  autosaveKey?: string
  autosaveName?: string
  canvasId: string
  height: number
  width: number
  onSelectElement?: (id: string | null) => void
}

const BASE_CANVAS = { width: 430, height: 538 }

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

function resolvedTextFontFamily(fontFamily?: string) {
  return !fontFamily || fontFamily === 'inherit' ? 'Arial, sans-serif' : fontFamily
}

async function loadTextFont(fontFamily?: string) {
  if (!fontFamily || fontFamily === 'inherit' || typeof document === 'undefined' || !document.fonts) return

  try {
    const safeFontFamily = fontFamily.replace(/'/g, "\\'")
    await Promise.all([
      document.fonts.load(`500 16px '${safeFontFamily}'`),
      document.fonts.load(`16px '${safeFontFamily}'`),
    ])
  } catch (error) {
    console.warn('Font load warning:', error)
  }
}

function isTextStyleChange(changes: Partial<DesignElement>) {
  return (
    changes.backgroundColor !== undefined ||
    changes.fontFamily !== undefined ||
    changes.fontSize !== undefined ||
    changes.fontStyle !== undefined ||
    changes.fontWeight !== undefined ||
    changes.textAlign !== undefined ||
    changes.textContent !== undefined ||
    changes.textDecoration !== undefined
  )
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

function forceTextObjectRender(canvas: Canvas, object: IText) {
  object.set({ objectCaching: false })
  object.dirty = true
  object.initDimensions()
  object.setCoords()
  canvas.renderAll()
  canvas.requestRenderAll()
  window.setTimeout(() => {
    object.dirty = true
    object.initDimensions()
    object.setCoords()
    canvas.renderAll()
    canvas.requestRenderAll()
  }, 100)
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
      image.scaleToWidth(targetWidth)
      image.set(common)
    }
    return attachElementData(image as FabricElementObject, element)
  }

  if (element.kind === 'text') {
    await loadTextFont(element.fontFamily)
    const text = new IText(element.textContent || element.label, {
      ...common,
      backgroundColor: element.backgroundColor,
      fill: element.color,
      fontFamily: resolvedTextFontFamily(element.fontFamily),
      fontSize: (element.fontSize || element.size || 24) * scale,
      fontStyle: element.fontStyle || 'normal',
      fontWeight: element.fontWeight || 'normal',
      lineHeight: element.lineHeight || 1.3,
      textAlign: element.textAlign || 'center',
      underline: element.textDecoration === 'underline',
      objectCaching: false,
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
      objectCaching: false,
      textAlign: 'center',
    })
    return attachElementData(icon as FabricElementObject, element)
  }

  const objectSize = element.size * scale
  const objectWidth = (element.width || element.size) * scale
  const objectHeight = (element.height || element.size) * scale
  const defaults = {
    ...common,
    fill: element.kind === 'frame' ? 'rgba(255,255,255,0.22)' : element.color,
    stroke: element.strokeColor || (element.kind === 'frame' ? 'rgba(255,255,255,0.75)' : undefined),
    strokeDashArray: element.strokeDashArray,
    strokeWidth: element.strokeWidth !== undefined ? element.strokeWidth * scale : element.kind === 'frame' ? Math.max(2, 3 * scale) : 0,
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
    shape = new Rect({
      ...defaults,
      height: objectHeight,
      rx: element.item === 'rounded' ? Math.min(objectWidth, objectHeight) * 0.08 : 0,
      ry: element.item === 'rounded' ? Math.min(objectWidth, objectHeight) * 0.08 : 0,
      width: objectWidth,
    }) as FabricElementObject
  }

  return attachElementData(shape, element)
}

export function useFabricCanvas({ autosaveKey, autosaveName, canvasId, height, onSelectElement, width }: UseFabricCanvasOptions) {
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
    console.log('canvas element id:', canvas.lowerCanvasEl?.id)

    const onMutation = () => snapshotHistory(canvas)
    const onSelection = () => {
      const object = canvas.getActiveObject() as FabricElementObject | undefined
      onSelectElementRef.current?.(object?.data?.id || null)
    }

    canvas.on('object:added', onMutation)
    canvas.on('object:modified', onMutation)
    canvas.on('object:removed', onMutation)
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

  const addDesignElement = useCallback(async (element: DesignElement) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const object = await createFabricObject(element, sizeRef.current)
    applyControls(object)
    canvas.add(object)
    canvas.setActiveObject(object)
    if (object instanceof IText) {
      forceTextObjectRender(canvas, object)
    } else {
      canvas.renderAll()
      canvas.requestRenderAll()
    }
  }, [])

  const applyBackgroundImage = useCallback(async (imageUrl: string) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const image = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' })
    const size = sizeRef.current
    const coverScale = Math.max(size.w / (image.width || 1), size.h / (image.height || 1))
    image.set({
      evented: false,
      left: size.w / 2,
      originX: 'center',
      originY: 'center',
      scaleX: coverScale,
      scaleY: coverScale,
      selectable: false,
      top: size.h / 2,
    })
    image.setCoords()
    const backgroundObject = image as FabricElementObject
    backgroundObject.data = { id: `ai-background-${Date.now()}`, item: 'background', kind: 'image' }

    const describeObjects = () =>
      canvas.getObjects().map((object) => {
        const fabricObject = object as FabricElementObject & { id?: string; item?: string }
        return {
          type: object.type,
          item: fabricObject.data?.item ?? fabricObject.item,
          id: fabricObject.data?.id ?? fabricObject.id,
        }
      })

    console.log('canvas objects before:', describeObjects())

    const existingBackgrounds = canvas
      .getObjects()
      .filter((object) => {
        const fabricObject = object as FabricElementObject & { id?: string; item?: string }
        const item = fabricObject.data?.item ?? fabricObject.item
        const id = fabricObject.data?.id ?? fabricObject.id ?? ''
        return object.type === 'image' && item === 'background' && (id.startsWith('ai-background-') || /^image-background-\d+$/.test(id))
      })

    existingBackgrounds.forEach((object) => canvas.remove(object))
    canvas.add(backgroundObject)
    canvas.moveObjectTo(backgroundObject, 0)
    canvas.backgroundImage = image
    canvas.backgroundColor = '#ffffff'
    canvas.discardActiveObject()
    canvas.renderAll()
    canvas.requestRenderAll()
    console.log('ai bg z-index:', canvas.getObjects().indexOf(backgroundObject))
    console.log('canvas element id:', canvas.lowerCanvasEl?.id)
    console.log('canvas objects after:', describeObjects())
    console.log('background applied, rendering canvas')
    snapshotHistory(canvas)
  }, [snapshotHistory])

  const updateDesignElement = useCallback(async (id: string, changes: Partial<DesignElement>) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activeObject = canvas.getActiveObject() as FabricElementObject | undefined
    const activeTextObject = activeObject instanceof IText ? (activeObject as FabricElementObject) : undefined
    const idObject = canvas.getObjects().find((candidate) => (candidate as FabricElementObject).data?.id === id) as
      | FabricElementObject
      | undefined
    const object =
      (isTextStyleChange(changes) ? activeTextObject : undefined) ||
      (activeObject?.data?.id === id ? activeObject : undefined) ||
      idObject ||
      (changes.textContent !== undefined && activeObject && 'text' in activeObject ? activeObject : undefined)
    if (!object) return

    if (changes.imageUrl && object.type === 'image') {
      const replacement = await FabricImage.fromURL(changes.imageUrl, { crossOrigin: 'anonymous' })
      replacement.set({
        angle: object.angle,
        data: object.data,
        left: object.left,
        opacity: object.opacity,
        originX: 'center',
        originY: 'center',
        scaleX: object.scaleX,
        scaleY: object.scaleY,
        top: object.top,
      })
      applyControls(replacement as FabricElementObject)
      canvas.remove(object)
      canvas.add(replacement)
      canvas.setActiveObject(replacement)
      canvas.renderAll()
      return
    }

    const nextProps: Record<string, unknown> = {}
    if (changes.rotation !== undefined) nextProps.angle = changes.rotation
    if (changes.color !== undefined && object.type !== 'image') nextProps.fill = changes.color
    if (changes.backgroundColor !== undefined && object.type !== 'image') {
      nextProps.backgroundColor = changes.backgroundColor
    }
    if (changes.fontFamily !== undefined) {
      await loadTextFont(changes.fontFamily)
      nextProps.fontFamily = resolvedTextFontFamily(changes.fontFamily)
    }
    if (changes.fontSize !== undefined) nextProps.fontSize = changes.fontSize
    if (changes.fontStyle !== undefined) nextProps.fontStyle = changes.fontStyle
    if (changes.fontWeight !== undefined) nextProps.fontWeight = changes.fontWeight
    if (changes.lineHeight !== undefined) nextProps.lineHeight = changes.lineHeight
    if (changes.opacity !== undefined) nextProps.opacity = changes.opacity / 100
    if (changes.textAlign !== undefined) nextProps.textAlign = changes.textAlign
    if (changes.textDecoration !== undefined) nextProps.underline = changes.textDecoration === 'underline'
    if (changes.width !== undefined) nextProps.width = changes.width * elementScale(sizeRef.current)

    if (changes.textContent !== undefined && 'text' in object) {
      object.set({ text: changes.textContent })
      if (object instanceof IText) {
        object.initDimensions()
      }
    }

    object.set(nextProps)
    if (object instanceof IText) {
      forceTextObjectRender(canvas, object)
    } else {
      object.setCoords()
      canvas.renderAll()
      canvas.requestRenderAll()
    }
    if (changes.fontFamily !== undefined && object instanceof IText) {
      console.log('Font applied:', resolvedTextFontFamily(changes.fontFamily), 'to object:', object.text)
    }
  }, [])

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
      applyBackgroundImage,
      bringForward,
      deleteSelected,
      duplicateSelected,
      exportPNG,
      fabricRef,
      loadDesignElements,
      redo,
      sendBackward,
      undo,
      updateDesignElement,
    }),
    [
      addDesignElement,
      applyBackgroundImage,
      bringForward,
      deleteSelected,
      duplicateSelected,
      exportPNG,
      loadDesignElements,
      redo,
      sendBackward,
      undo,
      updateDesignElement,
    ]
  )
}
