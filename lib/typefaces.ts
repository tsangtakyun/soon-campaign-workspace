export type TypefaceDirection = {
  id: string
  label: string
  labelEn: string
  emoji: string
  tagline: string
  description: string
  recommendedFor: string[]
}

export type Typeface = {
  id: string
  directionId: string
  name: string
  nameEn: string
  fontFamily: string
  cdnUrl: string
  description: string
  recommendedFor: string[]
  weight: string
  isGoogleFont?: boolean
}

export const typefaceDirections: TypefaceDirection[] = [
  {
    id: 'handwriting',
    label: '手寫溫柔',
    labelEn: 'Handwritten Warmth',
    emoji: '🖊',
    tagline: '像朋友寫給你的字',
    description: '溫柔、自然、適合個人品牌和生活風格內容',
    recommendedFor: ['lifestyle', 'cafe', '小紅書', 'personal', 'founder', '溫暖', '親切', '手作', '個人品牌'],
  },
  {
    id: 'rounded',
    label: '圓潤親切',
    labelEn: 'Rounded Friendly',
    emoji: '⭕',
    tagline: '讓人想靠近的品牌感',
    description: '親民、可愛、適合餐飲、社群和生活品牌',
    recommendedFor: ['餐飲', 'food', 'community', '親民', '生活', '可愛', '親子', '社群', 'friendly'],
  },
  {
    id: 'gothic',
    label: '簡潔俐落',
    labelEn: 'Clean & Modern',
    emoji: '▪',
    tagline: '清晰、直接、有信任感',
    description: '乾淨、俐落、適合科技、產品和專業品牌',
    recommendedFor: ['tech', 'saas', 'B2B', '產品', '專業', '科技', '現代', 'professional', 'product'],
  },
  {
    id: 'editorial',
    label: '高級質感',
    labelEn: 'Premium Editorial',
    emoji: '📖',
    tagline: '像雜誌封面的精緻感',
    description: '高級、優雅、適合精品、文化和設計品牌',
    recommendedFor: ['premium', 'luxury', '精品', '文化', '設計', '高端', '雜誌', 'boutique', 'editorial'],
  },
  {
    id: 'poster',
    label: '大聲有力',
    labelEn: 'Bold Statement',
    emoji: '🔥',
    tagline: '讓人第一眼就記住',
    description: '有力、搶眼、適合促銷、短片封面和活動標題',
    recommendedFor: ['促銷', 'campaign', 'gen z', '短片', '潮流', '活動', '海報', 'entertainment', 'promotion'],
  },
  {
    id: 'impact',
    label: '方正衝擊',
    labelEn: 'Square Impact',
    emoji: '💥',
    tagline: '台港社交媒體最搶眼標題感',
    description: '方正、厚重、適合 YouTube 封面、短片標題和社交媒體爆款內容',
    recommendedFor: ['youtube', 'thumbnail', '短片封面', '爆款', 'gen z', '香港', '台灣', '社交媒體', 'viral'],
  },
]

