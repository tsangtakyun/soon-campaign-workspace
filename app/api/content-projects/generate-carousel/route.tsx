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
  layout?: string;
  role?: string;
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

function clearMagazineRole(index: number, total: number): ClearMagazineRole {
  if (index === 0) return "cover";
  if (index === total - 1) return "end";
  // The reference set has six artboards, but the customer's chosen slide count
  // remains authoritative. A five-page carousel keeps the distinct cover,
  // long-form, split, comparison and end roles instead of shrinking six pages.
  const middle: ClearMagazineRole[] = total <= 5
    ? ["longform", "split", "comparison"]
    : ["longform", "split", "comparison", "feature"];
  return middle[Math.min(index - 1, middle.length - 1)];
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
  const requestedRole = String(draft.role || draft.layout || "").toLowerCase();
  const role = (["cover", "longform", "split", "comparison", "feature", "end"] as const)
    .includes(requestedRole as ClearMagazineRole)
    ? requestedRole as ClearMagazineRole
    : clearMagazineRole(index, total);
  const colors = branding.colors || [];
  const accent = colors[0] || "#f1d443";
  const dark = colors.find((color) => /^#[0-5]/i.test(color)) || "#050505";
  const page = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  const editorialFamily = hasBrandFont ? fonts.family : EDITORIAL_CAROUSEL_FONT;
  const clamp = (value: string | undefined, max: number) => {
    const clean = String(value || "").trim();
    return clean.length > max ? `${clean.slice(0, max).trim()}…` : clean;
  };
  const body = (Array.isArray(draft.body) ? draft.body : [])
    .filter(Boolean)
    .slice(0, 4)
    .map((line) => clamp(line, 54));
  const source = asset?.url;
  const picture = (style: React.CSSProperties, url = source) => url
    ? React.createElement("img", { src: url, width: 1080, height: 1350, style: { objectFit: "cover", ...style } })
    : box({ ...style, background: "#d9d4cc" }, null);
  const logo = branding.logoUrl
    ? React.createElement("img", { src: branding.logoUrl, width: 42, height: 42, style: { width: 42, height: 42, objectFit: "contain" } })
    : React.createElement("span", { style: { fontSize: 20, fontWeight: 700 } }, branding.name);
  const textBlock = (options: { color: string; headlineSize?: number; bodySize?: number; align?: "left" | "center"; showBody?: boolean }) =>
    box({ display: "flex", flexDirection: "column", color: options.color, textAlign: options.align || "left" }, [
      React.createElement("span", { key: "eye", style: { display: "flex", color: accent, fontSize: 24, fontWeight: 700, marginBottom: 18 } }, clamp(draft.subheadline || "重點整理", 28)),
      React.createElement("strong", { key: "head", style: { display: "flex", fontSize: options.headlineSize || 58, lineHeight: 1.14, letterSpacing: "-2px" } }, clamp(draft.headline, 24)),
      ...(options.showBody === false ? [] : body.map((line, bodyIndex) => React.createElement("span", { key: `body-${bodyIndex}`, style: { display: "flex", fontSize: options.bodySize || 31, lineHeight: 1.45, marginTop: bodyIndex === 0 ? 28 : 8 } }, line))),
    ]);
  const chrome = (color: string) => [
    React.createElement("div", { key: "logo", style: { position: "absolute", display: "flex", left: 58, top: 48, color } }, logo),
    React.createElement("span", { key: "page", style: { position: "absolute", display: "flex", right: 58, top: 55, color, fontSize: 20 } }, page),
  ];
  let content: React.ReactNode;
  if (role === "cover") {
    content = box({ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: dark }, [
      picture({ position: "absolute", inset: 0, width: "100%", height: "100%" }),
      box({ position: "absolute", inset: 0, width: "100%", height: "100%", background: "linear-gradient(0deg,rgba(0,0,0,.86),rgba(0,0,0,.04) 76%)" }, null),
      ...chrome("white"),
      box({ position: "absolute", left: 68, right: 68, bottom: 66, display: "flex", flexDirection: "column" }, [
        textBlock({ color: "white", headlineSize: 72, bodySize: 28 }),
        React.createElement("span", { key: "cta", style: { display: "flex", alignSelf: "flex-end", color: accent, fontSize: 42, marginTop: 20 } }, "→"),
      ]),
    ]);
  } else if (role === "end") {
    content = box({ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: dark, padding: "155px 66px 0" }, [
      ...chrome("white"),
      textBlock({ color: "white", headlineSize: 61, bodySize: 31 }),
      box({ position: "absolute", left: 0, bottom: 0, width: 820, height: 555, overflow: "hidden" }, picture({ width: "100%", height: "100%" })),
      React.createElement("span", { key: "cta", style: { position: "absolute", display: "flex", right: 62, bottom: 84, padding: "18px 28px", borderRadius: 22, background: accent, color: dark, fontSize: 24, fontWeight: 700 } }, "了解更多 →"),
    ]);
  } else if (role === "comparison") {
    content = box({ width: "100%", height: "100%", position: "relative", flexDirection: "column", background: dark, color: "white", padding: "150px 70px 62px" }, [
      ...chrome("white"),
      React.createElement("span", { key: "eye", style: { display: "flex", color: accent, fontSize: 29, fontWeight: 700 } }, draft.subheadline || "真正分別"),
      React.createElement("strong", { key: "head", style: { display: "flex", alignSelf: "center", textAlign: "center", fontSize: 57, lineHeight: 1.16, margin: "42px 30px 38px" } }, draft.headline || ""),
      box({ display: "flex", gap: 70, justifyContent: "center" }, [
        box({ width: 340, height: 380, flexDirection: "column", overflow: "hidden", borderRadius: 20, background: "#f36a2d" }, [picture({ width: "100%", height: 285 }), React.createElement("b", { key: "l", style: { display: "flex", padding: "18px 20px", fontSize: 25 } }, body[0] || "比較一")]),
        box({ width: 340, height: 380, flexDirection: "column", overflow: "hidden", borderRadius: 20, background: "#477877" }, [picture({ width: "100%", height: 285 }, secondaryAsset?.url), React.createElement("b", { key: "r", style: { display: "flex", padding: "18px 20px", fontSize: 25 } }, body[1] || "比較二")]),
      ]),
      React.createElement("span", { key: "summary", style: { display: "flex", textAlign: "center", alignSelf: "center", fontSize: 30, lineHeight: 1.45, margin: "38px 54px 0" } }, body.slice(2).join("\n") || draft.subheadline || ""),
    ]);
  } else if (role === "split") {
    content = box({ width: "100%", height: "100%", position: "relative", flexDirection: "column", background: dark }, [
      ...chrome("white"),
      box({ height: 700, width: "100%", overflow: "hidden" }, picture({ width: "100%", height: "100%" })),
      box({ flex: 1, padding: "42px 72px 58px" }, textBlock({ color: "white", headlineSize: 58, bodySize: 31 })),
    ]);
  } else if (role === "feature") {
    content = box({ width: "100%", height: "100%", position: "relative", background: dark, padding: "150px 60px 62px", gap: 38 }, [
      ...chrome("white"),
      box({ width: 420, flexDirection: "column", justifyContent: "center" }, textBlock({ color: "white", headlineSize: 56, bodySize: 31 })),
      box({ flex: 1, height: 940, overflow: "hidden" }, picture({ width: "100%", height: "100%" })),
    ]);
  } else {
    content = box({ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: dark }, [
      picture({ position: "absolute", inset: 0, width: "100%", height: "100%" }),
      box({ position: "absolute", inset: 0, width: "100%", height: "100%", background: "linear-gradient(0deg,rgba(0,0,0,.9),rgba(0,0,0,.08))" }, null),
      ...chrome("white"),
      box({ position: "absolute", inset: 0, width: "100%", height: "100%", background: "rgba(0,0,0,.48)" }, null),
      box({ position: "absolute", left: 72, right: 72, top: 155 }, textBlock({ color: "white", headlineSize: 65, bodySize: 38 })),
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
            .map((color) => typeof color === "string" ? color : color && typeof color === "object" && "hex" in color ? String(color.hex) : "")
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
    const outputs = await Promise.all(drafts.map(async (draft, index) => {
      const asset = assets.find((item) => item.id === draft.assetId);
      const preparedAsset = asset?.url
        ? { ...asset, url: preparedImageUrls.get(asset.url) || asset.url }
        : asset;
      const secondarySource = assets.find((item) => item.id !== draft.assetId && item.url);
      const secondaryAsset = secondarySource?.url
        ? { ...secondarySource, url: preparedImageUrls.get(secondarySource.url) || secondarySource.url }
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
