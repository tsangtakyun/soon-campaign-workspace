"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  DashboardSidebar,
  dashboardSidebarStyles,
} from "@/components/dashboard/DashboardSidebar";
import { DesignToolbar } from "@/components/editor/DesignToolbar";
import { EditorSidePanel } from "@/components/editor/EditorSidePanel";
import {
  CHANNELS,
  FALLBACK_IMAGES,
  PLACEHOLDER_IMAGE,
} from "@/components/editor/editorData";
import { ClaimOnboardingSession } from "@/components/onboarding/ClaimOnboardingSession";
import {
  getOrCreateOnboardingSessionId,
  getStoredOnboardingSessionId,
  hasPersistedOnboardingSession,
  markOnboardingPersisted,
} from "@/lib/onboarding-session";
import type { FabricControls } from "@/components/editor/DesignCanvas";
import { createClient } from "@/lib/supabase";
import {
  isBechillWorkspace,
  isEggWorkspace,
  resolveActiveWorkspace,
  WORKSPACE_CHANGED_EVENT,
} from "@/lib/workspace-client";
import type {
  CanvasSize,
  DesignElement,
  DesignElementKind,
  DesignTool,
  ElementSection,
  PreviewChannel,
  ScheduledPost,
  TextPreset,
  TopicReference,
} from "@/components/editor/editorTypes";

const DesignCanvas = dynamic(
  () =>
    import("@/components/editor/DesignCanvas").then(
      (module) => module.DesignCanvas,
    ),
  { ssr: false },
);

const PUBLISH_PLATFORMS = [
  {
    channel: "Instagram" as PreviewChannel,
    id: "instagram",
    label: "Instagram",
  },
  { channel: "Facebook" as PreviewChannel, id: "facebook", label: "Facebook" },
  { channel: "Threads" as PreviewChannel, id: "threads", label: "Threads" },
];

const AUTO_PUBLISH_PLATFORM_IDS = new Set(["instagram", "facebook", "threads"]);

function PublishPlatformIcon({ platform }: { platform: string }) {
  if (platform === "instagram") {
    return (
      <span className="publish-platform-icon instagram" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <rect x="5.25" y="5.25" width="13.5" height="13.5" rx="4.25" />
          <circle cx="12" cy="12" r="3.25" />
          <circle cx="16.15" cy="7.85" r="1" />
        </svg>
      </span>
    );
  }

  if (platform === "facebook") {
    return (
      <span className="publish-platform-icon facebook" aria-hidden="true">
        f
      </span>
    );
  }

  return (
    <span className="publish-platform-icon threads" aria-hidden="true">
      @
    </span>
  );
}

type PlatformConnection = {
  account_id?: string | null;
  account_name?: string | null;
  platform: string;
};

function readTopicImages() {
  if (typeof window === "undefined") return FALLBACK_IMAGES;
  try {
    const raw = window.sessionStorage.getItem("soon-topic-review-v1");
    const topics = raw ? (JSON.parse(raw) as TopicReference[]) : [];
    const images = topics
      .map((topic) => topic.image)
      .filter((image) => image && image !== PLACEHOLDER_IMAGE);
    return images.length ? images : FALLBACK_IMAGES;
  } catch {
    return FALLBACK_IMAGES;
  }
}

function resolveLogoSrc(value: string) {
  if (!value) return "";
  if (
    value.startsWith("/") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  )
    return value;
  return `/api/logo-image?url=${encodeURIComponent(value)}`;
}

function normalizeHexColorValue(value: unknown): string | null {
  const raw = String(value || "").trim().replace(/^#/, "");
  const expanded = /^[0-9a-f]{3}$/i.test(raw)
    ? raw
        .split("")
        .map((char) => char + char)
        .join("")
    : raw;
  return /^[0-9a-f]{6}$/i.test(expanded)
    ? `#${expanded.toUpperCase()}`
    : null;
}

function extractBrandColors(value: unknown): string[] {
  let input = value;
  if (typeof input === "string") {
    const serialized = input;
    try {
      input = JSON.parse(serialized);
    } catch {
      input = serialized.split(",");
    }
  }
  const items = Array.isArray(input) ? input : [];
  const normalized = items
    .map((item) => {
      if (typeof item === "string") return normalizeHexColorValue(item);
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return normalizeHexColorValue(
          record.hex ?? record.color ?? record.value,
        );
      }
      return null;
    })
    .filter((color): color is string => Boolean(color));
  return Array.from(new Set(normalized));
}

const BECHILL_BRAND_COLORS = [
  "#F7F1EC",
  "#CFE3F1",
  "#F1B8C6",
  "#EFE3D2",
  "#171717",
];

const EGG_BRAND_COLORS = [
  "#F4D547",
  "#111111",
  "#F6F1E7",
  "#E24B35",
  "#FFFFFF",
];

function readBrandKit() {
  if (typeof window === "undefined")
    return {
      businessName: "品牌",
      logoUrl: "",
      fontFamily: "SweiGothicCJKtc-Regular",
      brandColors: [] as string[],
    };

  try {
    const rawProfile = window.sessionStorage.getItem(
      "soon-business-profile-v1",
    );
    if (rawProfile) {
      const profile = JSON.parse(rawProfile) as {
        businessName?: string;
        logoUrl?: string;
      };
      return {
        businessName: profile.businessName || "品牌",
        logoUrl: resolveLogoSrc(profile.logoUrl || ""),
        fontFamily: "SweiGothicCJKtc-Regular",
        brandColors: extractBrandColors(
          (profile as { brandColors?: unknown; brand_colors?: unknown }).brandColors ??
            (profile as { brand_colors?: unknown }).brand_colors,
        ),
      };
    }
  } catch {
    // Fall through to website analysis fallback.
  }

  try {
    const rawAnalysis = window.sessionStorage.getItem(
      "soon-website-analysis-v1",
    );
    if (rawAnalysis) {
      const parsed = JSON.parse(rawAnalysis) as {
        analysis?: { businessName?: string; logoUrl?: string };
      };
      return {
        businessName: parsed.analysis?.businessName || "品牌",
        logoUrl: resolveLogoSrc(parsed.analysis?.logoUrl || ""),
        fontFamily: "SweiGothicCJKtc-Regular",
        brandColors: extractBrandColors(
          (parsed.analysis as { brandColors?: unknown; brand_colors?: unknown } | undefined)?.brandColors ??
            (parsed.analysis as { brand_colors?: unknown } | undefined)?.brand_colors,
        ),
      };
    }
  } catch {
    // Ignore malformed session data.
  }

  return {
    businessName: "品牌",
    logoUrl: "",
    fontFamily: "SweiGothicCJKtc-Regular",
    brandColors: [] as string[],
  };
}

function readSessionJson(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildOnboardingCompletePayload() {
  return {
    sessionId: getOrCreateOnboardingSessionId(),
    websiteAnalysis: readSessionJson("soon-website-analysis-v1"),
    businessProfile: readSessionJson("soon-business-profile-v1"),
    contentStrategy: readSessionJson("soon-content-strategy-v1"),
    campaignDetails: readSessionJson("soon-campaign-details-v1"),
    distributionPrefs: readSessionJson("soon-distribution-preferences-v1"),
    contentMix: readSessionJson("soon-content-mix-v1"),
    contentMood: readSessionJson("soon-content-mood-v1"),
    visualStyle: readSessionJson("soon-visual-style-v1"),
    typeface: readSessionJson("soon-typeface-v1"),
    photoControl: readSessionJson("soon-photo-control-v2"),
    topicReview: readSessionJson("soon-topic-review-v1"),
    campaignThemes: readSessionJson("soon-campaign-themes-v1"),
  };
}

async function completeOnboardingSnapshot() {
  if (hasPersistedOnboardingSession()) return true;

  const payload = buildOnboardingCompletePayload();
  if (!payload.sessionId) return false;
  if (!payload.businessProfile && !payload.websiteAnalysis) return false;

  try {
    const response = await fetch("/api/onboarding/complete", {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      console.warn(
        "Failed to persist onboarding snapshot:",
        response.status,
        message,
      );
      return false;
    }

    const result = await response.json().catch(() => ({}));
    console.log("[onboarding/complete] success:", result);
    markOnboardingPersisted();
    return true;
  } catch (error) {
    console.error("Failed to persist onboarding:", error);
    return false;
  }
}

async function loadPersistedBrandKit(fallback: {
  businessName: string;
  logoUrl: string;
  fontFamily: string;
  brandColors: string[];
}) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const sessionId = getStoredOnboardingSessionId();

    let query = supabase.from("brand_kits").select("business_name,logo_url");
    if (user?.id) {
      const { activeWorkspace, workspaceId } = await resolveActiveWorkspace();
      if (workspaceId) {
        const [response, settingsResponse] = await Promise.all([
          fetch(
            `/api/brand-kit-data?workspace_id=${encodeURIComponent(workspaceId)}`,
            { cache: "no-store" },
          ),
          fetch(
            `/api/workspace-settings?workspace_id=${encodeURIComponent(workspaceId)}`,
            { cache: "no-store" },
          ),
        ]);
        const payload = await response.json().catch(() => null);
        const settingsPayload = await settingsResponse.json().catch(() => null);
        if (response.ok || settingsResponse.ok) {
          const workspaceSettings =
            settingsPayload?.workspace || settingsPayload || payload?.workspace || {};
          const workspaceLogo = workspaceSettings?.logo_url || "";
          const workspaceFallbackLogo = isEggWorkspace(activeWorkspace)
            ? "/brand-assets/eggsoon/soon-egg.png"
            : isBechillWorkspace(activeWorkspace)
              ? "/brand-assets/bechilltogether/bunchill-logo.png"
              : "";
          const workspaceFont = resolveWorkspaceFontFamily(
            workspaceSettings?.font_style,
            fallback.fontFamily,
          );
          const persistedWorkspaceBrandColors = extractBrandColors(
            workspaceSettings?.brand_colors,
          );
          const workspaceBrandColors = persistedWorkspaceBrandColors.length
            ? persistedWorkspaceBrandColors
            : isEggWorkspace(activeWorkspace)
              ? EGG_BRAND_COLORS
              : isBechillWorkspace(activeWorkspace)
                ? BECHILL_BRAND_COLORS
                : [];
          if (!workspaceLogo) {
            const { data: storedKit } = await supabase
              .from("brand_kits")
              .select("business_name,logo_url")
              .eq("workspace_id", workspaceId)
              .maybeSingle();
            return {
              businessName:
                payload?.brandProfile?.business_name ||
                storedKit?.business_name ||
                fallback.businessName,
              logoUrl: storedKit?.logo_url
                ? resolveLogoSrc(storedKit.logo_url)
                : workspaceFallbackLogo,
              fontFamily: workspaceFont,
              brandColors: workspaceBrandColors,
            };
          }
          return {
            businessName:
              payload?.brandProfile?.business_name || fallback.businessName,
            logoUrl: resolveLogoSrc(workspaceLogo),
            fontFamily: workspaceFont,
            brandColors: workspaceBrandColors,
          };
        }
        query = query.eq("workspace_id", workspaceId);
      } else {
        query = query.eq("user_id", user.id);
      }
    } else if (sessionId) {
      query = query.eq("onboarding_session_id", sessionId);
    } else {
      return fallback;
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return fallback;

    const nextLogo = data.logo_url
      ? resolveLogoSrc(data.logo_url)
      : fallback.logoUrl;
    return {
      businessName: data.business_name || fallback.businessName,
      logoUrl: nextLogo,
      fontFamily: fallback.fontFamily,
      brandColors: fallback.brandColors,
    };
  } catch {
    return fallback;
  }
}

function resolveWorkspaceFontFamily(value?: string | null, fallback = "SweiGothicCJKtc-Regular") {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("gensenrounded") || normalized.includes("系統圓體")) {
    return "GenSenRounded2";
  }
  return value?.trim() || fallback;
}

type CarouselEditorPayload = {
  draft?: {
    body?: string[];
    headline?: string;
    layout?: string;
    subheadline?: string;
  };
  generatedImage?: string;
  page?: string;
  projectId?: string;
  sourceImage?: string;
  title?: string;
  workspaceLogo?: string;
  workspaceName?: string;
  workspaceFont?: string;
};

function readCarouselEditorPayload(): CarouselEditorPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(
      "soon-carousel-editor-payload-v1",
    );
    return raw ? (JSON.parse(raw) as CarouselEditorPayload) : null;
  } catch {
    return null;
  }
}

function createCarouselLayerElements(
  payload: CarouselEditorPayload,
  _fallbackImage: string,
): DesignElement[] {
  const cover = payload.draft?.layout === "cover" || payload.page === "P.1";
  const textColor = cover ? "#ffffff" : "#171717";
  const workspaceFont = resolveWorkspaceFontFamily(payload.workspaceFont);
  const body = Array.isArray(payload.draft?.body)
    ? payload.draft.body.slice(0, 3)
    : [];
  const elements: DesignElement[] = [
    {
      id: "carousel-background",
      kind: "shape",
      item: "background",
      label: "頁面背景",
      x: 50,
      y: 50,
      size: 430,
      width: 430,
      height: 538,
      rotation: 0,
      opacity: 100,
      color: cover ? "#171717" : "#f8f6f0",
      zIndex: 1,
    },
  ];
  if (payload.sourceImage) {
    if (!cover) {
      elements.push({
        id: "carousel-image-mat",
        kind: "shape",
        item: "rectangle",
        label: "圖片底板",
        x: 50,
        y: 67,
        size: 379,
        width: 379,
        height: 207,
        rotation: 0,
        opacity: 100,
        color: "#f1f1ef",
        zIndex: 2,
      });
    }
    elements.push({
      id: "carousel-source-image",
      kind: "image",
      item: cover ? "background" : "photo",
      label: "原圖",
      x: 50,
      y: cover ? 50 : 67,
      size: cover ? 430 : 379,
      width: cover ? 430 : 379,
      height: cover ? 538 : 207,
      rotation: 0,
      opacity: 100,
      color: "#ffffff",
      zIndex: cover ? 2 : 3,
      imageUrl: payload.sourceImage,
    });
  }
  if (cover) {
    elements.push({
      id: "carousel-overlay",
      kind: "shape",
      item: "rectangle",
      label: "文字遮罩",
      x: 50,
      y: 79,
      size: 430,
      width: 430,
      height: 225,
      rotation: 0,
      opacity: 58,
      color: "#111111",
      zIndex: 3,
    });
  }
  elements.push(
    {
      id: "carousel-category",
      kind: "text",
      item: "caption",
      label: "分類",
      x: 50,
      y: cover ? 72 : 5.5,
      size: cover ? 13 : 9,
      width: cover ? 378 : 379,
      rotation: 0,
      opacity: 82,
      color: textColor,
      zIndex: 10,
      textContent: "生活常識 × 科學解說",
      fontFamily: workspaceFont,
      fontSize: cover ? 13 : 9,
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      lineHeight: 1.2,
    },
    {
      id: "carousel-headline",
      kind: "text",
      item: "headline",
      label: "主標題",
      x: 50,
      y: cover ? 81 : 12.5,
      size: cover ? 29 : 23,
      width: 379,
      rotation: 0,
      opacity: 100,
      color: textColor,
      zIndex: 11,
      textContent: (payload.draft?.headline || payload.title || "")
        .replace(/\s+/g, " ")
        .trim(),
      fontFamily: workspaceFont,
      fontSize: cover ? 29 : 23,
      fontWeight: "bold",
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      lineHeight: 1.05,
    },
  );
  if (!cover) {
    elements.push({
      id: "carousel-headline-rule",
      kind: "shape",
      item: "rectangle",
      label: "標題分隔線",
      x: 10,
      y: 19.5,
      size: 36,
      width: 36,
      height: 2,
      rotation: 0,
      opacity: 100,
      color: "#111111",
      zIndex: 11,
    });
  }
  if (payload.draft?.subheadline) {
    elements.push({
      id: "carousel-subheadline",
      kind: "text",
      item: "subtitle",
      label: "副標題",
      x: 50,
      y: cover ? 90 : 29,
      size: 18,
      width: 379,
      rotation: 0,
      opacity: 100,
      color: textColor,
      zIndex: 12,
      textContent: payload.draft.subheadline,
      fontFamily: workspaceFont,
      fontSize: 18,
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      lineHeight: 1.15,
    });
  }
  if (!cover && body.length) {
    const bodyWidth = 379;
    const bodyFontSize = 12;
    const bodyLineHeight = 1.55;
    const bodyGap = 8;
    const approximateCharactersPerLine = Math.floor(bodyWidth / bodyFontSize);
    let bodyTop = 129;
    body.forEach((paragraph, index) => {
      const visualLength = Array.from(paragraph).reduce(
        (total, character) => total + (/\s/.test(character) ? 0.45 : 1),
        0,
      );
      const lineCount = Math.max(
        1,
        Math.ceil(visualLength / approximateCharactersPerLine),
      );
      const paragraphHeight = lineCount * bodyFontSize * bodyLineHeight;
      elements.push({
        id: `carousel-body-${index + 1}`,
        kind: "text",
        item: "body",
        label: `正文 ${index + 1}`,
        x: 50,
        y: ((bodyTop + paragraphHeight / 2) / 538) * 100,
        size: bodyFontSize,
        width: bodyWidth,
        rotation: 0,
        opacity: 100,
        color: "#171717",
        zIndex: 12,
        textContent: paragraph,
        fontFamily: workspaceFont,
        fontSize: bodyFontSize,
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        textAlign: "left",
        lineHeight: bodyLineHeight,
      });
      bodyTop += paragraphHeight + bodyGap;
    });
  }
  if (payload.workspaceLogo) {
    elements.push({
      id: "carousel-logo",
      kind: "image",
      item: "logo",
      label: "Workspace Logo",
      x: 7.5,
      y: 95.5,
      size: 14,
      width: 14,
      height: 14,
      rotation: 0,
      opacity: 100,
      color: "#ffffff",
      zIndex: 20,
      imageUrl: payload.workspaceLogo,
    });
  }
  elements.push(
    {
      id: "carousel-brand-name",
      kind: "text",
      item: "caption",
      label: "品牌名稱",
      x: payload.workspaceLogo ? 22.5 : 17.5,
      y: 95.5,
      size: 10,
      width: 100,
      rotation: 0,
      opacity: 100,
      color: textColor,
      zIndex: 21,
      textContent: payload.workspaceName || "egg.soon",
      fontFamily: workspaceFont,
      fontSize: 10,
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      lineHeight: 1,
    },
    {
      id: "carousel-page-number",
      kind: "text",
      item: "caption",
      label: "頁碼",
      x: 90,
      y: 95.5,
      size: 10,
      width: 55,
      rotation: 0,
      opacity: 100,
      color: textColor,
      zIndex: 21,
      textContent: payload.page || "P.1",
      fontFamily: workspaceFont,
      fontSize: 10,
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "right",
      lineHeight: 1,
    },
  );
  return elements;
}

function buildScheduledPosts(images: string[]): ScheduledPost[] {
  return [
    {
      id: "still-1000",
      type: "靜態圖片",
      time: "10:00",
      title: "差點沒拍下來的片段",
      body: "最細小的片段，往往承載最真實的感覺。把那個笑聲、眼神或普通一刻分享出去，就會變成朋友想再看一次的回憶。",
      image: images[0] || FALLBACK_IMAGES[0],
      status: "新內容",
    },
    {
      id: "blog-1400",
      type: "文章",
      time: "14:00",
      title: "一個簡單房間，幾段短片，突然就值得重播",
      body: "和朋友聚在一起，本來可以很平常。但當那些片段被剪成有節奏的日常故事，它就會變成你想再看、再分享的內容。",
      image: images[1] || FALLBACK_IMAGES[1],
      status: "新內容",
    },
    {
      id: "short-1800",
      type: "短影片",
      time: "18:00",
      title: "今天值得留下的一秒",
      body: "晚上的內容會用更輕鬆的節奏，提醒觀眾每日都有值得記錄的微小時刻。",
      image: images[2] || FALLBACK_IMAGES[2],
      status: "草稿",
    },
  ];
}

const approvalAsset = (fileName: string) =>
  `https://soon-approval.vercel.app/a/${fileName}`;

