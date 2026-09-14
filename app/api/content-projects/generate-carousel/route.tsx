import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import React from "react";
import sharp from "sharp";

import { isUuid } from "@/lib/oauth-connections";
import { isClearMagazineCarousel } from "@/lib/content-templates/clear-magazine-carousel-v1";
import { createServerSupabase } from "@/lib/server-supabase";
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
  imageTreatment?: "auto" | "cutout" | "full-bleed" | "card";
};

type Asset = { id: string; url: string; width?: number; height?: number };

const templateThemes: Record<string, { background: string; ink: string; accent: string; label: string }> = {
  "editorial-clear": { background: "#f6f2eb", ink: "#6b2c30", accent: "#c7e63a", label: "重點整理" },
  "product-focus": { background: "#ffffff", ink: "#202126", accent: "#d9bbb5", label: "產品重點" },
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

function resolveCarouselFontFamily(fontStyle?: string | null) {
  const normalized = String(fontStyle || "").toLowerCase();
  if (
    !normalized ||
    normalized.includes("gensenrounded") ||
    normalized.includes("系統圓體") ||
    normalized.includes("sweigothic")
  ) {
    return DEFAULT_CAROUSEL_FONT;
  }
  return DEFAULT_CAROUSEL_FONT;
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

type ClearMagazineRole = "cover" | "longform" | "split" | "comparison" | "feature" | "end";

function resolveClearMagazineRole(draft: Draft, index: number, total: number): ClearMagazineRole {
  if (index === 0) return "cover";
  if (index === total - 1) return "end";
  const text = [draft.headline, draft.subheadline, ...(draft.body || [])].join(" ");
  if (/(?:比較|對比|分別|不同|唔同|差異|有咩(?:唔同|不同)|\bvs\.?\b)/i.test(text)) {
    return "comparison";
  }
  const requestedRole = String(draft.role || draft.layout || "").toLowerCase();
  if (["longform", "split", "feature"].includes(requestedRole)) {
    return requestedRole as ClearMagazineRole;
  }
  // The PSD artboards define a visual language, not a page-number template.
  // Infer a safe layout from the actual copy and assets when an older draft
  // does not yet carry an explicit semantic role.
  const body = Array.isArray(draft.body) ? draft.body.filter(Boolean) : [];
  const assetCount = new Set([...(draft.assetIds || []), draft.assetId].filter(Boolean)).size;
  if (assetCount > 1) return "split";
  if (body.length >= 3 || text.length > 105) return "longform";
  return "feature";
}

async function renderClearMagazinePage(
  draft: Draft,
  asset: Asset | undefined,
  index: number,
  total: number,
  fonts: { regular: ArrayBuffer; bold: ArrayBuffer; family: string; editorial: ArrayBuffer },
  branding: { logoUrl?: string | null; name: string; colors?: string[] },
  secondaryAsset?: Asset,
  hasBrandFont = false,
) {
  const role = resolveClearMagazineRole(draft, index, total);
  const colors = branding.colors || [];
  const accent = colors[0] || "#f1d443";
  const dark = colors.find((color) => /^#[0-5]/i.test(color)) || "#050505";
  const page = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  const editorialFamily = hasBrandFont ? fonts.family : EDITORIAL_CAROUSEL_FONT;
  // A real print-style safe area: every visible element stays inside this
  // frame. Images may bleed only when the selected role explicitly calls for
  // a full-bleed cover.
  const safeX = 72;
  const safeTop = 58;
  const safeBottom = 64;
  const safeWidth = 1080 - safeX * 2;
  const clean = (value: string | undefined) => String(value || "").trim();
  const cleanHeadline = (value: string | undefined) => clean(value)
    .replace(/[，,。．；;：:、！？!?]+$/u, "");
  const cleanBodyLine = (value: unknown) => String(value || "")
    .trim()
    .replace(/[，,。．；;：:、]+$/u, "");
  const body = (Array.isArray(draft.body) ? draft.body : [])
    .filter(Boolean)
    .slice(0, 5)
    .map(cleanBodyLine);
  const source = asset?.url;
  const picture = (style: React.CSSProperties, url = source) => url
    ? React.createElement("img", { src: url, width: 1080, height: 1350, style: { objectFit: "cover", ...style } })
    : box({ ...style, background: "#d9d4cc" }, null);
  const squareLogo = /egg[.\s_-]*soon/i.test(branding.name);
  const logo = branding.logoUrl
    ? React.createElement("img", { src: branding.logoUrl, width: squareLogo ? 68 : 150, height: 68, style: { width: squareLogo ? 68 : 150, height: 68, objectFit: "contain", objectPosition: "left center" } })
    : React.createElement("span", { style: { fontFamily: fonts.family, fontSize: 20, fontWeight: 700 } }, branding.name);
  const headlineLength = cleanHeadline(draft.headline).length;
  const adaptiveHeadlineSize = (preferred: number) => headlineLength > 21
    ? Math.max(47, preferred - 13)
    : headlineLength > 15 ? preferred - 7 : preferred;
  const textBlock = (options: { color: string; headlineSize?: number; bodySize?: number; align?: "left" | "center"; showBody?: boolean; bodyLines?: number; maxWidth?: number | string }) => {
    // Satori calls `.trim()` on CSS values. Never pass optional properties with
    // an undefined value, otherwise only page roles without maxWidth will fail.
    const widthStyle = options.maxWidth == null ? {} : { maxWidth: options.maxWidth };
    return box({ display: "flex", flexDirection: "column", color: options.color, textAlign: options.align || "left" }, [
      React.createElement("span", { key: "eye", style: { display: "flex", color: accent, fontFamily: editorialFamily, fontSize: 24, fontWeight: 700, marginBottom: 18, ...widthStyle } }, cleanBodyLine(draft.subheadline) || "重點整理"),
      React.createElement("strong", { key: "head", style: { display: "flex", fontFamily: editorialFamily, fontSize: adaptiveHeadlineSize(options.headlineSize || 62), fontWeight: 700, lineHeight: 1.12, letterSpacing: "-2px", ...widthStyle } }, cleanHeadline(draft.headline)),
      ...(options.showBody === false ? [] : body.slice(0, options.bodyLines ?? 3).map((line, bodyIndex) => React.createElement("span", { key: `body-${bodyIndex}`, style: { display: "flex", fontSize: options.bodySize || 31, lineHeight: 1.42, marginTop: bodyIndex === 0 ? 28 : 10 } }, line))),
    ]);
  };
  const chrome = (color: string) => [
    React.createElement("div", { key: "logo", style: { position: "absolute", display: "flex", left: safeX, top: safeTop, color } }, logo),
    React.createElement("span", { key: "page", style: { position: "absolute", display: "flex", right: safeX, top: safeTop + 2, color, fontFamily: EDITORIAL_CAROUSEL_FONT, fontSize: 29, lineHeight: 1 } }, page),
  ];
  const swipeArrow = (color: string) => React.createElement(
    "svg",
    { width: 132, height: 75, viewBox: "0 0 132 75", style: { display: "flex" } },
    [
      React.createElement("path", { key: "shaft", d: "M43 20 C66 15 91 16 119 16", fill: "none", stroke: "#f54b45", strokeWidth: 5, strokeLinecap: "round" }),
      React.createElement("path", { key: "head", d: "M108 5 C114 10 121 14 126 16 C120 20 115 25 111 31", fill: "none", stroke: "#f54b45", strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round" }),
      React.createElement("path", { key: "word", d: "M7 48 C5 39 22 38 20 47 C18 54 7 51 10 61 C14 70 27 64 28 56 M30 43 L35 65 L41 52 L47 64 L51 41 M58 42 L57 65 M66 65 L66 42 C81 37 84 51 68 54 M89 65 L89 41 L105 41 M89 52 L102 52 M89 65 L106 65", fill: "none", stroke: color, strokeWidth: 3.6, strokeLinecap: "round", strokeLinejoin: "round" }),
    ],
  );
  const swipeCue = React.createElement("div", { key: "swipe", style: { position: "absolute", display: "flex", right: safeX, bottom: 18 } }, swipeArrow("white"));
  let content: React.ReactNode;
  if (role === "cover") {
    content = box({ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: dark }, [
      picture({ position: "absolute", inset: 0, width: "100%", height: "100%" }),
      box({ position: "absolute", inset: 0, width: "100%", height: "100%", background: "linear-gradient(0deg,rgba(0,0,0,.86),rgba(0,0,0,.04) 76%)" }, null),
      ...chrome("white"),
      box({ position: "absolute", left: safeX, right: safeX, bottom: safeBottom, display: "flex", flexDirection: "column" }, [
        textBlock({ color: "white", headlineSize: 86, bodySize: 29, bodyLines: 2 }),
        React.createElement("div", { key: "cta", style: { display: "flex", alignSelf: "flex-end", marginTop: 14 } }, swipeArrow("white")),
      ]),
    ]);
  } else if (role === "end") {
    content = box({ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: dark, padding: `150px ${safeX}px ${safeBottom}px` }, [
      ...chrome("white"),
      textBlock({ color: "white", headlineSize: 64, bodySize: 28, bodyLines: 2, maxWidth: safeWidth }),
      box({ position: "absolute", left: safeX, bottom: safeBottom, width: 690, height: 535, overflow: "hidden", background: "white" }, picture({ width: "100%", height: "100%", objectFit: "cover" })),
      React.createElement("span", { key: "cta", style: { position: "absolute", display: "flex", right: safeX, bottom: safeBottom + 22, padding: "18px 26px", borderRadius: 22, background: accent, color: dark, fontSize: 24, fontWeight: 700 } }, "了解更多 →"),
    ]);
  } else if (role === "comparison") {
    content = box({ width: "100%", height: "100%", position: "relative", flexDirection: "column", background: dark, color: "white", padding: `150px ${safeX}px ${safeBottom}px` }, [
      ...chrome("white"),
      React.createElement("span", { key: "eye", style: { display: "flex", color: accent, fontSize: 29, fontWeight: 700 } }, draft.subheadline || "真正分別"),
      React.createElement("strong", { key: "head", style: { display: "flex", alignSelf: "center", textAlign: "center", fontFamily: editorialFamily, fontSize: adaptiveHeadlineSize(68), fontWeight: 700, lineHeight: 1.12, margin: "38px 30px 34px" } }, cleanHeadline(draft.headline)),
      box({ display: "flex", gap: 40, justifyContent: "center" }, [
        box({ width: 448, height: 580, flexDirection: "column", overflow: "hidden", borderRadius: 20, background: "#f36a2d" }, [picture({ width: "100%", height: 350, objectFit: "contain", padding: 24 }), React.createElement("b", { key: "l", style: { display: "flex", padding: "18px 22px 4px", fontSize: 27, lineHeight: 1.3 } }, body[0] || "比較一"), React.createElement("span", { key: "lc", style: { display: "flex", padding: "8px 22px 20px", fontSize: 22, lineHeight: 1.35 } }, body[2] || "")]),
        box({ width: 448, height: 580, flexDirection: "column", overflow: "hidden", borderRadius: 20, background: "#477877" }, [picture({ width: "100%", height: 350, objectFit: "contain", padding: 24 }, secondaryAsset?.url), React.createElement("b", { key: "r", style: { display: "flex", padding: "18px 22px 4px", fontSize: 27, lineHeight: 1.3 } }, body[1] || "比較二"), React.createElement("span", { key: "rc", style: { display: "flex", padding: "8px 22px 20px", fontSize: 22, lineHeight: 1.35 } }, body[3] || "")]),
      ]),
      React.createElement("span", { key: "summary", style: { display: "flex", textAlign: "center", alignSelf: "center", fontSize: 27, lineHeight: 1.35, margin: "25px 54px 0" } }, body[4] || ""),
      swipeCue,
    ]);
  } else if (role === "split") {
    content = box({ width: "100%", height: "100%", position: "relative", flexDirection: "column", background: dark }, [
      ...chrome("white"),
      secondaryAsset?.url
        ? box({ display: "flex", position: "absolute", left: safeX, top: 145, height: 545, width: safeWidth, overflow: "hidden", gap: 20, background: dark }, [
            box({ width: 458, height: 545, overflow: "hidden" }, picture({ width: "100%", height: "100%" })),
            box({ width: 458, height: 545, overflow: "hidden" }, picture({ width: "100%", height: "100%" }, secondaryAsset.url)),
          ])
        : box({ position: "absolute", left: safeX, top: 145, height: 545, width: safeWidth, overflow: "hidden" }, picture({ width: "100%", height: "100%" })),
      box({ position: "absolute", left: safeX, right: safeX, top: 735, bottom: safeBottom }, textBlock({ color: "white", headlineSize: 64, bodySize: 29, bodyLines: 2 })),
      swipeCue,
    ]);
  } else if (role === "feature") {
    content = box({ width: "100%", height: "100%", position: "relative", background: dark, padding: `145px ${safeX}px ${safeBottom}px`, gap: 40 }, [
      ...chrome("white"),
      box({ width: 420, flexDirection: "column", justifyContent: "center" }, textBlock({ color: "white", headlineSize: 64, bodySize: 29, bodyLines: 3 })),
      box({ width: 476, height: 945, overflow: "hidden", borderRadius: 2 }, picture({ width: "100%", height: "100%" })),
      swipeCue,
    ]);
  } else {
    content = box({ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: dark }, [
      picture({ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }),
      box({ position: "absolute", inset: 0, width: "100%", height: "100%", background: "rgba(0,0,0,.54)" }, null),
      ...chrome("white"),
      box({ position: "absolute", left: safeX, right: safeX + 70, top: 155, bottom: 105, display: "flex", flexDirection: "column", justifyContent: "center" }, textBlock({ color: "white", headlineSize: 72, bodySize: body.join("").length > 115 ? 28 : 32, bodyLines: 4, maxWidth: 850 })),
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
    const [{ data: workspace }, { data: brandProfile }] = await Promise.all([
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
    ]);
    const workspaceName = String(
      brandProfile?.business_name || workspace?.name || "SOON",
    );
    const requestOrigin = new URL(req.url).origin;
    const fallbackLogoUrl = /egg[.\s_-]*soon/i.test(workspaceName)
      ? `${requestOrigin}/brand-assets/eggsoon/soon-egg.png`
      : null;
    const branding = {
      logoUrl: workspace?.logo_url || fallbackLogoUrl,
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
    const theme = templateThemes[templateCode] || templateThemes["editorial-clear"];
    const productionStatus = project.production?.productionStatus;
    if (
      productionStatus !== "drafts_confirmed" &&
      productionStatus !== "images_ready"
    )
      return NextResponse.json({ error: "請先確認逐頁草稿" }, { status: 400 });
    const drafts = (project.production.pageDrafts || []) as Draft[];
    const assets = (project.production.assets || []) as Asset[];
    if (!drafts.length)
      return NextResponse.json({ error: "沒有逐頁草稿" }, { status: 400 });
    const fontFile = await readFile(
      path.join(
        process.cwd(),
        "public/fonts/max32002/SweiGothicCJKtc-Regular.ttf",
      ),
    );
    const font = fontFile.buffer.slice(
      fontFile.byteOffset,
      fontFile.byteOffset + fontFile.byteLength,
    ) as ArrayBuffer;
    const editorialFontFile = await readFile(
      path.join(process.cwd(), "public/fonts/max32002/NotoSerifCJKtc-Regular.otf"),
    );
    const editorialFont = editorialFontFile.buffer.slice(
      editorialFontFile.byteOffset,
      editorialFontFile.byteOffset + editorialFontFile.byteLength,
    ) as ArrayBuffer;
    const fonts = {
      regular: font,
      // ImageResponse/Satori cannot parse WOFF2. Register only local TTF/OTF
      // buffers so the renderer never receives a webfont with that signature.
      bold: font,
      family: resolveCarouselFontFamily(workspace?.font_style),
      editorial: editorialFont,
    };
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
          || (draft.imageTreatment !== "full-bleed" && ["comparison", "feature", "end"].includes(role));
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
      const preparedAsset = asset?.url
        ? { ...asset, url: role && preparedCutoutUrls.has(asset.url)
          ? preparedCutoutUrls.get(asset.url) || preparedImageUrls.get(asset.url) || asset.url
          : preparedImageUrls.get(asset.url) || asset.url }
        : asset;
      const secondarySource = assets.find((item) => item.id === assetIds[1] && item.url);
      const secondaryAsset = secondarySource?.url
        ? { ...secondarySource, url: role && preparedCutoutUrls.has(secondarySource.url)
          ? preparedCutoutUrls.get(secondarySource.url) || preparedImageUrls.get(secondarySource.url) || secondarySource.url
          : preparedImageUrls.get(secondarySource.url) || secondarySource.url }
        : undefined;
      const response = isClearMagazineCarousel(templateCode)
        ? await renderClearMagazinePage(draft, preparedAsset, index, drafts.length, fonts, branding, secondaryAsset, Boolean(workspace?.font_style))
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
