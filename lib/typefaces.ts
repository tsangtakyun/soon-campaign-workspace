export type TypefacePreset = {
  id: string
  title: string
  subtitle: string
  moodZh: string
  bestFor: string
  fontFamily: string
  weight: number
  letterSpacing: string
}

const sans = 'Arial, "Helvetica Neue", Helvetica, sans-serif'
const serif = 'Georgia, "Times New Roman", Times, serif'
const mono = '"Courier New", Courier, monospace'

export const typefacePresets: TypefacePreset[] = [
  { id: 'franklin-gothic', title: 'Franklin Gothic', subtitle: 'Neue Haas Unica W1G', moodZh: '新聞感、直接、有力量', bestFor: '短句 headline、sale graphic、社交封面', fontFamily: '"Franklin Gothic Medium", Arial, sans-serif', weight: 800, letterSpacing: '-0.01em' },
  { id: 'gotham', title: 'Gotham', subtitle: 'Geometric Sans', moodZh: '現代、乾淨、商業感強', bestFor: '品牌 campaign、科技產品、清晰 CTA', fontFamily: 'Avenir, Montserrat, "Helvetica Neue", Arial, sans-serif', weight: 760, letterSpacing: '-0.01em' },
  { id: 'helvetica', title: 'Helvetica', subtitle: 'Classic Neutral', moodZh: '中性、穩陣、易讀', bestFor: '任何品牌基礎視覺、caption、資訊型內容', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', weight: 680, letterSpacing: '0' },
  { id: 'panache', title: 'Panache ITC Pro', subtitle: 'Editorial Display', moodZh: '高級、雜誌感、精品', bestFor: '美容、時裝、生活方式品牌', fontFamily: 'Didot, "Bodoni 72", Georgia, serif', weight: 700, letterSpacing: '-0.01em' },
  { id: 'block-w1g', title: 'Block W1G', subtitle: 'Heavy Poster', moodZh: '粗體、街頭、強記憶點', bestFor: '爆款 hook、挑戰、限時活動', fontFamily: 'Impact, "Arial Black", Arial, sans-serif', weight: 900, letterSpacing: '0' },
  { id: 'akzidenz', title: 'Akzidenz-Grotesk Next', subtitle: 'Swiss Grotesk', moodZh: '專業、理性、設計感', bestFor: 'B2B、顧問、策略內容', fontFamily: '"Helvetica Neue", Arial, sans-serif', weight: 620, letterSpacing: '0' },
  { id: 'avenir', title: 'Avenir Next', subtitle: 'Warm Geometric', moodZh: '親和、現代、生活感', bestFor: '生活方式、app、服務品牌', fontFamily: 'Avenir, "Avenir Next", Arial, sans-serif', weight: 720, letterSpacing: '-0.01em' },
  { id: 'futura', title: 'Futura', subtitle: 'Pure Geometric', moodZh: '幾何、年輕、時尚', bestFor: '時裝、活動、潮流產品', fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif', weight: 760, letterSpacing: '0.01em' },
  { id: 'din', title: 'DIN', subtitle: 'Industrial Sans', moodZh: '硬朗、工程感、可靠', bestFor: '運動、工具、性能產品', fontFamily: '"DIN Alternate", "Arial Narrow", Arial, sans-serif', weight: 760, letterSpacing: '0.01em' },
  { id: 'trade-gothic', title: 'Trade Gothic', subtitle: 'Condensed Editorial', moodZh: '窄身、硬淨、廣告感', bestFor: '直式 Reels 字幕、poster headline', fontFamily: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif', weight: 800, letterSpacing: '0.01em' },
  { id: 'inter', title: 'Inter', subtitle: 'Interface Sans', moodZh: '清楚、產品感、數碼感', bestFor: 'SaaS、app、教學內容', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', weight: 720, letterSpacing: '-0.01em' },
  { id: 'geist', title: 'Geist', subtitle: 'Modern System', moodZh: '簡潔、科技、乾淨', bestFor: 'AI、系統、內部工具品牌', fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', weight: 720, letterSpacing: '-0.01em' },
  { id: 'sf-pro', title: 'SF Pro', subtitle: 'Apple System', moodZh: '高完成度、介面感、輕巧', bestFor: 'app launch、product demo、UX 內容', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif', weight: 720, letterSpacing: '-0.01em' },
  { id: 'segoe', title: 'Segoe UI', subtitle: 'Soft System', moodZh: '柔和、易讀、穩定', bestFor: '教育、服務、日常內容', fontFamily: '"Segoe UI", Arial, sans-serif', weight: 700, letterSpacing: '0' },
  { id: 'verdana', title: 'Verdana', subtitle: 'Screen Friendly', moodZh: '清晰、網頁感、親切', bestFor: '資訊圖、教學、長 caption', fontFamily: 'Verdana, Geneva, sans-serif', weight: 700, letterSpacing: '-0.01em' },
  { id: 'trebuchet', title: 'Trebuchet MS', subtitle: 'Humanist Sans', moodZh: '輕鬆、社交、活潑', bestFor: '社群互動、餐飲、生活內容', fontFamily: '"Trebuchet MS", Arial, sans-serif', weight: 760, letterSpacing: '-0.01em' },
  { id: 'tahoma', title: 'Tahoma', subtitle: 'Compact Sans', moodZh: '實用、緊湊、易掃讀', bestFor: '大量資訊、比較表、字幕', fontFamily: 'Tahoma, Geneva, sans-serif', weight: 720, letterSpacing: '0' },
  { id: 'optima', title: 'Optima', subtitle: 'Luxury Humanist', moodZh: '優雅、溫和、高級', bestFor: '美容、健康、文化體驗', fontFamily: 'Optima, Candara, "Trebuchet MS", sans-serif', weight: 650, letterSpacing: '0' },
  { id: 'gill-sans', title: 'Gill Sans', subtitle: 'British Humanist', moodZh: '經典、文化、親切', bestFor: '文化品牌、生活專欄、故事內容', fontFamily: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif', weight: 700, letterSpacing: '0' },
  { id: 'calibri', title: 'Calibri', subtitle: 'Soft Corporate', moodZh: '圓潤、商務、低壓', bestFor: 'B2B、簡報、顧問服務', fontFamily: 'Calibri, Candara, Segoe, sans-serif', weight: 720, letterSpacing: '0' },
  { id: 'century-gothic', title: 'Century Gothic', subtitle: 'Rounded Geometric', moodZh: '圓潤、明亮、親民', bestFor: '親子、健康、生活用品', fontFamily: '"Century Gothic", Futura, Arial, sans-serif', weight: 760, letterSpacing: '0' },
  { id: 'arial-black', title: 'Arial Black', subtitle: 'Heavy Social', moodZh: '大聲、直接、非常搶眼', bestFor: '促銷、meme、challenge', fontFamily: '"Arial Black", Arial, sans-serif', weight: 900, letterSpacing: '-0.01em' },
  { id: 'impact', title: 'Impact', subtitle: 'Meme Poster', moodZh: 'meme 感、爆炸力、短促', bestFor: '搞笑、反主流、hot take', fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', weight: 900, letterSpacing: '0' },
  { id: 'cooper', title: 'Cooper Black', subtitle: 'Retro Friendly', moodZh: '復古、可愛、厚實', bestFor: '餐飲、咖啡、可愛品牌', fontFamily: '"Cooper Black", Georgia, serif', weight: 900, letterSpacing: '0' },
  { id: 'baskerville', title: 'Baskerville', subtitle: 'Classic Serif', moodZh: '可信、文學、成熟', bestFor: '文化、教育、深度內容', fontFamily: 'Baskerville, "Libre Baskerville", Georgia, serif', weight: 700, letterSpacing: '-0.01em' },
  { id: 'georgia', title: 'Georgia', subtitle: 'Readable Serif', moodZh: '溫暖、易讀、內容感', bestFor: 'blog、newsletter、品牌故事', fontFamily: serif, weight: 720, letterSpacing: '-0.01em' },
  { id: 'times', title: 'Times New Roman', subtitle: 'Classic News', moodZh: '正式、報章、傳統', bestFor: '新聞感、評論、權威內容', fontFamily: '"Times New Roman", Times, serif', weight: 760, letterSpacing: '-0.01em' },
  { id: 'palatino', title: 'Palatino', subtitle: 'Book Serif', moodZh: '書本感、柔和、古典', bestFor: '文化體驗、長文、品牌理念', fontFamily: 'Palatino, "Palatino Linotype", Georgia, serif', weight: 700, letterSpacing: '-0.01em' },
  { id: 'garamond', title: 'Garamond', subtitle: 'Heritage Serif', moodZh: '細膩、傳統、藝術', bestFor: '藝術、香水、精品餐飲', fontFamily: 'Garamond, "Times New Roman", serif', weight: 760, letterSpacing: '-0.01em' },
  { id: 'didot', title: 'Didot', subtitle: 'Fashion Serif', moodZh: '時尚、高級、銳利', bestFor: 'fashion、beauty、editorial cover', fontFamily: 'Didot, "Bodoni 72", Georgia, serif', weight: 760, letterSpacing: '-0.02em' },
  { id: 'bodoni', title: 'Bodoni 72', subtitle: 'Luxury Contrast', moodZh: '奢華、精品、對比強', bestFor: '高端產品、品牌形象片', fontFamily: '"Bodoni 72", Didot, Georgia, serif', weight: 760, letterSpacing: '-0.02em' },
  { id: 'american-typewriter', title: 'American Typewriter', subtitle: 'Editorial Type', moodZh: '手稿、紀錄、真實', bestFor: '幕後、旅遊、紀錄片感內容', fontFamily: '"American Typewriter", Georgia, serif', weight: 760, letterSpacing: '-0.01em' },
  { id: 'courier', title: 'Courier New', subtitle: 'Typewriter Mono', moodZh: '紀錄、檔案、原始感', bestFor: 'case study、before/after、調查內容', fontFamily: mono, weight: 760, letterSpacing: '-0.02em' },
  { id: 'monaco', title: 'Monaco', subtitle: 'Tech Mono', moodZh: '程式、科技、精準', bestFor: 'AI、數據、系統功能內容', fontFamily: 'Monaco, Consolas, "Courier New", monospace', weight: 700, letterSpacing: '-0.02em' },
  { id: 'menlo', title: 'Menlo', subtitle: 'Developer Mono', moodZh: '技術、產品、清楚', bestFor: 'dashboard、產品教學、數據拆解', fontFamily: 'Menlo, Monaco, Consolas, monospace', weight: 700, letterSpacing: '-0.02em' },
  { id: 'copperplate', title: 'Copperplate', subtitle: 'Boutique Caps', moodZh: '精品、徽章、儀式感', bestFor: '餐飲、會員、premium offer', fontFamily: 'Copperplate, "Copperplate Gothic Light", serif', weight: 760, letterSpacing: '0.02em' },
  { id: 'marker-felt', title: 'Marker Felt', subtitle: 'Handmade Casual', moodZh: '手寫、親切、輕鬆', bestFor: 'community、behind the scenes、餐飲', fontFamily: '"Marker Felt", "Comic Sans MS", cursive', weight: 760, letterSpacing: '0' },
  { id: 'chalkboard', title: 'Chalkboard', subtitle: 'Friendly Hand', moodZh: '可愛、教育、生活', bestFor: '教學、親子、健康貼士', fontFamily: '"Chalkboard SE", "Comic Sans MS", cursive', weight: 760, letterSpacing: '0' },
  { id: 'bradley-hand', title: 'Bradley Hand', subtitle: 'Personal Script', moodZh: '個人、溫度、手帳感', bestFor: '個人品牌、故事、日常紀錄', fontFamily: '"Bradley Hand", "Comic Sans MS", cursive', weight: 760, letterSpacing: '-0.01em' },
  { id: 'snell', title: 'Snell Roundhand', subtitle: 'Luxury Script', moodZh: '優雅、手寫、禮物感', bestFor: '婚禮、美容、節日 campaign', fontFamily: '"Snell Roundhand", cursive', weight: 760, letterSpacing: '-0.01em' },
  { id: 'brush-script', title: 'Brush Script', subtitle: 'Expressive Script', moodZh: '復古、熱情、手寫招牌', bestFor: '餐飲、活動、懷舊品牌', fontFamily: '"Brush Script MT", cursive', weight: 760, letterSpacing: '0' },
  { id: 'papyrus', title: 'Papyrus', subtitle: 'Organic Display', moodZh: '自然、手作、文化', bestFor: '健康、瑜伽、手工藝', fontFamily: 'Papyrus, fantasy', weight: 760, letterSpacing: '0' },
  { id: 'hoefler', title: 'Hoefler Text', subtitle: 'Premium Serif', moodZh: '精緻、成熟、出版感', bestFor: '高端服務、文化、長文內容', fontFamily: '"Hoefler Text", Georgia, serif', weight: 760, letterSpacing: '-0.01em' },
  { id: 'lucida-grande', title: 'Lucida Grande', subtitle: 'Soft UI', moodZh: '親和、穩定、app 感', bestFor: '平台產品、功能介紹', fontFamily: '"Lucida Grande", "Lucida Sans Unicode", sans-serif', weight: 720, letterSpacing: '-0.01em' },
  { id: 'lucida-console', title: 'Lucida Console', subtitle: 'Compact Mono', moodZh: '技術、細節、規格', bestFor: 'feature list、數據、debug 風格', fontFamily: '"Lucida Console", Monaco, monospace', weight: 700, letterSpacing: '-0.02em' },
  { id: 'arial-rounded', title: 'Arial Rounded', subtitle: 'Soft Bold', moodZh: '圓潤、可親、年輕', bestFor: '生活、健康、親子、可愛產品', fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif', weight: 820, letterSpacing: '-0.01em' },
  { id: 'system-clean', title: 'System Clean', subtitle: 'Universal Sans', moodZh: '最安全、最高可讀性', bestFor: '跨平台廣告、所有渠道', fontFamily: sans, weight: 760, letterSpacing: '-0.01em' },
  { id: 'system-editorial', title: 'System Editorial', subtitle: 'Serif Blend', moodZh: '內容感、可靠、安靜', bestFor: 'blog、newsletter、authority content', fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', weight: 720, letterSpacing: '-0.01em' },
  { id: 'system-mono', title: 'System Mono', subtitle: 'Mono Blend', moodZh: '數據、規格、現代', bestFor: '產品規格、AI、數據內容', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', weight: 720, letterSpacing: '-0.02em' },
  { id: 'condensed-bold', title: 'Condensed Bold', subtitle: 'Poster Stack', moodZh: '窄身、有衝擊、適合手機', bestFor: 'IG Reel 封面、短句 hook', fontFamily: '"Arial Narrow", Impact, Arial, sans-serif', weight: 900, letterSpacing: '0.01em' },
]

export function getTypefacePreset(id?: string | null) {
  return typefacePresets.find((preset) => preset.id === id) || typefacePresets[4]
}