const bechillConfirmedSchedulePosts: ScheduledPost[] = [
  {
    id: "bechill-week1-02",
    type: "靜態圖片",
    time: "8月13日（四）18:00",
    title: "《乖乖等你》",
    body: "你諗起邊個？\n\n有些人會陪你一段路。\n有些人會在某個時間明白你。\n有些關係很好，只是未必能一直留在原地。\n但笨chill 不太懂講大道理。\n牠一直在你回來之前，乖乖等你。\n-\n你同你屋企寵物之間，有冇一件好窩心嘅小事？\n留言講俾我哋聽",
    image: approvalAsset("02_wait_1.webp"),
    media: Array.from({ length: 7 }, (_, index) =>
      approvalAsset(`02_wait_${index + 1}.webp`),
    ),
    scheduledAt: "2026-08-13T10:00:00.000Z",
    status: "已確認",
  },
  {
    id: "bechill-week1-03",
    type: "靜態圖片",
    time: "8月14日（五）18:00",
    title: "《有你嘅世界》",
    body: "Tag 一個成日好忙嘅朋友\n你開心，世界照樣轉。\n你唔開心，世界一樣照樣轉。\n唔係你唔重要，\n係唔使咩都攬上身。\n舒服啲啦 —— 世界唔會因為你抖五分鐘而停。",
    image: approvalAsset("03_world_1.webp"),
    media: Array.from({ length: 4 }, (_, index) =>
      approvalAsset(`03_world_${index + 1}.webp`),
    ),
    scheduledAt: "2026-08-14T10:00:00.000Z",
    status: "已確認",
  },
  {
    id: "bechill-week1-04",
    type: "靜態圖片",
    time: "8月15日（六）18:00",
    title: "《休息不是懶惰》",
    body: "Tag 一個最近需要休息嘅朋友\n\n「休息並不是懶惰。在夏日某天躺在樹下草地上，聽水聲潺潺，或看雲在天上飄過，絕不是浪費時間。」\n\nJohn Lubbock",
    image: approvalAsset("04_rest_1.webp"),
    media: Array.from({ length: 7 }, (_, index) =>
      approvalAsset(`04_rest_${index + 1}.webp`),
    ),
    scheduledAt: "2026-08-15T10:00:00.000Z",
    status: "已確認",
  },
  {
    id: "bechill-week1-05",
    type: "靜態圖片",
    time: "8月16日（日）18:00",
    title: "《沖完涼的髮型》",
    body: "你喜歡笨chill沖完涼的髮型嗎？",
    image: approvalAsset("05_hair_1.webp"),
    media: Array.from({ length: 4 }, (_, index) =>
      approvalAsset(`05_hair_${index + 1}.webp`),
    ),
    scheduledAt: "2026-08-16T10:00:00.000Z",
    status: "已確認",
  },
];

function formatPostTime(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleTimeString("zh-HK", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function currentTimeZoneLabel() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "你的本地時區";
  } catch {
    return "你的本地時區";
  }
}

function mapPersistedPostType(value: unknown): ScheduledPost["type"] {
  if (value === "blog") return "文章";
  if (value === "video") return "短影片";
  return "靜態圖片";
}

function mapPersistedPostStatus(value: unknown): ScheduledPost["status"] {
  if (value === "approved") return "已確認";
  if (value === "scheduled") return "已排程";
  if (value === "published" || value === "posted") return "已發布";
  return value === "draft" ? "草稿" : "新內容";
}

function mapPersistedScheduledPost(
  row: Record<string, unknown>,
  index: number,
  fallbackPosts: ScheduledPost[],
): ScheduledPost {
  const fallback = fallbackPosts[index % fallbackPosts.length];
  const postType =
    typeof row.post_type === "string" ? row.post_type : undefined;
  const captions =
    row.captions && typeof row.captions === "object"
      ? (row.captions as Record<string, unknown>)
      : {};
  const publishStatus =
    captions.publish_status &&
    typeof captions.publish_status === "object" &&
    !Array.isArray(captions.publish_status)
      ? (captions.publish_status as ScheduledPost["publishStatus"])
      : undefined;
  const assets = Array.isArray(captions.assets) ? captions.assets : [];
  const media = assets
    .map((asset) =>
      asset && typeof asset === "object"
        ? (asset as Record<string, unknown>).url
        : null,
    )
    .filter((url): url is string => typeof url === "string" && url.length > 0);
  const image =
    typeof row.image_url === "string" && row.image_url
      ? row.image_url
      : media[0] || fallback.image;
  return {
    body: typeof row.body === "string" && row.body ? row.body : fallback.body,
    id: typeof row.id === "string" ? row.id : fallback.id,
    image,
    media: media.length ? media : undefined,
    postType,
    publishStatus,
    scheduledAt: typeof row.scheduled_at === "string" ? row.scheduled_at : null,
    status: mapPersistedPostStatus(row.status),
    time: formatPostTime(row.scheduled_at, fallback.time),
    title:
      typeof row.title === "string" && row.title ? row.title : fallback.title,
    type: mapPersistedPostType(postType),
  };
}

function localDateTimeValue(offsetHours = 1) {
  const date = new Date();
  date.setHours(date.getHours() + offsetHours, 0, 0, 0);
  return dateToLocalDateTimeValue(date);
}

function dateToLocalDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function scheduledPostDateTimeValue(value: string | null | undefined) {
  if (!value) return localDateTimeValue();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localDateTimeValue();
  return dateToLocalDateTimeValue(date);
}

function isInCurrentWeek(post: ScheduledPost) {
  if (!post.scheduledAt) return false;
  const scheduled = new Date(post.scheduledAt);
  if (Number.isNaN(scheduled.getTime())) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return scheduled >= start && scheduled < end;
}

function createPostDesignElements(post: ScheduledPost): DesignElement[] {
  return [
    {
      id: `image-background-${post.id}`,
      kind: "image",
      item: "background",
      label: "背景圖片",
      x: 50,
      y: 50,
      size: 430,
      width: 430,
      height: 538,
      rotation: 0,
      opacity: 100,
      color: "#ffffff",
      zIndex: 1,
      imageUrl: post.image,
    },
    {
      id: `text-title-${post.id}`,
      kind: "text",
      item: "headline",
      label: "標題文字",
      x: 34,
      y: 13,
      size: 36,
      rotation: 0,
      opacity: 100,
      color: "#ffffff",
      zIndex: 10,
      textContent: post.title,
      fontFamily: "Georgia, serif",
      fontSize: 36,
      fontWeight: "bold",
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      width: 330,
      lineHeight: 0.96,
    },
    {
      id: `text-subtitle-${post.id}`,
      kind: "text",
      item: "subtitle",
      label: "副標題文字",
      x: 33,
      y: 25,
      size: 21,
      rotation: 0,
      opacity: 100,
      color: "#ffffff",
      zIndex: 11,
      textContent: "is the one friends replay most.",
      fontFamily: "inherit",
      fontSize: 21,
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      width: 310,
      lineHeight: 1.08,
    },
    {
      id: `text-logo-${post.id}`,
      kind: "text",
      item: "logo",
      label: "品牌 Logo",
      x: 18,
      y: 91,
      size: 21,
      rotation: -4,
      opacity: 100,
      color: "#ffffff",
      zIndex: 12,
      textContent: "SOON\nLOG",
      fontFamily: "inherit",
      fontSize: 21,
      fontWeight: "bold",
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      width: 86,
      lineHeight: 0.8,
    },
  ];
}

function ScheduledPostsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoPostId = searchParams.get("postId");
  const externalEditImage = searchParams.get("editImage");
  const externalEditTitle = searchParams.get("editTitle") || "Carousel 圖片";
  const externalEditPage = searchParams.get("editPage") || "P.1";
  const carouselEditorPayload = useMemo(() => readCarouselEditorPayload(), []);
  const externalEditorReturnUrl = carouselEditorPayload?.projectId
    ? `/onboarding/content-studio?project=${encodeURIComponent(carouselEditorPayload.projectId)}`
    : "/onboarding/content-studio";
  const [compact, setCompact] = useState(false);
  const fallbackScheduledPosts = useMemo(
    () => buildScheduledPosts(readTopicImages()),
    [],
  );
  const [persistedScheduledPosts, setPersistedScheduledPosts] = useState<
    ScheduledPost[]
  >([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsLoadError, setPostsLoadError] = useState("");
  const clientReadyPosts = persistedScheduledPosts.filter((post) =>
    ["已批准", "已確認", "已排程"].includes(post.status),
  );
  const [isBechillActive, setIsBechillActive] = useState(false);
  const scheduledPosts =
    clientReadyPosts.length > 0
      ? clientReadyPosts
      : isBechillActive
        ? bechillConfirmedSchedulePosts
        : [];
  const currentWeekPosts = useMemo(
    () => scheduledPosts.filter(isInCurrentWeek),
    [scheduledPosts],
  );
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [postStatuses, setPostStatuses] = useState<
    Record<
      string,
      "draft" | "approved" | "scheduled" | "published" | "rejected"
    >
  >({});
  const [publishing, setPublishing] = useState(false);
  const [publishingPlatform, setPublishingPlatform] = useState<string | null>(
    null,
  );
  const [publishResult, setPublishResult] = useState<
    "success" | "error" | null
  >(null);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishedPlatforms, setPublishedPlatforms] = useState<
    Record<string, boolean>
  >({});
  const [platformConnections, setPlatformConnections] = useState<
    Record<string, PlatformConnection>
  >({});
  const [platformConnectionsLoading, setPlatformConnectionsLoading] =
    useState(true);
  const [previewChannel, setPreviewChannel] =
    useState<PreviewChannel>("Instagram");
  const [captions, setCaptions] = useState<
    Record<string, Partial<Record<PreviewChannel, string>>>
  >({});
  const [draftCaptions, setDraftCaptions] = useState<
    Partial<Record<PreviewChannel, string>>
  >({});
  const [captionModalOpen, setCaptionModalOpen] = useState(false);
  const [designMode, setDesignMode] = useState(false);
  const [activeDesignTool, setActiveDesignTool] = useState<DesignTool>("品牌");
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    label: "Instagram 直向貼文",
    w: 1080,
    h: 1350,
  });
  const [expandedElementSection, setExpandedElementSection] =
    useState<ElementSection | null>(null);
  const [designElements, setDesignElements] = useState<DesignElement[]>([]);
  const [designElementsPostId, setDesignElementsPostId] = useState<
    string | null
  >(null);
  const [uploadedImages, setUploadedImages] = useState<
    { url: string; label: string }[]
  >([]);
  const [brandKit, setBrandKit] = useState({
    businessName: "品牌",
    logoUrl: "",
    fontFamily: "SweiGothicCJKtc-Regular",
    brandColors: [] as string[],
  });
  const [brandKitLoading, setBrandKitLoading] = useState(true);
  const [isSavingDesign, setIsSavingDesign] = useState(false);
  const [saveDesignMessage, setSaveDesignMessage] = useState("");
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<
    string | null
  >(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createPostType, setCreatePostType] = useState("still-images");
  const [createTitle, setCreateTitle] = useState("");
  const [createScheduledAt, setCreateScheduledAt] =
    useState(localDateTimeValue());
  const [scheduleModalPost, setScheduleModalPost] =
    useState<ScheduledPost | null>(null);
  const [scheduleDraftAt, setScheduleDraftAt] = useState(localDateTimeValue());
  const [localTimeZoneLabel, setLocalTimeZoneLabel] = useState("你的本地時區");
  const [toolbarMessage, setToolbarMessage] = useState("");
  const [toolbarBusy, setToolbarBusy] = useState(false);
  const [postSlides, setPostSlides] = useState<Record<string, number>>({});
  const [expandedCaptions, setExpandedCaptions] = useState<
    Record<string, boolean>
  >({});
  const [editingCaptionPostId, setEditingCaptionPostId] = useState<
    string | null
  >(null);
  const [cardCaptionDrafts, setCardCaptionDrafts] = useState<
    Record<string, string>
  >({});
  const [savingCaptionPostId, setSavingCaptionPostId] = useState<string | null>(
    null,
  );
  const [cancellingPostId, setCancellingPostId] = useState<string | null>(null);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const connectedPublishPlatforms = PUBLISH_PLATFORMS.filter(
    (platform) => platformConnections[platform.id],
  );
  const connectedAutoPublishPlatforms = connectedPublishPlatforms.filter(
    (platform) => AUTO_PUBLISH_PLATFORM_IDS.has(platform.id),
  );
  const hasPublishConnection = connectedAutoPublishPlatforms.length > 0;
  const [regenerateProgress, setRegenerateProgress] = useState({
    current: 0,
    total: 0,
  });
  const [improvePanelOpen, setImprovePanelOpen] = useState(false);
  const [improveMode, setImproveMode] = useState<"copy" | "image-prompt">(
    "copy",
  );
  const [improveProgress, setImproveProgress] = useState({
    current: 0,
    total: 0,
  });
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const canvasRef = useRef<HTMLElement | null>(null);
  const fabricControlsRef = useRef<FabricControls | null>(null);
  const designHistoryIndexRef = useRef(-1);
  const designHistoryRef = useRef<string[]>([]);
  const isRestoringDesignHistoryRef = useRef(false);

  useEffect(() => {
    setLocalTimeZoneLabel(currentTimeZoneLabel());
  }, []);

  useEffect(() => {
    if (!autoPostId) return;
    router.replace("/onboarding/scheduled-posts", { scroll: false });
  }, [autoPostId, router]);

  useEffect(() => {
    if (!autoPostId || selectedPost) return;
    const targetPost = scheduledPosts.find((post) => post.id === autoPostId);
    if (targetPost) setSelectedPost(targetPost);
  }, [autoPostId, scheduledPosts, selectedPost]);

  const openDesignEditor = (post: ScheduledPost) => {
    if (designElementsPostId !== post.id) {
      const nextElements = createPostDesignElements(post);
      designHistoryRef.current = [JSON.stringify(nextElements)];
      designHistoryIndexRef.current = 0;
      setDesignElements(nextElements);
      void fabricControlsRef.current?.loadDesignElements(nextElements);
      setDesignElementsPostId(post.id);
      setSelectedElementId(null);
    }
    setDesignMode(true);
  };

  useEffect(() => {
    if (!externalEditImage || selectedPost) return;
    const externalPost: ScheduledPost = {
      id: `carousel-${externalEditPage}`,
      type: "靜態圖片",
      time: "",
      title: `${externalEditPage} · ${externalEditTitle}`,
      body: "",
      image: externalEditImage,
      status: "草稿",
    };
    setSelectedPost(externalPost);
    const payload = carouselEditorPayload
      ? {
          ...carouselEditorPayload,
          workspaceLogo:
            carouselEditorPayload.workspaceLogo || brandKit.logoUrl,
          workspaceName:
            carouselEditorPayload.workspaceName || brandKit.businessName,
          workspaceFont:
            carouselEditorPayload.workspaceFont || brandKit.fontFamily,
        }
      : null;
    const nextElements = payload
      ? createCarouselLayerElements(payload, externalEditImage)
      : createPostDesignElements(externalPost).filter(
          (element) => element.kind === "image",
        );
    designHistoryRef.current = [JSON.stringify(nextElements)];
    designHistoryIndexRef.current = 0;
    setDesignElements(nextElements);
    setDesignElementsPostId(externalPost.id);
    setSelectedElementId(null);
    setDesignMode(true);
  }, [
    brandKit.businessName,
    brandKit.logoUrl,
    brandKit.fontFamily,
    carouselEditorPayload,
    externalEditImage,
    externalEditPage,
    externalEditTitle,
    selectedPost,
  ]);

  const closeDesignEditor = () => {
    if (externalEditImage) {
      router.push(externalEditorReturnUrl);
      return;
    }
    setDesignMode(false);
  };

  const openCaptionModal = (post: ScheduledPost) => {
    const currentCaptions = captions[post.id] || {};
    setDraftCaptions(
      CHANNELS.reduce<Partial<Record<PreviewChannel, string>>>(
        (draft, channel) => {
          draft[channel.id] = currentCaptions[channel.id] || post.body;
          return draft;
        },
        {},
      ),
    );
    setCaptionModalOpen(true);
  };

  const platformPublishStatus = (post: ScheduledPost, platformId: string) => {
    const localKey = `${post.id}:${platformId}`;
    if (publishedPlatforms[localKey]) return "published";
    const persisted = post.publishStatus?.[platformId];
    return persisted?.status || "";
  };

  const saveCaptionDrafts = () => {
    if (!selectedPost) return;
    setCaptions((current) => ({
      ...current,
      [selectedPost.id]: {
        ...current[selectedPost.id],
        ...draftCaptions,
      },
    }));
    setCaptionModalOpen(false);
  };

  const refreshCalendar = () => setRefreshKey((value) => value + 1);

  const startCardCaptionEdit = (post: ScheduledPost) => {
    setCardCaptionDrafts((current) => ({
      ...current,
      [post.id]: current[post.id] ?? post.body,
    }));
    setEditingCaptionPostId(post.id);
    setExpandedCaptions((current) => ({ ...current, [post.id]: true }));
  };

  async function saveCardCaption(post: ScheduledPost) {
    if (savingCaptionPostId) return;

    const nextBody = (cardCaptionDrafts[post.id] ?? post.body).trim();
    if (!nextBody) {
      setToolbarMessage("Caption 不可以留空。");
      return;
    }

    setSavingCaptionPostId(post.id);
    setToolbarMessage("");

    try {
      const { workspaceId } = await resolveActiveWorkspace();
      if (!workspaceId) throw new Error("找不到目前工作台。");
      const response = await fetch("/api/posts/update-caption", {
        body: JSON.stringify({ body: nextBody, postId: post.id, workspaceId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        throw new Error(
          result?.detail || result?.error || "Caption 儲存失敗。",
        );
      }

      setPersistedScheduledPosts((current) =>
        current.map((item) =>
          item.id === post.id ? { ...item, body: nextBody } : item,
        ),
      );
      setEditingCaptionPostId(null);
      setToolbarMessage("Caption 已更新。");
    } catch (error) {
      setToolbarMessage(
        error instanceof Error
          ? error.message
          : "Caption 儲存失敗，請再試一次。",
      );
    } finally {
      setSavingCaptionPostId(null);
    }
  }

  async function cancelScheduledPost(post: ScheduledPost) {
    if (cancellingPostId) return;
    const confirmed = window.confirm("刪除這個排程？貼文會從已排程內容移除。");
    if (!confirmed) return;

    setCancellingPostId(post.id);
    setToolbarMessage("");

    try {
      const { workspaceId } = await resolveActiveWorkspace();
      if (!workspaceId) throw new Error("找不到目前工作台。");

      const response = await fetch("/api/posts/reject", {
        body: JSON.stringify({ postId: post.id, workspaceId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        throw new Error(
          result?.detail || result?.error || "未能刪除排程，請再試一次。",
        );
      }

      setPersistedScheduledPosts((current) =>
        current.filter((item) => item.id !== post.id),
      );
      setPostStatuses((current) => ({ ...current, [post.id]: "rejected" }));
      if (selectedPost?.id === post.id) setSelectedPost(null);
      setToolbarMessage("排程已刪除。");
    } catch (error) {
      setToolbarMessage(
        error instanceof Error ? error.message : "未能刪除排程，請再試一次。",
      );
    } finally {
      setCancellingPostId(null);
    }
  }

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (toolbarBusy) return;

    setToolbarBusy(true);
    setToolbarMessage("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("請先登入。");

      const { workspaceId } = await resolveActiveWorkspace();
      if (!workspaceId) throw new Error("找不到目前工作台。");

      const scheduledAt = new Date(createScheduledAt);
      if (Number.isNaN(scheduledAt.getTime()))
        throw new Error("請選擇有效的發布時間。");

      const title = createTitle.trim();
      if (!title) throw new Error("請輸入標題。");

      const response = await fetch("/api/posts/create", {
        body: JSON.stringify({
          postType: createPostType,
          scheduledAt: scheduledAt.toISOString(),
          title,
          workspaceId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        throw new Error(result?.detail || result?.error || "建立貼文失敗。");
      }

      setActiveWorkspaceIdState(workspaceId);
      setCreateModalOpen(false);
      setCreateTitle("");
      setCreateScheduledAt(localDateTimeValue());
      setToolbarMessage("已建立新貼文。");
      refreshCalendar();
    } catch (error) {
      setToolbarMessage(
        error instanceof Error ? error.message : "建立貼文失敗，請再試一次。",
      );
    } finally {
      setToolbarBusy(false);
    }
  }

  function openScheduleModal(post: ScheduledPost) {
    setScheduleModalPost(post);
    setScheduleDraftAt(scheduledPostDateTimeValue(post.scheduledAt));
    setToolbarMessage("");
  }

  async function handleUpdateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scheduleModalPost || toolbarBusy) return;

    setToolbarBusy(true);
    setToolbarMessage("");

    try {
      const { workspaceId } = await resolveActiveWorkspace();
      if (!workspaceId) throw new Error("找不到目前工作台。");

      const nextScheduledAt = new Date(scheduleDraftAt);
      if (Number.isNaN(nextScheduledAt.getTime()))
        throw new Error("請選擇有效的發布時間。");

      const response = await fetch("/api/posts/update-schedule", {
        body: JSON.stringify({
          postId: scheduleModalPost.id,
          scheduledAt: nextScheduledAt.toISOString(),
          workspaceId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        throw new Error(
          result?.detail || result?.error || "更新發布時間失敗。",
        );
      }

      setPersistedScheduledPosts((current) =>
        current.map((post) =>
          post.id === scheduleModalPost.id
            ? {
                ...post,
                scheduledAt: result.scheduled_at,
                status: post.status === "已發布" ? post.status : "已確認",
                time: formatPostTime(result.scheduled_at, post.time),
              }
            : post,
        ),
      );
      setScheduleModalPost(null);
      setToolbarMessage("發布時間已更新。");
      refreshCalendar();
    } catch (error) {
      setToolbarMessage(
        error instanceof Error
          ? error.message
          : "更新發布時間失敗，請再試一次。",
      );
    } finally {
      setToolbarBusy(false);
    }
  }

  async function regenerateImagesForPosts(
    posts: ScheduledPost[],
    onProgress?: (current: number, total: number) => void,
  ) {
    setRegenerateProgress({ current: 0, total: posts.length });
    for (let index = 0; index < posts.length; index += 1) {
      const post = posts[index];
      setRegenerateProgress({ current: index + 1, total: posts.length });
      onProgress?.(index + 1, posts.length);
      const response = await fetch("/api/generate-post-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || `圖片生成失敗：${post.title}`);
      }
    }
  }

  async function handleConfirmRegenerate() {
    if (toolbarBusy) return;

    const posts = currentWeekPosts;
    if (!activeWorkspaceId || !posts.length) {
      setToolbarMessage("本週沒有可重新生成的貼文。");
      setRegenerateConfirmOpen(false);
      return;
    }

    setToolbarBusy(true);
    setToolbarMessage("");

    try {
      await regenerateImagesForPosts(posts);
      setToolbarMessage("本週圖片已重新生成。");
      setRegenerateConfirmOpen(false);
      refreshCalendar();
    } catch (error) {
      setToolbarMessage(
        error instanceof Error ? error.message : "重新生成失敗，請再試一次。",
      );
    } finally {
      setToolbarBusy(false);
      setRegenerateProgress({ current: 0, total: 0 });
    }
  }

  async function handleImprovePosts() {
    if (toolbarBusy) return;

    const posts = currentWeekPosts;
    if (!activeWorkspaceId || !posts.length) {
      setToolbarMessage("本週沒有可改善的貼文。");
      setImprovePanelOpen(false);
      return;
    }

    setToolbarBusy(true);
    setToolbarMessage("");
    setImproveProgress({
      current: 1,
      total: improveMode === "image-prompt" ? posts.length + 1 : 1,
    });

    try {
      const response = await fetch("/api/scheduled-posts/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: improveMode,
          postIds: posts.map((post) => post.id),
          workspaceId: activeWorkspaceId,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          result?.detail || result?.error || "改善失敗，請再試一次。",
        );
      }

      if (improveMode === "image-prompt") {
        const updatedIds = Array.isArray(result?.updated)
          ? result.updated
          : posts.map((post) => post.id);
        const updatedPosts = posts.filter((post) =>
          updatedIds.includes(post.id),
        );
        await regenerateImagesForPosts(updatedPosts, (current, total) => {
          setImproveProgress({ current: current + 1, total: total + 1 });
        });
      }

      setToolbarMessage(
        improveMode === "copy"
          ? "本週文案已改善。"
          : "本週圖片 prompt 已改善並重新生成圖片。",
      );
      setImprovePanelOpen(false);
      refreshCalendar();
    } catch (error) {
      setToolbarMessage(
        error instanceof Error ? error.message : "改善失敗，請再試一次。",
      );
    } finally {
      setToolbarBusy(false);
      setImproveProgress({ current: 0, total: 0 });
    }
  }

  const approvePost = async (post: ScheduledPost) => {
    await publishPost(post);
  };

  const publishPost = async (
    post: ScheduledPost,
    platform?: string,
    publishNow = false,
  ) => {
    if (publishing) return;

    setPublishing(true);
    setPublishingPlatform(platform || "all");
    setPublishResult(null);
    setPublishMessage("");

    try {
      const { workspaceId } = await resolveActiveWorkspace();
      if (!workspaceId) throw new Error("找不到目前工作台。");

      const response = await fetch("/api/posts/publish", {
        body: JSON.stringify({
          platform,
          postId: post.id,
          publishNow,
          workspaceId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      const errors = Array.isArray(result?.errors) ? result.errors : [];
      const platformsPublished = Array.isArray(result?.platforms_published)
        ? result.platforms_published
        : [];

      if (!result?.success && !platformsPublished.length) {
        const message =
          errors
            .map((item: { message?: string; platform?: string }) =>
              item.platform
                ? `${item.platform}: ${item.message || "發布失敗"}`
                : item.message || "發布失敗",
            )
            .join("；") ||
          result?.detail ||
          result?.error ||
          "發布失敗，貼文已保留為已批准。";
        setPostStatuses((current) => ({ ...current, [post.id]: "approved" }));
        setPublishResult("error");
        setPublishMessage(message);
        setToolbarMessage(message);
        refreshCalendar();
        return;
      }

      const status =
        result?.status === "published"
          ? "published"
          : result?.status === "partial_published"
            ? "approved"
            : result?.status === "scheduled"
              ? "scheduled"
              : "approved";
      const scheduledAt = post.scheduledAt
        ? new Date(post.scheduledAt).toLocaleString("zh-HK", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "預定時間";
      const platformText = platformsPublished.length
        ? `已發布到 ${platformsPublished.join(", ")}。`
        : "";
      const warningText = errors.length
        ? ` 未能發布到：${errors
            .map((item: { message?: string; platform?: string }) =>
              item.platform
                ? `${item.platform}（${item.message || "發布失敗"}）`
                : item.message || "發布失敗",
            )
            .join("；")}`
        : "";

      setPostStatuses((current) => ({ ...current, [post.id]: status }));
      if (status === "published") {
        setPersistedScheduledPosts((current) =>
          current.filter((item) => item.id !== post.id),
        );
        if (selectedPost?.id === post.id) setSelectedPost(null);
      }
      if (platformsPublished.length) {
        setPublishedPlatforms((current) => {
          const next = { ...current };
          platformsPublished.forEach((item: string) => {
            next[`${post.id}:${item}`] = true;
          });
          return next;
        });
      }
      const nextPublishMessage =
        result?.status === "published" || result?.status === "partial_published"
          ? `✓ ${platformText || "已發布。"}${warningText}`
          : `貼文已批准，將於 ${scheduledAt} 自動發布。`;
      setPublishResult("success");
      setPublishMessage(nextPublishMessage);
      setToolbarMessage(nextPublishMessage);
      refreshCalendar();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "發布失敗，貼文已保留為已批准。";
      setPostStatuses((current) => ({ ...current, [post.id]: "approved" }));
      setPublishResult("error");
      setPublishMessage(message);
      setToolbarMessage(message);
    } finally {
      setPublishing(false);
      setPublishingPlatform(null);
    }
  };

  const platformAccountName = (platformId: string) => {
    const connection = platformConnections[platformId];
    const name = connection?.account_name || connection?.account_id || "";
    if (!name) return "";
    return platformId === "instagram" || platformId === "threads"
      ? `@${name}`
      : name;
  };

  const rejectPost = (post: ScheduledPost) => {
    setPostStatuses((current) => ({ ...current, [post.id]: "rejected" }));
  };

  const goToNextPost = () => {
    if (!selectedPost) return;
    const index = scheduledPosts.findIndex(
      (post) => post.id === selectedPost.id,
    );
    const nextPost = scheduledPosts[index + 1];
    if (nextPost) setSelectedPost(nextPost);
  };

  const goToPrevPost = () => {
    if (!selectedPost) return;
    const index = scheduledPosts.findIndex(
      (post) => post.id === selectedPost.id,
    );
    const prevPost = scheduledPosts[index - 1];
    if (prevPost) setSelectedPost(prevPost);
  };

  const selectedCaption = selectedPost
    ? captions[selectedPost.id]?.[previewChannel] || selectedPost.body
    : "";
  const selectedElement =
    designElements.find((element) => element.id === selectedElementId) || null;
  const selectedPostIndex = selectedPost
    ? scheduledPosts.findIndex((post) => post.id === selectedPost.id)
    : -1;
  const currentPostStatus = selectedPost
    ? postStatuses[selectedPost.id] ||
      (selectedPost.status === "已發布"
        ? "published"
        : selectedPost.status === "已排程"
          ? "scheduled"
          : selectedPost.status === "已批准"
            ? "approved"
            : selectedPost.status === "草稿"
              ? "draft"
              : "draft")
    : "draft";
  const hasPrevPost = selectedPostIndex > 0;
  const hasNextPost =
    selectedPostIndex >= 0 && selectedPostIndex < scheduledPosts.length - 1;

  function setPostSlide(
    postId: string,
    totalSlides: number,
    nextSlide: number,
  ) {
    setPostSlides((current) => ({
      ...current,
      [postId]: Math.max(0, Math.min(totalSlides - 1, nextSlide)),
    }));
  }

  function movePostSlide(
    postId: string,
    totalSlides: number,
    direction: number,
  ) {
    const currentSlide = postSlides[postId] ?? 0;
    setPostSlide(postId, totalSlides, currentSlide + direction);
  }

  const getToolForElement = (element: DesignElement): DesignTool => {
    if (element.kind === "text") return "文字";
    if (element.kind === "image") return "媒體";
    return "元素";
  };

  const clearFabricSelection = () => {
    const canvas = fabricControlsRef.current?.fabricRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const deselectDesignElement = () => {
    clearFabricSelection();
    setSelectedElementId(null);
  };

  const selectDesignElement = (id: string) => {
    setSelectedElementId(id);
    const element = designElements.find((item) => item.id === id);
    if (element) {
      setActiveDesignTool(getToolForElement(element));
    }
  };

  const switchDesignTool = (tool: DesignTool) => {
    deselectDesignElement();
    setActiveDesignTool(tool);
  };

  useEffect(() => {
    let cancelled = false;

    async function persistAndLoadBrandKit(includeOnboardingSnapshot = false) {
      const fallback = readBrandKit();
      if (!cancelled) {
        setBrandKitLoading(true);
        setBrandKit(fallback);
      }
      try {
        if (includeOnboardingSnapshot) await completeOnboardingSnapshot();
        const persisted = await loadPersistedBrandKit(fallback);
        if (!cancelled) setBrandKit(persisted);
      } finally {
        if (!cancelled) setBrandKitLoading(false);
      }
    }

    const handleWorkspaceBrandKitChanged = () => {
      void persistAndLoadBrandKit();
    };

    void persistAndLoadBrandKit(true);
    window.addEventListener(
      WORKSPACE_CHANGED_EVENT,
      handleWorkspaceBrandKitChanged,
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        WORKSPACE_CHANGED_EVENT,
        handleWorkspaceBrandKitChanged,
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPlatformConnections() {
      if (!cancelled) setPlatformConnectionsLoading(true);
      try {
        const { workspaceId } = await resolveActiveWorkspace();
        if (!workspaceId) {
          if (!cancelled) setPlatformConnections({});
          return;
        }

        const dashboardResponse = await fetch(
          `/api/dashboard-data?workspace_id=${encodeURIComponent(workspaceId)}`,
          {
            cache: "no-store",
          },
        );
        const dashboardPayload = await dashboardResponse
          .json()
          .catch(() => null);
        if (!dashboardResponse.ok) {
          throw new Error(
            dashboardPayload?.error || "Failed to load platform connections",
          );
        }

        if (cancelled) return;

        const nextConnections: Record<string, PlatformConnection> = {};
        ((dashboardPayload?.connections || []) as PlatformConnection[]).forEach(
          (connection) => {
            nextConnections[connection.platform] = connection;
          },
        );
        setPlatformConnections(nextConnections);
      } catch (error) {
        console.warn(
          "[scheduled-posts] failed to load social connections:",
          error,
        );
      } finally {
        if (!cancelled) setPlatformConnectionsLoading(false);
      }
    }

    void loadPlatformConnections();

    function handleWorkspaceChanged() {
      void loadPlatformConnections();
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(
        WORKSPACE_CHANGED_EVENT,
        handleWorkspaceChanged,
      );
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadPersistedPostsAndCredits() {
      if (!cancelled) setPostsLoading(true);
      if (!cancelled) setPostsLoadError("");
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const sessionId = getStoredOnboardingSessionId();
        let workspaceId: string | null = null;

        let postsData: Record<string, unknown>[] | null = null;

        if (user?.id) {
          const resolvedWorkspace = await resolveActiveWorkspace();
          workspaceId = resolvedWorkspace.workspaceId;
          if (!workspaceId) {
            if (!cancelled) {
              setActiveWorkspaceIdState(null);
              setPersistedScheduledPosts([]);
              setIsBechillActive(false);
              setPostsLoading(false);
            }
            return;
          }

          if (!cancelled) {
            setActiveWorkspaceIdState(workspaceId);
            setIsBechillActive(
              isBechillWorkspace(resolvedWorkspace.activeWorkspace),
            );
          }
          const syncResponse = await fetch("/api/content-projects/sync-approved", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ workspaceId }),
          });
          const syncPayload = await syncResponse.json().catch(() => null);
          if (!syncResponse.ok) {
            throw new Error(
              syncPayload?.detail ||
                syncPayload?.error ||
                "Failed to sync approved content",
            );
          }
          const dashboardResponse = await fetch(
            `/api/dashboard-data?workspace_id=${encodeURIComponent(workspaceId)}`,
            {
              cache: "no-store",
            },
          );
          const dashboardPayload = await dashboardResponse
            .json()
            .catch(() => null);
          if (!dashboardResponse.ok) {
            throw new Error(
              dashboardPayload?.error || "Failed to load scheduled posts",
            );
          }

          postsData = dashboardPayload?.posts || [];
          if (
            !cancelled &&
            typeof dashboardPayload?.credits?.balance === "number"
          ) {
            setCreditBalance(dashboardPayload.credits.balance);
          }
          if (!cancelled && Array.isArray(dashboardPayload?.connections)) {
            const nextConnections: Record<string, PlatformConnection> = {};
            (dashboardPayload.connections as PlatformConnection[]).forEach(
              (connection) => {
                nextConnections[connection.platform] = connection;
              },
            );
            setPlatformConnections(nextConnections);
            setPlatformConnectionsLoading(false);
          }
        } else if (sessionId) {
          const { data, error } = await supabase
            .from("campaign_posts")
            .select(
              "id,title,body,post_type,scheduled_at,image_url,status,captions,marketing_campaigns(name,strategy_emoji)",
            )
            .eq("onboarding_session_id", sessionId)
            .order("scheduled_at", { ascending: true });
          if (error) throw error;
          postsData = data || [];
        } else {
          if (!cancelled) setPostsLoading(false);
          return;
        }

        if (!cancelled) {
          setPersistedScheduledPosts(
            ((postsData || []) as Record<string, unknown>[]).map(
              (post, index) =>
                mapPersistedScheduledPost(post, index, fallbackScheduledPosts),
            ),
          );
        }
      } catch (error) {
        console.warn("[scheduled-posts] failed to load posts:", error);
        if (!cancelled) {
          setPersistedScheduledPosts([]);
          setPostsLoadError(
            error instanceof Error ? error.message : "未能載入已排程內容",
          );
        }
      } finally {
        if (!cancelled) setPostsLoading(false);
      }
    }

    void loadPersistedPostsAndCredits();

    function handleWorkspaceChanged() {
      setRefreshKey((value) => value + 1);
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(
        WORKSPACE_CHANGED_EVENT,
        handleWorkspaceChanged,
      );
    };
  }, [fallbackScheduledPosts, refreshKey]);

  useEffect(() => {
    const snapshot = JSON.stringify(designElements);
    if (isRestoringDesignHistoryRef.current) {
      isRestoringDesignHistoryRef.current = false;
      return;
    }

    const history = designHistoryRef.current;
    const currentIndex = designHistoryIndexRef.current;
    if (history[currentIndex] === snapshot) return;

    const nextHistory = history.slice(0, currentIndex + 1);
    nextHistory.push(snapshot);
    if (nextHistory.length > 50) {
      nextHistory.shift();
    }

    designHistoryRef.current = nextHistory;
    designHistoryIndexRef.current = nextHistory.length - 1;
  }, [designElements]);

  const restoreDesignHistory = (direction: "undo" | "redo") => {
    if (fabricControlsRef.current) {
      void (direction === "undo"
        ? fabricControlsRef.current.undo()
        : fabricControlsRef.current.redo());
      return;
    }

    const history = designHistoryRef.current;
    const currentIndex = designHistoryIndexRef.current;
    const nextIndex =
      direction === "undo" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= history.length) return;

    const nextElements = JSON.parse(history[nextIndex]) as DesignElement[];
    designHistoryIndexRef.current = nextIndex;
    isRestoringDesignHistoryRef.current = true;
    setDesignElements(nextElements);
    setSelectedElementId((current) =>
      current && nextElements.some((element) => element.id === current)
        ? current
        : null,
    );
  };

  useEffect(() => {
    if (!designMode) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'input, textarea, select, button, [contenteditable="true"]',
        )
      )
        return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        restoreDesignHistory(event.shiftKey ? "redo" : "undo");
        return;
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedElementId
      ) {
        event.preventDefault();
        deleteSelectedElement();
        return;
      }

      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        deselectDesignElement();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [designMode, selectedElementId]);

  const addDesignElement = (
    kind: Exclude<DesignElementKind, "text" | "image">,
    item: string,
  ) => {
    const id = `${kind}-${item}-${Date.now()}`;
    const nextElement: DesignElement = {
      id,
      kind,
      item,
      label: kind === "shape" ? "形狀" : kind === "frame" ? "相框" : "圖示",
      x: 50,
      y: 48,
      size: kind === "icon" ? 58 : 132,
      rotation: 0,
      opacity: 100,
      color: "#111111",
      zIndex: 15 + designElements.length,
    };
    void fabricControlsRef.current?.addDesignElement(nextElement);
    setDesignElements((current) => [...current, nextElement]);
    setSelectedElementId(id);
    setActiveDesignTool("元素");
  };

  const addTextElement = (preset: TextPreset) => {
    const presets: Record<
      TextPreset,
      Pick<
        DesignElement,
        "color" | "fontSize" | "fontWeight" | "textContent" | "width"
      >
    > = {
      heading: {
        color: "#ffffff",
        fontSize: 46,
        fontWeight: "bold",
        textContent: "標題文字",
        width: 360,
      },
      subheading: {
        color: "#ffffff",
        fontSize: 30,
        fontWeight: "bold",
        textContent: "副標題",
        width: 330,
      },
      body: {
        color: "#ffffff",
        fontSize: 20,
        fontWeight: "normal",
        textContent: "內文文字，點擊右邊編輯",
        width: 300,
      },
      caption: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "normal",
        textContent: "說明文字",
        width: 240,
      },
    };
    const config = presets[preset];
    const id = `text-${preset}-${Date.now()}`;
    const nextElement: DesignElement = {
      id,
      kind: "text",
      item: preset,
      label: "文字",
      x: 50,
      y: 46,
      size: config.fontSize || 24,
      rotation: 0,
      opacity: 100,
      color: config.color || "#ffffff",
      zIndex: 20 + designElements.length,
      textContent: config.textContent,
      fontFamily: brandKit.fontFamily,
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      width: config.width,
      lineHeight: 1.25,
    };
    void fabricControlsRef.current?.addDesignElement(nextElement);
    setDesignElements((current) => [...current, nextElement]);
    setSelectedElementId(id);
    setActiveDesignTool("文字");
  };

  const addImageElement = (imageUrl: string, label = "圖片") => {
    const nextElement: DesignElement = {
      id: crypto.randomUUID(),
      kind: "image",
      item: "photo",
      label,
      x: 50,
      y: 50,
      size: 220,
      width: 300,
      height: 220,
      rotation: 0,
      opacity: 100,
      color: "transparent",
      zIndex: 20 + designElements.length,
      imageUrl,
    };
    void fabricControlsRef.current?.addDesignElement(nextElement);
    setDesignElements((current) => [...current, nextElement]);
    setSelectedElementId(nextElement.id);
    setActiveDesignTool("媒體");
  };

  const updateImageElement = (id: string, changes: Partial<DesignElement>) => {
    void fabricControlsRef.current?.updateDesignElement(id, changes);
    setDesignElements((current) =>
      current.map((element) =>
        element.id === id ? { ...element, ...changes } : element,
      ),
    );
  };

  const addBrandTextElement = (
    label: string,
    textContent: string,
    fontSize: number,
    fontWeight: DesignElement["fontWeight"],
    color: string,
  ) => {
    const nextElement: DesignElement = {
      id: crypto.randomUUID(),
      kind: "text",
      item: label,
      label,
      x: 50,
      y: fontWeight === "bold" ? 40 : 60,
      size: fontSize,
      rotation: 0,
      opacity: 100,
      color,
      zIndex: 20 + designElements.length,
      textContent,
      fontFamily: brandKit.fontFamily,
      fontSize,
      fontWeight,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      width: fontWeight === "bold" ? 400 : 360,
      lineHeight: fontWeight === "bold" ? 1.12 : 1.45,
    };
    void fabricControlsRef.current?.addDesignElement(nextElement);
    setDesignElements((current) => [...current, nextElement]);
    setSelectedElementId(nextElement.id);
    setActiveDesignTool("品牌");
  };

  const applyBrandColor = (color: string) => {
    if (!selectedElementId) {
      const nextElement: DesignElement = {
        id: crypto.randomUUID(),
        kind: "shape",
        item: "rounded",
        label: "品牌色塊",
        x: 50,
        y: 50,
        size: 132,
        rotation: 0,
        opacity: 100,
        color,
        zIndex: 20 + designElements.length,
      };
      void fabricControlsRef.current?.addDesignElement(nextElement);
      setDesignElements((current) => [...current, nextElement]);
      setSelectedElementId(nextElement.id);
      return;
    }
    void fabricControlsRef.current?.updateDesignElement(selectedElementId, {
      color,
    });
    setDesignElements((current) =>
      current.map((element) =>
        element.id === selectedElementId ? { ...element, color } : element,
      ),
    );
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      const label = file.name.replace(/\.[^.]+$/, "") || "圖片";
      setUploadedImages((current) => [{ url, label }, ...current]);
      addImageElement(url, label);
    });
  };

  const updateSelectedElement = (updates: Partial<DesignElement>) => {
    if (!selectedElementId) return;
    void fabricControlsRef.current?.updateDesignElement(
      selectedElementId,
      updates,
    );
    setDesignElements((current) =>
      current.map((element) =>
        element.id === selectedElementId ? { ...element, ...updates } : element,
      ),
    );
  };

  const deleteSelectedElement = () => {
    void fabricControlsRef.current?.deleteSelected();
    if (!selectedElementId) return;
    setDesignElements((current) =>
      current.filter((element) => element.id !== selectedElementId),
    );
    setSelectedElementId(null);
  };

  const duplicateSelectedElement = () => {
    if (!selectedElement) return;
    const id = `${selectedElement.kind}-${selectedElement.item}-${Date.now()}`;
    const clone = {
      ...selectedElement,
      id,
      x: Math.min(74, selectedElement.x + 6),
      y: Math.min(74, selectedElement.y + 6),
      zIndex: selectedElement.zIndex + 1,
    };
    void fabricControlsRef.current?.addDesignElement(clone);
    setDesignElements((current) => [...current, clone]);
    setSelectedElementId(id);
  };

  const openElementEditor = (element: DesignElement) => {
    setSelectedElementId(element.id);
    setActiveDesignTool(
      element.kind === "image"
        ? "媒體"
        : element.kind === "text"
          ? "文字"
          : "元素",
    );
  };

  const moveSelectedLayer = (
    direction: "forward" | "front" | "backward" | "back",
  ) => {
    if (!selectedElement) return;
    if (direction === "forward" || direction === "front") {
      fabricControlsRef.current?.bringForward();
    } else {
      fabricControlsRef.current?.sendBackward();
    }
    setDesignElements((current) => {
      const zValues = current.map((element) => element.zIndex);
      const maxZ = Math.max(...zValues, 12);
      return current.map((element) => {
        if (element.id !== selectedElement.id) return element;
        const nextZ = {
          forward: element.zIndex + 5,
          front: maxZ + 5,
          backward: element.zIndex - 5,
          back: 2,
        }[direction];
        return { ...element, zIndex: Math.max(2, Math.min(80, nextZ)) };
      });
    });
  };

  const resizeCanvas = (size: CanvasSize) => {
    const nextSize = {
      label: size.label,
      w: Math.max(100, Math.round(size.w)),
      h: Math.max(100, Math.round(size.h)),
    };
    setCanvasSize(nextSize);
    setSelectedElementId(null);
    setActiveDesignTool("尺寸");
  };

  const saveCurrentDesign = async () => {
    if (!selectedPost || !activeWorkspaceId || isSavingDesign) return;
    const controls = fabricControlsRef.current;
    const canvas = controls?.fabricRef.current;
    if (!controls || !canvas) {
      setSaveDesignMessage("畫布尚未準備好，請稍後再試。");
      return;
    }

    setIsSavingDesign(true);
    setSaveDesignMessage("");
    try {
      const multiplier = Math.max(1, canvasSize.w / Math.max(1, canvas.width || canvasSize.w));
      const dataUrl = controls.exportPNG(multiplier);
      if (!dataUrl) throw new Error("未能匯出畫布");
      const imageBlob = await fetch(dataUrl).then((response) => response.blob());
      const supabase = createClient();
      const storagePath = `${activeWorkspaceId}/designs/${selectedPost.id}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload(storagePath, imageBlob, { cacheControl: "3600", contentType: "image/png", upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("brand-assets").getPublicUrl(storagePath);
      const imageUrl = publicUrlData.publicUrl;
      const canvasJson = canvas.toObject(["data"]);

      const isContentProjectDesign = Boolean(carouselEditorPayload?.projectId && externalEditImage);
      const response = await fetch(
        isContentProjectDesign ? "/api/content-projects/save-design" : "/api/posts/save-design",
        {
        body: JSON.stringify({
          canvasHeight: canvasSize.h,
          canvasJson,
          canvasWidth: canvasSize.w,
          imageUrl,
          name: selectedPost.title,
          page: carouselEditorPayload?.page,
          postId: selectedPost.id,
          projectId: carouselEditorPayload?.projectId,
          workspaceId: activeWorkspaceId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || result.error || "儲存失敗");

      if (isContentProjectDesign) {
        window.sessionStorage.removeItem("soon-carousel-editor-payload-v1");
        router.push(externalEditorReturnUrl);
      } else {
        setPersistedScheduledPosts((current) =>
          current.map((post) => post.id === selectedPost.id ? { ...post, image: imageUrl } : post),
        );
      }
      setSaveDesignMessage("設計已儲存。");
      setDesignMode(false);
      setSelectedPost(null);
    } catch (error) {
      setSaveDesignMessage(error instanceof Error ? error.message : "儲存失敗，請再試一次。");
    } finally {
      setIsSavingDesign(false);
    }
  };

  const startElementMove = (
    event: ReactPointerEvent<HTMLElement>,
    element: DesignElement,
  ) => {
    if (!canvasRef.current) return;
    event.preventDefault();
    setSelectedElementId(element.id);
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = element.x;
    const initialY = element.y;

    const onMove = (moveEvent: PointerEvent) => {
      const nextX =
        initialX + ((moveEvent.clientX - startX) / rect.width) * 100;
      const nextY =
        initialY + ((moveEvent.clientY - startY) / rect.height) * 100;
      setDesignElements((current) =>
        current.map((item) =>
          item.id === element.id
            ? {
                ...item,
                x: Math.min(94, Math.max(6, nextX)),
                y: Math.min(94, Math.max(6, nextY)),
              }
            : item,
        ),
      );
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startElementResize = (
    event: ReactPointerEvent<HTMLElement>,
    element: DesignElement,
  ) => {
    if (!canvasRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedElementId(element.id);
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.left + (element.x / 100) * rect.width;
    const centerY = rect.top + (element.y / 100) * rect.height;
    const initialSize = element.size;
    const initialDistance = Math.max(
      1,
      Math.hypot(event.clientX - centerX, event.clientY - centerY),
    );

    const onMove = (moveEvent: PointerEvent) => {
      const nextDistance = Math.hypot(
        moveEvent.clientX - centerX,
        moveEvent.clientY - centerY,
      );
      setDesignElements((current) =>
        current.map((item) =>
          item.id === element.id
            ? {
                ...item,
                ...(item.kind === "text"
                  ? {
                      fontSize: Math.min(
                        200,
                        Math.max(
                          8,
                          Math.round(
                            (initialSize || 24) *
                              (nextDistance / initialDistance),
                          ),
                        ),
                      ),
                      size: Math.min(
                        200,
                        Math.max(
                          8,
                          Math.round(
                            (initialSize || 24) *
                              (nextDistance / initialDistance),
                          ),
                        ),
                      ),
                      width: Math.min(
                        520,
                        Math.max(
                          140,
                          Math.round(
                            (element.width || 300) *
                              (nextDistance / initialDistance),
                          ),
                        ),
                      ),
                    }
                  : item.kind === "image"
                    ? {
                        height: Math.min(
                          760,
                          Math.max(
                            180,
                            Math.round(
                              (element.height || 538) *
                                (nextDistance / initialDistance),
                            ),
                          ),
                        ),
                        size: Math.min(
                          760,
                          Math.max(
                            180,
                            Math.round(
                              (initialSize || 430) *
                                (nextDistance / initialDistance),
                            ),
                          ),
                        ),
                        width: Math.min(
                          640,
                          Math.max(
                            150,
                            Math.round(
                              (element.width || 430) *
                                (nextDistance / initialDistance),
                            ),
                          ),
                        ),
                      }
                    : {
                        size: Math.min(
                          260,
                          Math.max(
                            34,
                            Math.round(
                              initialSize * (nextDistance / initialDistance),
                            ),
                          ),
                        ),
                      }),
              }
            : item,
        ),
      );
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startElementRotate = (
    event: ReactPointerEvent<HTMLElement>,
    element: DesignElement,
  ) => {
    if (!canvasRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedElementId(element.id);
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.left + (element.x / 100) * rect.width;
    const centerY = rect.top + (element.y / 100) * rect.height;

    const onMove = (moveEvent: PointerEvent) => {
      const radians = Math.atan2(
        moveEvent.clientY - centerY,
        moveEvent.clientX - centerX,
      );
      const degrees = Math.round((radians * 180) / Math.PI + 90);
      setDesignElements((current) =>
        current.map((item) =>
          item.id === element.id ? { ...item, rotation: degrees } : item,
        ),
      );
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (selectedPost && designMode) {
    return (
      <main className="design-editor-page">
        <ClaimOnboardingSession />
        <header className="design-topbar">
          <div className="design-nav">
            <button
              type="button"
              onClick={() => router.push("/onboarding")}
              aria-label="返回主頁"
              title="返回主頁"
            >
              ☰
            </button>
            <button
              type="button"
              onClick={closeDesignEditor}
              aria-label={externalEditImage ? "返回內容製作" : "返回貼文"}
              title={externalEditImage ? "返回內容製作" : "返回貼文"}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => router.push("/onboarding/scheduled-posts")}
              aria-label="前往已排程內容"
              title="前往已排程內容"
            >
              ▣
            </button>
          </div>

          <div className="design-title">
            <span>▱</span>
            <strong>{selectedPost.title}</strong>
            <em>草稿</em>
          </div>

          <div className="design-account">
            <span>✦ {creditBalance ?? "—"} credits 剩餘</span>
            <button type="button">升級</button>
          </div>
        </header>

        <DesignToolbar
          activeDesignTool={activeDesignTool}
          onRedo={() => restoreDesignHistory("redo")}
          onToolChange={switchDesignTool}
          onUndo={() => restoreDesignHistory("undo")}
        />

        <section className="design-workbench">
          <DesignCanvas
            canvasSize={canvasSize}
            canvasRef={canvasRef}
            designElements={designElements}
            onFabricReady={(controls) => {
              fabricControlsRef.current = controls;
            }}
            onCloseDesignMode={closeDesignEditor}
            onDelete={deleteSelectedElement}
            onDeselectElement={deselectDesignElement}
            onDuplicate={duplicateSelectedElement}
            onEditElement={openElementEditor}
            onSelectElement={selectDesignElement}
            onSetActiveTool={setActiveDesignTool}
            onStartMove={startElementMove}
            onStartResize={startElementResize}
            onStartRotate={startElementRotate}
            selectedElementId={selectedElementId}
            selectedPost={selectedPost}
          />

          <EditorSidePanel
            activeDesignTool={activeDesignTool}
            brandLogoUrl={brandKit.logoUrl}
            brandName={brandKit.businessName}
            brandColors={brandKit.brandColors}
            brandFontFamily={brandKit.fontFamily}
            brandKitLoading={brandKitLoading}
            canvasSize={canvasSize}
            expandedElementSection={expandedElementSection}
            isDraggingOver={isDraggingOver}
            isSavingDesign={isSavingDesign}
            onAddBrandText={addBrandTextElement}
            onAddElement={addDesignElement}
            onAddImage={addImageElement}
            onAddText={addTextElement}
            onApplyBrandColor={applyBrandColor}
            onCloseDesignMode={closeDesignEditor}
            onDelete={deleteSelectedElement}
            onDeselectElement={deselectDesignElement}
            onImageUpload={handleImageUpload}
            onSaveDesign={() => void saveCurrentDesign()}
            onMoveLayer={moveSelectedLayer}
            onResizeCanvas={resizeCanvas}
            onSetActiveTool={setActiveDesignTool}
            onSetDraggingOver={setIsDraggingOver}
            onSetExpandedSection={setExpandedElementSection}
            onTrackUploadedImage={(image) =>
              setUploadedImages((current) => [image, ...current])
            }
            onUpdateElement={(id, changes) => {
              void fabricControlsRef.current?.updateDesignElement(id, changes);
              setDesignElements((current) =>
                current.map((element) =>
                  element.id === id ? { ...element, ...changes } : element,
                ),
              );
            }}
            selectedElement={selectedElement}
            selectedPost={selectedPost}
            saveDesignMessage={saveDesignMessage}
            uploadedImages={uploadedImages}
          />
        </section>

        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </main>
    );
  }

  if (selectedPost) {
    return (
      <main className="post-editor-page">
        <ClaimOnboardingSession />
        <header className="post-editor-topbar">
          <div className="post-editor-topbar-left">
            <button
              aria-label="返回日曆"
              className="post-editor-back-btn"
              onClick={() => setSelectedPost(null)}
              type="button"
            >
              ←
            </button>
            <div className="post-editor-title-group">
              <img
                alt=""
                className="post-editor-thumb"
                src={selectedPost.image}
              />
              <span className="post-editor-campaign-name">
                {selectedPost.title}
              </span>
              <span className={`post-editor-status-badge ${currentPostStatus}`}>
                {currentPostStatus === "approved"
                  ? "已批准"
                  : currentPostStatus === "scheduled"
                    ? "已排程"
                    : currentPostStatus === "published"
                      ? "已發布"
                      : currentPostStatus === "rejected"
                        ? "不發布"
                        : "草稿"}
              </span>
            </div>
          </div>

          <div className="post-editor-topbar-center">
            <button
              className="post-editor-nav-btn"
              disabled={!hasPrevPost}
              onClick={goToPrevPost}
              type="button"
            >
              ← 上一個
            </button>
            <button
              className="post-editor-action-btn reject"
              disabled={publishing}
              onClick={() => rejectPost(selectedPost)}
              type="button"
            >
              不發布
            </button>
            <button
              className="post-editor-action-btn approve"
              disabled={publishing || currentPostStatus === "published"}
              onClick={() => void approvePost(selectedPost)}
              type="button"
            >
              {publishing
                ? "發布中..."
                : currentPostStatus === "published"
                  ? "✓ 已發布"
                  : "批准"}
            </button>
            <button
              className="post-editor-nav-btn"
              disabled={!hasNextPost}
              onClick={goToNextPost}
              type="button"
            >
              下一個 →
            </button>
          </div>

          <div className="post-editor-topbar-right">
            <span>✦ {creditBalance ?? "—"} credits 剩餘</span>
            <button className="upgrade-button" type="button">
              升級
            </button>
          </div>
        </header>

        <section className="editor-shell">
          <aside className="ai-improve-panel">
            <div className="improve-copy">
              <p>SOON 可以這樣改善這則貼文：</p>
              <ol>
                <li>
                  <strong>更改相片內容：</strong>
                  「在背景加入人物，令場景更豐富」
                </li>
                <li>
                  <strong>調整背景：</strong>「將背景換成現代辦公室」
                </li>
                <li>
                  <strong>更改文字疊加：</strong>「將標題放大並移到頂部」
                </li>
                <li>
                  <strong>修改顏色：</strong>「令整體配色更鮮明」
                </li>
                <li>
                  <strong>修改品牌：</strong>「將我的 logo 加到右下角」
                </li>
              </ol>
              <p>你想怎樣調整？</p>
            </div>

            <form className="ai-command-box">
              <textarea placeholder="要求 SOON 修改這則貼文..." />
              <div>
                <label aria-label="附加檔案">
                  <input type="file" />
                  <span>附件</span>
                </label>
                <button type="button" aria-label="送出要求">
                  ↑
                </button>
              </div>
            </form>
          </aside>

          <section className="preview-stage" aria-label="貼文預覽">
            <div className="view-switcher" aria-label="預覽平台">
              <span>預覽</span>
              {PUBLISH_PLATFORMS.map((platform) => (
                <button
                  className={
                    previewChannel === platform.channel ? "active" : ""
                  }
                  key={platform.id}
                  onClick={() => setPreviewChannel(platform.channel)}
                  type="button"
                >
                  {platform.channel === "Instagram"
                    ? "IG"
                    : platform.channel === "Facebook"
                      ? "FB"
                      : "Th"}
                </button>
              ))}
            </div>

            <article
              className={`phone-preview ${previewChannel.toLowerCase()}`}
            >
              <header>
                <div className="avatar">S</div>
                <strong>
                  {previewChannel === "Instagram"
                    ? platformAccountName("instagram") || "soon_log"
                    : previewChannel === "Threads"
                      ? platformAccountName("threads") || "soon_threads"
                      : platformAccountName("facebook") || "SOON-LOG"}
                </strong>
                <span>
                  {platformConnections[
                    previewChannel === "Instagram"
                      ? "instagram"
                      : previewChannel === "Threads"
                        ? "threads"
                        : "facebook"
                  ]
                    ? "已連接"
                    : "尚未連接帳戶"}
                </span>
              </header>
              <div className="phone-image">
                <img src={selectedPost.image} alt="" />
                <div className="phone-overlay">
                  <strong>{selectedPost.title}</strong>
                  <span>{selectedPost.type}</span>
                </div>
                <button
                  className="edit-design-overlay"
                  type="button"
                  onClick={() => openDesignEditor(selectedPost)}
                >
                  ✎ 編輯設計
                </button>
              </div>
              {previewChannel === "Threads" ? (
                <div className="threads-preview-note">單張圖片 + 文字貼文</div>
              ) : (
                <div className="phone-actions">
                  <span>♡</span>
                  <span>○</span>
                  <span>⌲</span>
                  <button
                    type="button"
                    onClick={() => openCaptionModal(selectedPost)}
                  >
                    編輯 caption
                  </button>
                </div>
              )}
              <p>
                <strong>
                  {previewChannel === "Instagram"
                    ? platformAccountName("instagram") || "soon_log"
                    : previewChannel === "Threads"
                      ? platformAccountName("threads") || "soon_threads"
                      : platformAccountName("facebook") || "SOON-LOG"}
                </strong>{" "}
                {selectedCaption}
              </p>
            </article>

            <div className="result-actions">
              <span>你喜歡這個結果嗎？</span>
              <button type="button">不喜歡</button>
              <button type="button">喜歡</button>
              <button type="button" onClick={() => setSelectedPost(null)}>
                關閉
              </button>
            </div>
          </section>

          <aside className="post-settings-panel">
            <section>
              <p>宣傳活動</p>
              <strong>分享你的日常，建立真實連繫</strong>
              <span>生活內容</span>
            </section>

            <section>
              <p>快速編輯</p>
              <button
                type="button"
                onClick={() => openCaptionModal(selectedPost)}
              >
                調整 caption <em>›</em>
              </button>
              <button
                type="button"
                onClick={() => openDesignEditor(selectedPost)}
              >
                編輯設計 <em>›</em>
              </button>
            </section>

            <section>
              <p>發布時間</p>
              <button type="button">2026年5月8日 {selectedPost.time} ⌄</button>
            </section>

            <section>
              <p>發布到</p>
              {PUBLISH_PLATFORMS.map((platform) => {
                const connection = platformConnections[platform.id];
                const supportsAutoPublish = AUTO_PUBLISH_PLATFORM_IDS.has(
                  platform.id,
                );
                const isPublishingThis = publishingPlatform === platform.id;
                const hasPublished = Boolean(
                  publishedPlatforms[`${selectedPost.id}:${platform.id}`],
                );
                return connection ? (
                  <button
                    className="connected-channel publish-btn"
                    disabled={publishing || hasPublished || !supportsAutoPublish}
                    key={platform.id}
                    onClick={() => void publishPost(selectedPost, platform.id)}
                    type="button"
                  >
                    <span>
                      {platform.label}
                      <small>{platformAccountName(platform.id)}</small>
                    </span>
                    <em>
                      {hasPublished
                        ? "✓ 已發布"
                        : !supportsAutoPublish
                          ? "手動發布"
                        : isPublishingThis
                          ? "發布中..."
                          : "立即發布"}
                    </em>
                  </button>
                ) : (
                  <button
                    className="connect-channel-btn"
                    key={platform.id}
                    onClick={() => router.push("/onboarding/integrations")}
                    type="button"
                  >
                    <span>{platform.label}</span>
                    <em>連接</em>
                  </button>
                );
              })}
              {publishResult === "success" ? (
                <div className="publish-success">
                  {publishMessage || "✓ 已成功發布。"}
                </div>
              ) : null}
              {publishResult === "error" ? (
                <div className="publish-error">
                  {publishMessage || "✗ 發布失敗，請確認帳戶已連接並重試"}
                </div>
              ) : null}
            </section>

            <section>
              <p>重新設計</p>
              <button type="button">重新生成設計</button>
              <button type="button">更換媒體</button>
            </section>
          </aside>
        </section>

        {captionModalOpen ? (
          <div className="caption-modal-backdrop" role="presentation">
            <section
              className="caption-modal"
              role="dialog"
              aria-modal="true"
              aria-label="編輯 caption"
            >
              <header>
                <div>
                  <h2>編輯 Caption</h2>
                  <p>
                    為不同平台調整同一則貼文的語氣。儲存後，預覽會即時更新。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCaptionModalOpen(false)}
                  aria-label="關閉"
                >
                  ×
                </button>
              </header>

              <div className="caption-grid">
                {CHANNELS.map((channel) => {
                  const value = draftCaptions[channel.id] || "";
                  return (
                    <article className="caption-column" key={channel.id}>
                      <div className="caption-channel-head">
                        <span>{channel.icon}</span>
                        <strong>{channel.label}</strong>
                        <button type="button">連接</button>
                      </div>
                      <p>{channel.note}</p>
                      <button
                        className="caption-regenerate"
                        type="button"
                        aria-label={`重新生成 ${channel.label} caption`}
                      >
                        ↻
                      </button>
                      <textarea
                        value={value}
                        onChange={(event) =>
                          setDraftCaptions((current) => ({
                            ...current,
                            [channel.id]: event.target.value,
                          }))
                        }
                      />
                      <small>
                        字數：{value.length}/{channel.limit}
                      </small>
                    </article>
                  );
                })}
              </div>

              <footer>
                <button
                  type="button"
                  onClick={() => setCaptionModalOpen(false)}
                >
                  取消
                </button>
                <button type="button" onClick={saveCaptionDrafts}>
                  儲存 Caption
                </button>
              </footer>
            </section>
          </div>
        ) : null}

        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="已排程內容" />

      <section className="calendar-shell">
        <header className="calendar-topbar">
          <div className="calendar-title">
            <h1>已排程內容</h1>
            <span>
              {isBechillActive
                ? "客戶已確認的 Week 1 貼文"
                : "目前工作台已確認的貼文"}
            </span>
          </div>

          <div className="calendar-actions">
            <span>✦ {creditBalance ?? "—"} credits 剩餘</span>
            <button type="button" className="upgrade-button">
              升級
            </button>
          </div>
        </header>

        {platformConnectionsLoading ? (
          <div
            className="connect-banner loading"
            aria-label="正在載入帳戶連接狀態"
          />
        ) : hasPublishConnection ? (
          <div className="connect-banner connected">
            <span>
              ✓ 已連接{" "}
              {connectedPublishPlatforms
                .map((platform) => platform.label)
                .join("、")}
              。
              {connectedAutoPublishPlatforms.length
                ? `${connectedAutoPublishPlatforms
                    .map((platform) => platform.label)
                    .join("、")} 可按排程自動發布。`
                : ""}
            </span>
            <button
              type="button"
              onClick={() => router.push("/onboarding/integrations")}
            >
              管理連接
            </button>
          </div>
        ) : (
          <div className="connect-banner">
            <span>
              ⚡ 你的貼文尚未自動發布。連接帳戶後，SOON 可以按排程自動發布。
            </span>
            <button
              type="button"
              onClick={() => router.push("/onboarding/integrations")}
            >
              連接
            </button>
          </div>
        )}

        {!postsLoading && scheduledPosts.length ? (
          <div className="calendar-date-pill">
            {isBechillActive ? "8月13日 - 8月16日 已確認排程" : "已確認排程"}
          </div>
        ) : null}

        <section className="schedule-column" aria-label="已排程內容">
          {postsLoading ? (
            <div className="schedule-empty-panel is-loading">
              <strong>正在載入已排程內容</strong>
              <span>SOON 正在同步目前工作台的貼文、審批狀態及圖片。</span>
            </div>
          ) : postsLoadError ? (
            <div className="schedule-empty-panel">
              <strong>未能載入已排程內容</strong>
              <span>
                請重新整理頁面；如果仍然見到這個畫面，SOON
                會用工作台紀錄追查載入問題。
              </span>
            </div>
          ) : scheduledPosts.length ? (
            scheduledPosts.map((post) => {
              const media = post.media?.length ? post.media : [post.image];
              const activeSlide = Math.min(
                postSlides[post.id] ?? 0,
                media.length - 1,
              );
              const captionExpanded = Boolean(expandedCaptions[post.id]);
              const isEditingCaption = editingCaptionPostId === post.id;
              const cardCaptionDraft = cardCaptionDrafts[post.id] ?? post.body;

              return (
                <article className="post-card" key={post.id}>
                  <div className="post-card-head">
                    <span
                      className={
                        post.type === "文章"
                          ? "post-type article"
                          : "post-type image"
                      }
                    >
                      {post.type}
                    </span>
                    <div className="post-time-actions">
                      <strong>{post.time}</strong>
                      <button
                        type="button"
                        className="quick-publish-button"
                        disabled={
                          publishing ||
                          !hasPublishConnection ||
                          post.status === "已發布"
                        }
                        onClick={() => void publishPost(post, undefined, true)}
                      >
                        {publishingPlatform === "all"
                          ? "發布中..."
                          : post.status === "已發布"
                            ? "已發布"
                            : hasPublishConnection
                              ? "立即發布"
                              : "未連接"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openScheduleModal(post)}
                      >
                        改時間
                      </button>
                    </div>
                  </div>
                  <div className="post-image-wrap">
                    <img
                      src={media[activeSlide]}
                      alt={`${post.title} 第 ${activeSlide + 1} 張`}
                    />
                    <span className="post-status-badge">{post.status}</span>
                    {media.length > 1 ? (
                      <>
                        <span className="post-carousel-count">
                          {activeSlide + 1} / {media.length}
                        </span>
                        <button
                          type="button"
                          className="post-carousel-button previous"
                          aria-label="上一張圖"
                          disabled={activeSlide === 0}
                          onClick={() =>
                            movePostSlide(post.id, media.length, -1)
                          }
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="post-carousel-button next"
                          aria-label="下一張圖"
                          disabled={activeSlide === media.length - 1}
                          onClick={() =>
                            movePostSlide(post.id, media.length, 1)
                          }
                        >
                          ›
                        </button>
                        <div
                          className="post-carousel-dots"
                          aria-label={`${post.title} 圖片頁數`}
                        >
                          {media.map((imageUrl, index) => (
                            <button
                              type="button"
                              key={imageUrl}
                              className={index === activeSlide ? "active" : ""}
                              aria-label={`第 ${index + 1} 張圖`}
                              onClick={() =>
                                setPostSlide(post.id, media.length, index)
                              }
                            />
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div className="post-copy">
                    <h2>{post.title}</h2>
                    {isEditingCaption ? (
                      <div className="post-caption-editor">
                        <textarea
                          value={cardCaptionDraft}
                          onChange={(event) =>
                            setCardCaptionDrafts((current) => ({
                              ...current,
                              [post.id]: event.target.value,
                            }))
                          }
                          aria-label={`${post.title} caption`}
                        />
                        <div className="post-caption-editor-actions">
                          <button
                            type="button"
                            onClick={() => setEditingCaptionPostId(null)}
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveCardCaption(post)}
                            disabled={savingCaptionPostId === post.id}
                          >
                            {savingCaptionPostId === post.id
                              ? "儲存中..."
                              : "儲存"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className={captionExpanded ? "is-expanded" : ""}>
                          {post.body}
                        </p>
                        <div className="post-caption-actions">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedCaptions((current) => ({
                                ...current,
                                [post.id]: !captionExpanded,
                              }))
                            }
                          >
                            {captionExpanded ? "收起" : "展開"}
                          </button>
                          <button
                            type="button"
                            onClick={() => startCardCaptionEdit(post)}
                          >
                            編輯 caption
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="post-card-actions">
                    {PUBLISH_PLATFORMS.map((platform) => {
                      const connection = platformConnections[platform.id];
                      const supportsAutoPublish = AUTO_PUBLISH_PLATFORM_IDS.has(
                        platform.id,
                      );
                      const status = platformPublishStatus(post, platform.id);
                      const isPublishingThis =
                        publishingPlatform === platform.id;
                      const failedMessage =
                        post.publishStatus?.[platform.id]?.message;
                      return (
                        <button
                          type="button"
                          key={platform.id}
                          className={`post-publish-now-button ${status === "published" ? "is-published" : ""}`}
                          disabled={
                            publishing ||
                            !connection ||
                            status === "published" ||
                            !supportsAutoPublish
                          }
                          onClick={() =>
                            void publishPost(post, platform.id, true)
                          }
                          title={failedMessage || undefined}
                        >
                          <PublishPlatformIcon platform={platform.id} />
                          <span className="publish-platform-label">
                            {status === "published"
                              ? `已發布到 ${platform.label}`
                              : !supportsAutoPublish
                                ? `${platform.label} 手動發布`
                              : isPublishingThis
                                ? `${platform.label} 發布中...`
                                : connection
                                  ? `發布到 ${platform.label}`
                                  : `未連接 ${platform.label}`}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="post-delete-schedule-button"
                      disabled={publishing || cancellingPostId === post.id}
                      onClick={() => void cancelScheduledPost(post)}
                    >
                      {cancellingPostId === post.id ? "刪除中..." : "刪除排程"}
                    </button>
                    {!hasPublishConnection ? (
                      <span>請先連接發布帳戶</span>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="schedule-empty-panel">
              <strong>暫時未有已確認排程內容</strong>
              <span>
                這裡只會顯示目前工作台已獲客戶確認的貼文；有新內容確認後會自動出現在這裡。
              </span>
            </div>
          )}
        </section>
        {toolbarMessage ? (
          <div className="toolbar-message">{toolbarMessage}</div>
        ) : null}
      </section>

      {createModalOpen ? (
        <div
          className="toolbar-modal-backdrop"
          role="presentation"
          onMouseDown={() => setCreateModalOpen(false)}
        >
          <section
            className="toolbar-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-post-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <h2 id="create-post-title">建立新貼文</h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                aria-label="關閉"
              >
                ×
              </button>
            </header>
            <form onSubmit={handleCreatePost} className="toolbar-form">
              <label>
                <span>貼文類型</span>
                <select
                  value={createPostType}
                  onChange={(event) => setCreatePostType(event.target.value)}
                >
                  <option value="still-images">靜態圖片</option>
                  <option value="carousels">輪播貼文</option>
                  <option value="short-form-video">短影片</option>
                  <option value="emails">文章 / 電郵內容</option>
                </select>
              </label>
              <label>
                <span>標題</span>
                <input
                  value={createTitle}
                  onChange={(event) => setCreateTitle(event.target.value)}
                  placeholder="輸入貼文主題"
                />
              </label>
              <label>
                <span>發布日期與時間（{localTimeZoneLabel}）</span>
                <input
                  type="datetime-local"
                  value={createScheduledAt}
                  onChange={(event) => setCreateScheduledAt(event.target.value)}
                />
              </label>
              <footer>
                <button type="button" onClick={() => setCreateModalOpen(false)}>
                  取消
                </button>
                <button type="submit" disabled={toolbarBusy}>
                  {toolbarBusy ? "建立中..." : "建立貼文"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {scheduleModalPost ? (
        <div
          className="toolbar-modal-backdrop"
          role="presentation"
          onMouseDown={() => setScheduleModalPost(null)}
        >
          <section
            className="toolbar-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-schedule-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <h2 id="edit-schedule-title">修改發布時間</h2>
              <button
                type="button"
                onClick={() => setScheduleModalPost(null)}
                aria-label="關閉"
              >
                ×
              </button>
            </header>
            <form onSubmit={handleUpdateSchedule} className="toolbar-form">
              <label>
                <span>貼文</span>
                <input value={scheduleModalPost.title} readOnly />
              </label>
              <label>
                <span>發布日期與時間（{localTimeZoneLabel}）</span>
                <input
                  type="datetime-local"
                  value={scheduleDraftAt}
                  onChange={(event) => setScheduleDraftAt(event.target.value)}
                />
              </label>
              <footer>
                <button
                  type="button"
                  onClick={() => setScheduleModalPost(null)}
                >
                  取消
                </button>
                <button type="submit" disabled={toolbarBusy}>
                  {toolbarBusy ? "儲存中..." : "儲存時間"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {regenerateConfirmOpen ? (
        <div
          className="toolbar-modal-backdrop"
          role="presentation"
          onMouseDown={() => setRegenerateConfirmOpen(false)}
        >
          <section
            className="toolbar-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="regenerate-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <h2 id="regenerate-title">重新生成圖片</h2>
              <button
                type="button"
                onClick={() => setRegenerateConfirmOpen(false)}
                aria-label="關閉"
              >
                ×
              </button>
            </header>
            <p>重新為本週所有貼文生成圖片？這會消耗 credits。</p>
            <div className="affected-post-list">
              {currentWeekPosts.length ? (
                currentWeekPosts.map((post) => (
                  <span key={post.id}>{post.title}</span>
                ))
              ) : (
                <span>本週沒有貼文</span>
              )}
            </div>
            {toolbarBusy && regenerateProgress.total ? (
              <strong className="toolbar-progress">
                正在重新生成... ({regenerateProgress.current}/
                {regenerateProgress.total})
              </strong>
            ) : null}
            <footer>
              <button
                type="button"
                onClick={() => setRegenerateConfirmOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                disabled={toolbarBusy || !currentWeekPosts.length}
                onClick={handleConfirmRegenerate}
              >
                確認重新生成
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {improvePanelOpen ? (
        <div
          className="toolbar-modal-backdrop"
          role="presentation"
          onMouseDown={() => setImprovePanelOpen(false)}
        >
          <section
            className="toolbar-modal improve-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="improve-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <h2 id="improve-title">改善本週內容</h2>
              <button
                type="button"
                onClick={() => setImprovePanelOpen(false)}
                aria-label="關閉"
              >
                ×
              </button>
            </header>
            <div className="improve-options">
              <label>
                <input
                  type="radio"
                  checked={improveMode === "copy"}
                  onChange={() => setImproveMode("copy")}
                />
                <span>改善所有本週文案</span>
              </label>
              <label>
                <input
                  type="radio"
                  checked={improveMode === "image-prompt"}
                  onChange={() => setImproveMode("image-prompt")}
                />
                <span>改善所有本週圖片 prompt</span>
              </label>
            </div>
            <p>以下貼文會受影響：</p>
            <div className="affected-post-list">
              {currentWeekPosts.length ? (
                currentWeekPosts.map((post) => (
                  <span key={post.id}>{post.title}</span>
                ))
              ) : (
                <span>本週沒有貼文</span>
              )}
            </div>
            {toolbarBusy && improveProgress.total ? (
              <strong className="toolbar-progress">
                正在改善... ({improveProgress.current}/{improveProgress.total})
              </strong>
            ) : null}
            <footer>
              <button type="button" onClick={() => setImprovePanelOpen(false)}>
                取消
              </button>
              <button
                type="button"
                disabled={toolbarBusy || !currentWeekPosts.length}
                onClick={handleImprovePosts}
              >
                確認改善
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </main>
  );
}

export default function ScheduledPostsPage() {
  return (
    <Suspense fallback={null}>
      <ScheduledPostsPageContent />
    </Suspense>
  );
}

const styles = `${dashboardSidebarStyles}
  .site-nav {
    display: none;
  }

  .dashboard-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .calendar-shell {
    min-width: 0;
    background: #ffffff;
  }

  .calendar-topbar {
    min-height: 58px;
    border-bottom: 1px solid #ebecef;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 0 18px;
  }

  .calendar-title,
  .calendar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .calendar-title h1 {
    margin: 0 8px 0 0;
    font-size: 18px;
    font-weight: 650;
  }

  .calendar-title > span {
    color: #6f737d;
    font-size: 13px;
  }

  .calendar-title button,
  .calendar-actions button {
    border: 0;
    background: transparent;
    color: #202126;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  .calendar-title strong {
    font-size: 15px;
    font-weight: 550;
  }

  .calendar-actions span {
    font-size: 14px;
  }

  .calendar-actions .upgrade-button {
    border: 1px solid #e2d8ff;
    border-radius: 8px;
    color: #7c3aed;
    padding: 7px 11px;
  }

  .toolbar-message {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 1200;
    border: 1px solid #dfe1e6;
    border-radius: 10px;
    background: #ffffff;
    color: #202126;
    box-shadow: 0 14px 40px rgba(32, 33, 38, 0.14);
    padding: 10px 14px;
    font-size: 13px;
  }

  .connect-banner {
    min-height: 48px;
    background: #fff7e8;
    border-bottom: 1px solid #efe3cc;
    color: #4c453b;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 18px;
    font-size: 14px;
  }

  .connect-banner.connected {
    background: #edfff5;
    border-bottom-color: #c7f3d8;
    color: #14532d;
  }

  .connect-banner.loading {
    background: linear-gradient(90deg, #f7f7f8 25%, #eceef1 50%, #f7f7f8 75%);
    background-size: 200% 100%;
    animation: scheduled-banner-shimmer 1.2s infinite;
  }

  @keyframes scheduled-banner-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .connect-banner button {
    border: 0;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    padding: 8px 14px;
    cursor: pointer;
  }

  .calendar-date-pill {
    width: fit-content;
    margin: 16px auto 14px;
    border-radius: 8px;
    background: #f2f3f5;
    color: #202126;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 650;
  }

  .schedule-column {
    width: min(100%, 320px);
    margin: 0 auto 80px;
    display: grid;
    gap: 10px;
  }

  .schedule-empty-panel {
    width: min(100%, 520px);
    min-height: 220px;
    border: 1px dashed #d9dbe1;
    border-radius: 12px;
    background: #fbfbfc;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    padding: 24px;
    color: #6f737d;
  }

  .schedule-empty-panel strong {
    color: #202126;
    font-size: 16px;
  }

  .schedule-empty-panel span {
    font-size: 14px;
    line-height: 1.6;
  }

  .schedule-empty-panel.is-loading {
    border-style: solid;
    background:
      linear-gradient(90deg, rgba(247, 247, 248, 0.7) 25%, rgba(235, 236, 239, 0.9) 50%, rgba(247, 247, 248, 0.7) 75%),
      #ffffff;
    background-size: 220% 100%;
    animation: scheduled-banner-shimmer 1.2s infinite;
  }

  .schedule-column.compact {
    width: min(100%, 280px);
  }

  .post-card {
    border: 1px solid #e8e9ec;
    border-radius: 10px;
    background: #ffffff;
    overflow: hidden;
    cursor: default;
    transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
  }

  .post-card:hover {
    transform: none;
    box-shadow: none;
    border-color: #e8e9ec;
  }

  .post-card-head {
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 8px;
    border-bottom: 1px solid #ececef;
  }

  .post-type {
    flex: 0 0 auto;
    color: #202126;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    line-height: 1;
    white-space: nowrap;
  }

  .post-type::before {
    content: '▧';
    color: #ef5148;
  }

  .post-type.article::before {
    content: '▤';
    color: #2e9a55;
  }

  .post-card-head strong {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.05;
    white-space: nowrap;
  }

  .post-time-actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 5px;
    flex: 1;
    min-width: 0;
  }

  .post-time-actions button {
    border: 1px solid #e2e3e7;
    border-radius: 7px;
    background: #ffffff;
    color: #202126;
    cursor: pointer;
    font: inherit;
    font-size: 11px;
    font-weight: 650;
    min-height: 28px;
    padding: 4px 7px;
    white-space: nowrap;
  }

  .post-time-actions button:hover {
    border-color: #c7c9cf;
    background: #f7f7f8;
  }

  .post-time-actions .quick-publish-button {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
    min-width: 78px;
  }

  .post-time-actions .quick-publish-button:hover {
    background: #202126;
    border-color: #202126;
  }

  .post-time-actions .quick-publish-button:disabled {
    background: #d8d9dd;
    border-color: #d8d9dd;
    color: #777b84;
    cursor: not-allowed;
  }

  .post-image-wrap {
    position: relative;
    aspect-ratio: 4 / 5;
    background: #fbfaf7;
    overflow: hidden;
  }

  .post-image-wrap img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .post-status-badge,
  .post-carousel-count {
    position: absolute;
    left: 8px;
    bottom: 8px;
    border-radius: 6px;
    background: #7c3aed;
    color: #ffffff;
    padding: 3px 7px;
    font-size: 12px;
  }

  .post-carousel-count {
    top: 8px;
    bottom: auto;
    background: rgba(17, 17, 17, 0.68);
  }

  .post-carousel-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 8px;
    background: rgba(17, 17, 17, 0.74);
    color: #ffffff;
    font-size: 26px;
    line-height: 1;
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .post-carousel-button.previous {
    left: 8px;
  }

  .post-carousel-button.next {
    right: 8px;
  }

  .post-carousel-button:disabled {
    opacity: 0.28;
    cursor: default;
  }

  .post-carousel-dots {
    position: absolute;
    left: 50%;
    bottom: 10px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    background: rgba(17, 17, 17, 0.46);
    padding: 5px 7px;
  }

  .post-carousel-dots button {
    width: 6px;
    height: 6px;
    border: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.54);
    padding: 0;
    cursor: pointer;
  }

  .post-carousel-dots button.active {
    width: 16px;
    background: #ffffff;
  }

  .post-copy {
    padding: 12px;
  }

  .post-copy h2 {
    margin: 0;
    color: #202126;
    font-size: 21px;
    line-height: 1.05;
    font-weight: 850;
  }

  .post-copy p {
    margin: 10px 0 0;
    color: #555861;
    font-size: 12px;
    line-height: 1.42;
    display: -webkit-box;
    overflow: hidden;
    white-space: pre-wrap;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }

  .post-copy p.is-expanded {
    display: block;
    overflow: visible;
    -webkit-line-clamp: unset;
  }

  .post-caption-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 9px;
  }

  .post-caption-actions button,
  .post-caption-editor-actions button {
    border: 1px solid #e0e2e7;
    border-radius: 7px;
    background: #ffffff;
    color: #333842;
    cursor: pointer;
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    padding: 5px 8px;
  }

  .post-caption-actions button:hover,
  .post-caption-editor-actions button:hover {
    background: #f7f8fa;
  }

  .post-caption-editor {
    display: grid;
    gap: 8px;
    margin-top: 10px;
  }

  .post-caption-editor textarea {
    border: 1px solid #dfe2e8;
    border-radius: 8px;
    color: #202126;
    font: inherit;
    font-size: 12px;
    line-height: 1.42;
    min-height: 142px;
    padding: 9px;
    resize: vertical;
    width: 100%;
  }

  .post-caption-editor textarea:focus {
    border-color: #202126;
    outline: 0;
  }

  .post-caption-editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  .post-caption-editor-actions button:last-child {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
  }

  .post-caption-editor-actions button:disabled {
    opacity: 0.55;
    cursor: wait;
  }

  .post-card-actions {
    border-top: 1px solid #ececef;
    display: grid;
    gap: 7px;
    padding: 10px 12px 12px;
  }

  .post-publish-now-button {
    align-items: center;
    border: 0;
    border-radius: 8px;
    background: #111111;
    color: #ffffff;
    cursor: pointer;
    display: flex;
    gap: 8px;
    font: inherit;
    font-size: 12px;
    font-weight: 750;
    justify-content: center;
    min-height: 36px;
    padding: 8px 10px;
    white-space: nowrap;
  }

  .post-publish-now-button:disabled {
    background: #d8d9dd;
    color: #777b84;
    cursor: not-allowed;
  }

  .post-publish-now-button.is-published {
    background: #e8fff1;
    color: #146c36;
  }

  .post-delete-schedule-button {
    border: 1px solid #ffd6d6;
    border-radius: 8px;
    background: #fff7f7;
    color: #b42318;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 750;
    min-height: 34px;
    padding: 8px 10px;
    white-space: nowrap;
  }

  .post-delete-schedule-button:hover {
    background: #ffefef;
  }

  .post-delete-schedule-button:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  .publish-platform-icon {
    align-items: center;
    border-radius: 999px;
    color: #ffffff;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 10px;
    font-weight: 850;
    height: 18px;
    justify-content: center;
    line-height: 1;
    text-align: center;
    width: 18px;
  }

  .publish-platform-icon.instagram {
    background: linear-gradient(135deg, #f58529, #dd2a7b 52%, #515bd4);
  }

  .publish-platform-icon.instagram svg {
    fill: none;
    height: 14px;
    stroke: #ffffff;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
    width: 14px;
  }

  .publish-platform-icon.facebook {
    background: #1877f2;
    font-family: Arial, sans-serif;
    font-size: 13px;
  }

  .publish-platform-icon.threads {
    background: #111111;
    font-size: 12px;
  }

  .publish-platform-label {
    color: inherit;
    font-size: 12px;
    line-height: 1;
    min-width: 0;
  }

  .post-card-actions > span {
    color: #858994;
    font-size: 11px;
    line-height: 1.4;
    text-align: center;
  }

  .schedule-column.compact .post-copy p {
    display: none;
  }

  .post-editor-page {
    min-height: 100vh;
    background: #f7f7f8;
    color: #202126;
  }

  .editor-topbar {
    height: 58px;
    border-bottom: 1px solid #e7e8eb;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 14px;
  }

  .editor-post-title,
  .editor-top-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .editor-post-title button,
  .editor-top-actions button,
  .post-settings-panel button,
  .result-actions button {
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .editor-post-title .post-type {
    max-width: min(42vw, 420px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 650;
  }

  .editor-post-title strong {
    border-radius: 7px;
    background: #fee2e2;
    color: #c2410c;
    padding: 7px 10px;
    font-size: 13px;
  }

  .editor-top-actions button:disabled {
    color: #b9bbc2;
    cursor: default;
  }

  .editor-top-actions .upgrade-button {
    color: #7c3aed;
    border-color: #e3d8ff;
  }

  .post-editor-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 58px;
    padding: 10px 20px;
    border-bottom: 1px solid #e8e9ec;
    background: #ffffff;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .post-editor-topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
  }

  .post-editor-back-btn {
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    padding: 6px 10px;
    font: inherit;
    font-size: 16px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .post-editor-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .post-editor-thumb {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .post-editor-campaign-name {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .post-editor-status-badge {
    font-size: 12px;
    padding: 3px 9px;
    border-radius: 6px;
    font-weight: 500;
    white-space: nowrap;
  }

  .post-editor-status-badge.draft {
    background: #f0f1f3;
    color: #6f737d;
  }

  .post-editor-status-badge.approved {
    background: #d1fae5;
    color: #065f46;
  }

  .post-editor-status-badge.scheduled {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .post-editor-status-badge.published {
    background: #202126;
    color: #ffffff;
  }

  .post-editor-status-badge.rejected {
    background: #fee2e2;
    color: #991b1b;
  }

  .post-editor-topbar-center {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .post-editor-nav-btn {
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    padding: 7px 14px;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    color: #6f737d;
    transition: background 150ms;
  }

  .post-editor-nav-btn:hover {
    background: #f5f5f7;
  }

  .post-editor-nav-btn:disabled {
    color: #b9bbc2;
    cursor: default;
    background: #ffffff;
  }

  .post-editor-action-btn {
    padding: 8px 20px;
    border-radius: 8px;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: opacity 150ms;
  }

  .post-editor-action-btn.reject {
    background: #f0f1f3;
    color: #202126;
  }

  .post-editor-action-btn.approve {
    background: #202126;
    color: #ffffff;
  }

  .post-editor-action-btn:hover {
    opacity: 0.85;
  }

  .post-editor-action-btn:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  .post-editor-topbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    justify-content: flex-end;
    font-size: 14px;
    color: #202126;
  }

  .post-editor-topbar-right .upgrade-button {
    border: 1px solid #e3d8ff;
    border-radius: 8px;
    background: #ffffff;
    color: #7c3aed;
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .editor-shell {
    min-height: calc(100vh - 58px);
    display: grid;
    grid-template-columns: 340px minmax(420px, 1fr) 300px;
  }

  .ai-improve-panel,
  .post-settings-panel {
    background: #ffffff;
    border-right: 1px solid #e7e8eb;
    padding: 24px 18px;
  }

  .post-settings-panel {
    border-right: 0;
    border-left: 1px solid #e7e8eb;
    display: grid;
    align-content: start;
    gap: 18px;
  }

  .improve-copy {
    min-height: calc(100vh - 230px);
    display: grid;
    align-content: center;
    gap: 22px;
  }

  .improve-copy p {
    margin: 0;
    color: #292b31;
    font-size: 17px;
    line-height: 1.45;
  }

  .improve-copy ol {
    margin: 0;
    padding-left: 22px;
    display: grid;
    gap: 14px;
    color: #292b31;
    font-size: 16px;
    line-height: 1.55;
  }

  .improve-copy strong {
    font-weight: 780;
  }

  .ai-command-box {
    border: 1px solid #e1e3e8;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 16px 36px rgba(32, 33, 38, 0.08);
    overflow: hidden;
  }

  .ai-command-box textarea {
    width: 100%;
    min-height: 82px;
    border: 0;
    resize: none;
    padding: 16px;
    color: #202126;
    background: transparent;
    font: inherit;
    font-size: 14px;
    outline: 0;
  }

  .ai-command-box div {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 10px;
  }

  .ai-command-box input {
    display: none;
  }

  .ai-command-box label span,
  .ai-command-box button {
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #5f636d;
    font: inherit;
    font-size: 13px;
    padding: 7px 10px;
    cursor: pointer;
  }

  .ai-command-box button {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: #202126;
    color: #ffffff;
    padding: 0;
  }

  .preview-stage {
    position: relative;
    display: grid;
    place-items: center;
    padding: 42px 24px 92px;
  }

  .view-switcher {
    position: absolute;
    left: max(20px, calc(50% - 310px));
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    gap: 9px;
    justify-items: center;
  }

  .view-switcher span {
    color: #979aa2;
    font-size: 13px;
  }

  .view-switcher button {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid #e1e3e8;
    background: #ffffff;
    color: #3f424a;
    font-weight: 750;
    cursor: pointer;
  }

  .view-switcher button.active {
    border-color: #202126;
    box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #202126;
  }

  .phone-preview {
    width: 280px;
    border-radius: 22px;
    background: #ffffff;
    border: 1px solid #e1e3e8;
    box-shadow: 0 24px 60px rgba(32, 33, 38, 0.16);
    overflow: hidden;
  }

  .phone-preview header {
    min-height: 48px;
    display: grid;
    grid-template-columns: 28px 1fr;
    column-gap: 9px;
    align-items: center;
    padding: 10px 14px;
  }

  .phone-preview header strong,
  .phone-preview header span {
    grid-column: 2;
    line-height: 1.1;
  }

  .phone-preview header strong {
    font-size: 13px;
    font-weight: 750;
  }

  .phone-preview header span {
    color: #979aa2;
    font-size: 11px;
  }

  .avatar {
    grid-row: 1 / 3;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #f0eef7;
    color: #9f7aea;
    display: grid;
    place-items: center;
    font-weight: 850;
  }

  .phone-image {
    position: relative;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    background: #eceef2;
    cursor: pointer;
  }

  .phone-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 180ms ease, filter 180ms ease;
  }

  .phone-image:hover img {
    transform: scale(1.015);
    filter: brightness(0.62);
  }

  .phone-overlay {
    position: absolute;
    inset: auto 18px 18px;
    color: #ffffff;
    text-shadow: 0 3px 16px rgba(0, 0, 0, 0.45);
    display: grid;
    gap: 6px;
  }

  .phone-overlay strong {
    max-width: 210px;
    font-size: 25px;
    line-height: 0.95;
    font-weight: 900;
  }

  .phone-overlay span {
    width: fit-content;
    border-radius: 6px;
    background: #d946ef;
    padding: 4px 7px;
    font-size: 11px;
    font-weight: 750;
  }

  .edit-design-overlay {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) translateY(4px);
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 10px;
    background: #ffffff;
    color: #202126;
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
    opacity: 0;
    pointer-events: none;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    padding: 10px 14px;
    white-space: nowrap;
    transition: opacity 160ms ease, transform 160ms ease;
    cursor: pointer;
  }

  .phone-image:hover .edit-design-overlay,
  .edit-design-overlay:focus-visible {
    opacity: 1;
    pointer-events: auto;
    transform: translate(-50%, -50%);
  }

  .phone-actions {
    min-height: 42px;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 8px 14px;
  }

  .phone-actions span {
    font-size: 23px;
    line-height: 1;
  }

  .phone-actions button {
    margin-left: auto;
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 12px;
    padding: 7px 9px;
    cursor: pointer;
    transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
  }

  .phone-actions button:hover,
  .phone-actions button:focus-visible {
    border-color: #202126;
    background: #f8f8f9;
    box-shadow: 0 6px 18px rgba(32, 33, 38, 0.1);
  }

  .phone-preview p {
    margin: 0;
    padding: 0 14px 18px;
    color: #464952;
    font-size: 13px;
    line-height: 1.35;
  }

  .phone-preview.facebook,
  .phone-preview.linkedin {
    width: 360px;
    border-radius: 14px;
  }

  .phone-preview.x,
  .phone-preview.google {
    width: 330px;
    border-radius: 18px;
  }

  .result-actions {
    position: absolute;
    left: 50%;
    bottom: 26px;
    transform: translateX(-50%);
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 20px 50px rgba(32, 33, 38, 0.14);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    white-space: nowrap;
  }

  .result-actions span {
    font-size: 14px;
  }

  .post-settings-panel section {
    border-bottom: 1px solid #e7e8eb;
    padding-bottom: 16px;
    display: grid;
    gap: 8px;
  }

  .post-settings-panel section > p {
    margin: 0 0 4px;
    color: #9a9da4;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .post-settings-panel section > strong {
    display: block;
    color: #202126;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.35;
  }

  .post-settings-panel section > span {
    display: block;
    color: #6f737d;
    font-size: 13px;
    margin-top: 2px;
  }

  .post-settings-panel section > button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border: 1px solid #e2e3e7;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    gap: 10px;
    transition: background 150ms ease;
  }

  .post-settings-panel section > button:hover {
    background: #f5f5f7;
  }

  .post-settings-panel section > button small {
    color: #6f737d;
    display: block;
    font-size: 11px;
    font-weight: 500;
    margin-top: 2px;
  }

  .post-settings-panel .connected-channel {
    background: #f6f7f9;
    border-color: #dee0e5;
  }

  .post-settings-panel .publish-btn {
    background: #f0fdf4;
    border-color: #d1fae5;
  }

  .post-settings-panel .publish-btn:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  .post-settings-panel .connect-channel-btn {
    color: #6f737d;
  }

  .post-settings-panel .connect-channel-btn em {
    color: #202126;
    font-weight: 600;
  }

  .threads-preview-note {
    border-top: 1px solid #f0f1f3;
    color: #6f737d;
    font-size: 12px;
    padding: 10px 14px 0;
  }

  .publish-success,
  .publish-error {
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.35;
    margin-top: 6px;
    padding: 8px 12px;
  }

  .publish-success {
    background: #f0fdf4;
    border: 1px solid #d1fae5;
    color: #065f46;
  }

  .publish-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .post-settings-panel em {
    color: #8a8d95;
    font-style: normal;
  }

  .post-settings-panel section > button em {
    color: #9a9da4;
    font-style: normal;
  }

  .caption-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(247, 248, 250, 0.72);
    backdrop-filter: blur(10px);
    display: grid;
    place-items: center;
    padding: 28px;
  }

  .toolbar-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2100;
    background: rgba(247, 248, 250, 0.72);
    backdrop-filter: blur(10px);
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .toolbar-modal {
    width: min(520px, 100%);
    border-radius: 16px;
    background: #ffffff;
    color: #202126;
    box-shadow: 0 28px 90px rgba(32, 33, 38, 0.24);
    display: grid;
    gap: 18px;
    padding: 22px;
  }

  .toolbar-modal.improve-modal {
    width: min(620px, 100%);
  }

  .toolbar-modal header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 16px;
  }

  .toolbar-modal h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 650;
  }

  .toolbar-modal header button {
    border: 0;
    background: transparent;
    color: #202126;
    cursor: pointer;
    font: inherit;
    font-size: 24px;
    line-height: 1;
  }

  .toolbar-modal p {
    margin: 0;
    color: #555963;
    font-size: 14px;
    line-height: 1.45;
  }

  .toolbar-form {
    display: grid;
    gap: 14px;
  }

  .toolbar-form label,
  .improve-options label {
    display: grid;
    gap: 7px;
    color: #202126;
    font-size: 13px;
  }

  .toolbar-form label span {
    color: #6f737d;
    font-weight: 600;
  }

  .toolbar-form input,
  .toolbar-form select {
    min-height: 40px;
    border: 1px solid #dfe1e6;
    border-radius: 9px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    padding: 0 11px;
  }

  .toolbar-modal footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .toolbar-modal footer button {
    border: 1px solid #dfe1e6;
    border-radius: 9px;
    background: #ffffff;
    color: #202126;
    cursor: pointer;
    font: inherit;
    font-size: 14px;
    padding: 9px 13px;
  }

  .toolbar-modal footer button:last-child {
    border-color: #111111;
    background: #111111;
    color: #ffffff;
  }

  .toolbar-modal footer button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .affected-post-list {
    max-height: 180px;
    overflow: auto;
    display: grid;
    gap: 6px;
    border: 1px solid #eceef2;
    border-radius: 10px;
    padding: 10px;
    background: #fafafa;
  }

  .affected-post-list span {
    color: #3d4048;
    font-size: 13px;
    line-height: 1.35;
  }

  .toolbar-progress {
    border-radius: 9px;
    background: #f2f3f5;
    color: #202126;
    font-size: 13px;
    font-weight: 600;
    padding: 9px 10px;
  }

  .improve-options {
    display: grid;
    gap: 8px;
  }

  .improve-options label {
    grid-template-columns: 18px 1fr;
    align-items: center;
    border: 1px solid #eceef2;
    border-radius: 10px;
    padding: 10px;
  }

  .caption-modal {
    width: min(1180px, 100%);
    max-height: min(760px, calc(100vh - 56px));
    border-radius: 18px;
    background: #ffffff;
    color: #202126;
    box-shadow: 0 28px 90px rgba(32, 33, 38, 0.24);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    overflow: hidden;
  }

  .caption-modal header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 18px;
    padding: 32px 36px 18px;
  }

  .caption-modal h2 {
    margin: 0;
    color: #17181c;
    font-size: 28px;
    line-height: 1.1;
    font-weight: 650;
  }

  .caption-modal header p {
    margin: 10px 0 0;
    color: #70737c;
    font-size: 14px;
    line-height: 1.45;
  }

  .caption-modal header > button {
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #202126;
    font: inherit;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
  }

  .caption-grid {
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(260px, 1fr);
    gap: 18px;
    padding: 10px 36px 24px;
  }

  .caption-column {
    min-width: 260px;
    display: grid;
    grid-template-rows: auto auto auto minmax(260px, 1fr) auto;
    gap: 10px;
  }

  .caption-channel-head {
    display: grid;
    grid-template-columns: 26px 1fr auto;
    align-items: center;
    gap: 10px;
  }

  .caption-channel-head span {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    background: #f2f3f6;
    color: #2864dc;
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 850;
  }

  .caption-column:nth-child(1) .caption-channel-head span {
    color: #ffffff;
    background: linear-gradient(135deg, #f97316, #ec4899, #7c3aed);
  }

  .caption-column:nth-child(4) .caption-channel-head span {
    color: #ffffff;
    background: #111111;
  }

  .caption-column:nth-child(5) .caption-channel-head span {
    color: #4285f4;
    background: #ffffff;
    border: 1px solid #e1e3e8;
  }

  .caption-channel-head strong {
    font-size: 17px;
    font-weight: 650;
  }

  .caption-channel-head button {
    border: 1px solid #e1e3e8;
    border-radius: 8px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 7px 10px;
    cursor: pointer;
  }

  .caption-column p {
    min-height: 44px;
    margin: 0;
    color: #676a73;
    font-size: 13px;
    line-height: 1.35;
  }

  .caption-regenerate {
    justify-self: end;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #202126;
    font-size: 18px;
    cursor: pointer;
  }

  .caption-column textarea {
    width: 100%;
    min-height: 280px;
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #2b2d34;
    padding: 14px;
    resize: none;
    outline: 0;
    font: inherit;
    font-size: 14px;
    line-height: 1.35;
  }

  .caption-column textarea:focus {
    border-color: #202126;
    box-shadow: 0 0 0 3px rgba(32, 33, 38, 0.08);
  }

  .caption-column small {
    justify-self: end;
    color: #70737c;
    font-size: 12px;
  }

  .caption-modal footer {
    min-height: 66px;
    border-top: 1px solid #eef0f3;
    background: rgba(255, 255, 255, 0.96);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 24px;
  }

  .caption-modal footer button {
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 15px;
    padding: 10px 14px;
    cursor: pointer;
  }

  .caption-modal footer button:last-child {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
  }

  .design-editor-page {
    min-height: 100vh;
    background: #f4f5f7;
    color: #202126;
  }

  .design-topbar {
    height: 58px;
    border-bottom: 1px solid #e3e5e8;
    background: #ffffff;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr) 260px;
    align-items: center;
    gap: 18px;
    padding: 0 14px;
  }

  .design-nav,
  .design-title,
  .design-account {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .design-nav button,
  .design-account button,
  .design-toolbar button,
  .brand-panel button,
  .design-result-bar button {
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    cursor: pointer;
  }

  .design-nav button {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .design-title {
    justify-content: center;
  }

  .design-title strong {
    max-width: min(48vw, 520px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    font-weight: 650;
  }

  .design-title em {
    border-radius: 999px;
    background: #eef0f4;
    color: #6f737d;
    font-size: 13px;
    font-style: normal;
    padding: 5px 10px;
  }

  .design-account {
    justify-content: flex-end;
  }

  .design-account span {
    font-size: 14px;
  }

  .design-account button {
    color: #7c3aed;
    border-color: #e3d8ff;
    padding: 8px 13px;
  }

  .design-toolbar {
    height: 66px;
    border-bottom: 1px solid #e3e5e8;
    background: #ffffff;
    display: flex;
    align-items: stretch;
    justify-content: center;
    gap: 0;
  }

  .history-tools {
    position: absolute;
    left: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 66px;
  }

  .design-toolbar button {
    min-width: 92px;
    border: 0;
    border-left: 1px solid #eceef2;
    border-radius: 0;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 4px;
    color: #4d5058;
  }

  .history-tools button {
    gap: 2px;
    min-width: 52px;
    width: 52px;
    border: 0;
    color: #afb2ba;
  }

  .history-tools button span {
    font-size: 20px;
  }

  .history-tools button strong {
    font-size: 11px;
    font-weight: 600;
  }

  .design-toolbar button.active {
    background: #f0f1f4;
    color: #202126;
    border-radius: 8px;
    margin: 8px 0;
  }

  .design-toolbar button span {
    font-size: 19px;
    line-height: 1;
  }

  .design-toolbar button strong {
    font-size: 13px;
    font-weight: 520;
  }

  .design-workbench {
    min-height: calc(100vh - 124px);
    display: grid;
    grid-template-columns: minmax(0, 1fr) 390px;
  }

  .design-canvas-area {
    position: relative;
    display: grid;
    place-items: center;
    padding: 48px 32px 84px;
  }

  .design-canvas {
    position: relative;
    width: min(430px, 62vh);
    aspect-ratio: 4 / 5;
    background: #ddd;
    overflow: hidden;
    box-shadow: 0 16px 44px rgba(32, 33, 38, 0.12);
  }

  .fabric-design-canvas-shell .canvas-container,
  .fabric-design-canvas-shell canvas {
    width: 100% !important;
    height: 100% !important;
  }

  .fabric-design-canvas-shell .canvas-container {
    position: relative !important;
    z-index: 2;
  }

  .fabric-context-menu {
    position: fixed;
    z-index: 2000;
    min-width: 150px;
    border: 1px solid #e0e2e6;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 14px 36px rgba(32, 33, 38, 0.18);
    display: grid;
    gap: 2px;
    padding: 6px;
  }

  .fabric-context-menu button {
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #202126;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    padding: 9px 10px;
    text-align: left;
  }

  .fabric-context-menu button:hover {
    background: #f2f3f5;
  }

  .canvas-image-layer {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
  }

  .canvas-element.image {
    place-items: stretch;
  }

  .design-canvas::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.16), transparent 42%, rgba(0, 0, 0, 0.2));
    z-index: 1;
    pointer-events: none;
  }

  .canvas-element {
    position: absolute;
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: move;
    transform-origin: center;
  }

  .canvas-element > span:first-child {
    display: block;
    width: 100%;
    height: 100%;
    background: currentColor;
  }

  .canvas-element.frame > span:first-child,
  .canvas-element[class*="frame-"] > span:first-child {
    background-image: url('/assets/content-strategies/photos/lifestyle-content.jpg');
    background-size: cover;
    background-position: center;
  }

  .canvas-element.icon > span:first-child {
    display: grid;
    place-items: center;
    background: transparent;
    font-size: 0.82em;
    line-height: 1;
    color: currentColor;
  }

  .canvas-element.text {
    place-items: center;
  }

  .canvas-text-layer {
    display: block;
    background: transparent;
    cursor: move;
    min-height: 1em;
    overflow-wrap: anywhere;
    pointer-events: none;
    text-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
    user-select: none;
    white-space: pre-wrap;
  }

  .canvas-element.selected {
    outline: 2px solid #101114;
    outline-offset: 3px;
  }

  .handle {
    position: absolute;
    width: 14px;
    height: 14px;
    border: 2px solid #101114;
    border-radius: 5px;
    background: #ffffff;
    box-shadow: 0 3px 9px rgba(0, 0, 0, 0.18);
  }

  .handle.nw {
    left: -9px;
    top: -9px;
  }

  .handle.ne {
    right: -9px;
    top: -9px;
  }

  .handle.sw {
    left: -9px;
    bottom: -9px;
  }

  .handle.se {
    right: -9px;
    bottom: -9px;
  }

  .rotate-handle {
    position: absolute;
    left: 50%;
    bottom: -52px;
    transform: translateX(-50%);
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: #ffffff;
    color: #101114;
    display: grid;
    place-items: center;
    font-style: normal;
    font-size: 22px;
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
  }

  .element-mini-toolbar {
    position: absolute;
    left: 50%;
    top: -58px;
    transform: translateX(-50%);
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
    display: flex;
    align-items: center;
    gap: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  .element-mini-toolbar button {
    border: 0;
    background: transparent;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 9px 11px;
    cursor: pointer;
  }

  .element-mini-toolbar button:hover {
    background: #f2f3f5;
  }

  .design-canvas-copy {
    position: absolute;
    z-index: 8;
    left: 28px;
    top: 32px;
    width: 72%;
    color: #ffffff;
    text-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
    display: grid;
    gap: 12px;
  }

  .design-canvas-copy strong {
    font-size: 36px;
    line-height: 0.94;
    font-weight: 900;
  }

  .design-canvas-copy span {
    font-size: 21px;
    line-height: 1.08;
  }

  .soon-logo-stub {
    position: absolute;
    z-index: 9;
    left: 30px;
    bottom: 24px;
    color: #ffffff;
    font-size: 21px;
    line-height: 0.8;
    font-weight: 900;
    transform: rotate(-4deg);
    text-shadow: 0 3px 10px rgba(0, 0, 0, 0.28);
  }

  .design-result-bar,
  .zoom-control,
  .ask-soon-button {
    position: absolute;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 12px 34px rgba(32, 33, 38, 0.1);
  }

  .design-result-bar {
    left: 50%;
    bottom: 22px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
  }

  .design-result-bar span {
    font-size: 14px;
  }

  .design-result-bar button {
    padding: 8px 10px;
  }

  .zoom-control {
    right: 18px;
    bottom: 24px;
    padding: 12px 16px;
    color: #2f3239;
    font-size: 13px;
  }

  .ask-soon-button {
    left: 16px;
    bottom: 24px;
    background: #111111;
    color: #ffffff;
    padding: 12px 16px;
    font-size: 15px;
    font-weight: 700;
  }

  .brand-panel {
    border-left: 1px solid #e0e2e6;
    background: #ffffff;
    padding: 22px;
    display: grid;
    align-content: start;
    gap: 24px;
    max-height: calc(100vh - 124px);
    overflow-y: auto;
  }

  .brand-panel-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-panel-head button {
    width: 34px;
    height: 34px;
  }

  .brand-panel h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 650;
  }

  .brand-panel section {
    display: grid;
    gap: 10px;
  }

  .brand-panel h3,
  .brand-panel p {
    margin: 0;
  }

  .brand-panel h3 {
    font-size: 15px;
    font-weight: 650;
  }

  .brand-panel p {
    color: #777b84;
    font-size: 13px;
  }

  .logo-card {
    height: 96px;
    border: 1px solid #e3e5e8;
    border-radius: 10px;
    background: #f4f4f5;
    color: #80645e;
    display: grid;
    place-items: center;
    text-align: center;
    font-size: 26px;
    line-height: 0.82;
    font-weight: 900;
    transform: rotate(-2deg);
  }

  .color-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .color-row span {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid #dfe1e5;
  }

  .color-row button {
    margin-left: auto;
    border: 0;
    padding: 8px 0;
  }

  .brand-panel section > button {
    min-height: 46px;
    text-align: left;
    padding: 0 12px;
  }

  .media-panel {
    border-left: 1px solid #e0e2e6;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-height: calc(100vh - 124px);
    overflow-y: auto;
    padding: 24px 30px 32px;
  }

  .media-upload-zone {
    align-items: center;
    border: 2px dashed #d3d6dc;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 138px;
    justify-content: center;
    padding: 22px 16px;
    text-align: center;
    transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
  }

  .media-upload-zone:hover,
  .media-upload-zone.dragging {
    background: #f7f8fa;
    border-color: #858a95;
  }

  .media-upload-icon {
    color: #8d929d;
    font-size: 28px;
    line-height: 1;
  }

  .media-upload-label {
    color: #202126;
    font-size: 14px;
    font-weight: 760;
  }

  .media-upload-hint {
    color: #8a8f99;
    font-size: 12px;
  }

  .media-panel-section {
    display: grid;
    gap: 12px;
  }

  .media-panel-section h3 {
    color: #202126;
    font-size: 15px;
    font-weight: 700;
    margin: 0;
  }

  .media-ai-card,
  .media-brand-kit-card {
    background: #fafbfc;
    border: 1px solid #e1e3e8;
    border-radius: 14px;
    display: grid;
    gap: 12px;
    padding: 14px;
  }

  .media-ai-input {
    background: #ffffff;
    border: 1px solid #dfe2e8;
    border-radius: 10px;
    color: #1f2329;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.45;
    min-height: 84px;
    padding: 10px 12px;
    resize: vertical;
    width: 100%;
  }

  .media-ai-input::placeholder {
    color: #999faa;
  }

  .image-ai-edit-section {
    background: #f7f8fa;
    border: 1px solid #e1e3e8;
    border-radius: 14px;
    display: grid;
    gap: 10px;
    padding: 14px;
  }

  .image-ai-edit-section > p {
    color: #6f7580;
    font-size: 12px;
    line-height: 1.45;
    margin: -2px 0 0;
  }

  .image-edit-size-row {
    padding-top: 2px;
  }

  .image-edit-message {
    color: #287a46 !important;
    font-size: 12px !important;
    font-weight: 700;
    margin: 0 !important;
  }

  .image-reference-dropzone {
    align-items: center;
    background: #f8f9fb;
    border: 1px dashed #cfd3da;
    border-radius: 10px;
    display: flex;
    gap: 10px;
    justify-content: space-between;
    padding: 10px 12px;
    transition: background 150ms ease, border-color 150ms ease;
  }

  .image-reference-dropzone.dragging {
    background: #f0ecff;
    border-color: #7c3aed;
  }

  .image-reference-dropzone > span {
    color: #676c76;
    font-size: 11px;
  }

  .image-reference-upload {
    color: #202126;
    cursor: pointer;
    font-size: 11px;
  }

  .image-reference-upload input {
    display: none;
  }

  .image-reference-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .image-reference-card {
    aspect-ratio: 1;
    border: 1px solid #dfe2e8;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
  }

  .image-reference-card img {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .image-reference-card > span {
    background: rgba(17, 17, 17, 0.82);
    border-radius: 4px;
    bottom: 4px;
    color: #ffffff;
    font-size: 10px;
    left: 4px;
    padding: 2px 5px;
    position: absolute;
  }

  .image-reference-card button {
    align-items: center;
    background: rgba(17, 17, 17, 0.82);
    border: 0;
    border-radius: 999px;
    color: #ffffff;
    display: flex;
    font-size: 13px;
    height: 20px;
    justify-content: center;
    padding: 0;
    position: absolute;
    right: 4px;
    top: 4px;
    width: 20px;
  }

  .media-control-row {
    display: grid;
    gap: 7px;
  }

  .media-control-label {
    color: #606672;
    font-size: 12px;
    font-weight: 700;
  }

  .media-segment-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .media-segment-button {
    background: #ffffff;
    border: 1px solid #dfe2e8;
    border-radius: 999px;
    color: #3a3f47;
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
    min-height: 32px;
    padding: 0 12px;
    transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
  }

  .media-segment-button.active {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
  }

  .media-generate-button {
    background: #111111;
    border: 0;
    border-radius: 10px;
    color: #ffffff;
    cursor: pointer;
    font-size: 13px;
    font-weight: 800;
    min-height: 40px;
    padding: 0 14px;
    transition: opacity 160ms ease, transform 160ms ease;
  }

  .media-generate-button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .media-generate-button:disabled {
    cursor: not-allowed;
    opacity: 0.36;
  }

  .media-brand-logo-button {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e1e3e8;
    border-radius: 12px;
    color: #8B4513;
    cursor: pointer;
    display: inline-flex;
    flex-direction: column;
    font-size: 16px;
    font-weight: 900;
    justify-content: center;
    min-height: 72px;
    padding: 10px 18px;
    width: 112px;
  }

  .brand-logo-image {
    display: block;
    height: 56px;
    max-width: 100%;
    object-fit: contain;
    width: 96px;
  }

  .brand-logo-empty {
    align-items: center;
    background: #f7f8fa;
    border: 1px dashed #d8dce4;
    border-radius: 12px;
    color: #8a909b;
    display: flex;
    font-size: 12px;
    font-weight: 700;
    justify-content: center;
    min-height: 72px;
    padding: 10px 14px;
    text-align: center;
    width: 132px;
  }

  .brand-logo-skeleton {
    animation: brand-skeleton-pulse 1.25s ease-in-out infinite;
    background: linear-gradient(90deg, #eef0f3 25%, #f8f9fa 50%, #eef0f3 75%);
    background-size: 200% 100%;
    border-radius: 12px;
    height: 72px;
    width: 132px;
  }

  @keyframes brand-skeleton-pulse {
    from { background-position: 200% 0; }
    to { background-position: -200% 0; }
  }

  .media-brand-kit-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .media-brand-kit-copy {
    color: #7a808b;
    font-size: 12px;
    line-height: 1.45;
    margin: 0;
  }

  .media-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .media-grid.compact {
    gap: 6px;
  }

  .media-thumb-btn {
    aspect-ratio: 1;
    background: #f4f5f7;
    border: 1px solid #e1e3e8;
    border-radius: 8px;
    cursor: pointer;
    overflow: hidden;
    padding: 0;
    transition: border-color 160ms ease, transform 160ms ease;
  }

  .media-thumb-btn:hover {
    border-color: #9297a1;
    transform: translateY(-1px);
  }

  .media-thumb {
    display: block;
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .resize-panel,
  .post-panel {
    border-left: 1px solid #e0e2e6;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-height: calc(100vh - 124px);
    overflow-y: auto;
    padding: 24px 30px 32px;
  }

  .panel-helper-copy {
    color: #737782;
    font-size: 13px;
    line-height: 1.5;
    margin: 0;
  }

  .panel-search-row {
    width: 100%;
  }

  .panel-search-input {
    background: #fafafa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 8px 12px;
    width: 100%;
  }

  .panel-section-title {
    color: #202126;
    font-size: 15px;
    font-weight: 700;
    margin: 0;
  }

  .post-panel-section {
    display: grid;
    gap: 10px;
  }

  .post-panel-section h3 {
    color: #202126;
    font-size: 15px;
    font-weight: 700;
    margin: 0;
  }

  .post-schedule-button,
  .post-platform-row,
  .post-panel-actions button,
  .post-primary-action {
    background: #ffffff;
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    color: #202126;
    cursor: pointer;
    font: inherit;
  }

  .post-schedule-button {
    min-height: 44px;
    padding: 0 12px;
    text-align: left;
  }

  .post-platform-list {
    display: grid;
    gap: 8px;
  }

  .post-platform-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
    min-height: 44px;
    padding: 0 12px;
  }

  .post-platform-row span {
    align-items: center;
    display: flex;
    gap: 10px;
  }

  .post-platform-row i {
    align-items: center;
    background: #f4f5f7;
    border-radius: 8px;
    display: inline-flex;
    font-size: 11px;
    font-style: normal;
    font-weight: 800;
    height: 26px;
    justify-content: center;
    width: 26px;
  }

  .post-platform-row em {
    color: #858a95;
    font-size: 12px;
    font-style: normal;
  }

  .post-panel-preview {
    border: 1px solid #e1e3e8;
    border-radius: 12px;
    display: grid;
    gap: 10px;
    margin: 0;
    overflow: hidden;
    padding: 12px;
  }

  .post-panel-preview img {
    aspect-ratio: 1;
    border-radius: 9px;
    object-fit: cover;
    width: 100%;
  }

  .post-panel-preview strong {
    color: #202126;
    font-size: 14px;
    line-height: 1.25;
  }

  .post-panel-preview p {
    color: #656a74;
    display: -webkit-box;
    font-size: 12px;
    line-height: 1.42;
    margin: 0;
    overflow: hidden;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
  }

  .post-panel-actions {
    display: grid;
    gap: 8px;
  }

  .post-panel-actions button {
    min-height: 42px;
  }

  .post-primary-action {
    background: #111111;
    color: #ffffff;
    min-height: 46px;
  }

  .resize-current {
    background: #f5f5f5;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 14px;
  }

  .resize-current-label {
    color: #888d97;
    font-size: 11px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .resize-current-value {
    color: #111111;
    font-size: 14px;
    font-weight: 650;
  }

  .resize-current-dims {
    color: #666b74;
    font-size: 12px;
  }

  .resize-custom {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .resize-custom-inputs {
    align-items: center;
    display: flex;
    gap: 6px;
  }

  .resize-custom-inputs input {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    color: #202126;
    font: inherit;
    font-size: 13px;
    min-width: 0;
    padding: 6px 8px;
    text-align: center;
    width: 72px;
  }

  .resize-custom-inputs span {
    color: #999da6;
    font-size: 13px;
  }

  .resize-apply-btn {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    color: #202126;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    padding: 6px 12px;
  }

  .resize-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .resize-size-row {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    color: #202126;
    cursor: pointer;
    display: flex;
    font: inherit;
    justify-content: space-between;
    padding: 10px 12px;
    text-align: left;
    transition: background 150ms ease;
  }

  .resize-size-row:hover,
  .resize-apply-btn:hover {
    background: #f8f8f8;
  }

  .resize-size-name {
    font-size: 13px;
  }

  .resize-size-dims {
    color: #888d97;
    font-size: 12px;
    white-space: nowrap;
  }

  .post-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .post-datetime-input {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    color: #202126;
    font: inherit;
    font-size: 13px;
    padding: 8px 10px;
    width: 100%;
  }

  .post-action-row {
    display: flex;
    gap: 8px;
  }

  .post-btn-secondary {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    color: #202126;
    cursor: pointer;
    flex: 1;
    font: inherit;
    font-size: 13px;
    padding: 9px;
    transition: background 150ms ease;
  }

  .post-btn-secondary:hover {
    background: #ebebeb;
  }

  .post-btn-primary {
    background: #000000;
    border: 0;
    border-radius: 8px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-size: 14px;
    font-weight: 650;
    padding: 11px;
    transition: opacity 150ms ease;
    width: 100%;
  }

  .post-btn-primary:hover {
    opacity: 0.85;
  }

  .post-platforms {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .post-platform-icon {
    font-size: 13px;
    font-weight: 800;
  }

  .post-platform-name {
    color: #333842;
    flex: 1;
    font-size: 13px;
  }

  .post-connect-btn {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    color: #202126;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    padding: 4px 12px;
    transition: background 150ms ease;
  }

  .post-connect-btn:hover {
    background: #f0f0f0;
  }

  .settings-image-preview {
    background: #f4f5f7;
    border-radius: 10px;
    display: block;
    max-height: 128px;
    object-fit: cover;
    width: 100%;
  }

  .brand-logo-row,
  .brand-colors-row,
  .brand-fonts-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .brand-fonts-list {
    flex-direction: column;
  }

  .brand-logo-placeholder {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e3e5e8;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    font: inherit;
    justify-content: center;
    min-height: 88px;
    min-width: 132px;
    padding: 12px 18px;
    transition: border-color 160ms ease, transform 160ms ease;
  }

  .brand-logo-placeholder:hover {
    border-color: #9297a1;
    transform: translateY(-1px);
  }

  .brand-color-swatch {
    border: 2px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px #c8ccd3;
    cursor: pointer;
    height: 34px;
    padding: 0;
    width: 34px;
  }

  .brand-color-swatch:hover {
    box-shadow: 0 0 0 2px #202126;
  }

  .brand-color-swatch.active {
    box-shadow: 0 0 0 2px #111111;
  }

  .color-palette-groups,
  .color-palette-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .color-palette-groups { gap: 16px; }

  .color-palette-group h4 {
    color: #555b66;
    font-size: 12px;
    margin: 0;
  }

  .color-palette-heading {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .eyedropper-button {
    align-items: center;
    background: #ffffff;
    border: 1px solid #d8dce4;
    border-radius: 8px;
    color: #343840;
    cursor: pointer;
    display: inline-flex;
    font-size: 12px;
    font-weight: 750;
    gap: 5px;
    min-height: 32px;
    padding: 0 10px;
  }

  .eyedropper-button:hover {
    background: #f5f6f8;
    border-color: #aeb3bd;
  }

  .eyedropper-button svg {
    fill: currentColor;
    height: 16px;
    width: 16px;
  }

  .color-palette-swatches,
  .brand-colors-loading {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }

  .brand-colors-loading span {
    animation: brand-skeleton-pulse 1.25s ease-in-out infinite;
    background: linear-gradient(90deg, #e7e9ed 25%, #f6f7f8 50%, #e7e9ed 75%);
    background-size: 200% 100%;
    border-radius: 999px;
    height: 34px;
    width: 34px;
  }

  .brand-colors-empty {
    background: #f7f8fa;
    border: 1px dashed #d8dce4;
    border-radius: 10px;
    color: #7b818c;
    font-size: 12px;
    margin: 0;
    padding: 10px 12px;
  }

  .brand-font-btn {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    color: #202126;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    min-height: 48px;
    padding: 10px 14px;
    transition: background 160ms ease, border-color 160ms ease;
  }

  .brand-font-btn:hover {
    background: #f7f8fa;
    border-color: #9297a1;
  }

  .brand-font-label,
  .panel-coming-soon {
    color: #8a8f99;
    font-size: 12px;
  }

  .placeholder-panel {
    align-items: center;
    background: #ffffff;
    border-left: 1px solid #e0e2e6;
    display: flex;
    justify-content: center;
    padding: 32px;
  }

  .elements-panel {
    border-left: 1px solid #e0e2e6;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 24px 30px 32px;
    max-height: calc(100vh - 124px);
    overflow-y: auto;
  }

  .text-panel {
    border-left: 1px solid #e0e2e6;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-height: calc(100vh - 124px);
    overflow-y: auto;
    padding: 24px 30px 32px;
  }

  .text-panel-section {
    display: grid;
    gap: 14px;
  }

  .text-panel-section h3 {
    color: #202126;
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  .text-preset-list {
    display: grid;
    gap: 8px;
  }

  .text-preset-btn {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    color: #202126;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    min-height: 58px;
    padding: 10px 14px;
    transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
  }

  .text-preset-btn:hover {
    background: #f6f7f8;
    border-color: #b9bdc6;
    transform: translateY(-1px);
  }

  .text-preset-preview {
    flex: 1;
    text-align: left;
  }

  .text-preset-preview.heading {
    font-size: 24px;
    font-weight: 850;
  }

  .text-preset-preview.subheading {
    font-size: 18px;
    font-weight: 760;
  }

  .text-preset-preview.body {
    font-size: 15px;
  }

  .text-preset-preview.caption,
  .text-preset-label {
    color: #828690;
    font-size: 12px;
  }

  .text-style-card span {
    justify-self: center;
  }

  .element-settings-panel {
    border-left: 1px solid #e0e2e6;
    background: #ffffff;
    padding: 22px;
    display: grid;
    align-content: start;
    gap: 24px;
    max-height: calc(100vh - 124px);
    overflow-y: auto;
  }

  .element-settings-panel input,
  .element-settings-panel textarea,
  .element-settings-panel button {
    color-scheme: light;
  }

  .property-list {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
  }

  .property-list label {
    min-height: 48px;
    border-bottom: 1px solid #eef0f3;
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    color: #202126;
    font-size: 14px;
    font-weight: 650;
  }

  .property-list label:last-child {
    border-bottom: 0;
  }

  .property-list span {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .property-list i {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: inline-block;
  }

  .property-list input[type="color"] {
    width: 32px;
    height: 32px;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }

  .property-list input[type="range"] {
    width: 104px;
  }

  .property-list button {
    border: 0;
    border-radius: 999px;
    background: #e5e7eb;
    color: #5f636d;
    padding: 5px 10px;
    font: inherit;
    font-size: 12px;
  }

  .property-list em {
    color: #6f737d;
    font-style: normal;
    font-weight: 500;
  }

  .alignment-panel,
  .transform-panel,
  .order-panel {
    display: grid;
    gap: 12px;
  }

  .alignment-panel h3,
  .transform-panel h3,
  .order-panel h3 {
    margin: 0;
    color: #202126;
    font-size: 15px;
    font-weight: 700;
  }

  .alignment-panel div {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }

  .alignment-panel button {
    height: 34px;
    border: 0;
    border-radius: 8px;
    background: #f4f5f7;
    color: #202126;
    font-size: 17px;
    cursor: pointer;
  }

  .transform-panel div {
    display: grid;
    grid-template-columns: 1fr 58px;
    align-items: center;
    gap: 10px;
  }

  .transform-panel input[type="number"] {
    width: 58px;
    height: 34px;
    border: 1px solid #e1e3e8;
    border-radius: 8px;
    text-align: center;
    font: inherit;
  }

  .order-panel div {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .order-panel p {
    margin: -2px 0 0;
    color: #747884;
    font-size: 12px;
    font-weight: 650;
  }

  .order-panel button,
  .delete-element-button,
  .finish-selection-button {
    min-height: 38px;
    border: 1px solid #e1e3e8;
    border-radius: 9px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    cursor: pointer;
  }

  .delete-element-button {
    color: #b42318;
  }

  .finish-selection-button {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
    font-weight: 760;
  }

  .finish-selection-button:hover {
    background: #2b2b2f;
    border-color: #2b2b2f;
  }

  .settings-section {
    border-bottom: 1px solid #eef0f3;
    display: grid;
    gap: 8px;
    padding: 0 0 16px;
  }

  .settings-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
    gap: 14px;
  }

  .settings-label {
    color: #60646f;
    font-size: 13px;
    font-weight: 650;
  }

  .settings-textarea {
    background: #ffffff !important;
    border: 1px solid #e1e3e8;
    border-radius: 10px;
    color: #202126 !important;
    caret-color: #202126;
    color-scheme: light;
    font: inherit;
    font-size: 14px;
    min-height: 96px;
    outline: 0;
    padding: 10px 12px;
    resize: vertical;
    width: 100%;
  }

  .settings-textarea:focus {
    border-color: #202126;
    box-shadow: 0 0 0 3px rgba(32, 33, 38, 0.08);
  }

  .settings-stepper,
  .settings-toggle-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .settings-stepper button,
  .settings-toggle-group button {
    border: 1px solid #e1e3e8;
    border-radius: 8px;
    background: #f6f7f8;
    color: #202126;
    cursor: pointer;
    font: inherit;
    min-height: 32px;
    padding: 6px 10px;
  }

  .settings-toggle-group button.active {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
  }

  .settings-stepper input {
    background: #ffffff;
    border: 1px solid #e1e3e8;
    border-radius: 8px;
    color: #202126;
    color-scheme: light;
    font: inherit;
    height: 32px;
    text-align: center;
    width: 58px;
  }

  .settings-section input[type="color"] {
    border: 0;
    background: transparent;
    cursor: pointer;
    height: 34px;
    padding: 0;
    width: 42px;
  }

  .text-font-select {
    background: #ffffff;
    border: 1px solid #dfe2e7;
    border-radius: 10px;
    color: #202126;
    font-size: 15px;
    height: 44px;
    padding: 0 12px;
    width: 100%;
  }

  .shape-color-section {
    gap: 12px;
  }

  .shape-color-controls {
    align-items: center;
    display: flex;
    gap: 12px;
  }

  .shape-color-controls input[type="color"] {
    background: #ffffff;
    border: 1px solid #dfe2e7;
    border-radius: 10px;
    height: 46px;
    padding: 4px;
    width: 58px;
  }

  .shape-hex-input {
    background: #ffffff;
    border: 1px solid #dfe2e7;
    border-radius: 10px;
    color: #202126;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px;
    font-weight: 650;
    height: 42px;
    padding: 0 11px;
    text-transform: uppercase;
    width: 132px;
  }

  .shape-hex-input[aria-invalid="true"] {
    border-color: #dc3545;
    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.12);
  }

  .shape-color-swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }

  .shape-color-swatches button {
    border: 2px solid #ffffff;
    border-radius: 999px;
    box-shadow: 0 0 0 1px #d8dbe1;
    cursor: pointer;
    height: 30px;
    padding: 0;
    width: 30px;
  }

  .shape-color-swatches button.active {
    box-shadow: 0 0 0 2px #111111;
  }

  .shape-legacy-color-control {
    display: none !important;
  }

  .elements-panel input {
    width: 100%;
    height: 54px;
    border: 1px solid #e1e3e8;
    border-radius: 12px;
    background: #ffffff;
    color: #202126;
    font: inherit;
    font-size: 19px;
    padding: 0 16px;
    outline: 0;
    margin: 22px 0 34px;
  }

  .elements-panel input:focus {
    border-color: #202126;
    box-shadow: 0 0 0 3px rgba(32, 33, 38, 0.08);
  }

  .element-shelf {
    display: block;
    margin: 0 0 38px;
  }

  .element-shelf-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 0 18px;
  }

  .element-shelf h3 {
    margin: 0;
    font-size: 20px;
    line-height: 1.2;
    font-weight: 650;
  }

  .element-shelf-head button {
    border: 0;
    background: transparent;
    color: #2f3239;
    font: inherit;
    font-size: 18px;
    line-height: 1.2;
    cursor: pointer;
    padding: 4px 0;
  }

  .element-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-rows: auto;
    gap: 22px 24px;
  }

  .element-grid.icon {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    grid-auto-rows: 40px;
    gap: 16px 14px;
  }

  .element-shelf.expanded .element-grid.icon {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .element-tile {
    position: relative;
    aspect-ratio: 1;
    width: 100%;
    border: 0;
    border-radius: 12px;
    background: transparent;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: background 150ms ease, transform 150ms ease;
  }

  .element-tile:hover {
    background: #f2f3f6;
    transform: translateY(-1px);
  }

  .element-tile > span {
    display: block;
  }

  .element-grid.shape .element-tile > span,
  .element-grid.frame .element-tile > span {
    aspect-ratio: 1 / 1;
    width: 78%;
    height: auto;
    background: #111111;
    box-shadow: 0 10px 22px rgba(32, 33, 38, 0.08);
  }

  .element-grid.frame .element-tile > span {
    background-image: url('/assets/content-strategies/photos/lifestyle-content.jpg');
    background-size: cover;
    background-position: center;
    opacity: 0.82;
  }

  .element-grid.icon .element-tile {
    aspect-ratio: auto;
    height: 40px;
    font-size: 27px;
    color: #111111;
  }

  .shape-circle > span,
  .frame-frameCircle > span {
    border-radius: 50%;
  }

  .shape-square > span,
  .frame-frameSquare > span {
    border-radius: 0;
  }

  .shape-rounded > span,
  .frame-frameRound > span {
    border-radius: 18px;
  }

  .shape-triangle > span,
  .frame-frameTriangle > span {
    clip-path: polygon(50% 4%, 96% 92%, 4% 92%);
  }

  .shape-diamond > span,
  .frame-frameDiamond > span {
    clip-path: polygon(50% 4%, 96% 50%, 50% 96%, 4% 50%);
  }

  .shape-pentagon > span,
  .frame-framePentagon > span {
    clip-path: polygon(50% 3%, 96% 36%, 78% 96%, 22% 96%, 4% 36%);
  }

  .shape-hexagon > span,
  .frame-frameHexagon > span {
    clip-path: polygon(25% 5%, 75% 5%, 98% 50%, 75% 95%, 25% 95%, 2% 50%);
  }

  .shape-octagon > span,
  .frame-frameOctagon > span {
    clip-path: polygon(30% 4%, 70% 4%, 96% 30%, 96% 70%, 70% 96%, 30% 96%, 4% 70%, 4% 30%);
  }

  .shape-parallelogram > span,
  .frame-frameSlant > span {
    clip-path: polygon(22% 5%, 96% 5%, 78% 95%, 4% 95%);
  }

  .shape-trapezoid > span {
    clip-path: polygon(22% 5%, 78% 5%, 96% 95%, 4% 95%);
  }

  .shape-semicircle > span,
  .frame-frameArch > span {
    clip-path: inset(0 0 0 0 round 999px 999px 0 0);
  }

  .shape-pill > span,
  .frame-framePill > span {
    aspect-ratio: auto;
    border-radius: 999px;
    height: 48%;
  }

  .shape-spark > span {
    clip-path: polygon(50% 0, 61% 35%, 98% 36%, 68% 58%, 79% 96%, 50% 73%, 21% 96%, 32% 58%, 2% 36%, 39% 35%);
  }

  .shape-star > span,
  .frame-frameStar > span {
    clip-path: polygon(50% 2%, 61% 34%, 95% 34%, 68% 54%, 79% 88%, 50% 68%, 21% 88%, 32% 54%, 5% 34%, 39% 34%);
  }

  .shape-starAlt > span {
    clip-path: polygon(50% 0, 58% 34%, 90% 16%, 72% 48%, 100% 58%, 66% 64%, 84% 96%, 52% 78%, 36% 100%, 36% 66%, 2% 74%, 28% 50%, 4% 24%, 40% 36%);
  }

  .shape-burst > span,
  .frame-frameBurst > span {
    clip-path: polygon(50% 0, 57% 19%, 74% 8%, 75% 29%, 96% 25%, 84% 43%, 100% 55%, 79% 62%, 88% 82%, 66% 78%, 58% 100%, 45% 82%, 27% 96%, 27% 74%, 4% 78%, 17% 58%, 0 45%, 22% 39%, 12% 18%, 34% 24%);
  }

  .shape-plus > span,
  .frame-frameCross > span {
    clip-path: polygon(38% 0, 62% 0, 62% 38%, 100% 38%, 100% 62%, 62% 62%, 62% 100%, 38% 100%, 38% 62%, 0 62%, 0 38%, 38% 38%);
  }

  .shape-arrowLeft > span,
  .frame-frameArrowLeft > span {
    clip-path: polygon(0 50%, 40% 8%, 40% 32%, 100% 32%, 100% 68%, 40% 68%, 40% 92%);
  }

  .shape-arrowRight > span,
  .frame-frameArrowRight > span {
    clip-path: polygon(100% 50%, 60% 8%, 60% 32%, 0 32%, 0 68%, 60% 68%, 60% 92%);
  }

  .shape-arrowUp > span,
  .frame-frameArrowUp > span {
    clip-path: polygon(50% 0, 92% 40%, 68% 40%, 68% 100%, 32% 100%, 32% 40%, 8% 40%);
  }

  .shape-arrowDown > span,
  .frame-frameArrowDown > span {
    clip-path: polygon(50% 100%, 92% 60%, 68% 60%, 68% 0, 32% 0, 32% 60%, 8% 60%);
  }

  .shape-moon > span {
    border-radius: 50%;
    box-shadow: inset 22px 0 0 #ffffff;
  }

  .shape-cloud > span {
    border-radius: 42% 42% 30% 30%;
    clip-path: polygon(8% 55%, 17% 39%, 35% 39%, 45% 20%, 65% 24%, 72% 42%, 88% 43%, 96% 58%, 88% 78%, 10% 78%);
  }

  .shape-bookmark > span {
    clip-path: polygon(16% 0, 84% 0, 84% 100%, 50% 78%, 16% 100%);
  }

  @media (max-width: 700px) {
    .dashboard-page {
      grid-template-columns: 1fr;
    }

    .calendar-topbar,
    .calendar-actions {
      flex-wrap: wrap;
    }

    .editor-shell {
      grid-template-columns: 1fr;
    }

    .view-switcher {
      position: static;
      transform: none;
      display: flex;
      margin-bottom: 16px;
    }

    .post-settings-panel {
      border-left: 0;
    }
  }
`;
