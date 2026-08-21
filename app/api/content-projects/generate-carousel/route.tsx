import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import React from "react";
import sharp from "sharp";

import { isUuid } from "@/lib/oauth-connections";
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
};

type Asset = { id: string; url: string; width?: number; height?: number };

const box = (style: React.CSSProperties, children: React.ReactNode) =>
  React.createElement(
    "div",
    { style: { display: "flex", ...style } },
    children,
  );

const DEFAULT_CAROUSEL_FONT = "SOON Rounded CJK";
const ROUNDED_BOLD_FONT_URL =
  "https://raw.githubusercontent.com/max32002/swei-gothic/master/WebFont/CJK%20TC/SweiGothicCJKtc-Bold.woff";

let roundedBoldFontPromise: Promise<ArrayBuffer> | null = null;

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

async function loadRoundedBoldFont(fallback: ArrayBuffer) {
  if (!roundedBoldFontPromise) {
    roundedBoldFontPromise = fetch(ROUNDED_BOLD_FONT_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Bold font HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .catch((error) => {
        console.warn("[content-projects/generate-carousel] bold font fallback", error);
        return fallback;
      });
  }
  return roundedBoldFontPromise;
}

async function renderPage(
  draft: Draft,
  asset: Asset | undefined,
  index: number,
  fonts: { regular: ArrayBuffer; bold: ArrayBuffer; family: string },
  branding: { logoUrl?: string | null; name: string },
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
            "生活常識 × 科學解說",
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
          background: "#f8f6f0",
          color: "#171717",
        },
        [
          React.createElement(
            "div",
            {
              key: "tag",
              style: {
                display: "flex",
                fontSize: 23,
                color: "#777",
                marginBottom: 18,
              },
            },
            "生活常識 × 科學解說",
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
              background: "#111",
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
        background: "#f8f6f0",
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
      .select("id,production")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .single();
    if (error) throw error;
    const [{ data: workspace }, { data: brandProfile }] = await Promise.all([
      access.admin
        .from("workspaces")
        .select("name,logo_url,font_style")
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
    };
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
    const fonts = {
      regular: font,
      bold: await loadRoundedBoldFont(font),
      family: resolveCarouselFontFamily(workspace?.font_style),
    };
    const outputs = [];
    const preparedImageUrls = new Map<string, string>();
    for (let index = 0; index < drafts.length; index += 1) {
      const draft = drafts[index];
      const asset = assets.find((item) => item.id === draft.assetId);
      let preparedAsset = asset;
      if (asset?.url) {
        let preparedUrl = preparedImageUrls.get(asset.url);
        if (!preparedUrl) {
          preparedUrl = await prepareImageSource(asset.url);
          preparedImageUrls.set(asset.url, preparedUrl);
        }
        preparedAsset = { ...asset, url: preparedUrl };
      }
      const response = await renderPage(
        draft,
        preparedAsset,
        index,
        fonts,
        branding,
      );
      const png = new Uint8Array(await response.arrayBuffer());
      const storagePath = `${workspaceId}/content-projects/${projectId}/carousel/p-${index + 1}-${Date.now()}.png`;
      const { error: uploadError } = await access.admin.storage
        .from("brand-assets")
        .upload(storagePath, png, { contentType: "image/png", upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = access.admin.storage
        .from("brand-assets")
        .getPublicUrl(storagePath);
      outputs.push({
        page: `P.${index + 1}`,
        url: publicUrl.publicUrl,
        width: 1080,
        height: 1350,
      });
    }
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
