export function resolveClearMagazineRole(draft: { headline?: string; subheadline?: string; body?: string[]; templateArtboardId?: string; assetIds?: string[]; assetId?: string; role?: string; layout?: string }, index: number, total: number): 'cover' | 'end' | 'comparison' | 'longform' | 'split' | 'feature' {
  if (index === 0) return 'cover';
  if (index === total - 1) return 'end';
  const roles = { '01_COVER': 'cover', '02_FULL_BLEED_TEXT': 'longform', '03_IMAGE_TOP_TEXT_BOTTOM': 'split', '04_COMPARISON': 'comparison', '05_LEFT_TEXT_RIGHT_IMAGE': 'feature', '06_END_CTA': 'end' } as const;
  const role = roles[draft.templateArtboardId as keyof typeof roles];
  if (role) return role;
  const requested = String(draft.role || draft.layout || '').toLowerCase();
  // Role selection is explicit. Words such as "不同" or a second photo must
  // not silently override the confirmed artboard during export.
  return requested === 'longform' || requested === 'split' || requested === 'feature' || requested === 'comparison' ? requested : 'longform';
}

export const clearMagazineCarouselV1 = {
  code: "clear-magazine-carousel-v1",
  sourceStyleCode: "clear_magazine_carousel",
  version: 1,
  output: { width: 1080, height: 1350, ratio: "4:5" },
  previewPath: "/templates/clear-magazine-carousel-v1/style-preview-square.png",
  previewPages: [
    "/templates/clear-magazine-carousel-v1/01-cover.png",
    "/templates/clear-magazine-carousel-v1/02-content.png",
    "/templates/clear-magazine-carousel-v1/03-content.png",
    "/templates/clear-magazine-carousel-v1/04-content.png",
    "/templates/clear-magazine-carousel-v1/05-content.png",
    "/templates/clear-magazine-carousel-v1/06-end.png",
  ],
  bodyPunctuation: "line-breaks-only",
  // Local artboard coordinates extracted from the source PSD. These values are
  // the rendering contract; semantic role selection may vary, geometry may not.
  layout: {
    chrome: {
      logo: { x: 66, y: 59, width: 73, height: 70 },
      pageNumber: { x: 886, y: 58, width: 96, height: 26 },
      swipe: { x: 886, y: 1235, width: 102, height: 59 },
    },
    cover: {
      image: { x: 0, y: 0, width: 1080, height: 1350 },
      eyebrow: { x: 76, y: 919, width: 760, height: 38 },
      headline: { x: 73, y: 982, width: 763, height: 184 },
      body: { x: 72, y: 1199, width: 749, height: 37 },
    },
    longform: {
      image: { x: -24, y: -443, width: 1202, height: 2136, opacity: 0.5 },
      eyebrow: { x: 74, y: 163, width: 214, height: 38 },
      headline: { x: 76, y: 242, width: 927, height: 167 },
      body: { x: 83, y: 450, width: 743, height: 436 },
    },
    split: {
      image: { x: 72, y: 145, width: 936, height: 545 },
      eyebrow: { x: 74, y: 738, width: 218, height: 38 },
      headline: { x: 74, y: 785, width: 900, height: 100 },
      body: { x: 74, y: 885, width: 900, height: 260 },
    },
    comparison: {
      eyebrow: { x: 74, y: 163, width: 155, height: 38 },
      headline: { x: 206, y: 258, width: 658, height: 143 },
      leftCard: { x: 158, y: 405, width: 337, height: 386 },
      rightCard: { x: 576, y: 405, width: 337, height: 386 },
      leftImage: { x: 207, y: 491, width: 244, height: 282 },
      rightImage: { x: 577, y: 505, width: 328, height: 240 },
      leftLabel: { x: 158, y: 434, width: 337, height: 37 },
      rightLabel: { x: 576, y: 435, width: 337, height: 37 },
      body: { x: 158, y: 819, width: 768, height: 299 },
    },
    feature: {
      image: { x: 537, y: 244, width: 941, height: 889 },
      eyebrow: { x: 74, y: 163, width: 157, height: 38 },
      headline: { x: 74, y: 256, width: 451, height: 215 },
      body: { x: 74, y: 533, width: 428, height: 608 },
    },
    end: {
      eyebrow: { x: 75, y: 163, width: 156, height: 37 },
      headline: { x: 65, y: 235, width: 935, height: 155 },
      body: { x: 64, y: 405, width: 765, height: 247 },
      image: { x: 72, y: 752, width: 690, height: 535 },
      ctaBox: { x: 829, y: 1195, width: 179, height: 70 },
      ctaText: { x: 839, y: 1214, width: 159, height: 31 },
    },
  },
  pages: [
    { role: "cover", layers: ["EYEBROW", "HEADLINE", "BODY", "PAGE_NUMBER", "CTA_ARROW", "LOGO", "IMAGE_MAIN"] },
    { role: "longform", layers: ["EYEBROW", "HEADLINE", "BODY", "PAGE_NUMBER", "LOGO", "IMAGE_MAIN"] },
    { role: "split", layers: ["EYEBROW", "HEADLINE", "BODY", "PAGE_NUMBER", "LOGO", "IMAGE_MAIN"] },
    { role: "comparison", layers: ["EYEBROW", "HEADLINE", "BODY", "LABEL_LEFT", "LABEL_RIGHT", "IMAGE_LEFT", "IMAGE_RIGHT", "PAGE_NUMBER", "LOGO"] },
    { role: "feature", layers: ["EYEBROW", "HEADLINE", "BODY", "PAGE_NUMBER", "LOGO", "IMAGE_MAIN"] },
    { role: "end", layers: ["EYEBROW", "HEADLINE", "BODY", "CTA_TEXT", "PAGE_NUMBER", "LOGO", "IMAGE_MAIN"] },
  ],
  brandBindings: {
    logo: "workspace.logo_url",
    font: "workspace.font_style",
    colors: "brand_profiles.brand_colors",
    fallback: "template-defaults",
  },
} as const;

export function isClearMagazineCarousel(templateCode?: string | null) {
  return /^clear-magazine-carousel-v\d+$/i.test(String(templateCode || ""))
    || templateCode === clearMagazineCarouselV1.code
    || templateCode === clearMagazineCarouselV1.sourceStyleCode
    || templateCode === "editorial-clear";
}
