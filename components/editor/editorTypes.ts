import type { CSSProperties } from 'react'

export type ScheduledPost = {
  id: string
  type: '靜態圖片' | '文章' | '短影片'
  postType?: string
  scheduledAt?: string | null
  time: string
  title: string
  body: string
  image: string
  media?: string[]
  publishStatus?: Record<string, { at?: string; message?: string; status?: string }>
  status: '新內容' | '草稿' | '已批准' | '已確認' | '已排程' | '已發布'
}

export type TopicReference = {
  id: string
  image: string
}

export type PreviewChannel = 'Instagram' | 'Facebook' | 'Threads'

export type ChannelCaption = {
  id: PreviewChannel
  label: string
  icon: string
  note: string
  limit: number
}

export type DesignTool = '元素' | '媒體' | '文字' | '尺寸' | '品牌' | '儲存'
export type ElementSection = 'shapes' | 'frames' | 'icons'
export type DesignElementKind = 'shape' | 'frame' | 'icon' | 'text' | 'image'
export type TextPreset = 'heading' | 'subheading' | 'body' | 'caption'

export type CanvasSize = {
  label: string
  w: number
  h: number
}

export type DesignElement = {
  id: string
  kind: DesignElementKind
  item: string
  label: string
  x: number
  y: number
  size: number
  rotation: number
  opacity: number
  color: string
  zIndex: number
  textContent?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline'
  textAlign?: 'left' | 'center' | 'right'
  width?: number
  height?: number
  lineHeight?: number
  imageUrl?: string
}

export type TextStylePreset = {
  label: string
  textContent: string
  style: CSSProperties
}
