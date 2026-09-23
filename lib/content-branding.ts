import { typefaces } from './typefaces';
export const localTypefaceFiles: Record<string, string> = {
  "jason-handwriting": "JasonHandwriting1-Regular.woff2",
  naikai: "NaikaiFont-Regular.woff2",
  nani: "NaniFont-Regular.woff2",
  "swei-gothic": "SweiGothicCJKtc-Regular.ttf",
  "swei-fan-sans": "SweiFanSansCJKtc-Regular.woff2",
  "fake-pearl": "FakePearl-Regular.woff2",
  "swei-fan-sans-gothic": "SweiFanSansCJKtc-Regular.woff2",
  "swei-jay-serif": "SweiJaySerifCJKtc-Regular.woff2",
  "max-hana": "B2Hana-Regular.woff2",
  "hana-meatball": "HanaMeatball-Regular.woff2",
  "swei-jay-serif-editorial": "SweiJaySerifCJKtc-Regular.woff2",
  bakudai: "Bakudai-Bold.woff2",
  "swei-gothic-bold": "SweiGothicCJKtc-Bold.woff2",
  "hana-meatball-bold": "HanaMeatball-Regular.woff2",
  "swei-gothic-extrabold-impact": "SweiGothicCJKtc-Bold.woff2",
};

type BrandSettings = { logo_url?: string | null; font_style?: string | null; typeface_family?: string | null; typeface_id?: string | null };
export function findBrandTypeface(value?: string | null) {
  const aliases: Record<string, string> = { gensenrounded2: 'swei-gothic', 'gensenrounded2 / 系統圓體': 'swei-gothic', '系統圓體': 'swei-gothic', nanifont: 'nani' };
  const key = String(value || '').trim().toLowerCase();
  const resolved = aliases[key] || key;
  return typefaces.find(font => font.id.toLowerCase() === resolved || font.fontFamily.toLowerCase() === resolved) || null;
}
export function resolveContentBranding(workspace?: BrandSettings | null, kit?: BrandSettings | null) {
  return {
    logoUrl: workspace?.logo_url || kit?.logo_url || null,
    fontStyle: workspace?.font_style || kit?.typeface_family || kit?.typeface_id || null,
  };
}

// Editorial directions are not reader-facing copy. Do not invent replacement copy.
export function readerFacingCopy(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.split(/\n/u).map(line => {
    const direction = line.match(/^(?:副題|副標題|主標題|主標|標題|內文|CTA|收尾)(?:點明|說明|帶出|強調|交代|呈現|提醒)[：:，,\s]*(.*)$/iu);
    if (direction) {
      const quoted = direction[1].match(/^[「“](.*)[」”][。.!！]?$/u);
      return quoted ? quoted[1] : '';
    }
    return line.replace(/^(?:副題|副標題|主標題|主標)[：:]\s*/u, '');
  }).filter(Boolean).join('\n');
}
