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
      image: { x: -92, y: -26, width: 1264, height: 843 },
      eyebrow: { x: 74, y: 163, width: 218, height: 38 },
      headline: { x: 89, y: 719, width: 526, height: 143 },
      body: { x: 87, y: 892, width: 896, height: 308 },
    },
    comparison: {
      eyebrow: { x: 74, y: 163, width: 155, height: 38 },
      headline: { x: 206, y: 258, width: 658, height: 143 },
      leftCard: { x: 158, y: 448, width: 337, height: 386 },
      rightCard: { x: 576, y: 448, width: 337, height: 386 },
      leftImage: { x: 207, y: 534, width: 244, height: 282 },
      rightImage: { x: 577, y: 548, width: 328, height: 240 },
      leftLabel: { x: 199, y: 477, width: 228, height: 37 },
      rightLabel: { x: 635, y: 478, width: 228, height: 37 },
      body: { x: 158, y: 862, width: 768, height: 299 },
    },
    feature: {
      image: { x: 537, y: 244, width: 941, height: 889 },
      eyebrow: { x: 74, y: 163, width: 157, height: 38 },
      headline: { x: 74, y: 256, width: 451, height: 215 },
      body: { x: 74, y: 533, width: 428, height: 608 },
    },
    end: {
      eyebrow: { x: 75, y: 163, width: 156, height: 37 },
      headline: { x: 65, y: 254, width: 641, height: 138 },
      body: { x: 64, y: 425, width: 765, height: 247 },
      image: { x: -26, y: 668, width: 878, height: 913 },
      ctaBox: { x: 692, y: 1241, width: 311, height: 71 },
      ctaText: { x: 722, y: 1257, width: 258, height: 31 },
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
  return templateCode === clearMagazineCarouselV1.code
    || templateCode === clearMagazineCarouselV1.sourceStyleCode
    || templateCode === "editorial-clear";
}
