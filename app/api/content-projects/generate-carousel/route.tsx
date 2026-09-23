import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import React from "react";
import sharp from "sharp";
import { decompress } from "wawoff2";

import { isUuid } from "@/lib/oauth-connections";
import { clearMagazineCarouselV1, isClearMagazineCarousel } from "@/lib/content-templates/clear-magazine-carousel-v1";
import {
  getCoreMasterPageDesign,
  hasCoreMasterDesigns,
  renderCoreMasterPage,
} from "@/lib/content-templates/core-master-template";
import { createServerSupabase } from "@/lib/server-supabase";
import { resolveContentBranding, readerFacingCopy, findBrandTypeface, localTypefaceFiles } from '@/lib/content-branding';
import { getWorkspaceAccess } from "@/lib/workspace-access";

export const runtime = "nodejs";
export const maxDuration = 60;

type Draft = {
  page?: string;
  headline?: string;
  subheadline?: string;
  body?: string[];
  assetId?: string;
  assetIds?: string[];
  layout?: string;
  role?: string;
  templateArtboardId?: string;
  imageTreatment?: "auto" | "cutout" | "full-bleed" | "card";
  imagePosition?: "center" | "top" | "bottom" | "left" | "right";
  secondaryImagePosition?: "center" | "top" | "bottom" | "left" | "right";
};

type Asset = { id: string; url: string; width?: number; height?: number; isCutout?: boolean };

const templateThemes: Record<string, { background: string; ink: string; accent: string; label: string }> = {
  "editorial-clear": { background: "#f6f2eb", ink: "#6b2c30", accent: "#c7e63a", label: "重點整理" },
  "product-focus": { background: "#f8f6f0", ink: "#202126", accent: "#d9bbb5", label: "產品重點" },
  "ranking-review": { background: "#ffffff", ink: "#111111", accent: "#777777", label: "排行榜評測" },
  "problem-solution": { background: "#fff4cf", ink: "#202126", accent: "#b46a61", label: "問題與解決方案" },
  "creator-natural": { background: "#efe8df", ink: "#4d2023", accent: "#8ca67a", label: "日常分享" },
  "bold-social": { background: "#202126", ink: "#ffffff", accent: "#f6d260", label: "你需要知道" },
};

const box = (style: React.CSSProperties, children: React.ReactNode) =>
  React.createElement(
    "div",
    { style: { display: "flex", ...style } },
    children,
  );

const DEFAULT_CAROUSEL_FONT = "SOON Rounded CJK";
const EDITORIAL_CAROUSEL_FONT = "SOON Editorial CJK";
const BRAND_CAROUSEL_FONT = "SOON Selected Brand Font";


const fontBufferCache = new Map<string, Promise<ArrayBuffer>>();

function exactArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}


async function fetchTypefaceWoff2(url: string) {
  let fontUrl = url;
  if (/fonts\.googleapis\.com/i.test(url)) {
    const cssResponse = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!cssResponse.ok) throw new Error(`字型樣式下載失敗（HTTP ${cssResponse.status}）`);
    const css = await cssResponse.text();
    const matches = [...css.matchAll(/url\((https:[^)]+\.woff2)\)/g)];
    fontUrl = matches.at(-1)?.[1] || "";
    if (!fontUrl) throw new Error("找不到可供出圖使用的字型檔案");
  }
  const response = await fetch(fontUrl, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`字型下載失敗（HTTP ${response.status}）`);
  return Buffer.from(await response.arrayBuffer());
}

async function loadTypefaceBuffer(typefaceId: string, cdnUrl: string) {
  const cacheKey = `${typefaceId}:${cdnUrl}`;
  const cached = fontBufferCache.get(cacheKey);
  if (cached) return cached;
  const pending = (async () => {
    const localFile = localTypefaceFiles[typefaceId];
    const bytes = localFile
      ? await readFile(path.join(process.cwd(), "public/fonts/max32002", localFile))
      : await fetchTypefaceWoff2(cdnUrl);
    if (!localFile?.endsWith(".ttf") && !localFile?.endsWith(".otf")) {
      return exactArrayBuffer(await decompress(bytes));
    }
    return exactArrayBuffer(bytes);
  })();
  fontBufferCache.set(cacheKey, pending);
  try {
    return await pending;
  } catch (error) {
    fontBufferCache.delete(cacheKey);
    throw error;
  }
}

async function loadCarouselFonts(fontStyle?: string | null) {
  const [defaultFile, editorialFile] = await Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/max32002/SweiGothicCJKtc-Regular.ttf")),
    readFile(path.join(process.cwd(), "public/fonts/max32002/NotoSerifCJKtc-Regular.otf")),
  ]);
  const fallback = exactArrayBuffer(defaultFile);
  const editorial = exactArrayBuffer(editorialFile);
  const selectedTypeface = findBrandTypeface(fontStyle);
  if (!selectedTypeface) {
    return { regular: fallback, bold: fallback, family: DEFAULT_CAROUSEL_FONT, editorial, hasBrandFont: false };
  }
  try {
    const selected = await loadTypefaceBuffer(selectedTypeface.id, selectedTypeface.cdnUrl);
    return { regular: selected, bold: selected, family: BRAND_CAROUSEL_FONT, editorial, hasBrandFont: true };
  } catch (error) {
    console.warn(`[content-projects/generate-carousel] font fallback for ${selectedTypeface.id}`, error);
    return { regular: fallback, bold: fallback, family: DEFAULT_CAROUSEL_FONT, editorial, hasBrandFont: false };
  }
}

