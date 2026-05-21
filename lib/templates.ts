export interface TemplateElement {
  type: 'background' | 'text' | 'image_placeholder' | 'image' | 'badge' | 'shape' | 'rect'
  bgColor?: string
  bgOpacity?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  rx?: number
  content?: string
  text?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  color?: string
  backgroundColor?: string
  bgPadding?: number
  textAlign?: 'left' | 'center' | 'right'
  align?: 'left' | 'center' | 'right'
  placeholder?: boolean
  optional?: boolean
  label?: string
  x?: number
  y?: number
  w?: number
  h?: number
}

export interface Template {
  id: string
  name: string
  category: string
  type: 'Single' | 'Carousel'
  style: 'Minimal' | 'Bold' | 'Editorial'
  mood?: string
  thumbnail: string
  elements: TemplateElement[]
}

export const templates: Template[] = [
  {
    id: 'wordplay-product',
    name: '食字標題 + 產品',
    category: 'Lifestyle',
    type: 'Single',
    style: 'Bold',
    thumbnail: '/templates/wordplay-product.jpg',
    elements: [
      { type: 'background', bgColor: '#ffffff' },
      {
        type: 'text',
        content: '副標題文字',
        fontSize: 16,
        fontWeight: 'normal',
        color: '#222222',
        textAlign: 'right',
        x: 0.35, y: 0.08, w: 0.60, h: 0.08,
      },
      {
        type: 'text',
        content: '看我今天\n枕麼說',
        fontSize: 52,
        fontWeight: 'bold',
        color: '#111111',
        textAlign: 'left',
        x: 0.05, y: 0.15, w: 0.90, h: 0.28,
      },
      {
        type: 'image_placeholder',
        label: '產品主圖',
        x: 0.05, y: 0.42, w: 0.60, h: 0.38,
      },
      {
        type: 'text',
        content: '產品名稱',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111111',
        textAlign: 'left',
        x: 0.60, y: 0.72, w: 0.38, h: 0.08,
      },
      {
        type: 'badge',
        content: '再創低價',
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        backgroundColor: '#e63329',
        x: 0.60, y: 0.82, w: 0.38, h: 0.08,
      },
    ],
  },
  {
    id: 'fullbleed-bottom-text',
    name: '全圖 + 左下大字',
    category: 'Lifestyle',
    type: 'Single',
    style: 'Minimal',
    thumbnail: '/templates/fullbleed-bottom-text.jpg',
    elements: [
      {
        type: 'image_placeholder',
        label: '全版背景圖',
        x: 0, y: 0, w: 1, h: 1,
      },
      {
        type: 'text',
        content: '乜＿都貴',
        fontSize: 56,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'left',
        x: 0.05, y: 0.78, w: 0.90, h: 0.18,
      },
    ],
  },
  {
    id: 'promo-block',
    name: '促銷 Block 疊圖',
    category: 'Promotion',
    type: 'Single',
    style: 'Bold',
    thumbnail: '/templates/promo-blocks.jpg',
    elements: [
      {
        type: 'image_placeholder',
        label: '全版背景圖',
        x: 0, y: 0, w: 1, h: 1,
      },
      {
        type: 'text',
        content: '只有 [品牌]',
        fontSize: 36,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        x: 0.05, y: 0.08, w: 0.90, h: 0.10,
      },
      {
        type: 'rect',
        fill: '#cc0008',
        stroke: '#ffffff',
        strokeWidth: 3,
        x: 0.10, y: 0.24, w: 0.80, h: 0.22,
      },
      {
        type: 'text',
        content: '再創',
        fontSize: 72,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        x: 0.10, y: 0.24, w: 0.80, h: 0.22,
      },
      {
        type: 'rect',
        fill: '#cc0008',
        stroke: '#ffffff',
        strokeWidth: 3,
        x: 0.10, y: 0.47, w: 0.80, h: 0.22,
      },
      {
        type: 'text',
        content: '低價',
        fontSize: 72,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        x: 0.10, y: 0.47, w: 0.80, h: 0.22,
      },
      {
        type: 'rect',
        fill: '#cc0008',
        stroke: '#ffffff',
        strokeWidth: 3,
        x: 0.10, y: 0.71, w: 0.80, h: 0.14,
      },
      {
        type: 'text',
        content: 'New lower price',
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        x: 0.10, y: 0.71, w: 0.80, h: 0.14,
      },
    ],
  },
  {
    id: 'pure-product-photo',
    name: '純產品特寫（無字）',
    category: 'Food',
    type: 'Single',
    style: 'Minimal',
    thumbnail: '/templates/pure-product-photo.jpg',
    elements: [
      {
        type: 'image_placeholder',
        label: '產品主圖',
        x: 0, y: 0, w: 1, h: 1,
      },
    ],
  },
  {
    id: 'visual-only',
    name: '純視覺衝擊',
    category: '產品',
    mood: '生活',
    type: 'Single',
    style: 'Minimal',
    thumbnail: '#1a1a1a',
    elements: [
      {
        type: 'image',
        x: 0, y: 0, w: 1.0, h: 1.0,
        placeholder: true,
        label: '產品主圖（建議俯拍/特寫）',
      },
    ],
  },
  {
    id: 'white-quote',
    name: '白底對白 + 產品',
    category: 'Storytelling',
    type: 'Single',
    style: 'Editorial',
    thumbnail: '/templates/cold-joke-quote.jpg',
    elements: [
      { type: 'background', bgColor: '#ffffff' },
      {
        type: 'text',
        content: '「你知唔知\n點解海係藍色嘅？」',
        fontSize: 28,
        fontWeight: 'bold',
        color: '#0064d2',
        textAlign: 'left',
        x: 0.05, y: 0.08, w: 0.60, h: 0.30,
      },
      {
        type: 'image_placeholder',
        label: '產品主圖',
        x: 0.05, y: 0.38, w: 0.90, h: 0.48,
      },
      {
        type: 'rect',
        x: 0.08, y: 0.50, w: 0.22, h: 0.09,
        fill: '#f5c400',
        rx: 8,
        optional: true,
        label: '系列 Badge（選填）',
      },
      {
        type: 'text',
        x: 0.08, y: 0.50, w: 0.22, h: 0.09,
        text: 'EP.1',
        fontSize: 26,
        fontWeight: 'bold',
        fill: '#1a1a1a',
        align: 'center',
        optional: true,
      },
      {
        type: 'badge',
        content: '字幕文字',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        backgroundColor: '#111111',
        x: 0.05, y: 0.88, w: 0.90, h: 0.09,
      },
    ],
  },
]