export const typefaces: Typeface[] = [
  {
    id: 'jason-handwriting',
    directionId: 'handwriting',
    name: '清松手寫體',
    nameEn: 'Jason Handwriting',
    fontFamily: 'JasonHandwriting1-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/JasonHandWritingFonts@20240409/webfont/JasonHandwriting1-Regular.woff2',
    description: '真人手寫，最自然親切，適合 founder 故事和日常內容',
    recommendedFor: ['founder', 'personal', '真實', '日常', '故事', 'behind-the-scenes'],
    weight: 'regular',
  },
  {
    id: 'naikai',
    directionId: 'handwriting',
    name: '奈海字體',
    nameEn: 'Naikaifont',
    fontFamily: 'NaikaiFont-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/naikaifont@1.060/webfont/NaikaiFont-Regular.woff2',
    description: '日系風格最強，適合咖啡店、生活品牌',
    recommendedFor: ['cafe', 'lifestyle', '日系', '咖啡', '生活', '小紅書'],
    weight: 'regular',
  },
  {
    id: 'nani',
    directionId: 'handwriting',
    name: 'Nani字體',
    nameEn: 'Nanifont',
    fontFamily: 'NaniFont-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/nanifont@1.036/webfont/NaniFont-Regular.woff2',
    description: '輕盈可愛，適合年輕、社交平台內容',
    recommendedFor: ['年輕', '輕盈', '小紅書', 'instagram', '可愛', 'social'],
    weight: 'light',
  },
  {
    id: 'swei-gothic',
    directionId: 'rounded',
    name: '獅尾圓體',
    nameEn: 'Swei Gothic',
    fontFamily: 'SweiGothicCJKtc-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/swei-gothic@2.200/WebFont/CJK%20TC/SweiGothicCJKtc-Regular.woff2',
    description: '最完整的繁中圓體，百搭親民',
    recommendedFor: ['餐飲', '社群', '生活', 'community', 'food', 'lifestyle'],
    weight: 'regular',
  },
  {
    id: 'swei-fan-sans',
    directionId: 'rounded',
    name: '獅尾繁中黑體',
    nameEn: 'Swei Fan Sans',
    fontFamily: 'SweiFanSansCJKtc-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/swei-fan-sans@2.140/WebFont/CJK%20TC/SweiFanSansCJKtc-Regular.woff2',
    description: '現代親民，中英混排效果佳',
    recommendedFor: ['現代', '親民', 'UI', '中英混排', '品牌'],
    weight: 'regular',
  },
  {
    id: 'fake-pearl',
    directionId: 'rounded',
    name: '假珍珠',
    nameEn: 'FakePearl',
    fontFamily: 'FakePearl-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/FakePearl@1.00/webfont/FakePearl-Regular.woff2',
    description: '圓潤飽滿，適合親子、可愛、教育類品牌',
    recommendedFor: ['親子', '可愛', '教育', 'friendly', 'warm'],
    weight: 'regular',
  },
  {
    id: 'swei-fan-sans-gothic',
    directionId: 'gothic',
    name: '獅尾繁中黑體',
    nameEn: 'Swei Fan Sans',
    fontFamily: 'SweiFanSansCJKtc-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/swei-fan-sans@2.140/WebFont/CJK%20TC/SweiFanSansCJKtc-Regular.woff2',
    description: '無襯線，最適合 UI 標題和數碼產品',
    recommendedFor: ['tech', 'saas', 'UI', 'dashboard', '數碼', '產品'],
    weight: 'regular',
  },
  {
    id: 'swei-jay-serif',
    directionId: 'gothic',
    name: '獅尾簡中宋',
    nameEn: 'Swei Jay Serif',
    fontFamily: 'SweiJaySerifCJKtc-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/swei-jay-serif@2.0/WebFont/CJK%20TC/SweiJaySerifCJKtc-Regular.woff2',
    description: '宋體改造，中英混排俐落，適合專業內容',
    recommendedFor: ['中英混排', 'editorial', '專業', 'B2B', '內容'],
    weight: 'regular',
  },
  {
    id: 'chiron-hei',
    directionId: 'gothic',
    name: '昭源黑體',
    nameEn: 'Chiron Hei HK',
    fontFamily: 'ChironHeiHK-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/chiron-fonts/chiron-hei-hk@latest/woff2/ChironHeiHK-Regular.woff2',
    description: '香港繁中優化，現代筆形，最適合香港品牌',
    recommendedFor: ['香港', '品牌', '專業', '現代', 'hk', '繁中'],
    weight: 'regular',
  },
  {
    id: 'max-hana',
    directionId: 'editorial',
    name: '花園明朝',
    nameEn: 'Max Hana',
    fontFamily: 'HanaMinA',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/max-hana@1.1/webfont/HanaMinA.woff2',
    description: '傳統明朝，優雅文化感強',
    recommendedFor: ['傳統', '文化', '優雅', '藝術', 'boutique'],
    weight: 'regular',
  },
  {
    id: 'hana-meatball',
    directionId: 'editorial',
    name: '花園肉丸',
    nameEn: 'Hana Meatball',
    fontFamily: 'HanaMeatball-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/max-hana@1.1/webfont/HanaMeatball-Regular-Lite.woff2',
    description: '明體轉角變圓，現代 editorial 感',
    recommendedFor: ['高級', '雜誌', '精品', '現代', 'editorial', 'premium'],
    weight: 'regular',
  },
  {
    id: 'swei-jay-serif-editorial',
    directionId: 'editorial',
    name: '獅尾簡中宋（質感版）',
    nameEn: 'Swei Jay Serif',
    fontFamily: 'SweiJaySerifCJKtc-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/swei-jay-serif@2.0/WebFont/CJK%20TC/SweiJaySerifCJKtc-Regular.woff2',
    description: '思源宋體改造，高級內容感',
    recommendedFor: ['內容', 'luxury', '高端', '設計', 'brand'],
    weight: 'regular',
  },
  {
    id: 'bakudai',
    directionId: 'poster',
    name: '莫大毛筆',
    nameEn: 'Bakudaifont',
    fontFamily: 'Bakudai-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/bakudaifont@1.48/webfont/Bakudai-Regular.woff2',
    description: '日本書法家毛筆字，氣勢強，適合文化活動',
    recommendedFor: ['文化', '活動', '毛筆', '傳統', '書法', '藝術'],
    weight: 'bold',
  },
  {
    id: 'swei-gothic-bold',
    directionId: 'poster',
    name: '獅尾圓體粗版',
    nameEn: 'Swei Gothic ExtraBold',
    fontFamily: 'SweiGothicCJKtc-ExtraBold',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/swei-gothic@2.200/WebFont/CJK%20TC/SweiGothicCJKtc-ExtraBold.woff2',
    description: '現代海報感，適合廣告圖和促銷標題',
    recommendedFor: ['廣告', '促銷', '現代', '海報', 'social media', 'campaign'],
    weight: 'bold',
  },
  {
    id: 'hana-meatball-bold',
    directionId: 'poster',
    name: '花園肉丸粗版',
    nameEn: 'Hana Meatball Medium',
    fontFamily: 'HanaMeatball-Medium',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/max-hana@1.1/webfont/HanaMeatball-Medium.woff2',
    description: '高級海報感，適合品牌 campaign 標題',
    recommendedFor: ['品牌', '高級', 'campaign', 'gen z', '潮流', '短片'],
    weight: 'bold',
  },
  {
    id: 'dela-gothic',
    directionId: 'impact',
    name: '德拉黑體',
    nameEn: 'Dela Gothic One',
    fontFamily: 'Dela Gothic One',
    cdnUrl: 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&display=swap',
    description: '最有衝擊力，YouTube thumbnail 首選，方正厚重',
    recommendedFor: ['youtube', 'thumbnail', '短片封面', '爆款', 'viral', '香港', '台灣'],
    weight: 'bold',
    isGoogleFont: true,
  },
  {
    id: 'wd-xl',
    directionId: 'impact',
    name: 'WD-XL滑油字',
    nameEn: 'WD-XL Lubrifont',
    fontFamily: 'WD-XL-Lubrifont-TC-Regular',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/wentin/WD-XL-lubrifont@main/fonts/WD-XL-Lubrifont-TC-Regular.woff2',
    description: '圓潤大氣，方正感強，海報文宣首選',
    recommendedFor: ['海報', '文宣', '社交媒體', '方正', '活潑', 'gen z'],
    weight: 'bold',
  },
  {
    id: 'swei-gothic-extrabold-impact',
    directionId: 'impact',
    name: '獅尾超粗黑',
    nameEn: 'Swei Gothic ExtraBold',
    fontFamily: 'SweiGothicCJKtc-ExtraBold',
    cdnUrl: 'https://cdn.jsdelivr.net/gh/max32002/swei-gothic@2.200/WebFont/CJK%20TC/SweiGothicCJKtc-ExtraBold.woff2',
    description: '方正現代，最安全的粗黑體選擇',
    recommendedFor: ['現代', '安全', '品牌', '標題', '廣告'],
    weight: 'bold',
  },
]

export type TypefacePreset = Typeface

export function getTypefacePreset(id?: string | null) {
  return typefaces.find((typeface) => typeface.id === id) || typefaces[13]
}

export function getTypefaceCssWeight(weight?: string) {
  if (weight === 'bold') return 800
  if (weight === 'light') return 300
  return 500
}

export function getTypefaceFontFaceStyles() {
  return typefaces
    .filter((font) => !font.isGoogleFont)
    .map((font) => `
      @font-face {
        font-family: '${font.fontFamily}';
        src: url('${font.cdnUrl}') format('woff2');
        font-weight: ${getTypefaceCssWeight(font.weight)};
        font-style: normal;
        font-display: swap;
      }
    `)
    .join('\n')
}

export function getGoogleTypefaceLinks() {
  return typefaces.filter((font) => font.isGoogleFont).map((font) => font.cdnUrl)
}