let magazineFonts: Promise<{regular:ArrayBuffer;bold:ArrayBuffer;family:string;editorial:ArrayBuffer;editorialBold:ArrayBuffer;hasBrandFont:boolean}> | undefined;
function loadMagazineFonts() {
  magazineFonts ??= Promise.all(['Sans-Regular.otf','Sans-Bold.otf','Serif-Regular.otf','Serif-Black.otf'].map(file=>readFile(path.join(process.cwd(),'public/fonts/magazine',file)))).then(([regular,bold,editorial,editorialBold])=>({regular:exactArrayBuffer(regular),bold:exactArrayBuffer(bold),editorial:exactArrayBuffer(editorial),editorialBold:exactArrayBuffer(editorialBold),family:'SOON Magazine Sans',hasBrandFont:false}));
  return magazineFonts;
}

async function prepareImageSource(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) {
    throw new Error(`圖片下載失敗（HTTP ${response.status}）`);
  }
  const contentType = response.headers.get("content-type")?.split(";")[0] || "";
  const bytes = Buffer.from(await response.arrayBuffer());
  const isUnsupportedFormat =
    contentType === "image/webp" ||
    contentType === "image/avif" ||
    /\.(webp|avif)(?:$|\?)/i.test(url);
  if (!isUnsupportedFormat) return url;
  const png = await sharp(bytes).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function prepareReliableLightBackgroundCutout(url: string) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return url;
    const input = Buffer.from(await response.arrayBuffer());
    const image = sharp(input).rotate().ensureAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    if (channels !== 4 || width * height > 12_000_000) return url;

    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;
    const isLightNeutral = (pixel: number) => {
      const offset = pixel * channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      return Math.min(r, g, b) >= 218 && Math.max(r, g, b) - Math.min(r, g, b) <= 24;
    };
    const enqueue = (pixel: number) => {
      if (!visited[pixel] && isLightNeutral(pixel)) {
        visited[pixel] = 1;
        queue[tail++] = pixel;
      }
    };
    for (let x = 0; x < width; x += 1) {
      enqueue(x);
      enqueue((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
      enqueue(y * width);
      enqueue(y * width + width - 1);
    }
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x > 0) enqueue(pixel - 1);
      if (x + 1 < width) enqueue(pixel + 1);
      if (y > 0) enqueue(pixel - width);
      if (y + 1 < height) enqueue(pixel + width);
    }
    // Only commit the cutout when a meaningful, edge-connected studio-style
    // background was found. Scene photos therefore remain untouched.
    if (tail < width * height * 0.08) return url;
    for (let pixel = 0; pixel < visited.length; pixel += 1) {
      if (visited[pixel]) data[pixel * channels + 3] = 0;
    }
    const png = await sharp(data, { raw: info }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return url;
  }
}

async function renderPage(
  draft: Draft,
  asset: Asset | undefined,
  index: number,
  fonts: { regular: ArrayBuffer; bold: ArrayBuffer; family: string },
  branding: { logoUrl?: string | null; name: string },
  theme: { background: string; ink: string; accent: string; label: string },
) {
  const cover = draft.layout === "cover" || index === 0;
  const body = Array.isArray(draft.body) ? draft.body : [];
  const page = draft.page || `P.${index + 1}`;
  const image = asset?.url
    ? React.createElement("img", {
        src: asset.url,
        width: cover ? 1080 : Math.max(1, Number(asset.width) || 1080),
        height: cover ? 1350 : Math.max(1, Number(asset.height) || 520),
        style: cover
          ? {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }
          : {
              width: "100%",
              height: 520,
              objectFit: "contain",
              background: "#f1f1ef",
            },
      })
    : null;
  const brandMark = box({ display: "flex", alignItems: "center", gap: 10 }, [
    ...(branding.logoUrl
      ? [
          React.createElement("img", {
            key: "logo",
            src: branding.logoUrl,
            width: 34,
            height: 34,
            style: {
              width: 34,
              height: 34,
              objectFit: "contain",
              borderRadius: 7,
            },
          }),
        ]
      : []),
    React.createElement("span", { key: "name" }, branding.name || "SOON"),
  ]);
  const footer = box(
    {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 24,
      color: cover ? "white" : "#555",
    },
    [
      React.createElement(
        "div",
        { key: "brand", style: { display: "flex" } },
        brandMark,
      ),
      React.createElement("span", { key: "page" }, page.replace("P.", "0")),
    ],
  );
  const content = cover
    ? box(
        {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "70px 66px 55px",
          color: "white",
          position: "relative",
          background: "linear-gradient(0deg,rgba(0,0,0,.78),rgba(0,0,0,0) 72%)",
        },
        [
          React.createElement(
            "div",
            {
              key: "tag",
              style: {
                display: "flex",
                fontSize: 25,
                opacity: 0.86,
                marginBottom: 20,
              },
            },
            theme.label,
          ),
          React.createElement(
            "div",
            {
              key: "h",
              style: {
                display: "flex",
                fontSize: 72,
                fontWeight: 700,
                lineHeight: 1.16,
                marginBottom: 22,
              },
            },
            draft.headline || "",
          ),
          React.createElement(
            "div",
            {
              key: "s",
              style: {
                display: "flex",
                fontSize: 31,
                lineHeight: 1.4,
                marginBottom: 55,
              },
            },
            draft.subheadline || "",
          ),
          React.createElement(
            "div",
            { key: "f", style: { display: "flex" } },
            footer,
          ),
        ],
      )
    : box(
        {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "58px 64px 48px",
          background: theme.background,
          color: theme.ink,
        },
        [
          React.createElement(
            "div",
            {
              key: "tag",
              style: {
                display: "flex",
                fontSize: 23,
                color: theme.ink,
                opacity: 0.68,
                marginBottom: 18,
              },
            },
            theme.label,
          ),
          React.createElement(
            "div",
            {
              key: "h",
              style: {
                display: "flex",
                fontSize: 57,
                fontWeight: 700,
                lineHeight: 1.18,
                marginBottom: 25,
              },
            },
            draft.headline || "",
          ),
          React.createElement("div", {
            key: "line",
            style: {
              display: "flex",
              width: 90,
              height: 5,
              background: theme.accent,
              marginBottom: 27,
            },
          }),
          ...body.slice(0, 3).map((paragraph, paragraphIndex) =>
            React.createElement(
              "div",
              {
                key: `p-${paragraphIndex}`,
                style: {
                  display: "flex",
                  fontSize: 29,
                  lineHeight: 1.55,
                  marginBottom: 20,
                },
              },
              paragraph,
            ),
          ),
          ...(image
            ? [
                React.createElement(
                  "div",
                  {
                    key: "image",
                    style: {
                      display: "flex",
                      flex: 1,
                      alignItems: "center",
                      overflow: "hidden",
                      marginTop: 5,
                    },
                  },
                  image,
                ),
              ]
            : []),
          React.createElement(
            "div",
            {
              key: "f",
              style: { display: "flex", marginTop: image ? 24 : "auto" },
            },
            footer,
          ),
        ],
      );
  return new ImageResponse(
    box(
      {
        width: "100%",
        height: "100%",
        display: "flex",
        fontFamily: fonts.family,
        position: "relative",
        overflow: "hidden",
        background: theme.background,
      },
      cover ? [image, content] : content,
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: fonts.family, data: fonts.regular, weight: 400 },
        { name: fonts.family, data: fonts.bold, weight: 700 },
      ],
    },
  );
}

