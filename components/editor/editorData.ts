import type { ChannelCaption, DesignTool, PostPlatform, TemplatePreset, TextStylePreset } from '@/components/editor/editorTypes'

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='220' viewBox='0 0 320 220'%3E%3Crect width='320' height='220' rx='18' fill='%23f3f4f6'/%3E%3Cpath d='M92 142l44-47 34 36 18-21 40 32H92z' fill='%23d9dde4'/%3E%3Ccircle cx='220' cy='76' r='18' fill='%23c8ced8'/%3E%3Crect x='88' y='58' width='144' height='104' rx='12' fill='none' stroke='%23c5cbd5' stroke-width='4'/%3E%3Ctext x='160' y='190' text-anchor='middle' font-family='Arial, sans-serif' font-size='18' fill='%238b929e'%3E參考圖片%3C/text%3E%3C/svg%3E"

export const FALLBACK_IMAGES = [
  '/photo-control/coffee-full-freedom.jpg',
  '/assets/content-strategies/photos/behind-the-scenes.jpg',
  '/assets/content-strategies/photos/lifestyle-content.jpg',
]

export const STOCK_MEDIA = [
  { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&q=80', label: '山景' },
  { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80', label: '人物' },
  { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80', label: '美食' },
  { url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&q=80', label: '購物' },
  { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80', label: '科技' },
  { url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=500&q=80', label: '自然' },
]

export const BRAND_COLORS = ['#1A1A1A', '#7A655B', '#8B4513', '#A0522D', '#F5F0EB']

export const CHANNELS: ChannelCaption[] = [
  {
    id: 'Instagram',
    label: 'Instagram',
    icon: 'IG',
    note: '輕鬆、口語、有畫面感，適合加 emoji 和短句。',
    limit: 2200,
  },
  {
    id: 'Facebook',
    label: 'Facebook',
    icon: 'f',
    note: '較完整、親切，適合補充故事背景並鼓勵留言。',
    limit: 33000,
  },
  {
    id: 'Threads',
    label: 'Threads',
    icon: 'Th',
    note: '文字更直接、有對話感，適合單張圖片配簡潔文字。',
    limit: 500,
  },
]

export const POST_PLATFORMS: PostPlatform[] = [
  { id: 'Instagram', icon: 'IG', label: 'Instagram', status: '未連接' },
  { id: 'Facebook', icon: 'f', label: 'Facebook', status: '未連接' },
  { id: 'Threads', icon: 'Th', label: 'Threads', status: '未連接' },
]

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'warm-story',
    title: '溫暖日常',
    description: '保留大相片作主角，用柔和文字建立親近感。',
    previewTitle: '日常片段',
    previewBody: '像朋友分享的一刻',
    accent: '#7A655B',
  },
  {
    id: 'bold-focus',
    title: '大字焦點',
    description: '用深色區塊托起 headline，適合強 hook 貼文。',
    previewTitle: '值得重播',
    previewBody: '把一句說話變成視覺中心',
    accent: '#111111',
  },
  {
    id: 'clean-brand',
    title: '品牌簡約',
    description: '文字、Logo、留白較平均，適合正式品牌內容。',
    previewTitle: 'SOON LOG',
    previewBody: '簡潔、清晰、有品牌感',
    accent: '#F5F0EB',
  },
]

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    label: 'Pop-Up',
    textContent: '重點提示',
    style: { background: '#111111', borderRadius: 8, color: '#ffffff', fontWeight: 'bold', padding: '5px 10px' },
  },
  {
    label: 'Story',
    textContent: '今日故事',
    style: { background: '#0ea5e9', color: '#ffffff', fontWeight: 'bold', padding: '5px 10px' },
  },
  {
    label: 'Offering',
    textContent: '精選內容',
    style: { color: '#2f3239', fontFamily: 'Georgia, serif' },
  },
  {
    label: 'Bold',
    textContent: '大膽標題',
    style: { color: '#111111', fontSize: 26, fontWeight: 900 },
  },
  {
    label: 'Minimal',
    textContent: '簡約文字',
    style: { color: '#555555', fontWeight: 300, letterSpacing: 2 },
  },
  {
    label: 'Release',
    textContent: '透明描邊',
    style: { color: 'transparent', fontWeight: 'bold', WebkitTextStroke: '1px #111111' },
  },
]

export const DISTINCT_TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    label: 'Pop-Up',
    textContent: '重點提示',
    style: {
      backgroundColor: 'rgba(0,0,0,0.55)',
      color: '#FFFFFF',
      fontSize: 20,
      fontStyle: 'normal',
      fontWeight: 'bold',
      textAlign: 'center',
    },
  },
  {
    label: 'Story',
    textContent: '今日故事',
    style: {
      color: '#FFFFFF',
      fontSize: 18,
      fontStyle: 'italic',
      fontWeight: 'normal',
      opacity: 0.9,
      textAlign: 'left',
    },
  },
  {
    label: 'Offering',
    textContent: '限時優惠',
    style: {
      color: '#FFD700',
      fontSize: 22,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  },
  {
    label: 'Bold',
    textContent: '大膽標題',
    style: {
      color: '#000000',
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  },
  {
    label: 'Minimal',
    textContent: '簡約文字',
    style: {
      color: '#CCCCCC',
      fontSize: 16,
      fontWeight: 'normal',
      textAlign: 'left',
    },
  },
  {
    label: 'Release',
    textContent: '新品上市',
    style: {
      color: '#000000',
      fontSize: 20,
      fontStyle: 'italic',
      fontWeight: 'bold',
      opacity: 0.85,
      textAlign: 'center',
    },
  },
]

export const DESIGN_TOOL_ITEMS: Array<[string, DesignTool]> = [
  ['⌘', '元素'],
  ['▧', '媒體'],
  ['A', '文字'],
  ['▦', '模板'],
  ['▨', '背景'],
  ['▣', '尺寸'],
  ['◇', '品牌'],
  ['⌲', '發布'],
]

export const SHAPE_ITEMS = [
  'circle',
  'square',
  'rounded',
  'triangle',
  'diamond',
  'pentagon',
  'hexagon',
  'octagon',
  'parallelogram',
  'trapezoid',
  'semicircle',
  'pill',
  'spark',
  'star',
  'starAlt',
  'burst',
  'plus',
  'arrowLeft',
  'arrowRight',
  'arrowUp',
  'arrowDown',
  'moon',
  'cloud',
  'bookmark',
]

export const FRAME_ITEMS = [
  'frameCircle',
  'frameSquare',
  'frameRound',
  'frameTriangle',
  'frameDiamond',
  'framePentagon',
  'frameHexagon',
  'frameOctagon',
  'frameSlant',
  'frameArch',
  'framePill',
  'frameStar',
  'frameBurst',
  'frameCross',
  'frameArrowLeft',
  'frameArrowRight',
  'frameArrowUp',
  'frameArrowDown',
]

export const ICON_ITEMS = [
  '◉',
  '▣',
  '♡',
  '◌',
  '▤',
  '⚙',
  '▧',
  '◍',
  '●',
  '◐',
  '▥',
  '▦',
  '⌘',
  '✦',
  '▰',
  '⌁',
  '✎',
  '▮',
  '◼',
  '⬢',
  '✣',
  '☀',
  '◑',
  '❄',
  '☕',
  '⌂',
  '✕',
  '◒',
  '−',
  '⌄',
  '⌃',
  '▶',
  '◷',
  '⚑',
  '🔗',
  '↻',
  '⬇',
]
