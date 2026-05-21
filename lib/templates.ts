export interface TemplateElement {
  type: 'background' | 'text' | 'image_placeholder' | 'badge' | 'shape'
  bgColor?: string
  bgOpacity?: number
  content?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  color?: string
  backgroundColor?: string
  bgPadding?: number
  textAlign?: 'left' | 'center' | 'right'
  x?: number
  y?: number
  w?: number
  h?: number
}

export interface Template {
  id: string
  name: string
  category: 'Food' | 'Lifestyle' | 'Promotion' | 'Storytelling'
  type: 'Single' | 'Carousel'
  style: 'Minimal' | 'Bold' | 'Editorial'
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
    thumbnail: '#ffffff',
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
    thumbnail: '#8b8b8b',
    elements: [
      {
        type: 'image_placeholder',
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
    id: 'promo-blocks',
    name: '促銷 Block 疊圖',
    category: 'Promotion',
    type: 'Single',
    style: 'Bold',
    thumbnail: '#e63329',
    elements: [
      {
        type: 'image_placeholder',
        x: 0, y: 0, w: 1, h: 1,
      },
      {
        type: 'text',
        content: '只有 SOON',
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        x: 0.05, y: 0.05, w: 0.90, h: 0.12,
      },
      {
        type: 'badge',
        content: '再創',
        fontSize: 52,
        fontWeight: 'bold',
        color: '#ffffff',
        backgroundColor: '#e63329',
        x: 0.10, y: 0.20, w: 0.80, h: 0.22,
      },
      {
        type: 'badge',
        content: '低價',
        fontSize: 52,
        fontWeight: 'bold',
        color: '#ffffff',
        backgroundColor: '#e63329',
        x: 0.10, y: 0.45, w: 0.80, h: 0.22,
      },
      {
        type: 'badge',
        content: 'New lower price',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        backgroundColor: '#e63329',
        x: 0.10, y: 0.70, w: 0.80, h: 0.16,
      },
    ],
  },
  {
    id: 'pure-product-photo',
    name: '純產品特寫（無字）',
    category: 'Food',
    type: 'Single',
    style: 'Minimal',
    thumbnail: '#f5a623',
    elements: [
      {
        type: 'image_placeholder',
        x: 0, y: 0, w: 1, h: 1,
      },
    ],
  },
  {
    id: 'cold-joke-quote',
    name: '白底對白 + 產品',
    category: 'Storytelling',
    type: 'Single',
    style: 'Editorial',
    thumbnail: '#ffffff',
    elements: [
      { type: 'background', bgColor: '#ffffff' },
      {
        type: 'text',
        content: '「你知唔知\n點解海係藍色嘅？」',
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111111',
        textAlign: 'left',
        x: 0.05, y: 0.08, w: 0.60, h: 0.30,
      },
      {
        type: 'image_placeholder',
        x: 0.05, y: 0.38, w: 0.90, h: 0.48,
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