async function renderRankingReviewPage(
  draft: Draft,
  asset: Asset | undefined,
  index: number,
  total: number,
  fonts: { regular: ArrayBuffer; bold: ArrayBuffer; family: string },
  branding: { logoUrl?: string | null; swipeUrl: string; name: string },
) {
  const cover = index === 0 || draft.layout === "cover";
  const clean = (value: unknown) => String(value || "").trim();
  const headline = clean(draft.headline).replace(/[，,。．；;：:、！？!?]+$/u, "");
  const rankedHeadline = cover || /^\s*(?:#?\d+|第[一二三四五六七八九十百]+)[.、．:：\s]/u.test(headline)
    ? headline
    : `${index}. ${headline}`;
  const body = (Array.isArray(draft.body) ? draft.body : [])
    .map(clean)
    .filter(Boolean)
    .slice(0, 4);
  const pageLabel = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  const photo = asset?.url
    ? React.createElement("img", {
        src: asset.url,
        width: Math.max(1, Number(asset.width) || 1080),
        height: Math.max(1, Number(asset.height) || 780),
        style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
      })
    : box({ position: "absolute", inset: 0, background: "linear-gradient(145deg,#2a211b,#a35c2f 52%,#e2b663)" }, null);
  const chrome = [
    ...(branding.logoUrl ? [React.createElement("img", {
      key: "logo", src: branding.logoUrl, width: 48, height: 48,
      style: { position: "absolute", zIndex: 5, top: 40, left: 44, width: 48, height: 48, objectFit: "contain" },
    })] : []),
    box({ position: "absolute", zIndex: 5, top: 34, right: 38, borderRadius: 999, background: "rgba(35,35,35,.72)", color: "white", padding: "12px 18px", fontSize: 22, fontWeight: 700 }, pageLabel),
  ];
  const swipe = React.createElement("img", {
    src: branding.swipeUrl, width: 105, height: 65,
    style: { position: "absolute", zIndex: 6, right: 35, bottom: 24, width: 105, height: 65, objectFit: "contain" },
  });
  const content = cover
    ? box({ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#111" }, [
        photo,
        box({ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(0,0,0,.82),rgba(0,0,0,0) 72%)" }, null),
        ...chrome,
        box({ position: "absolute", left: 50, right: 50, bottom: 125, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, color: "white" }, [
          React.createElement("div", { key: "h", style: { display: "flex", maxWidth: 960, background: "#050505", padding: "10px 16px", fontSize: 58, fontWeight: 700, lineHeight: 1.16, letterSpacing: -2 } }, rankedHeadline),
          ...(draft.subheadline ? [React.createElement("div", { key: "s", style: { display: "flex", maxWidth: 900, background: "#050505", padding: "7px 14px", fontSize: 31, fontWeight: 700, lineHeight: 1.25 } }, clean(draft.subheadline))] : []),
        ]),
        swipe,
      ])
    : box({ position: "relative", width: "100%", height: "100%", flexDirection: "column", background: "#fff", color: "#111" }, [
        box({ position: "relative", width: "100%", height: 755, overflow: "hidden", background: "#e9e5df" }, [photo, ...chrome]),
        box({ position: "relative", width: "100%", height: 595, flexDirection: "column", padding: "50px 62px 38px 88px", background: "#fff" }, [
          box({ position: "absolute", left: 51, top: 50, bottom: 44, width: 3, background: "#111" }, null),
          React.createElement("div", { key: "h", style: { display: "flex", fontSize: 48, fontWeight: 700, lineHeight: 1.13, letterSpacing: -1.2, marginBottom: 24 } }, rankedHeadline),
          ...body.map((paragraph, paragraphIndex) => React.createElement("div", { key: `body-${paragraphIndex}`, style: { display: "flex", fontSize: 29, lineHeight: 1.48, marginBottom: 12 } }, paragraph)),
          React.createElement("div", { key: "brand", style: { position: "absolute", left: 88, bottom: 26, display: "flex", color: "#777", fontSize: 18, fontWeight: 700 } }, branding.name || "SOON"),
          swipe,
        ]),
      ]);
  return new ImageResponse(content, {
    width: 1080,
    height: 1350,
    fonts: [
      { name: fonts.family, data: fonts.regular, weight: 400 },
      { name: fonts.family, data: fonts.bold, weight: 700 },
    ],
  });
}

type ClearMagazineRole = "cover" | "longform" | "split" | "comparison" | "feature" | "end";

function resolveClearMagazineRole(draft: Draft, index: number, total: number): ClearMagazineRole {
  if (index === 0) return "cover";
  if (index === total - 1) return "end";
  const text = [draft.headline, draft.subheadline, ...(draft.body || [])].join(" ");
  if (/(?:比較|對比|分別|不同|唔同|差異|有咩(?:唔同|不同)|\bvs\.?\b)/i.test(text)) {
    return "comparison";
  }
  const artboardRole: Record<string, ClearMagazineRole> = {
    "01_COVER": "cover", "02_FULL_BLEED_TEXT": "longform",
    "03_IMAGE_TOP_TEXT_BOTTOM": "split", "04_COMPARISON": "comparison",
    "05_LEFT_TEXT_RIGHT_IMAGE": "feature", "06_END_CTA": "end",
  };
  if (draft.templateArtboardId && artboardRole[draft.templateArtboardId]) {
    return artboardRole[draft.templateArtboardId];
  }
  // Migrate older drafts which predate templateArtboardId. Process/explainer
  // copy belongs to the full-bleed text artboard; option/list copy belongs to
  // the left-text/right-image artboard. This repairs stale swapped role labels.
  const assetCount = new Set([...(draft.assetIds || []), draft.assetId].filter(Boolean)).size;
  if (assetCount > 1) return "split";
  if (/(?:以外|口味|選擇|值得試|功能|款式|產品|服務)/i.test(text)) return "feature";
  if (/(?:製作|過程|即場|步驟|如何|點樣|由.+到|開始)/i.test(text)) return "longform";
  const requestedRole = String(draft.role || draft.layout || "").toLowerCase();
  if (["longform", "split", "feature"].includes(requestedRole)) {
    return requestedRole as ClearMagazineRole;
  }
  return "feature";
}

async function renderClearMagazinePage(
  draft: Draft,
  asset: Asset | undefined,
  index: number,
  total: number,
  fonts: { regular: ArrayBuffer; bold: ArrayBuffer; family: string; editorial: ArrayBuffer },
  branding: { logoUrl?: string | null; swipeUrl: string; name: string; colors?: string[] },
  secondaryAsset?: Asset,
  hasBrandFont = false,
) {
  const role = resolveClearMagazineRole(draft, index, total);
  const colors = branding.colors || [];
  const accent = colors[0] || "#f1d443";
  const dark = colors.find((color) => /^#[0-5]/i.test(color)) || "#050505";
  const page = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  const editorialFamily = hasBrandFont ? fonts.family : EDITORIAL_CAROUSEL_FONT;
  const layout = clearMagazineCarouselV1.layout;
  const clean = (value: string | undefined) => String(value || "").trim();
  const cleanHeadline = (value: string | undefined) => clean(value)
    .replace(/[，,。．；;：:、！？!?]+$/u, "");
  const normalizeHeadlineSpacing = (value: string) => value
    .replace(/([0-9A-Za-z])\s+(?=\p{Script=Han})/gu, "$1")
    .replace(/(\p{Script=Han})\s+(?=[0-9A-Za-z])/gu, "$1");
  const formatCoverHeadline = (value: string | undefined) => {
    const raw = normalizeHeadlineSpacing(clean(value));
    const explicitLines = raw.split(/\s*\n+\s*/u).map((part) => part.trim()).filter(Boolean);
    if (explicitLines.length >= 2) {
      return `${explicitLines[0]}\n${explicitLines.slice(1).join("")}`;
    }
    const clauses = raw.split(/[，,。．；;：:、！？!?]+/u).map((part) => part.trim()).filter(Boolean);
    if (clauses.length >= 2) return `${clauses[0]}\n${clauses.slice(1).join("")}`;
    const glyphs = Array.from(clauses[0] || raw.replace(/[，,。．；;：:、！？!?]/gu, ""));
    if (glyphs.length <= 10) return glyphs.join("");
    const splitAt = Math.ceil(glyphs.length / 2);
    return `${glyphs.slice(0, splitAt).join("")}\n${glyphs.slice(splitAt).join("")}`;
  };
  const formatTwoLineHeadline = (value: string | undefined) => {
    const raw = clean(value);
    const clauses = raw.split(/[，,。．；;：:、！？!?]+/u).map((part) => part.trim()).filter(Boolean);
    if (clauses.length >= 2) return `${clauses[0]}\n${clauses.slice(1).join("")}`;
    const glyphs = Array.from(raw.replace(/[，,。．；;：:、！？!?]/gu, ""));
    if (glyphs.length <= 8) return glyphs.join("");
    const splitAt = Math.ceil(glyphs.length / 2);
    return `${glyphs.slice(0, splitAt).join("")}\n${glyphs.slice(splitAt).join("")}`;
  };
  const cleanBodyLine = (value: unknown) => String(value || "")
    .trim()
    .replace(/[，,。．；;：:、]+$/u, "");
  const toWrittenChinese = (value: unknown) => String(value || "")
    .replace(/有冇/g, "是否有")
    .replace(/係咪/g, "是否")
    .replace(/唔係/g, "並非")
    .replace(/你親眼/g, "親眼")
    .replace(/睇住/g, "看著")
    .replace(/睇/g, "看")
    .replace(/拎/g, "拿")
    .replace(/薯仔/g, "馬鈴薯")
    .replace(/落油鍋/g, "放入油鍋")
    .replace(/落調味粉/g, "灑上調味粉")
    .replace(/落鍋/g, "下鍋")
    .replace(/即場/g, "現場")
    .replace(/暖嘅/g, "溫熱")
    .replace(/嘅/g, "的")
    .replace(/唔/g, "不")
    .replace(/係/g, "是")
    .replace(/^整個馬鈴薯/u, "整顆馬鈴薯");
  const body = (Array.isArray(draft.body) ? draft.body : [])
    .filter(Boolean)
    .slice(0, 5)
    .map(cleanBodyLine);
  const source = asset?.url;
  const picture = (style: React.CSSProperties, url = source) => url
    ? React.createElement("img", { src: url, width: 1080, height: 1350, style: { objectFit: "cover", ...style } })
    : box({ ...style, background: "#d9d4cc" }, null);
  const logo = branding.logoUrl
    ? React.createElement("img", { src: branding.logoUrl, width: 73, height: 70, style: { width: 73, height: 70, objectFit: "contain", objectPosition: "left center" } })
    : React.createElement("span", { style: { fontFamily: fonts.family, fontSize: 20, fontWeight: 700 } }, branding.name);
  const headlineLength = cleanHeadline(draft.headline).length;
  const adaptiveHeadlineSize = (preferred: number) => headlineLength > 24
    ? Math.max(45, preferred - 12)
    : headlineLength > 18 ? preferred - 6 : preferred;
  type Rect = { x: number; y: number; width: number; height: number; opacity?: number };
  const rectStyle = (rect: Rect): React.CSSProperties => ({ position: "absolute", left: rect.x, top: rect.y, width: rect.width, height: rect.height, overflow: "hidden", ...(rect.opacity == null ? {} : { opacity: rect.opacity }) });
  const textLayer = (key: string, rect: Rect, value: React.ReactNode, style: React.CSSProperties) => React.createElement("div", { key, style: { ...rectStyle(rect), display: "flex", ...style } }, value);
  const bodyText = body.join("\n");
  const chrome = (color: string) => [
    React.createElement("div", { key: "logo", style: { ...rectStyle(layout.chrome.logo), display: "flex", color } }, logo),
    textLayer("page", layout.chrome.pageNumber, page, { color, fontFamily: EDITORIAL_CAROUSEL_FONT, fontSize: 29, lineHeight: 1 }),
  ];
  const swipeCue = React.createElement("img", { key: "swipe", src: branding.swipeUrl, width: 102, height: 59, style: { ...rectStyle(layout.chrome.swipe), objectFit: "contain" } });
  const commonText = (l: { eyebrow: Rect; headline: Rect; body: Rect }, options?: { centered?: boolean; headlineSize?: number; bodySize?: number; headlineWidth?: number }) => [
    textLayer("eye", { ...l.eyebrow, width: Math.max(l.eyebrow.width, 500) }, cleanBodyLine(draft.subheadline) || "重點整理", { color: accent, fontSize: 24, lineHeight: 1.25, fontWeight: 700 }),
    textLayer("head", { ...l.headline, width: options?.headlineWidth || l.headline.width }, cleanHeadline(draft.headline), { color: "white", whiteSpace: "pre-wrap", fontSize: adaptiveHeadlineSize(options?.headlineSize || 62), lineHeight: 1.12, fontWeight: 700, letterSpacing: "-2px", textAlign: options?.centered ? "center" : "left", justifyContent: options?.centered ? "center" : "flex-start" }),
    textLayer("body", l.body, bodyText, { color: "white", whiteSpace: "pre-wrap", fontSize: options?.bodySize || 29, lineHeight: 1.25 }),
  ];
  let content: React.ReactNode;
  if (role === "cover") {
    const l = layout.cover;
    const sourceText = [draft.headline, draft.subheadline, ...body].join(" ");
    const requestedEyebrow = cleanBodyLine(draft.subheadline);
    const coverBody = body[0] || "";
    const coverBodyIsLong = Array.from(coverBody).length > 32;
    const coverEyebrow = Array.from(requestedEyebrow).length <= 10
      ? requestedEyebrow
      : /台南/.test(sourceText) ? "台南街頭小吃" : "重點故事";
    content = box({ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: dark }, [
      picture(rectStyle(l.image)),
      box({ position: "absolute", inset: 0, width: "100%", height: "100%", background: "linear-gradient(0deg,rgba(0,0,0,.86),rgba(0,0,0,.04) 76%)" }, null),
      ...chrome("white"),
      textLayer("eye", { ...l.eyebrow, width: 500 }, coverEyebrow || "重點故事", { color: accent, fontSize: 24, lineHeight: 1.25, fontWeight: 700 }),
      textLayer("head", { ...l.headline, width: 935, height: 205 }, formatCoverHeadline(draft.headline), { color: "white", whiteSpace: "pre-wrap", fontSize: 88, lineHeight: 1.08, fontWeight: 700, letterSpacing: "-2px" }),
      textLayer("body", { ...l.body, y: coverBodyIsLong ? 1184 : 1206, width: 780, height: coverBodyIsLong ? 70 : l.body.height }, coverBody, { color: "white", whiteSpace: coverBodyIsLong ? "pre-wrap" : "nowrap", fontSize: coverBodyIsLong ? 24 : 29, lineHeight: coverBodyIsLong ? 1.3 : 1.2 }),
      swipeCue,
    ]);
  } else if (role === "end") {
    const l = layout.end;
    const endEyebrowRaw = cleanBodyLine(draft.subheadline);
    const endEyebrow = !endEyebrowRaw || /重點整理/.test(endEyebrowRaw) ? "店舖資料" : endEyebrowRaw;
    const endHeadline = formatTwoLineHeadline(clean(draft.headline).replace(/[|｜]/g, "，"));
    const endBody = body.slice(0, 4).join("\n");
    content = box({ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: dark }, [
      ...chrome("white"),
      textLayer("eye", { ...l.eyebrow, width: 400 }, endEyebrow, { color: accent, fontSize: 24, lineHeight: 1.25, fontWeight: 700 }),
      textLayer("head", l.headline, endHeadline, { color: "white", whiteSpace: "pre-wrap", fontSize: 58, lineHeight: 1.08, fontWeight: 700, letterSpacing: "-2px" }),
      textLayer("body", l.body, endBody, { color: "white", whiteSpace: "pre-wrap", fontSize: 28, lineHeight: 1.35 }),
      box({ ...rectStyle(l.image), background: "white" }, picture({ width: "100%", height: "100%", objectFit: "contain" })),
      box({ ...rectStyle(l.ctaBox), background: accent, borderRadius: 22 }, null),
      textLayer("cta", l.ctaText, "了解更多 →", { color: dark, fontSize: 22, lineHeight: 1.25, justifyContent: "center" }),
    ]);
  } else if (role === "comparison") {
    const l = layout.comparison;
    const comparisonHeadline = clean(draft.headline).replace(/[，,。．；;：:、！？!?]/gu, "");
    const comparisonCopy = (value: unknown) => String(value || "")
      .split(/[，,。．；;：:、！？!?—]+/u)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join("\n");
    const legacyComparison = String(body[2] || "").split(/[；;]/, 2);
    const leftComparisonBody = comparisonCopy(body[3] ? body[2] : legacyComparison[0]);
    const rightComparisonBody = comparisonCopy(body[3] || legacyComparison[1]);
    content = box({ width: "100%", height: "100%", position: "relative", background: dark, color: "white" }, [
      ...chrome("white"),
      textLayer("eye", { ...l.eyebrow, width: 500 }, cleanBodyLine(draft.subheadline) || "真正分別", { color: accent, fontSize: 24, fontWeight: 700 }),
      textLayer("head", l.headline, comparisonHeadline, { color: "white", fontSize: adaptiveHeadlineSize(62), lineHeight: 1.12, fontWeight: 700, textAlign: "center", justifyContent: "center" }),
      box({ ...rectStyle(l.leftCard), background: "#f36a2d", borderRadius: 20 }, null),
      box({ ...rectStyle(l.rightCard), background: "#477877", borderRadius: 20 }, null),
      picture({ ...rectStyle(l.leftImage), objectFit: "contain", transform: "scale(1.78)", transformOrigin: "center" }),
      picture({ ...rectStyle(l.rightImage), objectFit: secondaryAsset?.isCutout ? "contain" : "cover" }, secondaryAsset?.url),
      textLayer("ll", l.leftLabel, body[0] || "比較一", { color: "white", fontSize: 25, fontWeight: 700, textAlign: "center", justifyContent: "center" }),
      textLayer("rl", l.rightLabel, body[1] || "比較二", { color: "white", fontSize: 25, fontWeight: 700, textAlign: "center", justifyContent: "center" }),
      textLayer("leftBody", { x: l.body.x, y: l.body.y, width: l.leftCard.width, height: l.body.height }, leftComparisonBody, { color: "white", whiteSpace: "pre-wrap", fontSize: 25, lineHeight: 1.35 }),
      textLayer("rightBody", { x: l.rightCard.x, y: l.body.y, width: l.rightCard.width, height: l.body.height }, rightComparisonBody, { color: "white", whiteSpace: "pre-wrap", fontSize: 25, lineHeight: 1.35 }),
      ...(body[4] ? [textLayer("summary", { x: 158, y: 1125, width: 755, height: 70 }, body[4], { color: "white", fontSize: 23, textAlign: "center", justifyContent: "center" })] : []),
      swipeCue,
    ]);
  } else if (role === "split") {
    const l = layout.split;
    const splitHeadline = clean(draft.headline).replace(/[，,。．；;：:、！？!?]/gu, "");
    const splitBody = body.slice(0, 2).join("\n");
    content = box({ width: "100%", height: "100%", position: "relative", flexDirection: "column", background: dark }, [
      ...chrome("white"),
      secondaryAsset?.url ? box({ ...rectStyle(l.image), gap: 20 }, [picture({ width: 458, height: "100%" }), picture({ width: 458, height: "100%" }, secondaryAsset.url)]) : picture(rectStyle(l.image)),
      textLayer("eye", { ...l.eyebrow, width: 500 }, cleanBodyLine(draft.subheadline) || "重點整理", { color: accent, fontSize: 24, lineHeight: 1.25, fontWeight: 700 }),
      textLayer("head", { ...l.headline, width: 900 }, splitHeadline, { color: "white", whiteSpace: "pre-wrap", fontSize: adaptiveHeadlineSize(58), lineHeight: 1.1, fontWeight: 700, letterSpacing: "-2px" }),
      textLayer("body", l.body, splitBody, { color: "white", whiteSpace: "pre-wrap", fontSize: 29, lineHeight: 1.4 }),
      swipeCue,
    ]);
  } else if (role === "feature") {
    const l = layout.feature;
    const featureBody = (Array.isArray(draft.body) ? draft.body : [])
      .flatMap((line) => String(line || "").split(/[，,。．；;：:！？!?—]+/u))
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6)
      .join("\n");
    content = box({ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: dark }, [
      ...chrome("white"),
      picture(rectStyle(l.image)),
      textLayer("eye", { ...l.eyebrow, width: 430 }, cleanBodyLine(draft.subheadline) || "重點整理", { color: accent, fontSize: 24, lineHeight: 1.25, fontWeight: 700 }),
      textLayer("head", l.headline, formatTwoLineHeadline(draft.headline), { color: "white", whiteSpace: "pre-wrap", fontSize: 75, lineHeight: 1.08, fontWeight: 700, letterSpacing: "-2px" }),
      textLayer("body", l.body, featureBody, { color: "white", whiteSpace: "pre-wrap", fontSize: 29, lineHeight: 1.35 }),
      swipeCue,
    ]);
  } else {
    const l = layout.longform;
    const longformBody = (Array.isArray(draft.body) ? draft.body : [])
      .flatMap((line) => String(line || "").split(/[，,。．；;：:、！？!?—]+/u))
      .map((line) => toWrittenChinese(line).trim())
      .filter(Boolean)
      .slice(0, 7)
      .join("\n");
    content = box({ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: dark }, [
      picture({ ...rectStyle(l.image), objectFit: "cover" }),
      ...chrome("white"),
      textLayer("eye", { ...l.eyebrow, width: 500 }, toWrittenChinese(cleanBodyLine(draft.subheadline)) || "重點整理", { color: accent, fontSize: 24, lineHeight: 1.25, fontWeight: 700 }),
      textLayer("head", { ...l.headline, height: 190 }, formatTwoLineHeadline(toWrittenChinese(draft.headline)), { color: "white", whiteSpace: "pre-wrap", fontSize: 81, lineHeight: 1.08, fontWeight: 700, letterSpacing: "-2px" }),
      textLayer("body", l.body, longformBody, { color: "white", whiteSpace: "pre-wrap", fontSize: longformBody.length > 115 ? 35 : 39, lineHeight: 1.35 }),
      swipeCue,
    ]);
  }
  return new ImageResponse(box({ width: "100%", height: "100%", fontFamily: editorialFamily, position: "relative", overflow: "hidden" }, content), {
    width: 1080,
    height: 1350,
    fonts: [
      { name: fonts.family, data: fonts.regular, weight: 400 },
      { name: fonts.family, data: fonts.bold, weight: 700 },
      { name: EDITORIAL_CAROUSEL_FONT, data: fonts.editorial, weight: 400 },
      { name: EDITORIAL_CAROUSEL_FONT, data: fonts.editorial, weight: 700 },
    ],
  });
}

function renderPublishedCoreMasterPage(
  design: NonNullable<ReturnType<typeof getCoreMasterPageDesign>>,
  draft: Draft,
  asset: Asset | undefined,
  secondaryAsset: Asset | undefined,
  index: number,
  total: number,
  fonts: { regular: ArrayBuffer; bold: ArrayBuffer; family: string; editorial: ArrayBuffer; editorialBold?: ArrayBuffer; hasBrandFont?: boolean },
  branding: { logoUrl?: string | null; name: string },
) {
  const node = renderCoreMasterPage({
    design,
    copy: draft,
    page: `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
    primary: asset ? { ...asset, position: draft.imagePosition || "center" } : undefined,
    secondary: secondaryAsset ? { ...secondaryAsset, position: draft.secondaryImagePosition || "center" } : undefined,
    branding,
    fonts: { family: fonts.family, editorialFamily: fonts.hasBrandFont ? fonts.family : EDITORIAL_CAROUSEL_FONT },
  });
  return new ImageResponse(node, {
    width: 1080,
    height: 1350,
    fonts: [
      { name: fonts.family, data: fonts.regular, weight: 400 },
      { name: fonts.family, data: fonts.bold, weight: 700 },
      { name: EDITORIAL_CAROUSEL_FONT, data: fonts.editorial, weight: 400 },
      { name: EDITORIAL_CAROUSEL_FONT, data: fonts.editorial, weight: 700 },
      { name: EDITORIAL_CAROUSEL_FONT, data: fonts.editorialBold || fonts.editorial, weight: 900 },
      { name: fonts.family, data: fonts.bold, weight: 900 },
    ],
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const workspaceId =
      typeof body.workspaceId === "string" ? body.workspaceId : "";
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    if (!isUuid(workspaceId) || !isUuid(projectId))
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const supabase = createServerSupabase(await cookies());
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = await getWorkspaceAccess({
      email: user.email,
      userId: user.id,
      workspaceId,
    });
    if (!access || (access.role !== "owner" && access.role !== "admin"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data: project, error } = await access.admin
      .from("content_projects")
      .select("id,production,format_decision")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .single();
    if (error) throw error;
    const [{ data: workspace }, { data: brandProfile }, { data: brandKit }] = await Promise.all([
      access.admin
        .from("workspaces")
        .select("name,logo_url,font_style,brand_colors")
        .eq("id", workspaceId)
        .maybeSingle(),
      access.admin
        .from("brand_profiles")
        .select("business_name")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),
      access.admin
        .from("brand_kits")
        .select("logo_url,typeface_family,typeface_id")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false }).limit(1)
        .maybeSingle(),
    ]);
    const workspaceName = String(
      brandProfile?.business_name || workspace?.name || "SOON",
    );
    const requestOrigin = new URL(req.url).origin;
    const brandSettings = resolveContentBranding(workspace, brandKit, workspaceName);
    const branding = {
      logoUrl: brandSettings.logoUrl ? new URL(brandSettings.logoUrl, requestOrigin).href : null,
      swipeUrl: `${requestOrigin}/templates/clear-magazine-carousel-v1/cta-arrow.png`,
      name: workspaceName,
      colors: Array.isArray(workspace?.brand_colors)
        ? workspace.brand_colors
            .filter((color): color is string => /^#[0-9a-f]{6}$/i.test(color))
        : [],
    };
    const templateCode = typeof project.format_decision?.renderTemplateCode === "string"
      ? project.format_decision.renderTemplateCode
      : typeof project.format_decision?.templateCode === "string"
        ? project.format_decision.templateCode
      : "editorial-clear";
    const templateContract = project.format_decision?.templateContractSnapshot;
    const usesPublishedCoreMaster = hasCoreMasterDesigns(templateContract);
    const theme = templateThemes[templateCode] || templateThemes["editorial-clear"];
    const productionStatus = project.production?.productionStatus;
    if (
      productionStatus !== "drafts_confirmed" &&
      productionStatus !== "images_ready"
    )
      return NextResponse.json({ error: "請先確認逐頁草稿" }, { status: 400 });
    const drafts = ((project.production.pageDrafts || []) as Draft[]).map(draft => ({ ...draft,
      headline: readerFacingCopy(draft.headline), subheadline: readerFacingCopy(draft.subheadline),
      body: draft.body?.map(readerFacingCopy),
    }));
    const assets = (project.production.assets || []) as Asset[];
    if (!drafts.length)
      return NextResponse.json({ error: "沒有逐頁草稿" }, { status: 400 });
    const configuredTypeface = brandSettings.fontStyle;
    const lockedMagazine = (templateContract as { typography?: { headline?: { family?: string }; locked?: boolean } } | undefined)?.typography;
    const fonts = !configuredTypeface && lockedMagazine?.locked && lockedMagazine.headline?.family === 'SOON Magazine Serif'
      ? await loadMagazineFonts()
      : await loadCarouselFonts(configuredTypeface);
    if (configuredTypeface && !fonts.hasBrandFont) {
      return NextResponse.json({ error: "品牌字型未能載入，請檢查品牌素材庫字型設定後重試；未使用其他字型代替。" }, { status: 422 });
    }
    const uniqueAssetUrls = [...new Set(assets.map((asset) => asset.url).filter(Boolean))];
    const preparedImageUrls = new Map(
      await Promise.all(
        uniqueAssetUrls.map(async (url) => [url, await prepareImageSource(url)] as const),
      ),
    );
    const cutoutCandidateUrls = [...new Set(drafts
      .filter((draft, index) => {
        if (!isClearMagazineCarousel(templateCode)) return false;
        const role = resolveClearMagazineRole(draft, index, drafts.length);
        return draft.imageTreatment === "cutout"
          || (draft.imageTreatment !== "full-bleed" && role === "comparison");
      })
      .flatMap((draft) => [...(draft.assetIds || []), draft.assetId])
      .map((id) => assets.find((asset) => asset.id === id)?.url)
      .filter((url): url is string => Boolean(url)))];
    const preparedCutoutUrls = new Map(
      await Promise.all(cutoutCandidateUrls.map(async (url) => [
        url,
        await prepareReliableLightBackgroundCutout(preparedImageUrls.get(url) || url),
      ] as const)),
    );
    const outputs = await Promise.all(drafts.map(async (draft, index) => {
      try {
      const requestedAssetIds = [...(Array.isArray(draft.assetIds) ? draft.assetIds : []), draft.assetId]
        .filter((id): id is string => typeof id === "string" && Boolean(id));
      const assetIds = [...new Set(requestedAssetIds)];
      const asset = assets.find((item) => item.id === assetIds[0]);
      const role = isClearMagazineCarousel(templateCode)
        ? resolveClearMagazineRole(draft, index, drafts.length)
        : null;
      const coreMasterDesign = role && usesPublishedCoreMaster
        ? getCoreMasterPageDesign(templateContract, role)
        : null;
      const preparedAsset = asset?.url
        ? { ...asset, isCutout: Boolean((draft.imageTreatment === "cutout" || role === "comparison") && preparedCutoutUrls.get(asset.url)?.startsWith("data:image/png") && preparedCutoutUrls.get(asset.url) !== preparedImageUrls.get(asset.url)), url: (draft.imageTreatment === "cutout" || role === "comparison") && preparedCutoutUrls.has(asset.url)
          ? preparedCutoutUrls.get(asset.url) || preparedImageUrls.get(asset.url) || asset.url
          : preparedImageUrls.get(asset.url) || asset.url }
        : asset;
      const secondarySource = assets.find((item) => item.id === assetIds[1] && item.url);
      const secondaryAsset = secondarySource?.url
        ? { ...secondarySource, isCutout: Boolean((draft.imageTreatment === "cutout" || role === "comparison") && preparedCutoutUrls.get(secondarySource.url)?.startsWith("data:image/png") && preparedCutoutUrls.get(secondarySource.url) !== preparedImageUrls.get(secondarySource.url)), url: (draft.imageTreatment === "cutout" || role === "comparison") && preparedCutoutUrls.has(secondarySource.url)
          ? preparedCutoutUrls.get(secondarySource.url) || preparedImageUrls.get(secondarySource.url) || secondarySource.url
          : preparedImageUrls.get(secondarySource.url) || secondarySource.url }
        : undefined;
      const response = coreMasterDesign
        ? renderPublishedCoreMasterPage(coreMasterDesign, draft, preparedAsset, secondaryAsset, index, drafts.length, fonts, branding)
        : isClearMagazineCarousel(templateCode)
        ? await renderClearMagazinePage(draft, preparedAsset, index, drafts.length, fonts, branding, secondaryAsset, fonts.hasBrandFont)
        : templateCode === "ranking-review"
          ? await renderRankingReviewPage(draft, preparedAsset, index, drafts.length, fonts, branding)
        : await renderPage(draft, preparedAsset, index, fonts, branding, theme);
      const png = new Uint8Array(await response.arrayBuffer());
      const storagePath = `${workspaceId}/content-projects/${projectId}/carousel/p-${index + 1}-${Date.now()}.png`;
      const { error: uploadError } = await access.admin.storage
        .from("brand-assets")
        .upload(storagePath, png, { contentType: "image/png", upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = access.admin.storage
        .from("brand-assets")
        .getPublicUrl(storagePath);
      return {
        page: `P.${index + 1}`,
        url: publicUrl.publicUrl,
        width: 1080,
        height: 1350,
      };
      } catch (pageError) {
        const message = pageError instanceof Error ? pageError.message : String(pageError);
        console.error(`[content-projects/generate-carousel] page ${index + 1}`, pageError);
        throw new Error(`第 ${index + 1} 頁生成失敗：${message}`);
      }
    }));
    const production = {
      ...project.production,
      generatedPages: outputs,
      productionStatus: "images_ready",
      imagesGeneratedAt: new Date().toISOString(),
    };
    const { data: saved, error: saveError } = await access.admin
      .from("content_projects")
      .update({
        production,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .select("id,production,updated_at")
      .single();
    if (saveError) throw saveError;
    return NextResponse.json({ success: true, project: saved });
  } catch (error) {
    console.error("[content-projects/generate-carousel]", error);
    return NextResponse.json(
      { error: "未能生成 Carousel 圖片", detail: String(error) },
      { status: 500 },
    );
  }
}
