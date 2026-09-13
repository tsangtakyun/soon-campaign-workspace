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
