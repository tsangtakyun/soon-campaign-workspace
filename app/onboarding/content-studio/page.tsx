"use client";

import { approvedVideoDuration } from '@/lib/approved-video-duration';
import { confirmedPhotoCount } from '@/lib/confirmed-project-materials';
import { CoreMasterPreview } from '@/components/content/CoreMasterPreview';
import { CompositionModeChoice } from '@/components/content/CompositionModeChoice';
import { setCompositionMode, type CompositionMode, type CompositionVariant } from '@/lib/composition-mode';
import { hasComparisonColumns } from '@/lib/content-page-semantics';
import { PageCompositionAdvisor } from '@/components/content/PageCompositionAdvisor';
import type { SubjectFocus } from '@/lib/subject-crop';
import type { OptimizationIssue } from '@/lib/optimize-carousel-assets';
import { BackgroundPreparationNotice, type BackgroundPreparation } from '@/components/content/BackgroundPreparationNotice';
import { resolveContentBranding } from '@/lib/content-branding';
import { type ChangeEvent, type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import {
  DashboardSidebar,
  dashboardSidebarStyles,
} from "@/components/dashboard/DashboardSidebar";
import { ClaimOnboardingSession } from "@/components/onboarding/ClaimOnboardingSession";
import { SoonLoading } from "@/components/ui/SoonLoading";
import { SoonIcon, type SoonIconName } from "@/components/ui/SoonIcon";
import { contentStyleTemplates as styleTemplates, type ContentStyleTemplate } from "@/lib/content-style-library";
import { clearMagazineCarouselV1, isClearMagazineCarousel } from "@/lib/content-templates/clear-magazine-carousel-v1";
import { applyCoreTemplateStructure, coreTemplatePageRoles, isFixedCoreTemplate } from "@/lib/core-template-contract";
import {
  resolveActiveWorkspace,
  WORKSPACE_CHANGED_EVENT,
  type WorkspaceSummary,
} from "@/lib/workspace-client";
import { createClient } from "@/lib/supabase";

type ProjectAsset = {
  compositionMode?: CompositionMode;
  compositionVariants?: Record<string,CompositionVariant>;
  compositionFit?: 'contain';
  extensionOriginal?: import('@/lib/extension-asset').ExtensionOriginal;
  extensionId?: string;
  autoExtensionDeclinedUrl?: string;
  subjectFocus?: SubjectFocus | null;
  id: string;
  url: string;
  filename: string;
  width: number;
  height: number;
  assignedPage: string;
  isCover: boolean;
  sourceType?: "upload" | "brand_library" | "ai_generated" | "licensed_search";
  sourceLabel?: string;
  sourceUrl?: string | null;
  creator?: string;
  creatorUrl?: string | null;
  license?: string;
  licenseUrl?: string | null;
};

type LicensedImageResult = {
  id: string;
  title: string;
  creator: string;
  creatorUrl: string | null;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string | null;
  url: string;
  thumbnail: string;
  width: number;
  height: number;
  provider: string;
};

type Project = {
  id: string;
  title: string;
  source_url?: string | null;
  source_name?: string | null;
  source_note?: string | null;
  stage:
    "brief" | "format" | "production" | "approval" | "scheduled" | "archived";
  selected_format?: string | null;
  brief?: Record<string, string>;
  format_decision?: Record<string, unknown>;
  production?: Record<string, unknown>;
  creator?: {
    avatarUrl: string | null;
    displayName: string;
  } | null;
  updated_at: string;
};

function downloadProjectUrl(workspaceId: string, projectId: string, page?: string) {
  const params = new URLSearchParams({ workspaceId, projectId });
  if (page) params.set("page", page);
  return `/api/content-projects/download?${params.toString()}`;
}

type Permissions = {
  canApprove: boolean;
  canEdit: boolean;
  canManagePrompt: boolean;
  canManageWorkspace: boolean;
  role: string;
};

type PreferenceEvent = {
  eventType: "selected" | "changed" | "rejected" | "edited" | "approved" | "published" | "performed";
  dimension: "format" | "template" | "production_method" | "copy" | "design";
  value: string;
  previousValue?: string | null;
  metadata?: Record<string, unknown>;
};

type CorePublishedStyle = {
  styleId: string;
  code: string;
  format: string;
  name: string;
  description: string;
  creatorSource?: "soon_core" | "soon_creator";
  version: {
    id: string;
    number: number;
    ref: string;
    contentHash: string;
    rules: Record<string, unknown>;
  };
  evidence?: { confirmedReferenceCount?: number };
  recommendation?: { score?: number; reason?: string; angle?: string; gaps?: string[]; source?: 'layout_eligibility' };
  templates?: Array<{
    templateId: string;
    code: string;
    version: {
      number: number;
      rendererCode: string;
      contentHash: string;
      creatorCommit?: string | null;
      contract: Record<string, unknown>;
    };
  }>;
};

type DisplayStyle = ContentStyleTemplate & {
  source: "soon_core" | "soon_creator";
  core?: CorePublishedStyle;
};

type DirectionRecommendation = {
  id: string;
  title: string;
  concept: string;
  reason: string;
  hook: string;
  category: string;
  version?: string;
};

type StudioStep = "brief" | "format" | "structure" | "assets" | "style" | "drafts" | "carousel";

type StylePreviewProps = {
  angle: string;
  summary: string;
  storyPages?: Array<Record<string, unknown>>;
  brandName?: string;
  imageUrls?: string[];
  imageLoading?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
};

function sharedPreviewCopy(angle: string, summary: string, storyPages: Array<Record<string, unknown>> = []) {
  const topic = angle && angle !== "交由 AI 決定" ? angle : "今次內容主題";
  const cleanSummary = summary
    .replace(/https?:\/\/\S+/giu, " ")
    .replace(/(?:%[0-9a-f]{2}){2,}/giu, " ")
    .replace(/\[\d+\]\s*\(?/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  const sentences = cleanSummary.split(/[。！？!?\n]+/u).map((part) => part.trim()).filter(Boolean);
  const fallback = [
    { headline: topic, body: sentences.slice(0, 2).join("。") || "內容將根據你提供的 Brief 及來源資料整理" },
    { headline: sentences[0]?.slice(0, 32) || "內容重點", body: sentences.slice(0, 2).join("。") || "內容將根據你提供的 Brief 及來源資料整理" },
    { headline: "重點總結", body: sentences.slice(0, 2).join("。") || "內容將根據你提供的 Brief 及來源資料整理" },
  ];
  if (!storyPages.length) return fallback;
  const indexes = [...new Set([0, Math.floor((storyPages.length - 1) / 2), storyPages.length - 1])];
  return indexes.map((index) => {
    const page = storyPages[index] || {};
    return {
      headline: String(page.headline || fallback[Math.min(index, 2)].headline).slice(0, 36),
      body: String(page.copyDirection || page.purpose || fallback[Math.min(index, 2)].body).slice(0, 180),
    };
  });
}

function PreviewVisual({ imageUrl, loading }: { imageUrl?: string; loading?: boolean }) {
  return <div className={`shared-preview-visual ${imageUrl ? "has-image" : ""}`} style={imageUrl ? { backgroundImage: `url(${JSON.stringify(imageUrl).slice(1, -1)})` } : undefined} aria-label={imageUrl ? "今次內容的共同預覽圖片" : "請先於 STEP 4 準備圖片素材"}>
    {!imageUrl ? <><i/><i/><i/><span>請先於 STEP 4 準備圖片素材</span></> : null}
    {imageUrl && !loading ? <b className="preview-image-status">AI 題材圖</b> : null}
    {loading ? <span className="preview-image-generating"><i/>AI 正在生成題材圖</span> : null}
  </div>;
}

function PreviewControls({ pageIndex, count, label, move, onExpand }: { pageIndex: number; count: number; label: string; move: (direction: -1 | 1) => void; onExpand?: () => void }) {
  return <>
    <button type="button" className="style-preview-arrow previous" aria-label={`查看${label}上一頁`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); move(-1); }}>←</button>
    <button type="button" className="style-preview-arrow next" aria-label={`查看${label}下一頁`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); move(1); }}>→</button>
    <span className="style-preview-count">示意 {String(pageIndex + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span>
    <span className="style-preview-dots" aria-hidden="true">{Array.from({ length: count }, (_, index) => <i key={index} className={index === pageIndex ? "active" : ""}/>)}</span>
    {onExpand ? <button type="button" className="style-preview-expand" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onExpand(); }}>⤢ 放大</button> : null}
  </>;
}

function ClearMagazinePreview({ angle, summary, storyPages, brandName, imageUrls, imageLoading, expanded, onExpand }: StylePreviewProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const copy = sharedPreviewCopy(angle, summary, storyPages);
  const pages = copy.map((page, index) => ({ ...page, eyebrow: index === 0 ? "今次主題" : index === copy.length - 1 ? "內容總結" : "重點整理", role: index === 0 ? "cover" : index === copy.length - 1 ? "end" : "content" }));
  const current = pages[pageIndex];
  const move = (direction: -1 | 1) => setPageIndex((value) => (value + direction + pages.length) % pages.length);
  return <div className={`clear-magazine-preview ${current.role} ${expanded ? "expanded" : ""}`}>
    <PreviewVisual imageUrl={imageUrls?.[pageIndex % Math.max(imageUrls.length, 1)]} loading={imageLoading}/>
    <div className="clear-preview-copy"><small>{current.eyebrow}</small><strong>{current.headline}</strong><p>{current.body}</p></div>
    <div className="unified-preview-brand"><span>{brandName || "BRAND"}</span><b>P.{String(pageIndex + 1).padStart(2, "0")}</b></div>
    <PreviewControls pageIndex={pageIndex} count={pages.length} label="清晰雜誌風" move={move} onExpand={onExpand}/>
  </div>;
}

function ProductFocusPreview({ angle, summary, storyPages, brandName, imageUrls, imageLoading, expanded, onExpand }: StylePreviewProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const copy = sharedPreviewCopy(angle, summary, storyPages);
  const pages = copy.map((page, index) => ({ ...page, eyebrow: index === 0 ? "產品重點" : index === copy.length - 1 ? "內容總結" : "資料重點", page: String(index + 1).padStart(2, "0") }));
  const current = pages[pageIndex];
  const move = (direction: -1 | 1) => setPageIndex((value) => (value + direction + pages.length) % pages.length);
  return <div className={`product-focus-preview ${expanded ? "expanded" : ""}`}>
    <div className="product-preview-copy"><small>{current.eyebrow}</small><strong>{current.headline}</strong><i/><p>{current.body}</p></div>
    <div className="product-preview-image"><PreviewVisual imageUrl={imageUrls?.[pageIndex % Math.max(imageUrls.length, 1)]} loading={imageLoading}/></div>
    <div className="product-preview-footer"><span>{brandName || "BRAND"}</span><b>P.{current.page}</b></div>
    <PreviewControls pageIndex={pageIndex} count={pages.length} label="產品主角" move={move} onExpand={onExpand}/>
  </div>;
}

function RankingReviewPreview({ angle, summary, storyPages, brandName, imageUrls, imageLoading, expanded, onExpand }: StylePreviewProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const copy = sharedPreviewCopy(angle, summary, storyPages);
  const pages = copy.map((page, index) => ({ ...page, cover: index === 0, headline: index === 0 ? page.headline : `${index}. ${page.headline}`, page: String(index + 1).padStart(2, "0") }));
  const current = pages[pageIndex];
  const move = (direction: -1 | 1) => setPageIndex((value) => (value + direction + pages.length) % pages.length);
  return <div className={`ranking-review-preview ${current.cover ? "cover" : "entry"} ${expanded ? "expanded" : ""}`}>
    <div className="ranking-preview-photo"><PreviewVisual imageUrl={imageUrls?.[pageIndex % Math.max(imageUrls.length, 1)]} loading={imageLoading}/></div>
    <div className="ranking-preview-copy">
      <strong>{current.headline}</strong>
      <p>{current.body}</p>
    </div>
    <div className="unified-preview-brand"><span>{brandName || "BRAND"}</span><b>P.{current.page}</b></div>
    <PreviewControls pageIndex={pageIndex} count={pages.length} label="排行榜評測" move={move} onExpand={onExpand}/>
  </div>;
}

const studioSteps: { id: StudioStep; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "format", label: "格式" },
  { id: "structure", label: "故事結構" },
  { id: "assets", label: "圖片素材" },
  { id: "style", label: "內容風格" },
  { id: "drafts", label: "逐頁草稿" },
  { id: "carousel", label: "Carousel" },
];

const formats = [
  { id: "carousel", outputFormat: "carousel", videoMethod: null, label: "輪播貼文", note: "多張圖片，逐步說清一個故事", icon: "carousel" as SoonIconName },
  { id: "single_image", outputFormat: "single_image", videoMethod: null, label: "單張貼文", note: "一張主視覺，集中傳達一個重點", icon: "image" as SoonIconName },
  {
    id: "human_video",
    outputFormat: "short_video",
    videoMethod: "human_filming",
    label: "真人短片",
    note: "提供腳本、分鏡及拍攝清單",
    icon: "creator" as SoonIconName,
  },
  {
    id: "ai_video",
    outputFormat: "short_video",
    videoMethod: "ai_video_generation",
    label: "AI 短片",
    note: "建立畫面、旁白及影片生成指示",
    icon: "spark" as SoonIconName,
  },
];

const stageLabels: Record<Project["stage"], string> = {
  brief: "建立 Brief",
  format: "判斷格式",
  production: "製作",
  approval: "等待審批",
  scheduled: "已排程",
  archived: "已封存",
};

const stylePreviewCopy: Record<string, { eyebrow: string; headline: string; detail: string }> = {
  "editorial-clear": { eyebrow: "品牌指南 · 01", headline: "粉絲多，不代表適合", detail: "選擇創作者的 3 個重點" },
  "product-focus": { eyebrow: "產品重點", headline: "一眼看懂核心賣點", detail: "功能 · 情境 · 行動" },
  "problem-solution": { eyebrow: "常見問題", headline: "為何內容未能帶來成效？", detail: "問題 → 原因 → 解法" },
  "creator-natural": { eyebrow: "真實分享", headline: "我會這樣選創作者", detail: "第一身經驗與日常畫面" },
  "bold-social": { eyebrow: "先看結論", headline: "你可能一直選錯人", detail: "5 張圖說清楚" },
  "editorial_contrast_carousel": { eyebrow: "對照觀點", headline: "表面相似，結果卻不同", detail: "背景 → 反差 → 證據 → 結論" },
};

type ContextualPreviewSlide = {
  role: "cover" | "content" | "end";
  label: string;
  eyebrow?: string;
  title: string;
  detail?: string;
  layout?: string;
  imageTreatment?: string;
  imagePosition?: "center" | "top" | "bottom" | "left" | "right";
  secondaryImagePosition?: "center" | "top" | "bottom" | "left" | "right";
};

function corePreviewSlides(template: DisplayStyle, angle: string): ContextualPreviewSlide[] {
  const preview = template.core?.version.rules?.preview;
  if (!preview || typeof preview !== "object" || Array.isArray(preview)) return [];
  const slides = (preview as { slides?: unknown }).slides;
  if (!Array.isArray(slides)) return [];
  return slides.slice(0, 3).flatMap((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const slide = value as Record<string, unknown>;
    const rawRole = slide.role;
    const role: ContextualPreviewSlide["role"] = rawRole === "cover" || rawRole === "end" ? rawRole : "content";
    const fallbackLabel = role === "cover" ? "封面" : role === "end" ? "結尾" : `內容 ${index}`;
    const sourceHeadline = typeof slide.headline === "string" ? slide.headline : "清楚交代一個重點";
    return [{
      role,
      label: fallbackLabel,
      eyebrow: typeof slide.eyebrow === "string" ? slide.eyebrow : undefined,
      title: role === "cover" && angle && angle !== "交由 AI 決定" ? angle : sourceHeadline,
      detail: typeof slide.supporting_text === "string" ? slide.supporting_text : undefined,
      layout: typeof slide.layout === "string" ? slide.layout : undefined,
      imageTreatment: typeof slide.image_treatment === "string" ? slide.image_treatment : undefined,
    }];
  });
}

function contextualPreviewSlides(template: DisplayStyle, angle: string): ContextualPreviewSlide[] {
  const coreSlides = corePreviewSlides(template, angle);
  const isSingleImage = template.formats.includes("single_image");
  if (isSingleImage && coreSlides.length) return coreSlides.slice(0, 1);
  if (coreSlides.length === 3) return coreSlides;
  const headline = angle && angle !== "交由 AI 決定" ? angle : "由一個重點開始說清故事";
  if (isSingleImage) return [
    { role: "cover", label: "單張", eyebrow: template.code.includes("product") ? "產品重點" : "今次主題", title: headline },
  ];
  if (template.code.includes("product")) return [
    { role: "cover", label: "封面", eyebrow: "產品重點", title: headline },
    { role: "content", label: "內容", eyebrow: "細節 01", title: "先看產品本身" },
    { role: "end", label: "結尾", eyebrow: "帶走一句", title: "再看製作與細節" },
  ];
  if (template.code.includes("problem")) return [
    { role: "cover", label: "封面", eyebrow: "常見問題", title: headline },
    { role: "content", label: "內容", eyebrow: "原因", title: "常見做法有何不足？" },
    { role: "end", label: "結尾", eyebrow: "解決方法", title: "真正分別在哪裡？" },
  ];
  if (template.code.includes("bold")) return [
    { role: "cover", label: "封面", eyebrow: "先看結論", title: headline },
    { role: "content", label: "內容", eyebrow: "關鍵一幕", title: "先看最關鍵一幕" },
    { role: "end", label: "結尾", eyebrow: "快速總結", title: "三點快速說明" },
  ];
  return [
    { role: "cover", label: "封面", eyebrow: "今次主題", title: headline },
    { role: "content", label: "內容", eyebrow: "細節 01", title: "從原材料開始" },
    { role: "end", label: "結尾", eyebrow: "帶走一句", title: "一步一步看製作過程" },
  ];
}

function workspaceAngleOptions(workspace: WorkspaceSummary | null) {
  if (workspace?.promptProfileKey === "egg-carousel-v1") {
    return [
      "交由 AI 決定",
      "反差／真相拆解",
      "新聞資料解說",
      "人物故事",
      "文化／社會角度",
      "輕鬆趣聞",
    ];
  }
  if (workspace?.promptProfileKey === "bunchill-content-v1") {
    return [
      "交由 AI 決定",
      "擬人化搞笑",
      "香港日常感",
      "無厘頭反差",
      "溫柔共鳴",
      "角色小故事",
    ];
  }
  return [
    "交由 AI 決定",
    "教育解說",
    "問題解決",
    "故事角度",
    "趨勢切入",
    "輕鬆幽默",
  ];
}

export default function ContentStudioPage() {
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startingProject, setStartingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [generatingCarousel, setGeneratingCarousel] = useState(false);
  const [generatingStructure, setGeneratingStructure] = useState(false);
  const autoGenerationProjectRef = useRef<string | null>(null);
  const draftRequestBusy = useRef(false);
  const preparingImages = useRef(false);
  const [message, setMessage] = useState("");
  const [studioLoadError, setStudioLoadError] = useState(false);
  const [brief, setBrief] = useState({ angle: "交由 AI 決定", summary: "", directionId: "", directionVersion: "", directionSource: "" });
  const [directionRecommendations, setDirectionRecommendations] = useState<DirectionRecommendation[]>([]);
  const [recommendingDirections, setRecommendingDirections] = useState(false);
  const [recommendedSlideCount, setRecommendedSlideCount] = useState<number | null>(null);
  const [slideCountReason, setSlideCountReason] = useState("");
  const [recommendedFormat, setRecommendedFormat] = useState("");
  const [formatReason, setFormatReason] = useState("");
  const [customDirectionsOpen, setCustomDirectionsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [carouselSlideCount, setCarouselSlideCount] = useState(5);
  const [videoMethod, setVideoMethod] = useState("human_filming");
  const [selectedStyleCode, setSelectedStyleCode] = useState("");
  const [expandedStyleCode, setExpandedStyleCode] = useState<string | null>(null);
  const [styleRecommendationId, setStyleRecommendationId] = useState("");
  const [styleMessage, setStyleMessage] = useState("");
  const [styleRetry, setStyleRetry] = useState(0);
  const [coreStyles, setCoreStyles] = useState<CorePublishedStyle[]>([]);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [styleCandidateCount, setStyleCandidateCount] = useState(0);
  const [generatingStylePreviews, setGeneratingStylePreviews] = useState<string[]>([]);
  const stylePreviewRunRef = useRef("");
  const stylePreviewInFlightRef = useRef(new Set<string>());
  const [promptOpen, setPromptOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<number | null>(null);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [assetUploadStatus, setAssetUploadStatus] = useState<{ type: "progress" | "error" | "success"; text: string } | null>(null);
  const [assetSourceMode, setAssetSourceMode] = useState<"upload" | "generate" | "search">("upload");
  const [assetTargetPage, setAssetTargetPage] = useState("P.1");
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [licensedResults, setLicensedResults] = useState<LicensedImageResult[]>([]);
  const [searchingImages, setSearchingImages] = useState(false);
  const [generatingAssetPage, setGeneratingAssetPage] = useState<string | null>(null);
  const [removingAssetId, setRemovingAssetId] = useState<string | null>(null);
  const [previewBrand, setPreviewBrand] = useState<ReturnType<typeof resolveContentBranding>>(resolveContentBranding());
  const [brandLibraryAssets, setBrandLibraryAssets] = useState<ProjectAsset[]>(
    [],
  );
  const [prompt, setPrompt] = useState({
    briefPrompt: "",
    formatPrompt: "",
    name: "Content workflow",
    productionPrompt: "",
  });
  const [promptVersion, setPromptVersion] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState<StudioStep>("brief");
  const studioLoadedRef = useRef(false);
  const savedRevisionRef=useRef<Record<string,string>>({});
  const previewAttemptRef=useRef('');

  const selected = useMemo(
    () => projects.find((project) => project.id === selectedId) || null,
    [projects, selectedId],
  );
  const isShortVideo = selected?.selected_format === "short_video";
  useEffect(()=>{
    if(selected && (!savedRevisionRef.current[selected.id] || Date.parse(selected.updated_at)>Date.parse(savedRevisionRef.current[selected.id])))savedRevisionRef.current[selected.id]=selected.updated_at;
  },[selected?.id,selected?.updated_at]);
  const videoScript = useMemo(() => {
    if (!isShortVideo) return [];
    const production = selected?.production || {};
    const source = Array.isArray(production.script) && production.script.length
      ? production.script
      : Array.isArray(production.pages) ? production.pages : [];
    return source.map((segment: any, index: number) => ({
      section: segment.section || segment.headline || `段落 ${index + 1}`,
      time: segment.time || segment.timestamp || segment.subheadline || "時間待定",
      dialogue: segment.dialogue || segment.voiceover || segment.copyDirection || segment.purpose || "",
      visual: segment.visual || segment.visualDirection || "",
      caption: segment.caption || "",
      productionNote: segment.productionNote || segment.shotNote || "",
    }));
  }, [isShortVideo, selected?.production]);
  const visibleStudioSteps = useMemo(
    () => selected?.selected_format === "short_video"
      ? studioSteps.filter((step) => step.id !== "assets")
      : studioSteps,
    [selected?.selected_format],
  );
  const angleOptions = useMemo(
    () => workspaceAngleOptions(workspace),
    [workspace],
  );
  const displayStyles = useMemo<DisplayStyle[]>(() => {
    const format = selected?.selected_format || selectedFormat;
    const coreFormat = format === "short_video"
      ? (videoMethod === "ai_video_generation" ? "ai_video" : "human_video")
      : format;
    const local = styleTemplates
      .filter((template) => template.formats.includes(format))
      .map((template) => ({ ...template, source: "soon_creator" as const }));
    if (!(["carousel", "single_image", "human_video", "ai_video"].includes(coreFormat))) return local;
    const palettes: Array<[string, string, string]> = [
      ["#f6f2eb", "#6b2c30", "#c7e63a"],
      ["#fff4cf", "#202126", "#b46a61"],
      ["#202126", "#f6d260", "#ffffff"],
    ];
    const canonical = coreStyles.map((style, index): DisplayStyle => ({
      code: style.code,
      version: style.version.number,
      name: style.name,
      note: style.description,
      formats: [format],
      tone: "SOON 建議",
      palette: palettes[index % palettes.length],
      rules: {
        structure: ["按照已驗證的內容次序逐頁推進", "每頁集中傳達一個重點"],
        copy: ["使用清晰、可快速閱讀的書面語", "內容聲稱必須有資料支持"],
        visual: ["維持一致網格及清楚對比", "首圖及重點句必須容易辨認"],
        byFormat: format === "single_image"
          ? { single_image: ["只保留一個主要訊息、單一視覺焦點及必要行動"] }
          : format === "short_video"
            ? { short_video: ["按已發布時間軸安排 Hook、主體、證據、轉場及 Ending"] }
            : { carousel: ["由開場、背景、證據推進至結論及行動"] },
      },
      source: style.creatorSource === "soon_creator" ? "soon_creator" : "soon_core",
      core: style,
    }));
    return canonical;
  }, [coreStyles, selected?.selected_format, selectedFormat, videoMethod]);
  const visibleDisplayStyles = useMemo(() => displayStyles.slice(0, 3), [displayStyles]);
  const compositionPreviewSignature=JSON.stringify([selected?.id,selected?.production?.compositionMode,selected?.production?.pages,
    (selected?.production?.assets as ProjectAsset[]|undefined)?.map(a=>[a.id,a.url,a.assignedPage,a.isCover]),
    visibleDisplayStyles.map(s=>[s.code,s.core?.templates?.[0]?.version.contentHash])]);
  useEffect(()=>{
    if(activeStep!=='style'||isShortVideo||saving||loadingStyles||selected?.production?.compositionMode!=='ai'||!visibleDisplayStyles.length)return;
    const previous=selected.production.styleCompositionPreparation as {signature?:string}|undefined;
    if(previous?.signature===compositionPreviewSignature||previewAttemptRef.current===compositionPreviewSignature)return;
    previewAttemptRef.current=compositionPreviewSignature;
    void prepareStyleCompositions(compositionPreviewSignature);
  },[activeStep,isShortVideo,saving,loadingStyles,compositionPreviewSignature]);

  async function prepareStyleCompositions(signature:string) {
    if(!selected?.production||preparingImages.current)return;
    preparingImages.current=true;setSaving(true);
    const issues:OptimizationIssue[]=[];
    let assets=setCompositionMode((selected.production.assets||[]) as ProjectAsset[],'ai');
    const save=async(status:string)=>{
      const ok=await saveProject({production:{...selected.production,assets,styleCompositionPreparation:{signature,status,issues}}},status==='ready'?'三頁風格示範已準備；正式製作會重用合適構圖。':'正在準備風格示範，原圖及已有成果會保留。');
      if(!ok)throw new Error('未能保存預覽進度，請重新載入後繼續。');
      setSaving(true);
    };
    try {
      await save('processing');
      const [{previewComposition},{stylePreviewPages},{coreMasterLayoutGeometry},{optimizeCarouselAssets}]=await Promise.all([
        import('@/lib/style-preview-composition'),import('@/lib/style-preview-pages'),import('@/lib/content-templates/core-master-template'),import('@/lib/optimize-carousel-assets'),
      ]);
      const pages=(selected.production.pages||[]) as Record<string,any>[];
      const frames=visibleDisplayStyles.flatMap(style=>stylePreviewPages(pages).flatMap(sample=>{
        const input=previewComposition(style.core?.templates?.[0]?.version.contract,sample.page,sample.sourceIndex,pages.length);
        if(!input.design)return [];
        const pageId=String(sample.page.page||`P.${sample.sourceIndex+1}`);
        const assigned=assets.filter(a=>a.assignedPage===pageId);
        const primary=assigned[0]||(input.role==='cover'?assets.find(a=>a.isCover&&!a.assignedPage):undefined);
        const geometry=coreMasterLayoutGeometry({...input,primary,secondary:assigned[1],planning:true});
        return geometry.images.flatMap(image=>{
          const asset=assets.find(a=>a.url===image.asset.url);
          return asset?[{assetId:asset.id,frame:image.rect,textZones:geometry.textZones,page:pageId}]:[];
        });
      }));
      assets=await optimizeCarouselAssets(assets,frames,{analyze:analyzeAssetFocus,generate:generateBackgroundExtension,dimensions:compositionDimensions,progress:setMessage,
        failure:issue=>issues.push(issue),checkpoint:async next=>{assets=next;await save('processing');}});
      await save(issues.length?'needs_attention':'ready');
    } catch(error){setMessage(error instanceof Error?error.message:'風格構圖未完成，可繼續保留原圖或重試。');}
    finally{preparingImages.current=false;setSaving(false);}
  }

  function compositionDimensions(asset:ProjectAsset):Promise<{width:number;height:number}> {
    if(asset.width>0&&asset.height>0)return Promise.resolve({width:asset.width,height:asset.height});
    return new Promise((resolve,reject)=>{
      const image=new Image(),timer=window.setTimeout(()=>reject(new Error('圖片載入逾時')),15000);
      image.onload=()=>{clearTimeout(timer);resolve({width:image.naturalWidth,height:image.naturalHeight});};
      image.onerror=()=>{clearTimeout(timer);reject(new Error('圖片未能載入'));};image.src=asset.url;
    });
  }
  useEffect(() => {
    if (!workspaceId || !selected?.id || !isShortVideo || activeStep !== "style" || !visibleDisplayStyles.length) return;
    const existing = selected.production?.stylePreviews && typeof selected.production.stylePreviews === "object"
      ? selected.production.stylePreviews as Record<string, { url?: string }> : {};
    const missing = visibleDisplayStyles.filter((style) =>
      !existing[style.code]?.url && !stylePreviewInFlightRef.current.has(style.code));
    const runKey = `${selected.id}:${selected.updated_at}:${missing.map((style) => `${style.code}:v${style.version}`).join(",")}`;
    if (!missing.length || stylePreviewRunRef.current === runKey) return;
    stylePreviewRunRef.current = runKey;
    void (async () => {
      for (const style of missing) {
        stylePreviewInFlightRef.current.add(style.code);
        setGeneratingStylePreviews((current) => [...new Set([...current, style.code])]);
        const previewRules = style.core?.version.rules || style.rules;
        const previewConfig = style.core?.version.rules?.preview as { asset?: string } | undefined;
        try {
          const response = await fetch("/api/content-projects/generate-style-preview", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ workspaceId, projectId: selected.id, styleCode: style.code, styleVersion: style.version, rules: previewRules, referenceUrl: previewConfig?.asset || "" }),
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok) throw new Error(payload?.detail || payload?.error || "未能生成預覽");
          if (payload?.project) {
            setProjects((current) => current.map((item) => item.id === selected.id ? { ...item, ...payload.project } : item));
          }
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "未能生成短片首鏡預覽");
        } finally {
          stylePreviewInFlightRef.current.delete(style.code);
          setGeneratingStylePreviews((current) => current.filter((code) => code !== style.code));
        }
      }
    })();
  }, [activeStep, isShortVideo, selected?.id, selected?.updated_at, selected?.production?.stylePreviews, visibleDisplayStyles, workspaceId]);
  const previewImageUrls = useMemo(() => {
    const productionAssets = Array.isArray(selected?.production?.assets)
      ? selected.production.assets as ProjectAsset[]
      : [];
    const preferred = [...productionAssets].sort((left, right) => Number(right.isCover) - Number(left.isCover));
    return preferred.map((asset) => asset.url).filter((url): url is string => typeof url === "string" && Boolean(url));
  }, [selected?.production]);
  const renderStylePreview = (code: string, expanded = false) => {
    const props: StylePreviewProps = {
      angle: brief.angle,
      summary: brief.summary,
      storyPages: Array.isArray(selected?.production?.pages)
        ? selected.production.pages as Array<Record<string, unknown>>
        : [],
      brandName: workspace?.brandName || workspace?.name || "BRAND",
      imageUrls: previewImageUrls,
      imageLoading: generatingAssetPage === "P.1",
      expanded,
      onExpand: expanded ? undefined : () => setExpandedStyleCode(code),
    };
    if (isClearMagazineCarousel(code)) {
      const contract = displayStyles.find(style => style.code === code)?.core?.templates?.[0]?.version.contract;
      return <CoreMasterPreview key={`${selected?.id}-${code}`} contract={contract} pages={props.storyPages || []}
        assets={Array.isArray(selected?.production?.assets) ? selected.production.assets as ProjectAsset[] : []}
        brandName={props.brandName || 'BRAND'} branding={previewBrand} onExpand={props.onExpand}
        saving={saving} onSaveFocus={permissions?.canEdit ? saveAssetFocus : undefined}
        onAnalyzeFocus={permissions?.canEdit ? analyzeAssetFocus : undefined}
        extensionActions={permissions?.canEdit ? extensionActions() : undefined}/>;
    }
    if (code === "product-focus") return <ProductFocusPreview {...props}/>;
    if (code === "ranking-review") return <RankingReviewPreview {...props}/>;
    return null;
  };
  const renderVideoStylePreview = (template: DisplayStyle) => {
    const previews = selected?.production?.stylePreviews && typeof selected.production.stylePreviews === "object"
      ? selected.production.stylePreviews as Record<string, { url?: string }> : {};
    const generatedUrl = previews[template.code]?.url || "";
    const isGenerating = generatingStylePreviews.includes(template.code);
    return <div className="video-style-preview" data-style={template.code} style={{
      "--video-bg": template.palette[0],
      "--video-ink": template.palette[1],
      "--video-accent": template.palette[2],
      backgroundImage: generatedUrl
        ? `url(${JSON.stringify(generatedUrl)})`
        : previewImageUrls[0]
          ? `url(${JSON.stringify(previewImageUrls[0])})`
        : undefined,
    } as CSSProperties}>
      <div className={`video-preview-scene${isGenerating ? " generating" : ""}`} aria-hidden="true">{isGenerating ? <><i /><small>正在按 reference 生成首鏡…</small></> : null}</div>
    </div>;
  };

  function stepLabel(step: StudioStep) {
    if (step === "structure" && selected?.selected_format === "short_video") return "短片結構";
    if (step === "assets" && selected?.selected_format === "single_image") return "圖片素材";
    if (step === "drafts" && selected?.selected_format === "short_video") return "製作草稿";
    if (step === "carousel") {
      if (selected?.selected_format === "short_video") return "製作包";
      if (selected?.selected_format === "single_image") return "單張貼文";
      return "輪播圖片";
    }
    return studioSteps.find((item) => item.id === step)?.label || step;
  }

  function latestAvailableStep(project: Project): StudioStep {
    if (!project.selected_format) return project.stage === "format" ? "format" : "brief";
    if (project.stage === "brief") return "brief";
    if (project.stage === "format") return "format";
    const production = project.production;
    if (!production?.status || production.status === "structure_ready") return "structure";
    if (production.status !== "structure_confirmed") return "structure";
    if (project.selected_format !== "short_video" && production.assetStatus !== "confirmed") return "assets";
    if (typeof project.format_decision?.templateCode !== "string" || !project.format_decision.templateCode) return "style";
    if (!production.productionStatus) return "style";
    if (production.productionStatus === "drafts_ready") return "drafts";
    return "carousel";
  }

  function goToStep(step: StudioStep) {
    setActiveStep(step);
    const url = new URL(window.location.href);
    url.searchParams.set("step", step);
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function fetchStudioData(url: string, attempts = 3) {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (response.ok || response.status < 500 || attempt === attempts - 1) {
          return response;
        }
      } catch (error) {
        lastError = error;
        if (attempt === attempts - 1) throw error;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 350 * 2 ** attempt));
    }
    throw lastError instanceof Error ? lastError : new Error("未能載入內容製作");
  }

  async function loadStudio() {
    const isInitialLoad = !studioLoadedRef.current;
    if (isInitialLoad) {
      setLoading(true);
      setMessage("");
    }
    setStudioLoadError(false);
    try {
      const resolved = await resolveActiveWorkspace();
      setWorkspace(resolved.activeWorkspace);
      setWorkspaceId(resolved.workspaceId);
      if (!resolved.workspaceId) {
        setProjects([]);
        return;
      }
      const response = await fetchStudioData(
        `/api/content-projects?workspaceId=${encodeURIComponent(resolved.workspaceId)}`,
      );
      const payload = await response.json().catch(() => null);
      if (response.status === 403) {
        window.location.replace("/onboarding");
        return;
      }
      if (!response.ok)
        throw new Error(
          payload?.detail || payload?.error || "未能載入內容製作",
        );
      const incomingProjects = Array.isArray(payload.projects)
        ? (payload.projects as Project[])
        : [];
      setProjects((current) => {
        if (isInitialLoad) return incomingProjects;
        const currentById = new Map(current.map((project) => [project.id, project]));
        return incomingProjects.map((incoming) => {
          const existing = currentById.get(incoming.id);
          if (!existing) return incoming;
          const incomingUpdatedAt = Date.parse(incoming.updated_at || "") || 0;
          const existingUpdatedAt = Date.parse(existing.updated_at || "") || 0;
          return existingUpdatedAt > incomingUpdatedAt ? existing : incoming;
        });
      });
      setPermissions(payload.permissions || null);
      try {
        const brandResponse = await fetchStudioData(
          `/api/brand-kit-data?workspace_id=${encodeURIComponent(resolved.workspaceId)}`,
          2,
        );
        const brandPayload = await brandResponse.json().catch(() => null);
        setPreviewBrand(brandResponse.ok ? resolveContentBranding(brandPayload?.workspace, brandPayload?.brandKit, brandPayload?.brandProfile?.business_name || brandPayload?.workspace?.name || '') : resolveContentBranding());
        setBrandLibraryAssets(
          brandResponse.ok && Array.isArray(brandPayload?.assets)
            ? brandPayload.assets
                .filter((asset: any) => typeof asset?.url === "string")
                .map((asset: any) => ({
                  id: `brand-${asset.id}`,
                  url: asset.url,
                  filename: asset.filename || "品牌素材",
                  width: Number(asset.width) || 1080,
                  height: Number(asset.height) || 1080,
                  assignedPage: "auto",
                  isCover: false,
                }))
            : [],
        );
      } catch {
        // Brand assets are optional and should not prevent the studio from loading.
        setBrandLibraryAssets([]);
        setPreviewBrand(resolveContentBranding());
      }
      const requestedProjectId = new URLSearchParams(
        window.location.search,
      ).get("project");
      setSelectedId((current) => {
        if (requestedProjectId && incomingProjects.some((item) => item.id === requestedProjectId)) {
          return requestedProjectId;
        }
        if (isInitialLoad) return null;
        return current && incomingProjects.some((item) => item.id === current) ? current : null;
      });
      if (isInitialLoad && !requestedProjectId) {
        const url = new URL(window.location.href);
        url.searchParams.delete("step");
        window.history.replaceState(null, "", url);
      }
    } catch (error) {
      setStudioLoadError(true);
      setMessage("連線暫時中斷，請重新載入內容。");
    } finally {
      studioLoadedRef.current = true;
      setLoading(false);
    }
  }

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const imported = hashParams.get("coreImport");
    if (imported) {
      try {
        const payload = JSON.parse(imported) as {
          version?: number;
          source?: string;
          sourceUrl?: string;
          content?: string;
          classification?: string;
          analysisReason?: string;
        };
        if (payload.version === 1 && payload.source === "soon_core_intelligence" && typeof payload.content === "string") {
          const summary = [
            payload.content.trim(),
            payload.sourceUrl ? `來源：${payload.sourceUrl}` : "",
            payload.classification ? `SOON Core 分類：${payload.classification}` : "",
            payload.analysisReason ? `分析摘要：${payload.analysisReason}` : "",
          ].filter(Boolean).join("\n\n").slice(0, 12000);
          setBrief((current) => ({ ...current, summary }));
          setMessage("已由 SOON Core 帶入研究內容，請確認後讓 SOON 整理。");
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        }
      } catch {
        setMessage("未能讀取 SOON Core 內容，請返回 Core 再試一次。");
      }
    }
    void loadStudio();
    const changed = () => void loadStudio();
    window.addEventListener(WORKSPACE_CHANGED_EVENT, changed);
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, changed);
  }, []);

  function openProject(project: Project) {
    setSelectedId(project.id);
    const step = latestAvailableStep(project);
    setActiveStep(step);
    const url = new URL(window.location.href);
    url.searchParams.set("project", project.id);
    url.searchParams.set("step", step);
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openNewContent() {
    setSelectedId(null);
    setMessage("");
    setBrief({ angle: "交由 AI 決定", summary: "", directionId: "", directionVersion: "", directionSource: "" });
    setDirectionRecommendations([]);
    setRecommendedFormat("");
    setFormatReason("");
    setSelectedFormat("");
    setActiveStep("brief");
    const url = new URL(window.location.href);
    url.searchParams.delete("project");
    url.searchParams.delete("step");
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function recommendDirections(projectOverride?: Project, summaryOverride?: string) {
    const project = projectOverride || selected;
    const summary = String(summaryOverride ?? brief.summary ?? "").trim();
    if (!workspaceId || !project || !summary || recommendingDirections) return;
    setRecommendingDirections(true);
    setMessage("");
    try {
      const response = await fetch("/api/content-directions/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          projectId: project.id,
          summary,
          format: project.selected_format || selectedFormat,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.detail || payload?.error || "未能取得內容方向建議");
      const recommendations = Array.isArray(payload?.recommendations) ? payload.recommendations : [];
      setDirectionRecommendations(recommendations);
      const hasSlideCount = payload?.recommendedSlideCount !== null && payload?.recommendedSlideCount !== undefined && payload?.recommendedSlideCount !== "";
      const slideCount = Number(payload?.recommendedSlideCount);
      const normalizedSlideCount = hasSlideCount && Number.isFinite(slideCount)
        ? Math.min(10, Math.max(3, Math.round(slideCount)))
        : null;
      setRecommendedSlideCount(normalizedSlideCount);
      setSlideCountReason(typeof payload?.slideCountReason === "string" ? payload.slideCountReason : "");
      const nextRecommendedFormat = typeof payload?.recommendedFormat === "string" ? payload.recommendedFormat : "";
      setRecommendedFormat(nextRecommendedFormat);
      setFormatReason(typeof payload?.formatReason === "string" ? payload.formatReason : "");
      if (!project.selected_format && nextRecommendedFormat) {
        setSelectedFormat(nextRecommendedFormat);
        if (payload?.recommendedVideoMethod === "ai_video_generation" || payload?.recommendedVideoMethod === "human_filming") {
          setVideoMethod(payload.recommendedVideoMethod);
        }
      }
      if ((project.selected_format || nextRecommendedFormat || selectedFormat) === "carousel" && normalizedSlideCount) {
        setCarouselSlideCount(normalizedSlideCount);
      }
      if (recommendations[0]) {
        setBrief((current) => ({
          ...current,
          angle: recommendations[0].title,
          directionId: recommendations[0].id,
          directionVersion: recommendations[0].version || "",
          directionSource: payload?.source || "",
        }));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未能取得內容方向建議");
    } finally {
      setRecommendingDirections(false);
    }
  }

  useEffect(() => {
    if (!selected) return;
    setBrief({
      angle: selected.brief?.angle || "交由 AI 決定",
      summary: selected.brief?.summary || selected.source_note || "",
      directionId: selected.brief?.directionId || "",
      directionVersion: selected.brief?.directionVersion || "",
      directionSource: selected.brief?.directionSource || "",
    });
    setDirectionRecommendations([]);
    setRecommendedSlideCount(null);
    setSlideCountReason("");
    setCustomDirectionsOpen(false);
    setSelectedFormat(selected.selected_format || "");
    setCarouselSlideCount(
      Math.min(10, Math.max(3, Number(selected.format_decision?.slideCount) || 5)),
    );
    setVideoMethod(
      selected.format_decision?.videoMethod === "ai_video_generation"
        ? "ai_video_generation"
        : "human_filming",
    );
    setSelectedStyleCode(
      typeof selected.format_decision?.templateCode === "string"
        ? selected.format_decision.templateCode
        : "",
    );
    const requested = new URLSearchParams(window.location.search).get("step") as StudioStep | null;
    const latest = latestAvailableStep(selected);
    const latestIndex = studioSteps.findIndex((step) => step.id === latest);
    const requestedIndex = studioSteps.findIndex((step) => step.id === requested);
    goToStep(requestedIndex >= 0 && requestedIndex <= latestIndex ? requested! : latest);
  }, [selected?.id]);

  useEffect(() => {
    const activeFormat = selected?.selected_format || selectedFormat;
    const coreFormat = activeFormat === "short_video"
      ? (videoMethod === "ai_video_generation" ? "ai_video" : "human_video")
      : activeFormat;
    if (!workspaceId || !selected || !["carousel", "single_image", "human_video", "ai_video"].includes(coreFormat)) {
      setCoreStyles([]);
      setStyleCandidateCount(0);
      return;
    }
    if (activeStep !== "style") return;
    let cancelled = false;
    setLoadingStyles(true);
    setCoreStyles([]);
    setSelectedStyleCode("");
    setStyleRecommendationId("");
    setStyleMessage("");
    const production = selected.production || {};
    const story = Array.isArray(production.pages) ? production.pages : [];
    const assets = Array.isArray(production.assets)
      ? (production.assets as ProjectAsset[]).map((asset) => ({
          filename: asset.filename,
          width: asset.width,
          height: asset.height,
          assignedPage: asset.assignedPage,
          isCover: asset.isCover,
          sourceType: asset.sourceType,
          sourceLabel: asset.sourceLabel,
        }))
      : [];
    fetch("/api/content-styles/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        projectId: selected.id,
        retryEmpty: styleRetry > 0,
        format: coreFormat,
        brief: [selected.brief?.angle, selected.brief?.summary || selected.source_note].filter(Boolean).join("\n"),
        story,
        assets,
      }),
      cache: "no-store",
    })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "未能載入最新風格"); return payload; })
      .then((payload) => {
        if (!cancelled) {
          const styles = Array.isArray(payload?.styles) ? payload.styles as CorePublishedStyle[] : [];
          setCoreStyles(styles);
          setStyleRecommendationId(payload.id || "");
          setStyleMessage(styles.length ? "" : payload.emptyReason || "暫未有適合這個題材及素材的風格，請補充資料後重試。");
          setStyleCandidateCount(Number(payload?.candidateCount) || styles.length);
          setSelectedStyleCode("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStyleMessage(error.message || "未能分析風格，請重試。");
          setCoreStyles([]);
          setStyleCandidateCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStyles(false);
      });
    return () => { cancelled = true; };
  }, [workspaceId, selected?.id, selected?.selected_format, selectedFormat, videoMethod, activeStep, styleRetry, JSON.stringify(selected?.format_decision?.confirmedMaterials)]);

  async function saveProject(
    updates: Record<string, unknown>,
    successMessage: string,
    nextStep?: StudioStep,
    preferenceEvents: PreferenceEvent[] = [],
  ) {
    if (!workspaceId || !selected || !permissions?.canEdit) return false;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/content-projects", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: selected.id,
          workspaceId,
          expectedUpdatedAt: savedRevisionRef.current[selected.id] || selected.updated_at,
          ...updates,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(payload?.detail || payload?.error || "未能儲存");
      savedRevisionRef.current[selected.id]=payload.project.updated_at;
      setProjects((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, ...payload.project } : item,
        ),
      );
      if (preferenceEvents.length) {
        await Promise.allSettled(preferenceEvents.map((event) => fetch("/api/content-preference-events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ workspaceId, projectId: selected.id, ...event }),
        })));
      }
      setMessage(successMessage);
      if (nextStep) goToStep(nextStep);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未能儲存");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function startNewProject() {
    const summary = String(brief.summary || "").trim();
    if (!workspaceId || !summary || startingProject || !permissions?.canEdit) return;
    setStartingProject(true);
    setMessage("");
    try {
      const response = await fetch("/api/content-projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          title: summary.replace(/\s+/g, " ").slice(0, 40),
          sourceNote: summary,
          brief: { ...brief, summary },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.project?.id) throw new Error(payload?.detail || payload?.error || "未能建立內容");
      setProjects((current) => [payload.project, ...current.filter((item) => item.id !== payload.project.id)]);
      setSelectedId(payload.project.id);
      setSelectedFormat("");
      const url = new URL(window.location.href);
      url.searchParams.set("project", payload.project.id);
      window.history.replaceState(null, "", url);
      goToStep("brief");
      await recommendDirections(payload.project, summary);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未能建立內容");
    } finally {
      setStartingProject(false);
    }
  }

  async function deleteProject(project: Project) {
    if (!workspaceId || deletingProjectId || !permissions?.canEdit) return;
    if (!window.confirm(`確定刪除「${project.title}」？\n\n內容會由製作中及審批頁移除。`)) return;

    setDeletingProjectId(project.id);
    setMessage("");
    try {
      const response = await fetch("/api/content-projects", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          workspaceId,
          stage: "archived",
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.detail || payload?.error || "未能刪除內容");

      setProjects((current) => current.filter((item) => item.id !== project.id));
      if (selectedId === project.id) openNewContent();
      setMessage("內容已刪除");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未能刪除內容");
    } finally {
      setDeletingProjectId(null);
    }
  }

  async function openPromptManager() {
    if (!workspaceId || !permissions?.canManagePrompt) return;
    setPromptOpen(true);
    const response = await fetch(
      `/api/workspace-prompts?workspaceId=${encodeURIComponent(workspaceId)}`,
      { cache: "no-store" },
    );
    const payload = await response.json().catch(() => null);
    const active =
      payload?.prompts?.find((item: any) => item.is_active) ||
      payload?.prompts?.[0];
    if (response.ok && active) {
      setPrompt({
        briefPrompt: active.brief_prompt || "",
        formatPrompt: active.format_prompt || "",
        name: active.name || "Content workflow",
        productionPrompt: active.production_prompt || "",
      });
      setPromptVersion(active.version);
    }
  }

  async function savePrompt() {
    if (!workspaceId || !permissions?.canManagePrompt) return;
    setSaving(true);
    const response = await fetch("/api/workspace-prompts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, ...prompt }),
    });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) return setMessage(payload?.error || "未能儲存 Prompt");
    setPromptVersion(payload.prompt.version);
    setPromptOpen(false);
    setMessage(`Prompt v${payload.prompt.version} 已儲存`);
  }

  async function generateStructure() {
    if (!workspaceId || !selected || !permissions?.canEdit) return;
    setSaving(true);
    setGeneratingStructure(true);
    setMessage("");
    try {
      const response = await fetch("/api/content-projects/generate-structure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: selected.id, workspaceId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          payload?.detail || payload?.error || "未能生成故事結構",
        );
      setProjects((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, ...payload.project } : item,
        ),
      );
      setMessage(selected.selected_format === "short_video"
        ? "資料核查及短片劇本已完成，請檢查後確認"
        : "資料核查及內容順序已完成，請檢查後確認");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未能生成故事結構");
    } finally {
      setSaving(false);
      setGeneratingStructure(false);
    }
  }

  async function confirmStructure() {
    if (!selected?.production) return;
    await saveProject(
      {
        production: {
          ...selected.production,
          status: "structure_confirmed",
          ...(selected.selected_format === "short_video" ? { assetStatus: "not_required" } : {}),
          confirmedAt: new Date().toISOString(),
        },
      },
      selected.selected_format === "short_video"
        ? "短片結構已確認，下一步選擇內容風格"
        : "故事結構已確認，下一步可以準備圖片素材",
      selected.selected_format === "short_video" ? "style" : "assets",
    );
  }

  function updateStoryPage(index: number, field: string, value: string) {
    if (!selected?.production) return;
    const editingVideo = selected.selected_format === "short_video";
    const current = editingVideo ? videoScript : selected.production.pages;
    if (!Array.isArray(current)) return;
    const updated = current.map((page: any, pageIndex: number) =>
      pageIndex === index ? { ...page, [field]: value } : page,
    );
    setProjects((current) =>
      current.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              production: {
                ...selected.production,
                ...(editingVideo ? { script: updated, pages: [] } : { pages: updated }),
                status: "structure_ready",
                confirmedAt: null,
              },
            }
          : item,
      ),
    );
  }

  async function saveStoryPages() {
    if (!selected?.production) return;
    await saveProject(
      { production: selected.production },
      selected.selected_format === "short_video" ? "短片劇本修改已儲存" : "故事結構修改已儲存",
      undefined,
      [
        { eventType: "edited", dimension: "copy", value: "story_structure", metadata: { step: "structure" } },
        { eventType: "edited", dimension: "design", value: "visual_direction", metadata: { step: "structure" } },
      ],
    );
    setEditingPage(null);
  }

  async function deleteStoryPage(index: number) {
    if (!selected?.production) return;
    const deletingVideo = selected.selected_format === "short_video";
    const current = deletingVideo ? videoScript : selected.production.pages;
    if (!Array.isArray(current)) return;
    if (
      !window.confirm(deletingVideo
        ? `確定刪除「${current[index]?.section || `段落 ${index + 1}`}」？`
        : `確定刪除 P.${index + 1}？刪除後其餘頁面會自動重新編號`)
    )
      return;
    const remaining = current
      .filter((_: unknown, pageIndex: number) => pageIndex !== index)
      .map((page: any, pageIndex: number) => deletingVideo ? page : ({ ...page, page: `P.${pageIndex + 1}` }));
    await saveProject(
      {
        production: {
          ...selected.production,
          ...(deletingVideo ? { script: remaining, pages: [] } : { pages: remaining }),
          status: "structure_ready",
          confirmedAt: null,
        },
      },
      deletingVideo ? "劇本段落已刪除" : `P.${index + 1} 已刪除，頁碼已重新排列`,
    );
    setEditingPage(null);
  }

  async function imageDimensions(file: File) {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
        URL.revokeObjectURL(image.src);
      };
      image.onerror = reject;
      image.src = URL.createObjectURL(file);
    });
  }

  async function normalizeUploadImage(file: File) {
    const isHeic = /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
    if (!isHeic) {
      if (!file.type.startsWith("image/")) throw new Error(`${file.name} 不是支援的圖片格式`);
      return file;
    }

    setAssetUploadStatus({ type: "progress", text: `正在轉換 ${file.name}…` });
    let convertedBlob: Blob | null = null;
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      convertedBlob = Array.isArray(converted) ? converted[0] : converted;
    } catch {
      setAssetUploadStatus({ type: "progress", text: `正在以兼容模式讀取 ${file.name}…` });
      try {
        const { heicTo } = await import("heic-to/csp");
        const converted = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
        convertedBlob = converted instanceof Blob ? converted : null;
      } catch {
        convertedBlob = null;
      }
    }

    if (!convertedBlob) {
      throw new Error(`未能讀取 ${file.name}，請確認檔案完整或先在相片 App 匯出為 JPEG`);
    }
    return new File(
      [convertedBlob],
      file.name.replace(/\.(heic|heif)$/i, ".jpg"),
      { type: "image/jpeg", lastModified: file.lastModified },
    );
  }

  async function uploadProjectAssets(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !workspaceId || !selected?.production) return;
    setUploadingAssets(true);
    setMessage("");
    setAssetUploadStatus({ type: "progress", text: "正在準備圖片…" });
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("請先登入");
      const existing = Array.isArray(selected.production.assets)
        ? (selected.production.assets as ProjectAsset[])
        : [];
      const uploaded: ProjectAsset[] = [];
      for (const file of files) {
        const uploadFile = await normalizeUploadImage(file);
        const dimensions = await imageDimensions(uploadFile).catch(() => {
          throw new Error(`未能讀取 ${file.name} 的圖片尺寸`);
        });
        setAssetUploadStatus({ type: "progress", text: `正在上載 ${file.name}…` });
        const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const id = crypto.randomUUID();
        const storagePath = `${user.id}/content-projects/${workspaceId}/${selected.id}/${id}-${safeName}`;
        const { error } = await supabase.storage
          .from("brand-assets")
          .upload(storagePath, uploadFile, { cacheControl: "3600", contentType: uploadFile.type, upsert: false });
        if (error) throw error;
        const { data } = supabase.storage
          .from("brand-assets")
          .getPublicUrl(storagePath);
        uploaded.push({
          id,
          url: data.publicUrl,
          filename: uploadFile.name,
          ...dimensions,
          assignedPage: "auto",
          isCover: existing.length === 0 && uploaded.length === 0,
          sourceType: "upload",
          sourceLabel: "自行上載",
        });
      }
      await saveProject(
        {
          production: {
            ...selected.production,
            assets: [...existing, ...uploaded],
            assetStatus: "pending",
          },
        },
        `已上載 ${uploaded.length} 張圖片`,
      );
      setMessage("");
      setAssetUploadStatus({ type: "success", text: `已上載 ${uploaded.length} 張圖片` });
    } catch (error) {
      setMessage("");
      setAssetUploadStatus({
        type: "error",
        text: error instanceof Error ? error.message : "圖片上載失敗，請重新選擇圖片。",
      });
    } finally {
      setUploadingAssets(false);
      event.target.value = "";
    }
  }

  async function generateProjectAsset(page: string) {
    if (!workspaceId || !selected) return;
    const activeWorkspaceId = workspaceId;
    const projectId = selected.id;
    setGeneratingAssetPage(page);
    setMessage(`AI 正在生成 ${page} 圖片…`);
    try {
      const response = await fetch("/api/content-projects/generate-asset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, projectId, page }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.detail || payload?.error || "未能生成圖片");
      setProjects((current) =>
        current.map((item) => item.id === projectId
          ? {
              ...item,
              ...payload.project,
              production: payload.project.production,
              updated_at: payload.project.updated_at || item.updated_at,
            }
          : item),
      );
      setMessage(payload?.promptAdjusted
        ? `${page} 原畫面涉及敏感表達，AI 已自動調整成合規視覺並完成生成`
        : activeStep === "style"
          ? "共同預覽圖已生成，三款 Style 已同步更新"
          : `${page} AI 圖片已生成並加入素材`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未能生成圖片");
    } finally {
      setGeneratingAssetPage(null);
    }
  }

  async function searchLicensedImages() {
    const pages = Array.isArray(selected?.production?.pages) ? selected.production.pages : [];
    const targetIndex = Math.max(0, pages.findIndex((page: any, index: number) => (page?.page || `P.${index + 1}`) === assetTargetPage));
    const targetPage: any = pages[targetIndex] || {};
    const query = imageSearchQuery.trim() || [targetPage.visualDirection, targetPage.headline, selected?.title].filter(Boolean).join(" ");
    if (query.length < 2) return setMessage("請輸入至少兩個字嘅搜尋內容");
    setSearchingImages(true);
    setMessage("AI 正在搜尋可商用授權圖片…");
    try {
      const response = await fetch(`/api/content-projects/search-images?q=${encodeURIComponent(query)}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "暫時未能搜尋圖片");
      setLicensedResults(payload.results || []);
      if (!imageSearchQuery.trim() && payload.optimizedQuery) setImageSearchQuery(payload.optimizedQuery);
      setMessage(payload.results?.length ? `搵到 ${payload.results.length} 張候選圖片` : "未搵到合適圖片，請試另一組關鍵字");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "暫時未能搜尋圖片");
    } finally {
      setSearchingImages(false);
    }
  }

  async function addLicensedImage(result: LicensedImageResult) {
    if (!selected?.production) return;
    const existing = Array.isArray(selected.production.assets)
      ? (selected.production.assets as ProjectAsset[])
      : [];
    if (existing.some((asset) => asset.url === result.url)) {
      setMessage("呢張圖片已經加入素材");
      return;
    }
    const isCover = existing.length === 0 && assetTargetPage === "P.1";
    const asset: ProjectAsset = {
      id: crypto.randomUUID(),
      url: result.url,
      filename: result.title,
      width: result.width,
      height: result.height,
      assignedPage: assetTargetPage,
      isCover,
      sourceType: "licensed_search",
      sourceLabel: result.provider,
      sourceUrl: result.sourceUrl,
      creator: result.creator,
      creatorUrl: result.creatorUrl,
      license: result.license,
      licenseUrl: result.licenseUrl,
    };
    await saveProject(
      {
        production: {
          ...selected.production,
          assets: [...existing, asset],
          assetStatus: "pending",
        },
      },
      `已加入 ${assetTargetPage} 授權圖片；發佈前請核對授權及署名要求`,
    );
  }

  function extensionActions() {
    return { generate: generateBackgroundExtension, apply: applyBackgroundExtension,
      scope: `${workspaceId}:${selected?.id}`, automatic: selected?.production?.autoBackgroundExtension === true,
      setAutomatic: async (enabled: boolean) => selected?.production ? saveProject({ production: { ...selected.production, autoBackgroundExtension: enabled } }, enabled ? '已開啟自動延伸背景（會使用生成額度）' : '已關閉自動延伸背景') : false };
  }

  async function generateBackgroundExtension(assetId: string, placement?: import('@/lib/composition-advice').ExtensionPlacement) {
    const response = await fetch('/api/content-projects/extend-background', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceId, projectId: selected?.id, assetId, placement }), signal: AbortSignal.timeout(175_000) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.error || '延伸未完成，原圖未改動。') as Error & {code?:string;runId?:string;stage?:string};
      error.code=payload?.code;
      error.runId=payload?.runId;
      error.stage=payload?.stage;
      throw error;
    }
    return payload as import('@/lib/extension-asset').ExtensionPreview;
  }

  async function applyBackgroundExtension(assetId: string, preview: import('@/lib/extension-asset').ExtensionPreview | null) {
    if (!selected?.production || !Array.isArray(selected.production.assets)) return false;
    const { applyExtension, restoreExtension } = await import('@/lib/extension-asset');
    const assets = (selected.production.assets as ProjectAsset[]).map(asset => asset.id === assetId
      ? preview ? applyExtension(asset, preview) : restoreExtension(asset) : asset);
    return saveProject({ production: { ...selected.production, assets } }, preview
      ? '已套用 AI 延伸背景；原圖保留，現有輸出圖片未覆寫' : '已還原原圖；現有輸出圖片未覆寫');
  }

  async function analyzeAssetFocus(assetId: string) {
    const response = await fetch('/api/content-projects/detect-subject', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceId, projectId: selected?.id, assetId }), signal: AbortSignal.timeout(55_000) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || '辨識未完成，請稍後重試。');
    return { focus: payload.focus as SubjectFocus | null, label: String(payload.detection?.label || '圖片主體'), reason: String(payload.detection?.reason || ''), cached: Boolean(payload.cached), background: payload.detection?.background as import('@/lib/composition-advice').CompositionAnalysis['background'] };
  }

  async function saveAssetFocus(assetId: string, updates: { subjectFocus: SubjectFocus | null; width: number; height: number }) {
    if (!selected?.production || !Array.isArray(selected.production.assets)) return false;
    return saveProject({ production: { ...selected.production,
      assets: (selected.production.assets as ProjectAsset[]).map(asset => asset.id === assetId ? { ...asset,
        subjectFocus: updates.subjectFocus ? { ...updates.subjectFocus, sourceWidth: updates.width, sourceHeight: updates.height } : null,
      } : asset),
    } }, '圖片焦點已儲存；現有輸出圖片不會被覆寫，下次製作會套用新裁切');
  }

  async function updateAsset(assetId: string, updates: Partial<ProjectAsset>) {
    if (!selected?.production || !Array.isArray(selected.production.assets))
      return;
    const assets = (selected.production.assets as ProjectAsset[]).map(
      (asset) => {
        if (updates.isCover) return { ...asset, isCover: asset.id === assetId };
        return asset.id === assetId ? { ...asset, ...updates } : asset;
      },
    );
    await saveProject(
      {
        production: {
          ...selected.production,
          assets,
          assetStatus: "pending",
        },
      },
      "圖片分配已儲存",
    );
  }

  async function addBrandLibraryAssets() {
    if (!selected?.production || !brandLibraryAssets.length) return;
    const existing = Array.isArray(selected.production.assets)
      ? (selected.production.assets as ProjectAsset[])
      : [];
    const existingUrls = new Set(existing.map((asset) => asset.url));
    const additions = brandLibraryAssets.filter(
      (asset) => !existingUrls.has(asset.url),
    );
    if (!additions.length) {
      setMessage("品牌素材庫圖片已經全部加入");
      return;
    }
    await saveProject(
      {
        production: {
          ...selected.production,
          assets: [...existing, ...additions],
          assetStatus: "pending",
        },
      },
      `已從品牌素材庫加入 ${additions.length} 張圖片`,
    );
  }

  async function removeAsset(assetId: string) {
    if (
      !selected?.production ||
      !Array.isArray(selected.production.assets) ||
      removingAssetId
    )
      return;
    const assets = (selected.production.assets as ProjectAsset[]).filter(
      (asset) => asset.id !== assetId,
    );
    setRemovingAssetId(assetId);
    try {
      await saveProject(
        {
          production: {
            ...selected.production,
            assets,
            assetStatus: "pending",
          },
        },
        "圖片素材已移除",
      );
    } finally {
      setRemovingAssetId(null);
    }
  }

  async function confirmAssets(mode?:CompositionMode) {
    if(saving || preparingImages.current)return;
    if (!selected?.production || !Array.isArray(selected.production.assets))
      return;
    if (!selected.production.assets.length) {
      setMessage("請先加入至少一張圖片素材");
      return;
    }
    const confirmed = await saveProject(
      {
        production: {
          ...selected.production,
          assetStatus: "confirmed",
          ...(mode?{compositionMode:mode,assets:setCompositionMode(selected.production.assets as ProjectAsset[],mode),autoBackgroundExtension:false,styleCompositionPreparation:null}:{}),
          assetsConfirmedAt: new Date().toISOString(),
        },
      },
      "圖片素材已確認，下一步可用真實素材比較內容風格",
      "style",
    );
    if (confirmed) setMessage("圖片素材已確認，下一步可用真實素材比較內容風格");
  }

  async function generatePageDrafts(attempt = "") {
    if (!workspaceId || !selected) return;
    if (draftRequestBusy.current) return;
    draftRequestBusy.current = true;
    setSaving(true);
    setMessage("步驟 1/2：正在準備圖片分析，已完成結果會自動重用…");
    try {
      let phase = "assets";
      let payload: any;
      // Each request completes at most one image analysis or the draft step.
      for (let step = 0; step < 200; step++) {
        const response = await fetch("/api/content-projects/generate-drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ workspaceId, projectId: selected.id, phase, attempt }),
        });
        payload = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(payload?.error || "未能生成逐頁草稿");
        if (!payload?.continue) break;
        phase = payload.phase;
        setMessage(phase === "assets"
          ? `步驟 1/2：圖片分析已保存 ${payload.completed}/${payload.total}，正在處理下一張…`
          : "步驟 2/2：圖片分析已完成並保存，正在生成文案及配圖草稿（最多約 150 秒）…");
      }
      if (!payload?.project) throw new Error("已保存進度，請再按一次繼續剩餘步驟。");
      setProjects((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, ...payload.project } : item,
        ),
      );
      setMessage("逐頁文案及版面草稿已完成");
      goToStep("drafts");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未能生成逐頁草稿");
    } finally {
      draftRequestBusy.current = false;
      setSaving(false);
    }
  }

  async function regeneratePageDrafts() {
    if (!Array.isArray(selected?.production?.pageDrafts) || !selected.production.pageDrafts.length) {
      await generatePageDrafts();
      return;
    }
    const confirmed = window.confirm(
      "重新生成會取代目前全部逐頁草稿，包括你已作出的修改。確定繼續？",
    );
    if (!confirmed) return;
    await generatePageDrafts(crypto.randomUUID());
  }

  function updatePageDraft(index: number, field: string, value: unknown) {
    if (!selected?.production || !Array.isArray(selected.production.pageDrafts))
      return;
    const pageDrafts = selected.production.pageDrafts.map(
      (draft: any, draftIndex: number) =>
        draftIndex === index
          ? {
              ...draft,
              [field]: value,
              ...(field === 'body' ? {fields:undefined} : {}),
              ...(field === "assetIds" && Array.isArray(value)
                ? { assetId: value[0] || "" }
                : field === "assetId"
                  ? { assetIds: value ? [value] : [] }
                  : {}),
            }
          : draft,
    );
    setProjects((current) =>
      current.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              production: {
                ...selected.production,
                pageDrafts,
                productionStatus: "drafts_ready",
              },
            }
          : item,
      ),
    );
  }

  async function savePageDrafts() {
    if (!selected?.production) return;
    await saveProject(
      { production: selected.production },
      "逐頁草稿修改已儲存",
      undefined,
      [
        { eventType: "edited", dimension: "copy", value: "content_draft", metadata: { step: "drafts", format: selected.selected_format } },
        { eventType: "edited", dimension: "design", value: "layout_direction", metadata: { step: "drafts", format: selected.selected_format } },
      ],
    );
    setEditingDraft(null);
  }

  async function deletePageDraft(index: number) {
    if (!selected?.production || !Array.isArray(selected.production.pageDrafts))
      return;
    if (isFixedCoreTemplate(selected.format_decision?.templateContractSnapshot)) {
      setMessage("這個標準母版固定為六頁；你可以修改內容，但不能刪除必要頁面。");
      return;
    }
    if (!window.confirm(`確定刪除 P.${index + 1} 草稿？其餘頁面會自動重新編號`))
      return;
    const pageDrafts = selected.production.pageDrafts
      .filter((_: unknown, draftIndex: number) => draftIndex !== index)
      .map((draft: any, draftIndex: number) => ({
        ...draft,
        page: `P.${draftIndex + 1}`,
      }));
    await saveProject(
      {
        production: {
          ...selected.production,
          pageDrafts,
          productionStatus: "drafts_ready",
        },
      },
      `P.${index + 1} 草稿已刪除`,
    );
    setEditingDraft(null);
  }

  async function confirmPageDrafts(optimizeBackground = false, retryPage?: string) {
    if (preparingImages.current || saving) return;
    if (!selected?.production || !Array.isArray(selected.production.pageDrafts))
      return;
    if (!selected.production.pageDrafts.length) {
      setMessage("請先保留至少一頁草稿");
      return;
    }
    if (editingDraft !== null) {
      setMessage("請先儲存正在編輯的頁面");
      return;
    }
    const requiredRoles = coreTemplatePageRoles(selected.format_decision?.templateContractSnapshot);
    if (isFixedCoreTemplate(selected.format_decision?.templateContractSnapshot)) {
      const copyLimits = (selected.format_decision?.templateContractSnapshot as { copy_limits?: { headline_chars_zh_max?: number; body_chars_zh_max_per_block?: number } })?.copy_limits;
      const maxHeadline = Number(copyLimits?.headline_chars_zh_max || 24);
      const maxBody = Number(copyLimits?.body_chars_zh_max_per_block || 72);
      const actualRoles = selected.production.pageDrafts.map((draft: any) => String(draft.role || draft.layout || ""));
      if (actualRoles.length !== requiredRoles.length || requiredRoles.some((item, index) => item.role !== actualRoles[index])) {
        setMessage("逐頁草稿與已選標準母版的六頁角色不一致，請重新生成。");
        return;
      }
      for (const [index, draft] of selected.production.pageDrafts.entries()) {
        const headlineLength = Array.from(String(draft.headline || "").replace(/\s+/g, "")).length;
        const bodyLines = Array.isArray(draft.body) ? draft.body : [];
        const assetIds = Array.isArray(draft.assetIds) ? draft.assetIds.filter(Boolean) : draft.assetId ? [draft.assetId] : [];
        const requiredImages = actualRoles[index] === "comparison" && hasComparisonColumns(draft) ? 2 : 1;
        if (headlineLength > maxHeadline || bodyLines.some((line: unknown) => Array.from(String(line || "")).length > maxBody)) {
          setMessage(`P.${index + 1} 文案超出標準母版上限（標題 ${maxHeadline} 字、每段正文 ${maxBody} 字），請先縮短。`);
          return;
        }
        if (assetIds.length < requiredImages) {
          setMessage(`P.${index + 1} 尚欠${requiredImages === 2 ? "兩張比較" : "一張"}圖片，補齊後才可製作。`);
          return;
        }
      }
    }
    const isVideo = selected.selected_format === "short_video";
    if (!isVideo && selected.production.productionStatus === 'images_ready' && !window.confirm('將重新製作輸出圖片。若有手動修改，請先備份；確定繼續？')) return;
    preparingImages.current = true;
    setSaving(true);
    try {
    const mode:CompositionMode=optimizeBackground?'ai':selected.production.compositionMode==='ai'?'ai':'original';
    let preparedAssets = setCompositionMode((selected.production.assets||[]) as ProjectAsset[],mode);
    const priorPreparation=selected.production.backgroundPreparation as {issues?:OptimizationIssue[]}|undefined;
    let issues:OptimizationIssue[]=retryPage?(priorPreparation?.issues||[]).filter(i=>i.page!==retryPage):[];
    if(!optimizeBackground && Array.isArray(preparedAssets)) {
      const failedIds=new Set((priorPreparation?.issues||[]).map(i=>i.assetId));
      preparedAssets=preparedAssets.map((a:ProjectAsset)=>failedIds.has(a.id)?{...a,compositionFit:'contain',compositionVariants:{...a.compositionVariants,...Object.fromEntries((priorPreparation?.issues||[]).filter(i=>i.assetId===a.id&&i.compositionKey).map(i=>[i.compositionKey!,{sourceUrl:a.url,action:'contain' as const,reason:'用家選擇保留原圖。'}]))}}:a);
    }
    const attemptAt=new Date().toISOString();
    const checkpoint=async(assets:unknown,status:string)=>{
      const ok=await saveProject({production:{...selected.production,compositionMode:mode,autoBackgroundExtension:false,assets,backgroundPreparation:{status,startedAt:attemptAt,issues}}},status==='needs_attention'?'部分頁面未完成，請選擇重試或保留原圖。':'正在處理構圖；現有下載仍是上次成功版本。');
      if(!ok)throw new Error('未能保存處理進度，已停止，請重新載入後再試。');
      setSaving(true);
    };
    if (optimizeBackground && !isVideo) {
      await checkpoint(preparedAssets,'processing');
      const [{coreMasterLayoutGeometry,getCoreMasterPageDesign},{resolveClearMagazineRole},{optimizeCarouselAssets}] = await Promise.all([
        import('@/lib/content-templates/core-master-template'), import('@/lib/content-templates/clear-magazine-carousel-v1'), import('@/lib/optimize-carousel-assets'),
      ]);
      const assets = preparedAssets as ProjectAsset[];
      const drafts = selected.production.pageDrafts as any[];
      const frames = drafts.flatMap((draft,index) => {
        if(draft.compositionMode==='original')return [];
        if(retryPage && issues.some(i=>i.page===draft.page))return [];
        const design = getCoreMasterPageDesign(selected.format_decision?.templateContractSnapshot, resolveClearMagazineRole(draft,index,drafts.length));
        if (!design) return [];
        const ids = [...new Set([...(draft.assetIds || []),draft.assetId].filter(Boolean))];
        const geometry = coreMasterLayoutGeometry({design,copy:draft,page:`P.${index+1}`,primary:assets.find(a=>a.id===ids[0]),secondary:assets.find(a=>a.id===ids[1]),planning:true});
        return geometry.images.flatMap(image => {
          const asset = assets.find(a=>a.url===image.asset.url);
          return asset ? [{assetId:asset.id,frame:image.rect,textZones:geometry.textZones,page:`P.${index+1}`}] : [];
        });
      });
      // Contained narrative layouts need no outpainting; an empty worklist is success.
      preparedAssets = await optimizeCarouselAssets(assets.map(a=>({...a,width:a.width||0,height:a.height||0})),frames,{
        analyze:analyzeAssetFocus,generate:generateBackgroundExtension,progress:setMessage,
        failure:issue=>{issues.push(issue);},
        checkpoint:assets=>checkpoint(assets,'processing'),
        dimensions:asset=>new Promise((resolve,reject)=>{
          const image = new Image();
          const timer = window.setTimeout(()=>reject(new Error('圖片尺寸載入逾時，請重試。')),15000);
          image.onload=()=>{clearTimeout(timer);resolve({width:image.naturalWidth,height:image.naturalHeight});};
          image.onerror=()=>{clearTimeout(timer);reject(new Error('圖片未能載入，請重試。'));};
          image.src=asset.url;
        }),
      });
      if(issues.length){await checkpoint(preparedAssets,'needs_attention');return;}
    }
    autoGenerationProjectRef.current = null;
    await saveProject(
      {
        production: {
          ...selected.production,
          assets: preparedAssets,
          compositionMode:mode,
          backgroundPreparation: {status:'ready',startedAt:attemptAt,issues:[]},
          autoBackgroundExtension: false,
          productionStatus: isVideo ? "package_ready" : "drafts_confirmed",
          draftsConfirmedAt: new Date().toISOString(),
        },
      },
      isVideo ? "短片製作包已確認，可以提交審批" : "內容草稿已確認，已進入圖片生成階段",
      "carousel",
    );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '構圖優化未完成，未開始出圖；可重試或直接用現有素材生成。');
    } finally { preparingImages.current = false; setSaving(false); }
  }

  async function keepFailedPage(issue:OptimizationIssue) {
    if(saving || preparingImages.current || !selected?.production)return;
    const preparation=selected.production.backgroundPreparation as BackgroundPreparation;
    const assets=(selected.production.assets as ProjectAsset[]).map(a=>a.id===issue.assetId?{...a,compositionFit:'contain',compositionVariants:{...a.compositionVariants,...(issue.compositionKey?{[issue.compositionKey]:{sourceUrl:a.url,action:'contain' as const,reason:'用家選擇保留原圖。'}}:{})}}:a);
    await saveProject({production:{...selected.production,assets,backgroundPreparation:{...preparation,issues:(preparation.issues||[]).filter(i=>i.assetId!==issue.assetId)}}},`${issue.page} 已選保留原圖；按「繼續製作圖片」輸出新版。`);
  }

  async function changePageComposition(page:string,mode:CompositionMode) {
    if(saving||preparingImages.current||!selected?.production)return;
    const drafts=(selected.production.pageDrafts||[]) as any[];
    const ok=await saveProject({production:{...selected.production,pageDrafts:drafts.map(d=>d.page===page?{...d,compositionMode:mode}:d)}},`${page} 已切換構圖方式，正在更新本頁；其他頁不變。`);
    if(ok)await generateCarouselImages(page);
  }

  async function submitVideoPackage() {
    if (!selected?.production) return;
    await saveProject(
      {
        stage: "approval",
        production: {
          ...selected.production,
          approvalStatus: "pending",
          submittedForApprovalAt: new Date().toISOString(),
        },
      },
      "短片製作包已提交審批",
    );
  }

  async function generateCarouselImages(page?:string) {
    if (!workspaceId || !selected) return;
    if(generatingCarousel)return;
    if(selected.production?.productionStatus==='images_ready' && !window.confirm(page?`重新排版 ${page}？其他頁面及已選底圖會保留。舊版本會保存。`:'重新排版全套？已選底圖會保留，手動編輯將由草稿重新排版；舊版本會保存。'))return;
    const activeWorkspaceId = workspaceId;
    const projectId = selected.id;
    const generationStartedAt = Date.now();
    setGeneratingCarousel(true);
    setSaving(true);
    setMessage("正在生成全套 Carousel 圖片，請勿關閉頁面…");
    try {
      const response = await fetch("/api/content-projects/generate-carousel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, projectId, page }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(payload?.detail || payload?.error || "未能生成圖片");
      setProjects((current) =>
        current.map((item) =>
          item.id === projectId ? { ...item, ...payload.project } : item,
        ),
      );
      setMessage(payload.warning || "全套 Carousel 圖片已生成");
    } catch (error) {
      if (error instanceof TypeError) {
        try {
          const recoveryResponse = await fetch(
            `/api/content-projects?workspaceId=${encodeURIComponent(activeWorkspaceId)}`,
            { cache: "no-store" },
          );
          const recoveryPayload = await recoveryResponse.json().catch(() => null);
          const recoveredProject = recoveryPayload?.projects?.find(
            (project: Project) => project.id === projectId,
          );
          const generatedAt = Date.parse(
            String(recoveredProject?.production?.imagesGeneratedAt || ""),
          );
          if (
            recoveryResponse.ok &&
            recoveredProject?.production?.productionStatus === "images_ready" &&
            generatedAt >= generationStartedAt
          ) {
            setProjects((current) =>
              current.map((item) =>
                item.id === projectId ? { ...item, ...recoveredProject } : item,
              ),
            );
            setMessage("全套 Carousel 圖片已生成");
            return;
          }
        } catch {
          // Preserve the original network error when server reconciliation fails.
        }
      }
      setMessage(error instanceof Error ? error.message : "未能生成圖片");
    } finally {
      setGeneratingCarousel(false);
      setSaving(false);
    }
  }

  function updateCaptionDraft(value: string) {
    if (!selected) return;
    setProjects((current) => current.map((project) => project.id === selected.id
      ? { ...project, production: { ...(project.production || {}), captionDraft: value } }
      : project));
  }

  async function saveCaptionDraft() {
    if (!selected?.production) return false;
    return saveProject({ production: selected.production }, "Caption 已儲存");
  }

  async function submitForApproval() {
    if (!selected?.production) return;
    const saved = await saveProject(
      {
        stage: "approval",
        production: {
          ...selected.production,
          approvalStatus: "pending",
          submittedForApprovalAt: new Date().toISOString(),
        },
      },
      selected.selected_format === "single_image" ? "單張貼文已提交審批" : "輪播貼文已提交審批",
    );
    if (saved) window.location.assign(`/onboarding/content-review?project=${encodeURIComponent(selected.id)}`);
  }

  const messageTone =
    saving ||
    startingProject ||
    generatingCarousel ||
    /^(正在|AI 正在)/.test(message)
      ? "loading"
      : /(未能|失敗|中斷|請先)/.test(message)
        ? "error"
        : "success";

  useEffect(() => {
    if (
      activeStep !== "carousel" ||
      selected?.selected_format === "short_video" ||
      selected?.production?.productionStatus !== "drafts_confirmed" ||
      saving ||
      generatingCarousel ||
      autoGenerationProjectRef.current === selected?.id
    )
      return;
    autoGenerationProjectRef.current = selected.id;
    void generateCarouselImages();
  }, [
    activeStep,
    generatingCarousel,
    saving,
    selected?.id,
    selected?.production?.productionStatus,
    selected?.selected_format,
  ]);

  useEffect(() => {
    if (!message || messageTone !== "success") return;
    const timer = window.setTimeout(() => setMessage(""), 4500);
    return () => window.clearTimeout(timer);
  }, [message, messageTone]);

  return (
    <main className="studio-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="內容製作" />
      <section className="studio-shell">
        <header className="studio-topbar">
          <h1>內容製作</h1>
        </header>

        <div className="studio-layout">
          <aside className="project-list">
            <div>
              <strong>製作中</strong>
              <span>{projects.length}</span>
            </div>
            <button type="button" className="new-project-button" onClick={openNewContent}>＋ 建立新內容</button>
            {loading ? (
              <p className="empty">正在整理內容…</p>
            ) : projects.length ? (
              projects.map((project) => (
                <article
                  key={project.id}
                  className={`project-list-card ${project.id === selected?.id ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className="project-select-button"
                    onClick={() => openProject(project)}
                  >
                    <strong>{project.title}</strong>
                    <div className="project-creator">
                      {project.creator?.avatarUrl ? (
                        <img
                          src={project.creator.avatarUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="project-creator-avatar" aria-hidden="true">
                          {(project.creator?.displayName || "W").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <small>{project.creator?.displayName || "Workspace Admin"}</small>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="project-delete-button"
                    aria-label={`刪除 ${project.title}`}
                    title="刪除內容"
                    disabled={deletingProjectId === project.id}
                    onClick={() => void deleteProject(project)}
                  >
                    {deletingProjectId === project.id ? "…" : "刪除"}
                  </button>
                </article>
              ))
            ) : (
              <p className="empty">去題材庫選擇一個題材開始製作</p>
            )}
          </aside>

          <section className="studio-workspace">
            {loading ? (
              <SoonLoading title="正在準備你的內容" description="SOON 正在整理製作進度及最近修改。" steps={["讀取內容", "整理素材", "恢復進度"]} />
            ) : selected ? (
              <>
                <div className="project-head">
                  <div>
                    <span>{stageLabels[selected.stage]}</span>
                    <h2>{selected.title}</h2>
                    {selected.source_url ? (
                      <a
                        href={selected.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        查看來源 ↗
                      </a>
                    ) : null}
                  </div>
                </div>

                <section className="studio-progress">
                  <div className="studio-progress-head">
                    <strong>製作進度</strong>
                  </div>
                  <nav className="studio-step-nav" aria-label="內容製作步驟">
                    {visibleStudioSteps.map((step, index) => {
                      const latestIndex = visibleStudioSteps.findIndex(
                        (item) => item.id === latestAvailableStep(selected),
                      );
                      const disabled = index > latestIndex;
                      const done = index < latestIndex;
                      const current = activeStep === step.id;
                      return (
                        <button
                          key={step.id}
                          type="button"
                          className={`${current ? "active" : ""} ${done ? "done" : ""}`}
                          disabled={disabled}
                          title={done ? `返回修改${stepLabel(step.id)}` : current ? "目前步驟" : "完成前一步後開放"}
                          onClick={() => goToStep(step.id)}
                        >
                          <span>{done ? "✓" : index + 1}</span>
                          <b>{stepLabel(step.id)}</b>
                          {current ? <em>目前</em> : null}
                        </button>
                      );
                    })}
                  </nav>
                </section>

                {activeStep === "brief" ? (
                  <div className="editor-card">
                    <div className="section-title">
                      <div>
                        <span>STEP 1</span>
                        <h3>你今次想講甚麼？</h3>
                      </div>
                      <em>不需要先懂得寫 Brief，零碎想法也可以</em>
                    </div>
                    <label className="brief-source-field">
                      <span>寫下你知道的事情</span>
                      <textarea
                        value={brief.summary}
                        onChange={(event) => {
                          setBrief({ ...brief, summary: event.target.value });
                          setDirectionRecommendations([]);
                          setRecommendedSlideCount(null);
                          setSlideCountReason("");
                        }}
                        placeholder={"例如：我想介紹新產品，但不確定應該突出功能、使用方法還是顧客感受。\n亦可以直接貼上文章、產品資料、活動詳情或任何零碎想法。"}
                      />
                      <small>毋須整理語句或決定格式，SOON 會先找出值得說的重點。</small>
                    </label>
                    <div className="angle-field">
                      <div className="direction-heading">
                        <div>
                          <span>{directionRecommendations.length ? "SOON 建議的製作方向" : "讓 SOON 整理今次內容"}</span>
                          <small>{directionRecommendations.length ? "選擇一個方向，或重新分析取得其他建議。" : "SOON 會分析內容重點、合適方向及製作安排。"}</small>
                        </div>
                        <button
                          type="button"
                          className="direction-recommend-button"
                          disabled={!String(brief.summary || "").trim() || recommendingDirections}
                          onClick={() => void recommendDirections()}
                        >
                          <SoonIcon name={recommendingDirections ? "refresh" : "spark"} size={16} />
                          {recommendingDirections ? "正在分析…" : directionRecommendations.length ? "重新分析" : "分析內容"}
                        </button>
                      </div>
                      {!String(brief.summary || "").trim() ? <p className="direction-hint">先在上方貼上資料，SOON 才能提供合適建議。</p> : null}
                      {directionRecommendations.length ? (
                        <div className="direction-card-grid">
                          {directionRecommendations.map((recommendation, index) => (
                            <button
                              type="button"
                              key={recommendation.id}
                              className={brief.directionId === recommendation.id ? "active" : ""}
                              onClick={() => setBrief({
                                ...brief,
                                angle: recommendation.title,
                                directionId: recommendation.id,
                                directionVersion: recommendation.version || "",
                                directionSource: brief.directionSource,
                              })}
                            >
                              <div className="direction-card-top">
                                <i><SoonIcon name={index === 0 ? "spark" : index === 1 ? "target" : "ideas"} size={17} /></i>
                                <span>{index === 0 ? "SOON 建議" : recommendation.category}</span>
                              </div>
                              <strong>{recommendation.title}</strong>
                              <p>{recommendation.concept}</p>
                              <small>{recommendation.reason}</small>
                              <em>「{recommendation.hook}」</em>
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <button type="button" className="custom-directions-toggle" onClick={() => setCustomDirectionsOpen((open) => !open)}>
                        自行選擇方向 <SoonIcon name="chevron-down" size={14} />
                      </button>
                      {customDirectionsOpen ? (
                        <div className="angle-options custom-direction-options">
                          {angleOptions.filter((option) => option !== "交由 AI 決定").map((option) => (
                            <button
                              type="button"
                              key={option}
                              className={brief.angle === option && !brief.directionId ? "active" : ""}
                              onClick={() => setBrief({ ...brief, angle: option, directionId: "", directionVersion: "", directionSource: "manual" })}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="actions">
                      <button
                        className="secondary"
                        disabled={saving || !permissions?.canEdit}
                        onClick={() => saveProject({ brief }, "Brief 已儲存")}
                      >
                        儲存
                      </button>
                      <button
                        disabled={
                          saving ||
                          !String(brief.summary || "").trim() ||
                          !directionRecommendations.length ||
                          !permissions?.canEdit
                        }
                        onClick={() =>
                          saveProject(
                            {
                              brief,
                              stage: "format",
                            },
                            "內容方向已確認，請選擇合適格式",
                            "format",
                            [{
                              eventType: "selected",
                              dimension: "copy",
                              value: brief.directionId || brief.angle,
                              metadata: {
                                source: brief.directionSource || "manual",
                                directionTitle: brief.angle,
                                directionVersion: brief.directionVersion || null,
                              },
                            }],
                          )
                        }
                      >
                        {directionRecommendations.length ? "確認方向，選擇格式 →" : "請先分析內容"}
                      </button>
                    </div>
                  </div>
                ) : activeStep === "format" ? (
                  <div className="editor-card">
                    <div className="section-title">
                      <div>
                        <span>STEP 2</span>
                        <h3>用甚麼形式最能說清楚？</h3>
                      </div>
                      <em>{formatReason || "SOON 已按內容重點提供建議，你仍可自行選擇"}</em>
                    </div>
                    <div className="format-grid">
                      {formats.map((format) => (
                        <button
                          key={format.id}
                          data-format={format.id}
                          className={
                            selectedFormat === format.outputFormat && (format.videoMethod === null || videoMethod === format.videoMethod) ? "active" : ""
                          }
                          onClick={() => {
                            setSelectedFormat(format.outputFormat);
                            if (format.videoMethod) setVideoMethod(format.videoMethod);
                            const recommended = styleTemplates.find((template) => template.formats.includes(format.outputFormat));
                            setSelectedStyleCode(recommended?.code || "");
                          }}
                        >
                          <i><SoonIcon name={format.icon} size={24} /></i>
                          <span>
                            <strong>{format.label}{recommendedFormat === format.outputFormat && (format.outputFormat !== "short_video" || format.videoMethod === videoMethod) ? <em className="soon-recommended-badge">SOON 建議</em> : null}</strong>
                            <small>{format.note}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                    {selectedFormat === "carousel" && recommendedSlideCount ? (
                      <section className="slide-count-recommendation" aria-label="輪播張數">
                        <div>
                          <strong>{`SOON 建議製作 ${recommendedSlideCount} 張`}</strong>
                          <small>{slideCountReason || "你可以按今次需要選擇 3–10 張。"}</small>
                        </div>
                        <div className="quantity-options" aria-label="選擇輪播圖片數量">
                          {Array.from({ length: 8 }, (_, index) => index + 3).map((count) => (
                            <button type="button" key={count} className={carouselSlideCount === count ? "active" : ""} onClick={() => setCarouselSlideCount(count)}>
                              {count} 張{count === recommendedSlideCount ? <small>SOON 建議</small> : null}
                            </button>
                          ))}
                        </div>
                      </section>
                    ) : null}
                    <div className="actions">
                      <button
                        className="secondary"
                        onClick={() => goToStep("brief")}
                      >
                        ← 修改內容方向
                      </button>
                      <button
                        disabled={
                          saving || !selectedFormat || !permissions?.canEdit
                        }
                        onClick={async () => {
                          const saved = await saveProject(
                            {
                              formatDecision: {
                                ...(selected.format_decision || {}),
                                videoMethod: selectedFormat === "short_video" ? videoMethod : null,
                                templateCode: null,
                                renderTemplateCode: null,
                                templateSource: null,
                                templateName: null,
                                templateSelectedAt: null,
                                ...(selectedFormat === "carousel" ? {
                                  slideCount: carouselSlideCount,
                                  slideCountSource: recommendedSlideCount === carouselSlideCount ? "soon_ai" : "manual",
                                  slideCountReason: slideCountReason || null,
                                } : {}),
                              },
                              selectedFormat,
                              stage: "production",
                            },
                            "格式已確認，SOON 正在整理故事結構",
                            "structure",
                            [
                              {
                                eventType: selected.selected_format && selected.selected_format !== selectedFormat ? "changed" : "selected",
                                dimension: "format",
                                value: selectedFormat,
                                previousValue: selected.selected_format || null,
                                metadata: { source: "content_studio" },
                              },
                              ...(selectedFormat === "short_video" ? [{
                                eventType: selected.format_decision?.videoMethod && selected.format_decision.videoMethod !== videoMethod ? "changed" as const : "selected" as const,
                                dimension: "production_method" as const,
                                value: videoMethod,
                                previousValue: typeof selected.format_decision?.videoMethod === "string" ? selected.format_decision.videoMethod : null,
                                metadata: { source: "content_studio" },
                              }] : []),
                            ],
                          );
                          if (saved) await generateStructure();
                        }}
                      >
                        確認格式 →
                      </button>
                    </div>
                  </div>
                ) : activeStep === "style" ? (
                  <div className="editor-card">
                    <div className="section-title">
                      <div>
                        <span>STEP {studioSteps.findIndex((step) => step.id === "style") + 1}</span>
                        <h3>選擇內容風格</h3>
                      </div>
                      <em>{loadingStyles ? "SOON AI 正在配對合適風格…" : coreStyles.length ? `找到 ${coreStyles.length} 款合適風格` : "風格配對尚未完成"}</em>
                    </div>
                    <div className="style-intro">
                      <div><b>{isShortVideo ? "用同一份劇本，直接比較短片視覺" : "用同一故事、同一組素材，直接比較版面"}</b><span>{isShortVideo ? "候選風格均使用已確認劇本生成一張無字 9:16 首幀 preview，讓你比較構圖、鏡頭感及整體氣氛。" : "候選風格均使用已確認的故事結構及 STEP 4 圖片素材，讓你比較的只有排版、字體層級及視覺處理。"}</span></div>
                    </div>
                    <details className="style-preview-notice">
                      <summary>預覽與正式版面的分別</summary>
                      <b>目前只屬風格預覽</b>
                      <span>{isShortVideo ? "這張無字圖片只模擬短片首鏡；選擇後，SOON 會按完整劇本建立逐鏡製作包。" : "選擇後，SOON 會按完整故事及圖片生成正式版面；到「編輯圖片」仍可逐頁調整文字、圖片、字體、大小及位置。"}</span>
                    </details>
                    {!isShortVideo ? <section className="style-preview-notice" aria-live="polite">
                      <b>{selected.production?.compositionMode==='ai'?'AI 智能構圖':selected.production?.compositionMode==='original'?'原圖創作':'尚未選擇圖片製作方式'}</b>
                      <p>{saving?'正在準備構圖，完成的結果會逐張保存。':'只示範封面、內文、收尾；正式製作會再按各頁圖片框及文字位置檢查。'}</p>
                      <button type="button" disabled={saving} onClick={()=>goToStep('assets')}>更改製作方式</button>
                      {selected.production?.compositionMode==='ai' && (selected.production.styleCompositionPreparation as {status?:string}|undefined)?.status!=='ready'?<button type="button" disabled={saving} onClick={()=>void prepareStyleCompositions(compositionPreviewSignature)}>繼續／重試預覽構圖</button>:null}
                    </section>:null}
                    <div className="style-template-grid">
                      {visibleDisplayStyles.map((template, index) => {
                        const slides = contextualPreviewSlides(template, brief.angle);
                        return (
                        <article key={template.code} className={selectedStyleCode === template.code ? "active" : ""}>
                          {isShortVideo ? renderVideoStylePreview(template) : renderStylePreview(template.code) || <div className="contextual-preview" data-style={template.code}>
                            {slides.map((slide, slideIndex) => (
                              <div key={`${slide.role}-${slideIndex}`} className={slide.role} data-layout={slide.layout || "standard"} style={{ background: template.palette[0], color: template.palette[1] }}>
                                <span className="preview-page-role">{slide.label}</span>
                                <i className="preview-image-area" style={{
                                  backgroundColor: template.palette[2],
                                  backgroundImage: previewImageUrls.length
                                    ? `linear-gradient(135deg,rgba(255,255,255,.05),rgba(32,33,38,.18)),url(${JSON.stringify(previewImageUrls[slideIndex % previewImageUrls.length])})`
                                    : undefined,
                                }} aria-hidden="true" />
                                <span className="preview-page-copy">
                                  {slide.eyebrow ? <small>{slide.eyebrow}</small> : null}
                                  <strong>{slide.title}</strong>
                                  {slide.detail ? <p>{slide.detail}</p> : null}
                                </span>
                              </div>
                            ))}
                          </div>}
                          <div className="template-copy">
                            <span>{template.core?.recommendation?.source==='layout_eligibility' ? "版面可用" : template.code === "product-focus" ? "STYLE 02" : template.code === "ranking-review" ? "STYLE 03" : index === 0 ? "SOON 建議" : "可選風格"}</span>
                            <strong>{template.name}</strong>
                            <small>{template.note}</small>
                            {template.core?.recommendation?.reason ? <p className="style-recommendation-reason"><b>{template.core.recommendation.source==='layout_eligibility'?'版面適用說明（非內容核實）':'AI 推薦原因'}</b>{template.core.recommendation.reason}</p> : null}
                            {template.core?.recommendation?.gaps?.length ? <details><summary>製作前需補充</summary><ul>{template.core.recommendation.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul></details> : null}
                            <em>{template.source === "soon_core" ? `參考 ${template.core?.evidence?.confirmedReferenceCount || 0} 個已確認案例` : "SOON 基本品牌模板"}</em>
                            <button type="button" onClick={() => setSelectedStyleCode(template.code)}>
                              {selectedStyleCode === template.code ? "✓ 已選擇" : "選用這款"}
                            </button>
                          </div>
                        </article>
                      )})}
                    </div>
                    {displayStyles.find((template) => template.code === selectedStyleCode) ? (() => {
                      const rules = displayStyles.find((template) => template.code === selectedStyleCode)!;
                      return <details className="style-rule-preview"><summary>查看「{rules.name}」製作規格</summary><div><section><b>內容結構</b>{rules.rules.structure.map((rule) => <span key={rule}>✓ {rule}</span>)}</section><section><b>文案</b>{rules.rules.copy.map((rule) => <span key={rule}>✓ {rule}</span>)}</section><section><b>視覺</b>{rules.rules.visual.map((rule) => <span key={rule}>✓ {rule}</span>)}</section></div><small>{rules.source === "soon_core" ? "已連接 SOON 最新製作規格" : "SOON 經典風格"}</small></details>;
                    })() : null}
                    <details className="style-rule-preview">
                      <summary>素材狀態{confirmedPhotoCount(selected.production) ? ` · 已沿用 ${confirmedPhotoCount(selected.production)} 張已確認圖片` : "與補充確認"}</summary>
                      <p>沿用上一步的素材。以下是補充確認，不代表每項都是必要條件。</p>
                      {(isShortVideo ? [["photos","可用圖片"],["footage","現場影片"],["presenter","可出鏡主持"],["research","資料已核實"]] : [["photos","可用圖片"],["research","資料已核實"]]).map(([id,label]) => {
                        const inherited = id === "photos" && confirmedPhotoCount(selected.production) > 0;
                        return <label key={id} style={{display:"inline-flex",alignItems:"center",gap:6,marginRight:12}}><input type="checkbox" style={{width:"auto"}} disabled={saving || loadingStyles || inherited} checked={inherited || (Array.isArray(selected.format_decision?.confirmedMaterials) && selected.format_decision.confirmedMaterials.includes(id))} onChange={async event => { const current = Array.isArray(selected.format_decision?.confirmedMaterials) ? selected.format_decision.confirmedMaterials as string[] : []; await saveProject({formatDecision:{...selected.format_decision,confirmedMaterials:event.target.checked?[...current,id]:current.filter(value=>value!==id)}},""); }} />{label}{inherited ? "（承接上一步）" : ""}</label>;
                      })}
                    </details>
                    {loadingStyles ? <p className="style-loading">正在分析合適風格…</p> : null}
                    {styleMessage ? <p role="status">{styleMessage} <button type="button" onClick={() => setStyleRetry(value => value + 1)}>重新分析</button></p> : null}
                    {expandedStyleCode ? <div className="style-preview-modal" role="dialog" aria-modal="true" aria-label="放大風格預覽" onClick={() => setExpandedStyleCode(null)}>
                      <div className="style-preview-modal-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="style-preview-modal-head"><div><small>{isShortVideo ? "共同劇本 · 9:16 首幀示意" : selected.selected_format === "single_image" ? "共同題材 · 單張示意" : isClearMagazineCarousel(expandedStyleCode) ? "共同題材 · 母版排版預覽" : "共同題材 · 三頁示意"}</small><strong>{displayStyles.find((item) => item.code === expandedStyleCode)?.name || "風格預覽"}</strong></div><button type="button" onClick={() => setExpandedStyleCode(null)} aria-label="關閉預覽">×</button></div>
                        {isShortVideo ? renderVideoStylePreview(displayStyles.find((item) => item.code === expandedStyleCode)!) : renderStylePreview(expandedStyleCode, true)}
                        <p>{isShortVideo ? "預覽使用已確認劇本的 Hook、首鏡及字幕；正式製作會沿用你選定的短片風格。" : "預覽使用已確認的故事結構及同一組圖片素材；正式製作會沿用你選定的風格。"}</p>
                      </div>
                    </div> : null}
                    <div className="actions">
                      <button className="secondary" type="button" onClick={() => goToStep(selected.selected_format === "short_video" ? "structure" : "assets")}>← 返回{selected.selected_format === "short_video" ? "故事結構" : "圖片素材"}</button>
                      <button type="button" disabled={saving || loadingStyles || !styleRecommendationId || !selectedStyleCode} onClick={async () => {
                        const template = displayStyles.find((item) => item.code === selectedStyleCode);
                        const core = template?.core;
                        const coreTemplate = core?.templates?.[0];
                        const templateContract = coreTemplate?.version.contract || null;
                        const nextProduction = isFixedCoreTemplate(templateContract)
                          ? {
                              ...(selected.production || {}),
                              pages: applyCoreTemplateStructure(selected.production?.pages, templateContract),
                              templateStructureVersion: coreTemplate?.version.number || null,
                              templateStructureHash: coreTemplate?.version.contentHash || null,
                            }
                          : selected.production;
                        const saved = await saveProject({
                          formatDecision: {
                            ...(selected.format_decision || {}),
                            recommendationId: styleRecommendationId,
                            templateCode: selectedStyleCode,
                            templateVersion: template?.version || 1,
                            templateSource: template?.source || "soon_creator",
                            templateName: template?.name || selectedStyleCode,
                            templateTone: template?.tone || "",
                            renderTemplateCode: coreTemplate?.version.rendererCode
                              || (isClearMagazineCarousel(selectedStyleCode)
                                ? clearMagazineCarouselV1.code
                                : selectedStyleCode),
                            styleId: core?.styleId || null,
                            styleVersionId: core?.version.id || null,
                            styleVersionRef: core?.version.ref || null,
                            styleContentHash: core?.version.contentHash || null,
                            styleRulesSnapshot: core?.version.rules || null,
                            templateRegistryId: coreTemplate?.templateId || null,
                            templateRegistryCode: coreTemplate?.code || null,
                            templateRegistryVersion: coreTemplate?.version.number || null,
                            templateContentHash: coreTemplate?.version.contentHash || null,
                            templateContractSnapshot: templateContract,
                            templateCreatorCommit: coreTemplate?.version.creatorCommit || null,
                            templateSelectedAt: new Date().toISOString(),
                          },
                          ...(nextProduction ? { production: nextProduction } : {}),
                        }, "", undefined, [{
                          eventType: selected.format_decision?.templateCode && selected.format_decision.templateCode !== selectedStyleCode ? "changed" : "selected",
                          dimension: "template",
                          value: selectedStyleCode,
                          previousValue: typeof selected.format_decision?.templateCode === "string" ? selected.format_decision.templateCode : null,
                          metadata: {
                            templateVersion: coreTemplate?.version.number || template?.version || 1,
                            templateSource: template?.source || "soon_creator",
                            styleVersionRef: core?.version.ref || null,
                            templateRegistryId: coreTemplate?.templateId || null,
                            templateContentHash: coreTemplate?.version.contentHash || null,
                            rendererCode: coreTemplate?.version.rendererCode || null,
                            format: selected.selected_format,
                          },
                        }]);
                        if (saved) await generatePageDrafts();
                      }}>{saving ? "儲存中…" : "使用這個風格 →"}</button>
                    </div>
                  </div>
                ) : (
                  <div className="editor-card production-card" data-step={activeStep}>
                    <div className="section-title">
                      <div>
                        <span>STEP {studioSteps.findIndex((step) => step.id === activeStep) + 1}</span>
                        <h3>{stepLabel(activeStep)}</h3>
                      </div>
                      <em>按照已確認的內容設定製作</em>
                    </div>
                    {generatingStructure ? (
                      <div className="production-ready is-generating" role="status" aria-live="polite">
                        <b className="working" />
                        <h4>{isShortVideo ? "正在整理短片劇本" : `正在重新整理 ${carouselSlideCount} 頁內容`}</h4>
                        <p>SOON 正在重新核對資料</p>
                      </div>
                    ) : selected.production?.status ? (
                      <div className="structure-result">
                        <div className="structure-status">
                          <b>✓</b>
                          <div>
                            <h4>
                              {selected.production.status ===
                              "structure_confirmed"
                                ? isShortVideo ? "短片劇本已確認" : "故事結構已確認"
                                : isShortVideo ? "資料核查＋短片劇本" : "資料核查＋故事結構"}
                            </h4>
                            <p>SOON 已完成資料核查，請確認以下{isShortVideo ? "劇本及鏡頭安排" : "內容順序"}是否合適。</p>
                          </div>
                        </div>
                        <details className="structure-evidence">
                          <summary>查看資料核查詳情</summary>
                          <p>{String(selected.production.verificationSummary || "")}</p>
                        <div className="fact-grid">
                          {[
                            ["已確認事實", selected.production.confirmedFacts],
                            [
                              "當事人自述",
                              selected.production.selfReportedClaims,
                            ],
                            [
                              "待核實事項",
                              selected.production.unverifiedClaims,
                            ],
                          ].map(([label, values]) => (
                            <section key={String(label)}>
                              <h5>{String(label)}</h5>
                              <ul>
                                {(Array.isArray(values) ? values : []).map(
                                  (value, index) => (
                                    <li key={index}>{String(value)}</li>
                                  ),
                                )}
                              </ul>
                            </section>
                          ))}
                        </div>
                        </details>
                        <div className="story-pages">
                          <h4>{isShortVideo ? "短片劇本" : "內容順序"}</h4>
                          {(isShortVideo ? videoScript : Array.isArray(selected.production.pages)
                            ? selected.production.pages : []).map((page: any, index: number) => (
                            <article key={index}>
                              <span>{isShortVideo ? page.time : page.page || `P.${index + 1}`}</span>
                              <div>
                                {editingPage === index ? (
                                  <div className="page-editor">
                                    <label>
                                      <span>{isShortVideo ? "劇本段落" : "Headline"}</span>
                                      <input
                                        value={isShortVideo ? page.section || "" : page.headline || ""}
                                        onChange={(event) =>
                                          updateStoryPage(
                                            index,
                                            isShortVideo ? "section" : "headline",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </label>
                                    {isShortVideo ? <label>
                                      <span>時間碼</span>
                                      <input value={page.time || ""} onChange={(event) => updateStoryPage(index, "time", event.target.value)} />
                                    </label> : null}
                                    <label>
                                      <span>{isShortVideo ? "旁白／對白" : "內容方向"}</span>
                                      <textarea
                                        value={isShortVideo ? page.dialogue || "" :
                                          page.copyDirection ||
                                          page.purpose ||
                                          ""
                                        }
                                        onChange={(event) =>
                                          updateStoryPage(
                                            index,
                                            isShortVideo ? "dialogue" : "copyDirection",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </label>
                                    <label>
                                      <span>{isShortVideo ? "畫面／人物動作" : "畫面方向"}</span>
                                      <textarea
                                        value={isShortVideo ? page.visual || "" : page.visualDirection || ""}
                                        onChange={(event) =>
                                          updateStoryPage(
                                            index,
                                            isShortVideo ? "visual" : "visualDirection",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </label>
                                    {isShortVideo ? <>
                                      <label><span>畫面字幕</span><textarea value={page.caption || ""} onChange={(event) => updateStoryPage(index, "caption", event.target.value)} /></label>
                                      <label><span>拍攝／生成提示</span><textarea value={page.productionNote || ""} onChange={(event) => updateStoryPage(index, "productionNote", event.target.value)} /></label>
                                    </> : null}
                                    <div className="page-editor-actions">
                                      <button
                                        className="secondary"
                                        onClick={() => setEditingPage(null)}
                                      >
                                        取消
                                      </button>
                                      <button
                                        disabled={saving}
                                        onClick={saveStoryPages}
                                      >
                                        儲存修改
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="page-card-head">
                                      <h5>{isShortVideo ? page.section || "未命名段落" : page.headline || "未命名頁面"}</h5>
                                      <div>
                                        <button
                                          onClick={() => setEditingPage(index)}
                                        >
                                          編輯
                                        </button>
                                        <button
                                          className="delete"
                                          onClick={() => deleteStoryPage(index)}
                                        >
                                          刪除
                                        </button>
                                      </div>
                                    </div>
                                    {isShortVideo ? <>
                                      <p><strong>旁白／對白：</strong>{page.dialogue || "—"}</p>
                                      <p><strong>畫面：</strong>{page.visual || "—"}</p>
                                      {page.caption ? <p><strong>字幕：</strong>{page.caption}</p> : null}
                                      {page.productionNote ? <details className="page-visual-detail"><summary>查看拍攝／生成提示</summary><p>{page.productionNote}</p></details> : null}
                                    </> : <>
                                      <p>{page.copyDirection || page.purpose || ""}</p>
                                      {page.visualDirection ? <details className="page-visual-detail"><summary>查看畫面建議</summary><p>{page.visualDirection}</p></details> : null}
                                    </>}
                                  </>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                        {Array.isArray(selected.production.sources) &&
                        selected.production.sources.length ? (
                          <div className="structure-sources">
                            <h5>來源</h5>
                            {selected.production.sources.map(
                              (source: any, index) =>
                                source?.url ? (
                                  <a
                                    key={index}
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {source.label || source.url} ↗
                                  </a>
                                ) : null,
                            )}
                          </div>
                        ) : null}
                        {selected.production.status ===
                        "structure_confirmed" ? (
                          <>
                            <div className="next-production">
                              <div className="asset-upload-head">
                                <div>
                                  <b>圖片素材</b>
                                  <p>上載現有圖片、由 AI 生成，或者搜尋有授權資料嘅網上圖片</p>
                                </div>
                              </div>
                              <div className="asset-source-tabs" role="tablist" aria-label="圖片素材來源">
                                <button type="button" className={assetSourceMode === "upload" ? "active" : ""} onClick={() => setAssetSourceMode("upload")}>↑ 上載圖片</button>
                                <button type="button" className={assetSourceMode === "generate" ? "active" : ""} onClick={() => setAssetSourceMode("generate")}>✦ AI 生成圖片</button>
                                <button type="button" className={assetSourceMode === "search" ? "active" : ""} onClick={() => setAssetSourceMode("search")}>⌕ AI 搜尋授權圖片</button>
                              </div>
                              {assetSourceMode === "upload" ? (
                                <div className="asset-upload-block">
                                  <div className="asset-source-panel">
                                    <div><b>使用你已有嘅圖片</b><p>適合品牌相、產品相、活動相或已獲授權素材。</p></div>
                                    <div className="asset-upload-actions">
                                      {brandLibraryAssets.length ? <button type="button" className="asset-library-button" disabled={saving} onClick={() => void addBrandLibraryAssets()}>從品牌素材庫加入</button> : null}
                                      <label className="asset-upload-button">{uploadingAssets ? "處理中…" : "+ 上載圖片"}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple disabled={uploadingAssets} onChange={uploadProjectAssets} /></label>
                                    </div>
                                  </div>
                                  {assetUploadStatus ? <div className={`asset-upload-status ${assetUploadStatus.type}`} role={assetUploadStatus.type === "error" ? "alert" : "status"}><b aria-hidden="true">{assetUploadStatus.type === "error" ? "!" : assetUploadStatus.type === "success" ? "✓" : ""}</b><span>{assetUploadStatus.text}</span></div> : null}
                                </div>
                              ) : assetSourceMode === "generate" ? (
                                <div className="asset-source-panel asset-ai-panel">
                                  <div><b>按每頁 AI 畫面建議生成</b><p>圖片會直接加入指定頁面；AI 生成內容仍建議由你最後檢查。</p></div>
                                  <div className="asset-page-actions">
                                    {(Array.isArray(selected.production.pages) ? selected.production.pages : []).map((page: any, index: number) => {
                                      const pageName = page?.page || `P.${index + 1}`;
                                      return <button type="button" key={pageName} disabled={Boolean(generatingAssetPage)} onClick={() => void generateProjectAsset(pageName)}>{generatingAssetPage === pageName ? `${pageName} 生成中…` : `生成 ${pageName}`}</button>;
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="asset-search-panel">
                                  <div className="asset-license-note"><b>搜尋可商用 Creative Commons／公眾領域圖片</b><p>搜尋結果嘅授權資料由原來源提供，可能有誤差。發佈前請開啟原頁核對授權、署名及人物／商標權利；SOON 不會將一般網頁圖片當作可自由使用。</p></div>
                                  <div className="asset-search-controls">
                                    <select value={assetTargetPage} onChange={(event) => setAssetTargetPage(event.target.value)}>{(Array.isArray(selected.production.pages) ? selected.production.pages : []).map((page: any, index: number) => { const pageName = page?.page || `P.${index + 1}`; return <option key={pageName} value={pageName}>{pageName}</option>; })}</select>
                                    <input value={imageSearchQuery} onChange={(event) => setImageSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchLicensedImages(); }} placeholder="留空會按該頁 AI 畫面建議搜尋" />
                                    <button type="button" disabled={searchingImages} onClick={() => void searchLicensedImages()}>{searchingImages ? "AI 搜尋中…" : "按 AI 建議搜尋"}</button>
                                  </div>
                                  {licensedResults.length ? <div className="licensed-result-grid">{licensedResults.map((result) => <article key={result.id}><img src={result.thumbnail} alt={result.title} /><div><strong>{result.title}</strong><small>{result.creator} · {result.license}</small><div><a href={result.sourceUrl || result.licenseUrl || "#"} target="_blank" rel="noreferrer">查看來源／授權 ↗</a><button type="button" onClick={() => void addLicensedImage(result)}>加入 {assetTargetPage}</button></div></div></article>)}</div> : null}
                                </div>
                              )}
                              <details className="asset-visual-guidance">
                                <summary>查看 SOON 的畫面建議</summary>
                                {Array.isArray(selected.production.pages) &&
                                selected.production.pages.some(
                                  (page) =>
                                    page &&
                                    typeof page === "object" &&
                                    "visualDirection" in page &&
                                    typeof page.visualDirection === "string" &&
                                    page.visualDirection.trim(),
                                ) ? (
                                  <ul>
                                    {selected.production.pages.map(
                                      (page, index) =>
                                        page &&
                                        typeof page === "object" &&
                                        "visualDirection" in page &&
                                        typeof page.visualDirection === "string" &&
                                        page.visualDirection.trim() ? (
                                          <li key={index}>
                                            <strong>P.{index + 1}</strong>
                                            <span>{page.visualDirection}</span>
                                          </li>
                                        ) : null,
                                    )}
                                  </ul>
                                ) : (
                                  <p>AI 暫未提供指定畫面建議，可按每頁內容準備相關圖片。</p>
                                )}
                              </details>
                              {Array.isArray(selected.production.assets) &&
                              selected.production.assets.length ? (
                                <div className="asset-grid">
                                  {(
                                    selected.production.assets as ProjectAsset[]
                                  ).map((asset) => (
                                    <article key={asset.id}>
                                      <img
                                        src={asset.url}
                                        alt={asset.filename}
                                      />
                                      <div>
                                        <strong>{asset.filename}</strong>
                                        <small>
                                          {asset.width} × {asset.height}
                                          {asset.sourceType !== "ai_generated" &&
                                          (asset.width < 1080 ||
                                          asset.height < 1080)
                                            ? " · 解像度偏低"
                                            : ""}
                                        </small>
                                        {asset.sourceType ? (
                                          <small className="asset-source-meta">
                                            {asset.sourceType === "ai_generated" ? "✦ AI 生成" : asset.sourceType === "licensed_search" ? `⌕ ${asset.sourceLabel || "授權圖片"}${asset.creator ? ` · ${asset.creator}` : ""}${asset.license ? ` · ${asset.license}` : ""}` : asset.sourceLabel || "自行上載"}
                                            {asset.sourceUrl ? <a href={asset.sourceUrl} target="_blank" rel="noreferrer"> 核對來源 ↗</a> : null}
                                          </small>
                                        ) : null}
                                        <select
                                          value={asset.assignedPage || "auto"}
                                          onChange={(event) =>
                                            updateAsset(asset.id, {
                                              assignedPage: event.target.value,
                                            })
                                          }
                                        >
                                          <option value="auto">
                                            交俾 AI 配對
                                          </option>
                                          {(Array.isArray(
                                            selected.production?.pages,
                                          )
                                            ? selected.production.pages
                                            : []
                                          ).map((page: any, index: number) => (
                                            <option
                                              key={index}
                                              value={
                                                page.page || `P.${index + 1}`
                                              }
                                            >
                                              {page.page || `P.${index + 1}`}
                                            </option>
                                          ))}
                                        </select>
                                        <div className="asset-actions">
                                          <button
                                            type="button"
                                            className={
                                              asset.isCover ? "active" : ""
                                            }
                                            disabled={saving || Boolean(removingAssetId)}
                                            onClick={() =>
                                              updateAsset(asset.id, {
                                                isCover: true,
                                              })
                                            }
                                          >
                                            {asset.isCover
                                              ? "封面圖 ✓"
                                              : "設為封面"}
                                          </button>
                                          <button
                                            type="button"
                                            aria-label={`移除圖片素材 ${asset.filename}`}
                                            disabled={saving || Boolean(removingAssetId)}
                                            onClick={() =>
                                              removeAsset(asset.id)
                                            }
                                          >
                                            {removingAssetId === asset.id
                                              ? "移除中…"
                                              : "移除"}
                                          </button>
                                        </div>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              ) : (
                                <div className="asset-empty">未有圖片素材</div>
                              )}
                              {Array.isArray(selected.production.assets) &&
                              selected.production.assets.length ? (
                                <div className="asset-confirm-row">
                                  {saving ? (
                                    <span className="asset-generation-status">
                                      <b aria-hidden="true" />
                                      <span>
                                        <strong>SOON 正在確認圖片素材</strong>
                                        完成後會進入內容風格，讓你用同一組素材直接比較版面。
                                      </span>
                                    </span>
                                  ) : selected.production.assetStatus ===
                                    "confirmed" ? (
                                    <span>✓ 圖片素材已確認，可以比較內容風格</span>
                                  ) : (
                                    <span>
                                      確認後，下一步會用同一組素材比較內容風格
                                    </span>
                                  )}
                                  <CompositionModeChoice mode={selected.production.compositionMode as CompositionMode|undefined} busy={saving} onChoose={mode=>void confirmAssets(mode)}/>
                                </div>
                              ) : null}
                            </div>
                            {(selected.production.productionStatus ===
                              "drafts_ready" ||
                              selected.production.productionStatus ===
                                "drafts_confirmed" ||
                              selected.production.productionStatus ===
                                "package_ready" ||
                              selected.production.productionStatus ===
                                "images_ready") &&
                            Array.isArray(selected.production.pageDrafts) ? (
                              <div className="page-drafts">
                                <div className="page-drafts-heading">
                                  <h4>{selected.selected_format === "short_video" ? "逐鏡短片製作草稿" : selected.selected_format === "single_image" ? "單張貼文草稿" : "逐頁文案及版面草稿"}</h4>
                                  <div className="page-drafts-heading-actions">
                                    {selected.production.productionStatus === "drafts_ready" ? (
                                      <button type="button" disabled={saving || editingDraft !== null} onClick={() => void regeneratePageDrafts()}>
                                        {saving ? "正在重新生成…" : "重新生成草稿"}
                                      </button>
                                    ) : null}
                                    {selected.production.productionStatus === "drafts_confirmed" || selected.production.productionStatus === "package_ready" ? (
                                      <span className="confirmed-pill">已確認</span>
                                    ) : null}
                                  </div>
                                </div>
                                {selected.production.pageDrafts.map(
                                  (draft: any, index: number) => {
                                    const availableAssets = Array.isArray(
                                      selected.production?.assets,
                                    )
                                      ? selected.production.assets as ProjectAsset[]
                                      : [];
                                    const requestedAssetIds = [
                                      ...(Array.isArray(draft.assetIds) ? draft.assetIds : []),
                                      draft.assetId,
                                    ].filter((id: unknown): id is string => typeof id === "string" && Boolean(id));
                                    const draftAssetIds = [...new Set(requestedAssetIds)];
                                    const draftAssets = draftAssetIds
                                      .map((id) => availableAssets.find((item) => item.id === id))
                                      .filter((item): item is ProjectAsset => Boolean(item));
                                    const draftRole = String(draft.role || draft.layout || "");
                                    const supportsMultipleImages = ["comparison", "split"].includes(draftRole);
                                    const isComparisonDraft = draftRole === "comparison";
                                    const previewSlots = isComparisonDraft ? 2 : Math.max(1, draftAssets.length);
                                    return (
                                      <article key={index}>
                                        <div className={`draft-assets-preview${previewSlots > 1 ? " is-multi" : ""}`}>
                                          {draftAssets.slice(0, supportsMultipleImages ? 2 : 1).map((asset) => (
                                            <img key={asset.id} src={asset.url} alt="" />
                                          ))}
                                          {Array.from({ length: Math.max(0, previewSlots - draftAssets.length) }).map((_, missingIndex) => (
                                            <div className="draft-no-image" key={`missing-${missingIndex}`}>
                                              {selected.selected_format === "short_video" ? "鏡頭" : isComparisonDraft ? "尚欠比較圖片" : "未指定圖片"}
                                            </div>
                                          ))}
                                        </div>
                                        <div>
                                          {editingDraft === index ? (
                                            <div className="draft-editor">
                                              <label>
                                                <b>標題</b>
                                                <input
                                                  value={draft.headline || ""}
                                                  onChange={(event) =>
                                                    updatePageDraft(
                                                      index,
                                                      "headline",
                                                      event.target.value,
                                                    )
                                                  }
                                                />
                                              </label>
                                              <label>
                                                <b>副題</b>
                                                <input
                                                  value={
                                                    draft.subheadline || ""
                                                  }
                                                  onChange={(event) =>
                                                    updatePageDraft(
                                                      index,
                                                      "subheadline",
                                                      event.target.value,
                                                    )
                                                  }
                                                />
                                              </label>
                                              {isComparisonDraft && Array.isArray(draft.body) && draft.body.length>=4 ? ['左欄標籤','右欄標籤','左欄內文','右欄內文','結論（可選）','資料來源（可選）'].map((label,slot)=><label key={label}><b>{label}</b><textarea value={draft.body[slot] || ''} onChange={event=>{const body=[...draft.body];body[slot]=event.target.value;updatePageDraft(index,'body',body);}} /></label>) : <label>
                                                <b>{isComparisonDraft ? '內文（未提供左右比較內容，會使用主圖＋內文版面）' : '正文（段落之間留一行）'}</b>
                                                <textarea
                                                  value={
                                                    Array.isArray(draft.body)
                                                      ? draft.body.join("\n\n")
                                                      : ""
                                                  }
                                                  onChange={(event) =>
                                                    updatePageDraft(
                                                      index,
                                                      "body",
                                                      event.target.value.split(
                                                        /\n\s*\n/,
                                                      ),
                                                    )
                                                  }
                                                />
                                              </label>}
                                              <label>
                                                <b>{supportsMultipleImages ? "左側圖片" : "配對圖片"}</b>
                                                <select
                                                  value={draftAssetIds[0] || ""}
                                                  onChange={(event) =>
                                                    updatePageDraft(
                                                      index,
                                                      supportsMultipleImages ? "assetIds" : "assetId",
                                                      supportsMultipleImages ? [event.target.value, draftAssetIds[1] || ""].filter(Boolean) : event.target.value,
                                                    )
                                                  }
                                                >
                                                  <option value="">
                                                    未指定圖片
                                                  </option>
                                                  {Array.isArray(
                                                    selected.production?.assets,
                                                  )
                                                    ? (
                                                        selected.production
                                                          .assets as ProjectAsset[]
                                                      ).map((item) => (
                                                        <option
                                                          key={item.id}
                                                          value={item.id}
                                                        >
                                                          {item.filename}
                                                        </option>
                                                      ))
                                                    : null}
                                                </select>
                                              </label>
                                              {supportsMultipleImages ? (
                                                <label>
                                                  <b>右側圖片</b>
                                                  <select
                                                    value={draftAssetIds[1] || ""}
                                                    onChange={(event) => updatePageDraft(index, "assetIds", [draftAssetIds[0] || "", event.target.value].filter(Boolean))}
                                                  >
                                                    <option value="">{isComparisonDraft ? "尚欠比較圖片" : "不使用第二張圖片"}</option>
                                                    {availableAssets.map((item) => (
                                                      <option key={item.id} value={item.id} disabled={item.id === draftAssetIds[0]}>{item.filename}</option>
                                                    ))}
                                                  </select>
                                                </label>
                                              ) : null}
                                              <label>
                                                <b>圖片裁切焦點</b>
                                                <select value={draft.imagePosition || "center"} onChange={(event) => updatePageDraft(index, "imagePosition", event.target.value)}>
                                                  <option value="center">中央</option><option value="top">上方</option><option value="bottom">下方</option><option value="left">左方</option><option value="right">右方</option>
                                                </select>
                                              </label>
                                              {supportsMultipleImages ? <label><b>右側圖片裁切焦點</b><select value={draft.secondaryImagePosition || "center"} onChange={(event) => updatePageDraft(index, "secondaryImagePosition", event.target.value)}><option value="center">中央</option><option value="top">上方</option><option value="bottom">下方</option><option value="left">左方</option><option value="right">右方</option></select></label> : null}
                                              <details className="draft-layout-detail">
                                                <summary>查看版面設定</summary>
                                                <p>{draft.designDirection}</p>
                                              </details>
                                              <div className="draft-editor-actions">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingDraft(null);
                                                    void loadStudio();
                                                  }}
                                                >
                                                  取消
                                                </button>
                                                <button
                                                  type="button"
                                                  className="primary"
                                                  disabled={saving}
                                                  onClick={() =>
                                                    void savePageDrafts()
                                                  }
                                                >
                                                  儲存修改
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="draft-card-head">
                                                <span>
                                                  {draft.page ||
                                                    `P.${index + 1}`}
                                                </span>
                                                <div>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setEditingDraft(index)
                                                    }
                                                  >
                                                    編輯
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="delete"
                                                    onClick={() =>
                                                      void deletePageDraft(
                                                        index,
                                                      )
                                                    }
                                                  >
                                                    刪除
                                                  </button>
                                                </div>
                                              </div>
                                              <h5>{draft.headline}</h5>
                                              {draft.subheadline ? (
                                                <h6>{draft.subheadline}</h6>
                                              ) : null}
                                              {Array.isArray(draft.body)
                                                ? draft.body.map(
                                                    (
                                                      paragraph: string,
                                                      paragraphIndex: number,
                                                    ) => (
                                                      <p key={paragraphIndex}>
                                                        {paragraph}
                                                      </p>
                                                    ),
                                                  )
                                                : null}
                                              {draft.assetStatus === "missing" ? (
                                                <div className="draft-asset-missing" role="status">
                                                  <div>
                                                    <b>這一頁未有合適圖片</b>
                                                    <p>{draft.assetRequest?.reason || "現有圖片未能清楚支持這一頁的內容。"}</p>
                                                    {Array.isArray(draft.assetRequest?.suggestions) && draft.assetRequest.suggestions.length ? (
                                                      <small>建議上載：{draft.assetRequest.suggestions.join("、")}</small>
                                                    ) : null}
                                                  </div>
                                                  <div>
                                                    <button type="button" onClick={() => { setAssetTargetPage(draft.page || `P.${index + 1}`); setAssetSourceMode("upload"); goToStep("assets"); }}>上載相關圖片</button>
                                                    <button type="button" onClick={() => { setAssetTargetPage(draft.page || `P.${index + 1}`); setAssetSourceMode("search"); goToStep("assets"); }}>搜尋授權圖片</button>
                                                  </div>
                                                </div>
                                              ) : null}
                                              <details className="draft-layout-detail">
                                                <summary>查看版面設定</summary>
                                                <p>{draft.designDirection}</p>
                                              </details>
                                            </>
                                          )}
                                        </div>
                                      </article>
                                    );
                                  },
                                )}
                                {selected.production.productionStatus ===
                                "drafts_ready" || activeStep === 'drafts' ? (
                                  <div className="draft-confirm-step" style={{flexDirection:'column',alignItems:'stretch'}}>
                                    <BackgroundPreparationNotice state={selected.production.backgroundPreparation as BackgroundPreparation|undefined} busy={saving} retry={page=>void confirmPageDrafts(true,page)} keep={issue=>void keepFailedPage(issue)} continueWithOriginals={()=>void confirmPageDrafts(false)} />
                                    <div>
                                      <b>
                                        {selected.selected_format === "short_video"
                                          ? "確認短片製作包"
                                          : selected.selected_format === "single_image"
                                            ? "確認後生成單張貼文"
                                            : "確認後生成全套輪播圖片"}
                                      </b>
                                      <p>
                                        {selected.selected_format === "short_video"
                                          ? "請檢查開場句、逐鏡內容及拍攝方法；確認後會鎖定這個製作版本。"
                                          : "請檢查文案、圖片配對及版面指示；確認後會鎖定這個製作版本。"}
                                      </p>
                                    </div>
                                    {selected.selected_format !== 'short_video' && selected.production.compositionMode!=='original' ? <div>
                                      <p>AI 會先分析各頁，只在有需要時延伸背景，再製作圖片；會使用圖片生成額度。原圖保留，可還原。請勿關閉頁面。</p>
                                      <button type="button" disabled={saving || editingDraft !== null} onClick={()=>void confirmPageDrafts(true)}>{saving ? '正在處理…' : 'AI 優化構圖並生成圖片 →'}</button>
                                    </div> : null}
                                    <button
                                      type="button"
                                      style={selected.selected_format !== 'short_video' ? {background:'transparent',color:'var(--soon-oxblood)',border:'1px solid var(--soon-line)'} : undefined}
                                      disabled={saving || editingDraft !== null}
                                      onClick={() => void confirmPageDrafts()}
                                    >
                                      {selected.selected_format === "short_video" ? "確認短片製作包 →" : selected.production.compositionMode==='original'?"使用原圖製作圖片 →":"保留目前構圖，直接生成 →"}
                                    </button>
                                  </div>
                                ) : selected.production.productionStatus === "package_ready" ? (
                                  <div className="video-package-ready">
                                    <div>
                                      <small>{selected.format_decision?.videoMethod === "ai_video_generation" ? "AI 影片生成計劃" : "真人拍攝製作包"}</small>
                                      <h4>{String((selected.production.videoPlan as any)?.hook || "短片製作資料已準備")}</h4>
                                      <p>建議片長：{String(approvedVideoDuration(selected.production.script || []) ?? ((selected.production.videoPlan as any)?.durationSeconds || 20))} 秒</p>
                                      {Array.isArray((selected.production.videoPlan as any)?.shotList) && (selected.production.videoPlan as any).shotList.length ? <ul>{(selected.production.videoPlan as any).shotList.map((item: string) => <li key={item}>{item}</li>)}</ul> : null}
                                    </div>
                                    {selected.stage === "production" ? <button type="button" disabled={saving} onClick={() => void submitVideoPackage()}>{saving ? "提交中…" : "提交製作包審批 →"}</button> : <span>✓ 已提交審批</span>}
                                  </div>
                                ) : selected.production.productionStatus ===
                                  "drafts_confirmed" ? (
                                  <div className="generation-next-step">
                                    <div>
                                      <b>
                                        {generatingCarousel
                                          ? selected.selected_format === "single_image" ? "正在生成單張貼文" : "正在生成全套輪播圖片"
                                          : selected.selected_format === "single_image" ? "準備繼續製作單張貼文" : "準備繼續製作輪播圖片"}
                                      </b>
                                      <p>
                                        {generatingCarousel
                                          ? "正在並行處理每一頁，完成後圖片會直接出現，請勿關閉頁面…"
                                          : "上次製作未有完成，你可以由這裡繼續。"}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={saving}
                                      onClick={() =>
                                        void generateCarouselImages()
                                      }
                                    >
                                      {generatingCarousel
                                        ? "生成中，毋須再按"
                                        : "繼續製作 →"}
                                    </button>
                                  </div>
                                ) : selected.production.productionStatus ===
                                  "images_ready" ? (
                                  <div className="generated-carousel">
                                    <BackgroundPreparationNotice state={selected.production.backgroundPreparation as BackgroundPreparation|undefined} busy={saving} retry={page=>void confirmPageDrafts(true,page)} keep={issue=>void keepFailedPage(issue)} continueWithOriginals={()=>void confirmPageDrafts(false)} />
                                    <div className="generated-carousel-head">
                                      <div>
                                        <b>{selected.production.backgroundPreparation && (selected.production.backgroundPreparation as BackgroundPreparation).status!=='complete' ? '上次成功版本（並非本次新結果）' : selected.selected_format === "single_image" ? "單張貼文已生成" : "全套輪播圖片已生成"}</b>
                                        <p>每頁尺寸：1080 × 1350 px</p>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={saving}
                                        aria-busy={generatingCarousel}
                                        onClick={() =>
                                          void generateCarouselImages()
                                        }
                                      >
                                        {generatingCarousel
                                          ? "重新生成中…"
                                          : "重新生成全套"}
                                      </button>
                                    </div>
                                    {generatingCarousel ? (
                                      <div
                                        className="carousel-generation-status"
                                        role="status"
                                      >
                                        <span aria-hidden="true" />
                                        正在重新生成全套 Carousel，請勿關閉頁面…
                                      </div>
                                    ) : null}
                                    <div className="generated-grid">
                                      {Array.isArray(
                                        selected.production.generatedPages,
                                      )
                                        ? (
                                            selected.production
                                              .generatedPages as any[]
                                          ).map((page) => (
                                            <article key={page.page}>
                                              <img
                                                src={page.url}
                                                alt={page.page}
                                              />
                                              <div>
                                                <b>{page.page}</b>
                                                <div className="generated-actions">
                                                  <button type="button" disabled={saving} onClick={()=>void generateCarouselImages(page.page)}>重新排版本頁</button>
                                                  <a
                                                    className="generated-edit-button"
                                                    href={`/onboarding/scheduled-posts?editImage=${encodeURIComponent(page.url)}&editPage=${encodeURIComponent(page.page)}&editTitle=${encodeURIComponent(selected.title || "Carousel 圖片")}&projectId=${encodeURIComponent(selected.id)}&layered=${isClearMagazineCarousel(String(selected.format_decision?.renderTemplateCode || selected.format_decision?.templateCode || "")) ? "1" : "0"}`}
                                                    onClick={() => {
                                                      const pageIndex =
                                                        Number(
                                                          String(
                                                            page.page,
                                                          ).replace(/\D/g, ""),
                                                        ) - 1;
                                                      const drafts = Array.isArray(
                                                        selected.production
                                                          ?.pageDrafts,
                                                      )
                                                        ? (selected.production
                                                            .pageDrafts as any[])
                                                        : [];
                                                      const assets = Array.isArray(
                                                        selected.production
                                                          ?.assets,
                                                      )
                                                        ? (selected.production
                                                            .assets as ProjectAsset[])
                                                        : [];
                                                      const draft =
                                                        drafts[pageIndex] || null;
                                                      const sourceAsset = assets.find(
                                                        (asset) =>
                                                          asset.id ===
                                                          draft?.assetId,
                                                      );
                                                      window.sessionStorage.setItem(
                                                        "soon-carousel-editor-payload-v1",
                                                        JSON.stringify({
                                                          draft,
                                                          generatedImage:
                                                            page.url,
                                                          page: page.page,
                                                          projectId:
                                                            selected.id,
                                                          templateCode:
                                                            selected.format_decision?.renderTemplateCode ||
                                                            selected.format_decision?.templateCode ||
                                                            "editorial-clear",
                                                          sourceImage:
                                                            sourceAsset?.url ||
                                                            "",
                                                          title:
                                                            selected.title,
                                                          workspaceLogo:
                                                            workspace?.logoUrl ||
                                                            (/egg[.\s_-]*soon/i.test(
                                                              workspace?.name ||
                                                                "",
                                                            )
                                                              ? "/brand-assets/eggsoon/soon-egg.png"
                                                              : ""),
                                                          workspaceName:
                                                            workspace?.name ||
                                                            "",
                                                          workspaceFont:
                                                            workspace?.fontStyle || (/egg[.\s_-]*soon/i.test(
                                                              workspace?.name ||
                                                                "",
                                                            )
                                                              ? "GenSenRounded2"
                                                              : ""),
                                                        }),
                                                      );
                                                    }}
                                                  >
                                                    編輯圖片
                                                  </a>
                                                  <a
                                                    className="generated-download-button"
                                                    href={downloadProjectUrl(workspaceId || "", selected.id, page.page)}
                                                  >
                                                    下載圖片
                                                  </a>
                                                </div>
                                                {permissions?.canEdit && !selected.production.compositionMode ? <PageCompositionAdvisor contract={selected.format_decision?.templateContractSnapshot} drafts={(selected.production.pageDrafts || []) as any[]} assets={(selected.production.assets || []) as ProjectAsset[]} page={page.page} actions={extensionActions()} analyze={analyzeAssetFocus} saveFocus={saveAssetFocus} disabled={saving}/> : null}
                                                {permissions?.canEdit && selected.production.compositionMode==='ai'?<button type="button" disabled={saving} onClick={()=>void changePageComposition(page.page,(selected.production?.pageDrafts as any[])?.find(d=>d.page===page.page)?.compositionMode==='original'?'ai':'original')}>
                                                  {(selected.production.pageDrafts as any[])?.find(d=>d.page===page.page)?.compositionMode==='original'?'重用本頁 AI 構圖':'本頁還原原圖構圖'}
                                                </button>:null}
                                              </div>
                                            </article>
                                          ))
                                        : null}
                                    </div>
                                    <div className="caption-draft">
                                      <label htmlFor="carousel-caption-draft"><b>IG Caption Draft</b><span>可在提交審批前修改</span></label>
                                      <textarea
                                        id="carousel-caption-draft"
                                        value={String(selected.production.captionDraft || "")}
                                        onChange={(event) => updateCaptionDraft(event.target.value)}
                                        rows={8}
                                      />
                                      <div>
                                        <a className="download-all-button" href={downloadProjectUrl(workspaceId || "", selected.id)}>一鍵下載全部圖片（ZIP）</a>
                                        <button type="button" disabled={saving || !String(selected.production.captionDraft || "").trim()} onClick={() => void saveCaptionDraft()}>{saving ? "儲存中…" : "儲存 Caption"}</button>
                                      </div>
                                    </div>
                                    {selected.stage === "production" ? (
                                      <div className="generation-next-step">
                                        <div>
                                          <b>下一步｜提交內容審批</b>
                                          <p>
                                            確認全套圖片同 Caption 後，將呢個 Content
                                            Project 推進到等待審批。
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          disabled={saving}
                                          onClick={() => void submitForApproval()}
                                        >
                                          {saving
                                            ? "提交中…"
                                            : "提交審批，下一步 →"}
                                        </button>
                                      </div>
                                    ) : selected.stage === "approval" ? (
                                      <div className="carousel-approval-status">
                                        <span>✓ 已提交審批</span>
                                        <Link href="/onboarding/content-review">
                                          前往「內容審批」→
                                        </Link>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <div className="production-ready">
                        <b>!</b>
                        <h4>尚未建立內容順序</h4>
                        <p>SOON 會先根據已確認的 Brief 及格式整理故事結構，內容風格會在圖片素材準備好後才選擇。</p>
                      </div>
                    )}
                    {generatingStructure ? null : <div className="actions">
                      <button
                        className="secondary"
                        disabled={saving}
                        onClick={() =>
                          saveProject({ stage: "format" }, "已返回格式選擇", "format")
                        }
                      >
                        ← 修改格式
                      </button>
                      {selected.production?.status === "structure_ready" ? (
                        <>
                          <button
                            className="secondary"
                            disabled={saving}
                            onClick={generateStructure}
                          >
                            重新生成
                          </button>
                          <button disabled={saving} onClick={confirmStructure}>
                            確認故事結構 →
                          </button>
                        </>
                      ) : selected.production?.status ===
                        "structure_confirmed" ? null : (
                        <button
                          disabled={saving || !permissions?.canEdit}
                          onClick={generateStructure}
                        >
                          {saving
                            ? "正在核對資料及整理內容…"
                            : "整理內容順序 →"}
                        </button>
                      )}
                    </div>}
                  </div>
                )}
                {activeStep !== "style" ? <div className="studio-step-footer">
                  <button
                    type="button"
                    className="secondary"
                    disabled={visibleStudioSteps.findIndex((step) => step.id === activeStep) === 0}
                    onClick={() => {
                      const index = visibleStudioSteps.findIndex((step) => step.id === activeStep);
                      if (index > 0) goToStep(visibleStudioSteps[index - 1].id);
                    }}
                  >
                    ← 上一步
                  </button>
                  <span>
                    {visibleStudioSteps.findIndex((step) => step.id === activeStep) + 1} / {visibleStudioSteps.length}
                  </span>
                  <button
                    type="button"
                    disabled={
                      visibleStudioSteps.findIndex((step) => step.id === activeStep) >=
                      visibleStudioSteps.findIndex((step) => step.id === latestAvailableStep(selected))
                    }
                    onClick={() => {
                      const index = visibleStudioSteps.findIndex((step) => step.id === activeStep);
                      const latestIndex = visibleStudioSteps.findIndex((step) => step.id === latestAvailableStep(selected));
                      if (index < latestIndex) goToStep(visibleStudioSteps[index + 1].id);
                    }}
                  >
                    下一步 →
                  </button>
                </div> : null}
                {message ? <p className={`studio-message ${messageTone}`} role="status">{message}</p> : null}
              </>
            ) : (
              <div className="new-content-entry">
                <div className="new-content-head">
                  <span>建立新內容</span>
                  <h2>你今次想講甚麼？</h2>
                  <p>不用先想好怎樣說，也不用先選格式。寫下你知道的資料，SOON 會協助整理。</p>
                </div>
                <label className="brief-source-field entry-brief-field">
                  <span>任何想法、資料或連結內容</span>
                  <textarea
                    value={brief.summary}
                    onChange={(event) => setBrief({ ...brief, summary: event.target.value })}
                    placeholder={"例如：下個月會推出一款方便小店使用的新服務，但我不知道應該從功能、價錢還是顧客問題開始說。"}
                  />
                  <small>一句話、幾個重點或完整資料都可以。</small>
                </label>
                <div className="new-content-actions">
                  <div className="entry-topic-link"><span>未有想法？</span><Link href="/onboarding/topic-library">到題材庫找靈感 →</Link></div>
                  <button type="button" disabled={!String(brief.summary || "").trim() || startingProject || !permissions?.canEdit} onClick={() => void startNewProject()}>
                    {startingProject ? "SOON 正在整理…" : "讓 SOON 幫我整理 →"}
                  </button>
                </div>
                {startingProject ? (
                  <p className="studio-message loading" role="status">正在建立內容…</p>
                ) : studioLoadError ? (
                  <div className="studio-load-error" role="alert">
                    <span>{message}</span>
                    <button type="button" onClick={() => void loadStudio()}>重新載入</button>
                  </div>
                ) : message ? <p className={`studio-message ${messageTone}`} role="status">{message}</p> : null}
              </div>
            )}
          </section>
        </div>
      </section>

      {promptOpen ? (
        <div
          className="modal-backdrop"
          onMouseDown={() => setPromptOpen(false)}
        >
          <section
            className="prompt-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>只限 Owner</span>
                <h2>品牌內容設定</h2>
                <p>
                  {promptVersion
                    ? `目前版本 v${promptVersion}；儲存會建立新版本`
                    : "建立第一個 Prompt 版本"}
                </p>
              </div>
              <button onClick={() => setPromptOpen(false)}>×</button>
            </header>
            <label>
              <span>Prompt 名稱</span>
              <input
                value={prompt.name}
                onChange={(event) =>
                  setPrompt({ ...prompt, name: event.target.value })
                }
              />
            </label>
            <label>
              <span>Brief Builder Prompt</span>
              <textarea
                value={prompt.briefPrompt}
                onChange={(event) =>
                  setPrompt({ ...prompt, briefPrompt: event.target.value })
                }
              />
            </label>
            <label>
              <span>品牌格式偏好</span>
              <textarea
                value={prompt.formatPrompt}
                onChange={(event) =>
                  setPrompt({ ...prompt, formatPrompt: event.target.value })
                }
              />
            </label>
            <label>
              <span>製作 Prompt</span>
              <textarea
                value={prompt.productionPrompt}
                onChange={(event) =>
                  setPrompt({ ...prompt, productionPrompt: event.target.value })
                }
              />
            </label>
            <footer>
              <button
                className="secondary"
                onClick={() => setPromptOpen(false)}
              >
                取消
              </button>
              <button disabled={saving} onClick={savePrompt}>
                {saving ? "儲存中…" : "儲存為新版本"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
      <style
        dangerouslySetInnerHTML={{
          __html: `${dashboardSidebarStyles}\n${styles}\n${editingStyles}`,
        }}
      />
    </main>
  );
}

const styles = `
  .shared-preview-visual{position:absolute;inset:0;overflow:hidden;background:linear-gradient(145deg,#ddd2c6,#95867a);background-position:center;background-size:cover}.shared-preview-visual>i{position:absolute;display:block;border-radius:999px;background:#dec06b;box-shadow:0 4px 10px rgba(55,32,20,.18)}.shared-preview-visual>i:nth-child(1){width:48%;height:12%;left:20%;top:37%;transform:rotate(10deg)}.shared-preview-visual>i:nth-child(2){width:39%;height:12%;left:34%;top:49%;transform:rotate(-8deg)}.shared-preview-visual>i:nth-child(3){width:30%;height:11%;left:25%;top:60%;transform:rotate(5deg)}.shared-preview-visual>span{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);width:max-content;border-radius:999px;background:rgba(17,17,17,.68);color:#fff;padding:5px 8px;font-size:7px;font-weight:750}.preview-image-status{position:absolute;z-index:2;right:10px;bottom:10px;border-radius:999px;background:rgba(17,17,17,.72);color:#fff;padding:5px 8px;font-size:7px;font-weight:850;backdrop-filter:blur(5px)}.shared-preview-visual>.preview-image-generating{z-index:8;inset:0;display:flex;align-items:center;justify-content:center;gap:7px;width:auto;transform:none;border-radius:0;background:rgba(24,21,19,.72);font-size:9px;backdrop-filter:blur(7px)}.preview-image-generating>i{display:block;width:14px;height:14px;border:2px solid rgba(255,255,255,.38);border-top-color:#fff;border-radius:50%;animation:studio-loading-spin .8s linear infinite}.unified-preview-brand{position:absolute;z-index:2;left:25px;right:25px;bottom:19px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,.45);padding-top:8px;color:inherit;font-size:7px}.unified-preview-brand span{font-weight:850}.style-preview-expand{position:absolute;z-index:5;top:10px;left:10px;border:1px solid rgba(255,255,255,.72);border-radius:999px;background:rgba(17,17,17,.7);color:#fff;padding:6px 8px;font-size:8px;font-weight:800;cursor:pointer;backdrop-filter:blur(5px)}.style-preview-expand:hover{background:#fff;color:#202126}.clear-magazine-preview{position:relative;aspect-ratio:4/5;overflow:hidden;background:#050505;color:#fff}.clear-magazine-preview .shared-preview-visual{inset:0 0 42%}.clear-preview-copy{position:absolute;z-index:2;left:24px;right:24px;bottom:56px;display:flex;flex-direction:column;align-items:flex-start;text-align:left}.clear-preview-copy small{color:#f1d443;font-size:8px;font-weight:800}.clear-preview-copy strong{display:-webkit-box;overflow:hidden;margin-top:8px;font-size:22px;line-height:1.08;-webkit-box-orient:vertical;-webkit-line-clamp:3}.clear-preview-copy p{display:-webkit-box;overflow:hidden;margin:9px 0 0;font-size:9px;line-height:1.45;opacity:.78;-webkit-box-orient:vertical;-webkit-line-clamp:3}.clear-magazine-preview.cover:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.86),rgba(0,0,0,.05) 72%)}.clear-magazine-preview.cover .shared-preview-visual{inset:0}.clear-magazine-preview.cover .clear-preview-copy strong{background:#050505;padding:5px 8px}.clear-magazine-preview.content,.clear-magazine-preview.end{background:#050505}.clear-magazine-preview.end .shared-preview-visual{opacity:.35}.clear-magazine-preview .style-preview-dots{bottom:8px}.clear-magazine-preview .unified-preview-brand{bottom:36px}.style-preview-modal{position:fixed;z-index:80;inset:0;display:grid;place-items:center;background:rgba(20,18,17,.72);padding:24px;backdrop-filter:blur(8px)}.style-preview-modal-panel{width:min(470px,92vw);border-radius:18px;background:#fff;padding:14px;box-shadow:0 24px 80px rgba(0,0,0,.35)}.style-preview-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 2px 11px}.style-preview-modal-head>div{display:grid;gap:2px}.style-preview-modal-head small{color:#777b83;font-size:9px}.style-preview-modal-head strong{font-size:18px}.style-preview-modal-head button{display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:50%;background:#f1ebe4;color:#202126;font-size:22px;cursor:pointer}.style-preview-modal-panel>p{margin:10px 3px 1px;color:#777b83;font-size:9px;line-height:1.45}.style-preview-modal-panel .style-preview-expand{display:none}.style-preview-modal-panel .style-preview-arrow{width:39px;height:39px}.style-preview-modal-panel .style-preview-count{font-size:9px}
  .ranking-review-preview{position:relative;aspect-ratio:4/5;overflow:hidden;background:#fff;color:#111}.ranking-preview-photo{position:relative;height:58%;overflow:hidden;background:radial-gradient(circle at 50% 46%,#eac267 0 16%,#9d542c 17% 29%,#eee2cf 30% 48%,#776356 49% 100%)}.ranking-preview-photo>i{position:absolute;display:block;border-radius:999px;background:#e9c56f}.ranking-preview-photo>i:nth-child(1){width:35%;height:12%;left:23%;top:42%;transform:rotate(12deg)}.ranking-preview-photo>i:nth-child(2){width:28%;height:11%;left:39%;top:51%;transform:rotate(-10deg)}.ranking-preview-photo>i:nth-child(3){width:22%;height:10%;left:31%;top:59%;transform:rotate(6deg)}.ranking-preview-copy{position:relative;box-sizing:border-box;height:42%;padding:21px 23px 18px 34px;text-align:left}.ranking-preview-copy:before{content:"";position:absolute;left:23px;top:21px;bottom:22px;width:2px;background:#111}.ranking-preview-copy strong{display:-webkit-box;overflow:hidden;font-size:18px;line-height:1.08;letter-spacing:-.035em;-webkit-box-orient:vertical;-webkit-line-clamp:2}.ranking-preview-copy p{display:-webkit-box;overflow:hidden;margin:13px 0 0;font-size:9px;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:5}.ranking-review-preview.cover .ranking-preview-photo{height:100%;background:radial-gradient(circle at 50% 48%,#d78337 0 15%,#6d321d 16% 29%,#1a1715 30% 100%)}.ranking-review-preview.cover .ranking-preview-copy{position:absolute;left:21px;right:21px;bottom:31px;height:auto;padding:0;color:#fff}.ranking-review-preview.cover .ranking-preview-copy:before{display:none}.ranking-review-preview.cover .ranking-preview-copy strong{width:max-content;max-width:94%;background:#050505;padding:5px 8px;font-size:20px;line-height:1.12}.ranking-review-preview.cover .ranking-preview-copy p{width:max-content;max-width:90%;margin-top:7px;background:#050505;padding:4px 7px;font-size:9px;font-weight:700}.ranking-review-preview .style-preview-arrow{width:31px;height:31px;font-size:14px}.ranking-review-preview .style-preview-dots{bottom:8px}
  .product-focus-preview{position:relative;aspect-ratio:4/5;overflow:hidden;background:#f8f6f0;color:#171717;padding:34px 28px 25px;box-sizing:border-box}.product-preview-copy{position:relative;z-index:2;display:flex;flex-direction:column;align-items:flex-start;width:68%;text-align:left}.product-preview-copy small{color:#8e6f68;font-size:8px;font-weight:850;letter-spacing:.09em}.product-preview-copy strong{display:-webkit-box;overflow:hidden;margin-top:8px;font-size:22px;line-height:1.1;letter-spacing:-.035em;-webkit-box-orient:vertical;-webkit-line-clamp:3}.product-preview-copy i{display:block;width:38px;height:3px;margin:12px 0 9px;background:#d9bbb5}.product-preview-copy p{display:-webkit-box;overflow:hidden;margin:0;color:#62636a;font-size:9px;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:3}.product-preview-image{position:absolute;right:-14%;bottom:12%;width:80%;height:48%;display:flex;align-items:center;justify-content:center;transform:rotate(-5deg);border-radius:48% 0 0 48%;background:linear-gradient(145deg,#eadcd4,#d9bbb5);box-shadow:0 14px 30px rgba(80,54,48,.16)}.product-preview-image>span{position:absolute;top:11%;left:20%;color:#6b2c30;font-size:7px;font-weight:900;letter-spacing:.12em}.product-preview-image>b{display:grid;place-items:center;width:40%;aspect-ratio:.8;border:2px solid rgba(107,44,48,.48);border-radius:9px;background:#fffaf4;color:#6b2c30;text-align:center;font-size:13px;line-height:1.05;box-shadow:0 8px 18px rgba(107,44,48,.14)}.product-preview-footer{position:absolute;z-index:2;left:28px;right:28px;bottom:22px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #ddd2ca;padding-top:9px;color:#68686d;font-size:7px}.product-preview-footer span{font-weight:800}.product-preview-footer b{font-size:7px}.product-focus-preview .style-preview-arrow{width:31px;height:31px;font-size:14px}.product-focus-preview .style-preview-dots{bottom:49px}
  .caption-draft{display:grid!important;gap:9px;white-space:normal!important;background:#fff;border-radius:10px;padding:13px!important}.caption-draft label{display:flex!important;align-items:center;justify-content:space-between;gap:12px;margin:0!important}.caption-draft label span{color:#747880;font-size:10px}.caption-draft textarea{box-sizing:border-box;width:100%;min-height:150px;resize:vertical;border:1px solid #d9dcdf!important;border-radius:9px;background:#fff!important;color:#202126!important;padding:11px!important;font:inherit;font-size:12px;line-height:1.55}.caption-draft>div{display:flex;align-items:center;justify-content:flex-end;gap:8px}.caption-draft button,.download-all-button{border:0;border-radius:8px;background:#6b2c30;color:#fff!important;padding:9px 12px;font:inherit;font-size:10px;font-weight:800;text-decoration:none;cursor:pointer}.caption-draft button:disabled{opacity:.45;cursor:not-allowed}.download-all-button{margin-right:auto;background:#202126}@media(max-width:700px){.caption-draft>div{align-items:stretch;flex-direction:column}.download-all-button{text-align:center;margin-right:0}}
  .studio-progress{position:sticky;top:0;z-index:12;margin-bottom:18px;border:1px solid #ded5cd;border-radius:14px;background:rgba(246,242,235,.97);padding:10px;backdrop-filter:blur(10px)}.studio-progress-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:1px 4px 9px}.studio-progress-head strong{font-size:11px;color:#202126}.studio-progress-head span{display:flex;align-items:center;gap:5px;color:#6f737d;font-size:9px}.studio-progress .studio-step-nav{position:static!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;backdrop-filter:none!important}.studio-step-nav button b{font:inherit}.studio-step-nav button em{display:flex;align-items:center;gap:3px;margin-left:auto;font-size:8px;font-style:normal;opacity:.78}.studio-step-nav button.done{border:1px solid #d8e6ae!important}.studio-step-nav button.done:hover{border-color:#6b2c30!important;background:#fff!important;color:#6b2c30!important;box-shadow:0 2px 0 #ddc6c1}.studio-step-nav button.active em{color:#fff}.studio-step-nav button:disabled em{display:none}@media(max-width:700px){.studio-progress-head span{display:none}.studio-progress{overflow:hidden}.studio-progress .studio-step-nav{display:flex!important}.studio-step-nav button{min-width:115px!important}}
  .actual-style-preview{position:relative;aspect-ratio:4/5;overflow:hidden;background:#171717}.actual-style-preview img{object-fit:cover}.style-preview-arrow{position:absolute;z-index:3;top:50%;display:grid;place-items:center;width:36px;height:36px;transform:translateY(-50%);border:1px solid rgba(255,255,255,.72);border-radius:50%;background:rgba(17,17,17,.72);color:#fff;font-size:18px;font-weight:800;box-shadow:0 3px 12px rgba(0,0,0,.2);cursor:pointer;backdrop-filter:blur(5px)}.style-preview-arrow:hover,.style-preview-arrow:focus-visible{background:#fff;color:#202126;outline:2px solid #fff;outline-offset:2px}.style-preview-arrow.previous{left:10px}.style-preview-arrow.next{right:10px}.style-preview-count{position:absolute;z-index:3;top:10px;right:10px;border-radius:999px;background:rgba(17,17,17,.72);color:#fff;padding:5px 8px;font-size:8px;font-weight:800;letter-spacing:.08em;backdrop-filter:blur(5px)}.style-preview-dots{position:absolute;z-index:3;left:50%;bottom:11px;display:flex;gap:5px;transform:translateX(-50%);border-radius:999px;background:rgba(17,17,17,.56);padding:6px 8px}.style-preview-dots i{display:block;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.48)}.style-preview-dots i.active{width:14px;border-radius:4px;background:#fff}.contextual-preview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;aspect-ratio:4/5;padding:10px;background:#eee8e2}.contextual-preview>div{position:relative;min-width:0;overflow:hidden;border-radius:8px;padding:9px;display:flex;flex-direction:column;align-items:stretch;text-align:left;box-shadow:0 1px 0 rgba(32,33,38,.08)}.preview-page-role{position:absolute;z-index:3;top:7px;right:7px;border-radius:999px;background:rgba(255,255,255,.9);color:#202126;padding:3px 6px;font-size:6px;font-weight:850;letter-spacing:.04em}.preview-image-area{display:block;flex:0 0 48%;margin:-9px -9px 8px;opacity:.84;background-image:linear-gradient(135deg,rgba(255,255,255,.15),rgba(32,33,38,.18));background-position:center;background-size:cover}.preview-page-copy{position:relative;z-index:2;display:flex;min-height:0;flex:1;flex-direction:column;justify-content:flex-end;gap:4px}.contextual-preview small{font-size:6px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;opacity:.72}.contextual-preview strong{display:-webkit-box;overflow:hidden;font-size:10px;line-height:1.16;letter-spacing:-.025em;-webkit-box-orient:vertical;-webkit-line-clamp:3}.contextual-preview p{display:-webkit-box;overflow:hidden;margin:0;font-size:6px;line-height:1.35;opacity:.72;-webkit-box-orient:vertical;-webkit-line-clamp:3}.contextual-preview .cover .preview-image-area{flex-basis:58%}.contextual-preview .cover strong{font-size:13px}.contextual-preview .end{justify-content:center}.contextual-preview .end .preview-image-area{position:absolute;inset:0;margin:0;opacity:.16}.contextual-preview .end .preview-page-copy{justify-content:center}.contextual-preview[data-style*="product"] .preview-image-area{border-radius:0 0 55% 0}.contextual-preview[data-style*="problem"] .content .preview-image-area{clip-path:polygon(0 0,100% 0,88% 100%,0 100%)}.contextual-preview[data-style*="bold"] strong{text-transform:uppercase;font-weight:900}.template-copy em{color:#777b83;font-size:9px;font-style:normal}.style-recommendation-reason{display:grid;gap:2px;margin:2px 0 0;border-left:2px solid #c7e63a;padding-left:7px;color:#555b63;font-size:9px;line-height:1.45}.style-recommendation-reason b{color:#52691a;font-size:8px}.template-copy>button{margin-top:3px;border:0;border-radius:8px;background:#f1ebe4;color:#6b2c30;padding:8px;text-align:center;font-size:10px;font-weight:800;cursor:pointer}.style-template-grid>article.active .template-copy>button{background:#6b2c30;color:#fff}
  .direction-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.direction-heading>div{display:grid;gap:5px}.direction-heading>div>span{color:#202126;font-size:14px;font-weight:800}.direction-heading>div>small{color:#6f737d;font-size:11px;line-height:1.45}.direction-recommend-button{display:flex;align-items:center;justify-content:center;gap:7px;flex:none;border:0;border-radius:10px;background:#6b2c30;color:#fff;padding:11px 14px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.direction-recommend-button:disabled{opacity:.42;cursor:not-allowed}.direction-hint{margin:4px 0 0;border-radius:9px;background:#f7eee9;color:#7d5554;padding:10px 12px;font-size:11px}.direction-card-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:4px}.direction-card-grid>button{min-width:0;border:1px solid #ded5cd;border-radius:14px;background:#faf8f4;color:#202126;padding:15px;text-align:left;cursor:pointer;display:flex;flex-direction:column;align-items:stretch;gap:8px}.direction-card-grid>button:hover{border-color:#b46a61}.direction-card-grid>button.active{border-color:#6b2c30;box-shadow:0 0 0 1px #6b2c30,4px 4px 0 #ddc6c1;background:#fff}.direction-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.direction-card-top i{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:#edf6d4;color:#52691a}.direction-card-top span{border-radius:999px;background:#f1ebe4;color:#6b2c30;padding:4px 7px;font-size:8px;font-weight:850}.direction-card-grid strong{font-size:15px;line-height:1.35}.direction-card-grid p{margin:0;color:#4f535a;font-size:11px;line-height:1.5}.direction-card-grid small{color:#777b83;font-size:10px;line-height:1.45}.direction-card-grid em{margin-top:auto;border-top:1px solid #eee8e2;padding-top:8px;color:#6b2c30;font-size:10px;font-style:normal;line-height:1.45}.custom-directions-toggle{display:flex;align-items:center;gap:6px;width:max-content;margin-top:4px;border:0;background:transparent;color:#6b2c30;padding:5px 0;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.custom-direction-options{border-top:1px solid #eee8e2;padding-top:10px}@media(max-width:850px){.direction-card-grid{grid-template-columns:1fr}.direction-heading{align-items:stretch;flex-direction:column}.direction-recommend-button{width:100%}}
  .project-list>.new-project-button{display:block!important;width:100%!important;min-height:42px;margin:0 0 13px!important;border:1px solid #c9aaa5!important;border-radius:10px!important;background:#f7eee9!important;color:#6b2c30!important;-webkit-text-fill-color:#6b2c30!important;padding:10px 12px!important;font:inherit;font-size:12px!important;font-weight:800!important;text-align:left;cursor:pointer}.project-list>.new-project-button:hover{border-color:#6b2c30!important;background:#f2e3de!important}
  .site-nav{display:none}.studio-page{min-height:100vh;background:#f7f7f8;color:#202126;display:grid;grid-template-columns:240px minmax(0,1fr)}.studio-shell{min-width:0;background:#fff}.studio-topbar{min-height:72px;border-bottom:1px solid #ebecef;padding:0 28px;display:flex;align-items:center;justify-content:space-between}.studio-topbar h1{font-size:22px;margin:0}.studio-topbar p{font-size:13px;color:#777b84;margin:4px 0 0}.studio-topbar button,.actions button,.prompt-modal footer button{border:0;border-radius:10px;padding:11px 17px;background:#111;color:#fff;font-weight:750;cursor:pointer}.secondary{background:#f0f1f3!important;color:#27292e!important}.studio-layout{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:calc(100vh - 72px)}.project-list{min-width:0;background:#f7f7f8;border-right:1px solid #e8e9ec;padding:20px 14px}.project-list>div{display:flex;justify-content:space-between;padding:0 8px 12px}.project-list>div span{color:#8a8e96}.project-list>button{width:100%;border:1px solid transparent;background:transparent;border-radius:12px;text-align:left;padding:13px;margin-bottom:7px;display:grid;gap:5px;cursor:pointer}.project-list>button.active{background:#fff;border-color:#dedfe3;box-shadow:0 5px 18px rgba(0,0,0,.05)}.project-list button span{font-size:11px;color:#777b84}.project-list button strong{font-size:14px;line-height:1.35}.project-list button em{font-style:normal;font-size:11px;color:#a0a3aa}.empty{font-size:13px;color:#8a8e96;padding:20px 8px;line-height:1.6}.studio-workspace{min-width:0;padding:30px;max-width:1050px;width:100%;box-sizing:border-box}.project-head{display:flex;justify-content:space-between;gap:30px;align-items:flex-start;margin-bottom:26px}.project-head>div>span{font-size:12px;font-weight:750;color:#777b84}.project-head h2{font-size:25px;line-height:1.3;margin:6px 0}.project-head a{font-size:12px;color:#555961}.stage-track{display:flex;align-items:center;gap:8px;white-space:nowrap;padding-top:8px}.stage-track b{font-size:11px;color:#a4a7ae}.stage-track b.done{color:#111}.stage-track i{display:block;width:26px;height:1px;background:#d9dadd}.editor-card{min-width:0;border:1px solid #e1e2e5;border-radius:18px;padding:26px;box-shadow:0 10px 35px rgba(20,22,26,.05)}.section-title{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #ededee;padding-bottom:18px;margin-bottom:22px}.section-title span{font-size:10px;font-weight:800;letter-spacing:.1em;color:#888c94}.section-title h3{margin:4px 0 0;font-size:20px}.section-title em{font-size:11px;color:#8c9098;font-style:normal}.editor-card label,.prompt-modal label{display:grid;gap:7px;margin:15px 0}.editor-card label>span,.prompt-modal label>span{font-size:12px;font-weight:750;color:#555961}.editor-card input,.editor-card textarea,.prompt-modal input,.prompt-modal textarea{appearance:none;border:1px solid #dfe1e5;border-radius:10px;padding:12px 13px;font:inherit;resize:vertical;background:#fff!important;color:#111!important;-webkit-text-fill-color:#111!important;color-scheme:light}.editor-card input::placeholder,.editor-card textarea::placeholder,.prompt-modal input::placeholder,.prompt-modal textarea::placeholder{color:#8b8e95!important;-webkit-text-fill-color:#8b8e95!important;opacity:1}.editor-card textarea{min-height:90px}.two-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.angle-field{display:grid;gap:9px;margin:18px 0}.angle-field>span{font-size:12px;font-weight:750;color:#555961}.angle-field small{color:#8b8f97;font-size:11px}.angle-options{display:flex;gap:8px;flex-wrap:wrap}.angle-options button{border:1px solid #dfe1e5;background:#fff;color:#2b2d31;border-radius:999px;padding:9px 13px;font-weight:700;cursor:pointer}.angle-options button.active{background:#111;color:#fff;border-color:#111}.actions{display:flex;justify-content:flex-end;gap:9px;margin-top:22px;flex-wrap:wrap}.actions button:disabled{opacity:.45;cursor:not-allowed}.format-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.format-grid button{border:1px solid #dedfe3;background:#fafafa;border-radius:13px;padding:17px;text-align:left;display:grid;gap:5px;cursor:pointer}.format-grid button.active{background:#111;color:#fff;border-color:#111}.format-grid span{font-size:12px;color:#7d8189}.format-grid .active span{color:#ccc}.production-ready{text-align:center;padding:45px 20px}.production-ready b{display:grid;place-items:center;margin:auto;width:44px;height:44px;border-radius:50%;background:#e8f8ed;color:#20813d;font-size:20px}.production-ready h4{font-size:19px;margin:14px 0 7px}.production-ready p{max-width:500px;margin:auto;color:#737780;line-height:1.6}.structure-result{display:grid;gap:22px}.structure-status{display:flex;gap:14px;align-items:flex-start;background:#f5faf6;border-radius:13px;padding:16px}.structure-status>b{display:grid;place-items:center;flex:0 0 32px;height:32px;border-radius:50%;background:#dff4e5;color:#20813d}.structure-status h4,.story-pages>h4{margin:2px 0 6px;font-size:16px}.structure-status p{margin:0;color:#646971;line-height:1.55}.fact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.fact-grid section{background:#f7f7f8;border-radius:12px;padding:14px}.fact-grid h5,.structure-sources h5{margin:0 0 9px;font-size:12px}.fact-grid ul{margin:0;padding-left:17px;color:#5f636b;font-size:12px;line-height:1.55}.story-pages{display:grid;gap:9px}.story-pages article{display:grid;grid-template-columns:48px 1fr;gap:12px;border:1px solid #e4e5e8;border-radius:12px;padding:13px}.story-pages article>span{font-size:11px;font-weight:800;background:#111;color:#fff;border-radius:8px;padding:7px;height:max-content;text-align:center}.story-pages h5{margin:1px 0 6px}.story-pages p{font-size:12px;color:#656a72;line-height:1.5;margin:3px 0}.story-pages p strong{color:#2b2e33}.structure-sources{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.structure-sources h5{width:100%}.structure-sources a{font-size:11px;color:#454951;background:#f1f2f4;padding:7px 10px;border-radius:999px;text-decoration:none}.next-production{border:1px dashed #cfd2d7;border-radius:12px;padding:15px}.next-production p{margin:5px 0 0;color:#747880;font-size:12px}.studio-message{background:#f4f4f5;border-radius:9px;padding:10px 13px;font-size:12px}.welcome{text-align:center;padding:100px 20px}.welcome>span{font-size:40px}.welcome h2{margin:14px 0 8px}.welcome p{color:#777b84}.welcome a{display:inline-block;background:#111;color:#fff;border-radius:10px;padding:11px 16px;text-decoration:none;margin-top:10px}.welcome small{display:block;margin-top:18px;color:#a33}.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.46);z-index:100;display:grid;place-items:center;padding:22px}.prompt-modal{background:#fff!important;color:#111!important;color-scheme:light;width:min(760px,100%);max-height:90vh;overflow:auto;border-radius:18px;padding:24px}.prompt-modal header{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding-bottom:15px}.prompt-modal header span{font-size:10px;font-weight:800;background:#fff0c2;padding:4px 7px;border-radius:6px}.prompt-modal h2{margin:8px 0 3px;color:#111}.prompt-modal header p{margin:0;color:#777;font-size:12px}.prompt-modal header button{border:0;background:transparent;color:#111;font-size:25px;cursor:pointer}.prompt-modal textarea{min-height:130px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.prompt-modal footer{display:flex;justify-content:flex-end;gap:9px;margin-top:20px}@media(max-width:900px){.studio-page{display:block;width:100%;max-width:100vw}.studio-shell,.studio-layout,.project-list,.studio-workspace,.editor-card{min-width:0;max-width:100%}.studio-layout{display:block}.project-list{border-right:0;border-bottom:1px solid #ddd}.project-head{display:block}.stage-track{max-width:100%;margin-top:18px;overflow-x:auto;padding-bottom:6px}.two-fields,.format-grid,.fact-grid{grid-template-columns:1fr}.studio-workspace{padding:20px;overflow:hidden}}
  @media(max-width:900px){.project-list{display:flex;align-items:stretch;gap:8px;overflow-x:auto;padding:10px 12px}.project-list>div{flex:0 0 auto;align-items:center;padding:0 5px}.project-list>.new-project-button{flex:0 0 132px;width:132px!important;margin:0!important}.project-list-card{flex:0 0 220px;margin:0}.project-select-button{min-height:54px;padding-top:9px;padding-bottom:9px}.project-list .empty{padding:10px}}
  @media(max-width:560px){.studio-progress{overflow:visible}.studio-progress .studio-step-nav{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));overflow:visible!important}.studio-step-nav button{min-width:0!important;padding:8px 4px!important;gap:4px!important}.studio-step-nav button b{font-size:9px;overflow:hidden;text-overflow:ellipsis}.studio-step-nav button em{display:none}.studio-step-nav button span{width:18px;height:18px}}
`;

const editingStyles = `
  .project-list>button{color:#111!important;-webkit-text-fill-color:#111!important}
  .project-list>button strong{color:#111!important;-webkit-text-fill-color:#111!important}
  .project-list>button span{color:#777b84!important;-webkit-text-fill-color:#777b84!important}
  .project-list>button em{color:#747880!important;-webkit-text-fill-color:#747880!important}
  .project-creator{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;padding:3px 0 0!important}.project-creator img,.project-creator-avatar{width:24px!important;height:24px!important;flex:0 0 24px!important;border-radius:50%!important;object-fit:cover!important}.project-creator-avatar{display:grid!important;place-items:center!important;background:#e8e9ec!important;color:#303238!important;-webkit-text-fill-color:#303238!important;font-size:10px!important;font-weight:800!important}.project-creator small{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#696d75!important;-webkit-text-fill-color:#696d75!important;font-size:11px!important;font-weight:650!important}
  .project-list-card{position:relative;border:1px solid transparent;border-radius:12px;margin-bottom:7px;overflow:hidden}.project-list-card.active{background:#fff;border-color:#dedfe3;box-shadow:0 5px 18px rgba(0,0,0,.05)}.project-select-button{width:100%;min-width:0;border:0;background:transparent;color:#111;text-align:left;padding:13px 58px 13px 13px;display:grid;gap:5px;cursor:pointer}.project-select-button>strong{font-size:14px;line-height:1.35;color:#111;-webkit-text-fill-color:#111}.project-delete-button{position:absolute;top:10px;right:9px;border:0;border-radius:7px;background:#f0f1f3;color:#6c7078;padding:6px 8px;font-size:10px;font-weight:750;cursor:pointer;opacity:.72;transition:opacity .15s,background .15s,color .15s}.project-list-card:hover .project-delete-button,.project-list-card:focus-within .project-delete-button{opacity:1}.project-delete-button:hover{background:#fee8e8;color:#b42318}.project-delete-button:disabled{cursor:wait;opacity:.55}
  .studio-loading{min-height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#202126}
  .studio-loading-spinner{width:28px;height:28px;border:3px solid #dedfe3;border-top-color:#111;border-radius:50%;animation:studio-loading-spin .8s linear infinite}
  .studio-loading h2{margin:16px 0 5px;font-size:20px;color:#111}
  .studio-loading p{margin:0;color:#777b84;font-size:12px}
  .studio-loading-skeleton{width:min(480px,90%);display:grid;gap:10px;margin-top:25px}
  .studio-loading-skeleton i{display:block;height:14px;border-radius:999px;background:linear-gradient(90deg,#eee 25%,#f7f7f7 45%,#eee 65%);background-size:220% 100%;animation:studio-loading-shimmer 1.25s ease-in-out infinite}
  .studio-loading-skeleton i:nth-child(2){width:82%}.studio-loading-skeleton i:nth-child(3){width:64%}
  @keyframes studio-loading-spin{to{transform:rotate(360deg)}}
  @keyframes studio-loading-shimmer{to{background-position:-220% 0}}
  .studio-step-nav{position:sticky;top:0;z-index:12;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin:0 0 18px;padding:9px;background:rgba(255,255,255,.96);border:1px solid #e5e6e9;border-radius:13px;backdrop-filter:blur(10px);overflow-x:auto}
  .studio-step-nav button{display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:9px;background:#f2f3f5;color:#696d75;padding:10px 7px;font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap}.studio-step-nav button span{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#fff;font-size:9px}.studio-step-nav button.done{color:#23723b;background:#edf8f0}.studio-step-nav button.active{background:#111;color:#fff}.studio-step-nav button.active span{color:#111}.studio-step-nav button:disabled{opacity:.42;cursor:not-allowed}
  .production-card:not([data-step="structure"]) .structure-status,.production-card:not([data-step="structure"]) .fact-grid,.production-card:not([data-step="structure"]) .story-pages,.production-card:not([data-step="structure"]) .structure-sources,.production-card:not([data-step="structure"])>.actions,.production-card:not([data-step="structure"]) .production-ready{display:none}
  .production-card:not([data-step="assets"]) .next-production{display:none}.production-card:not([data-step="drafts"]):not([data-step="carousel"]) .page-drafts{display:none}.production-card[data-step="drafts"] .generated-carousel,.production-card[data-step="drafts"] .page-drafts>.generation-next-step{display:none}.production-card[data-step="carousel"] .page-drafts-heading,.production-card[data-step="carousel"] .page-drafts>article,.production-card[data-step="carousel"] .draft-confirm-step{display:none}
  .studio-step-footer{position:sticky;bottom:12px;z-index:11;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;margin-top:18px;padding:10px 12px;border:1px solid #e1e3e6;border-radius:12px;background:rgba(255,255,255,.96);box-shadow:0 8px 28px rgba(20,22,26,.1);backdrop-filter:blur(10px)}.studio-step-footer span{text-align:center;color:#7b7f87;font-size:11px;font-weight:750}.studio-step-footer button{border:0;border-radius:9px;background:#111;color:#fff;padding:10px 14px;font-size:11px;font-weight:800;cursor:pointer}.studio-step-footer button:disabled{opacity:.35;cursor:not-allowed}
  @media(max-width:900px){.studio-step-nav{display:flex;overflow-x:auto;justify-content:flex-start}.studio-step-nav button{min-width:104px}.studio-step-footer{bottom:8px}}
  .generated-carousel-head button:disabled{opacity:.45;cursor:not-allowed}
  .carousel-generation-status{display:flex;align-items:center;gap:8px;border-radius:9px;background:#e8f3eb;color:#24653a;padding:10px 12px;font-size:11px;font-weight:800}
  .carousel-generation-status span{width:14px;height:14px;border:2px solid #9bc4a7;border-top-color:#24653a;border-radius:50%;animation:carousel-generation-spin .8s linear infinite}
  .carousel-approval-status{border-radius:11px;background:#e8f3eb;color:#24653a;padding:13px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;font-weight:800}.carousel-approval-status a{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 17px;border-radius:9px;background:#176b38;color:#fff;text-decoration:none;white-space:nowrap;font-size:12px}.carousel-approval-status a:hover{background:#10592d}@media(max-width:600px){.carousel-approval-status{align-items:stretch;flex-direction:column}.carousel-approval-status a{width:100%;box-sizing:border-box;min-height:48px;font-size:14px}}
  @keyframes carousel-generation-spin{to{transform:rotate(360deg)}}
  .page-drafts-heading-actions{display:flex;align-items:center;gap:8px}.page-drafts-heading-actions button{border:1px solid #d9dce1;border-radius:8px;background:#fff;color:#222;padding:8px 11px;font-size:10px;font-weight:800;cursor:pointer}.page-drafts-heading-actions button:disabled{opacity:.45;cursor:not-allowed}
  .page-drafts-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0}.page-drafts-heading h4{margin:0}.page-drafts-heading .confirmed-pill{background:#e8f7ed!important;color:#208345!important}.draft-confirm-step,.generation-next-step{display:flex;align-items:center;justify-content:space-between;gap:20px;border:1px dashed #cfd2d7;border-radius:13px;padding:16px;margin-top:7px}.draft-confirm-step b,.generation-next-step b{font-size:13px}.draft-confirm-step p,.generation-next-step p{margin:5px 0 0;font-size:11px;color:#747880}.draft-confirm-step button,.generation-next-step button,.generated-carousel-head button{flex:0 0 auto;border:0;border-radius:9px;background:#111;color:#fff;padding:11px 15px;font-size:11px;font-weight:800;cursor:pointer}.draft-confirm-step button:disabled,.generation-next-step button:disabled{opacity:.45;cursor:not-allowed}.generation-next-step{background:#f6faf7;border-style:solid;border-color:#dcebe0}.generated-carousel{display:grid;gap:14px;border:1px solid #dcebe0;background:#f6faf7;border-radius:13px;padding:16px}.generated-carousel-head{display:flex;align-items:center;justify-content:space-between;gap:15px}.generated-carousel-head p{margin:4px 0 0}.generated-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:11px}.page-drafts .generated-grid article{display:block;grid-template-columns:none;background:#fff;border:1px solid #e1e3e6;border-radius:10px;overflow:hidden}.page-drafts .generated-grid article>img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:contain;background:#f3f3f1}.page-drafts .generated-grid article>div:last-child{display:grid;gap:8px;padding:10px 12px}.page-drafts .generated-grid article>div:last-child b{white-space:nowrap}.generated-actions{display:grid!important;grid-template-columns:1fr 1fr;gap:7px}.generated-actions a{display:flex;align-items:center;justify-content:center;border-radius:7px;padding:8px 6px!important;font-size:10px;font-weight:800;text-decoration:none}.generated-edit-button{background:#eceef1;color:#222!important}.generated-download-button{background:#111;color:#fff!important}.caption-draft{white-space:pre-wrap;background:#fff;border-radius:10px;padding:13px!important}@media(max-width:700px){.draft-confirm-step,.generation-next-step{align-items:flex-start;flex-direction:column}.generated-grid{grid-template-columns:1fr 1fr}}
  .page-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
  .page-card-head>div{display:flex;gap:5px}
  .page-card-head button,.page-editor-actions button{border:0;border-radius:7px;background:#f0f1f3;color:#34373c;padding:6px 9px;font-size:10px;font-weight:750;cursor:pointer}
  .page-card-head button.delete{color:#a12d2d;background:#fff0f0}
  .page-editor label{margin:0 0 9px}
  .page-editor label span{font-size:10px}
  .page-editor input,.page-editor textarea{width:100%;box-sizing:border-box;font-size:12px}
  .page-editor textarea{min-height:70px}
  .page-editor-actions{display:flex;justify-content:flex-end;gap:7px}
  .page-editor-actions button:last-child{background:#111;color:#fff}
  .asset-upload-head{display:flex;justify-content:space-between;gap:18px;align-items:center}.asset-upload-head p{margin:5px 0 0!important}.asset-upload-actions{display:flex;align-items:center;gap:7px}.asset-upload-button,.asset-library-button{display:block!important;margin:0!important;border:0;background:#111;color:#fff;border-radius:9px;padding:10px 14px;font-size:12px;font-weight:750;cursor:pointer}.asset-library-button{background:#eceef1;color:#222}.asset-upload-button input{display:none}.asset-empty{text-align:center;color:#92969e;background:#f7f7f8;border-radius:10px;padding:28px;margin-top:15px;font-size:12px}.asset-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-top:16px}.asset-grid article{border:1px solid #e1e3e6;border-radius:11px;overflow:hidden;background:#fff}.asset-grid img{width:100%;height:150px;object-fit:contain;background:#f2f2f3;display:block}.asset-grid article>div{padding:10px;display:grid;gap:7px}.asset-grid strong{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.asset-grid small{font-size:10px;color:#898d95}.asset-grid select{width:100%;border:1px solid #dedfe3;border-radius:7px;background:#fff!important;color:#111!important;-webkit-text-fill-color:#111!important;color-scheme:light;padding:7px;font-size:10px}.asset-grid select option{background:#fff!important;color:#111!important}.asset-actions{display:flex;gap:5px}.asset-actions button{flex:1;border:0;border-radius:7px;padding:7px;background:#f0f1f3;color:#111!important;-webkit-text-fill-color:#111!important;font-size:10px;font-weight:700;cursor:pointer}.asset-actions button.active{background:#e4f5e9;color:#111!important;-webkit-text-fill-color:#111!important}.asset-actions button:disabled{color:#111!important;-webkit-text-fill-color:#111!important;opacity:.52}.asset-confirm-row{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-top:17px;padding-top:15px;border-top:1px solid #e6e7ea}.asset-confirm-row span{font-size:11px;color:#686d75}.asset-confirm-row button{border:0;border-radius:9px;background:#111;color:#fff;padding:10px 14px;font-size:11px;font-weight:750;cursor:pointer}.asset-confirm-row button:disabled{opacity:.5}@media(max-width:900px){.asset-grid{grid-template-columns:1fr 1fr}.asset-upload-head{align-items:flex-start}.asset-upload-actions{align-items:stretch;flex-direction:column}.asset-confirm-row{align-items:flex-start;flex-direction:column}}
  .asset-upload-block{display:grid;gap:9px}.asset-upload-status{display:flex;align-items:flex-start;gap:10px;border:1px solid #d7dfbf;border-radius:10px;background:#f5f8eb;padding:12px 14px;color:#42551b;font-size:12px;font-weight:700;line-height:1.5}.asset-upload-status>b{display:grid;place-items:center;flex:0 0 20px;height:20px;border-radius:50%;background:#dfeabf}.asset-upload-status.progress>b{border:2px solid #d7dfbf;border-top-color:var(--soon-oxblood);background:transparent;animation:studio-loading-spin .8s linear infinite}.asset-upload-status.error{border-color:#d9aaa7;background:#fff1ef;color:#742b30}.asset-upload-status.error>b{background:#742b30;color:#fff}.asset-upload-status.success>b{background:#58731e;color:#fff}
  .asset-generation-status{display:flex!important;align-items:flex-start;gap:10px;max-width:590px;color:#303239!important;line-height:1.45}.asset-generation-status>b{flex:0 0 18px;width:18px;height:18px;border:2px solid #d8c8c1;border-top-color:var(--soon-oxblood);border-radius:50%;animation:studio-loading-spin .8s linear infinite}.asset-generation-status>span{display:grid;gap:2px;color:#666a72!important}.asset-generation-status strong{color:#202126;font-size:12px}.asset-confirm-row:has(.asset-generation-status){border:1px solid #d7dfbf;border-radius:12px;background:#f5f8eb;padding:14px 15px;margin-top:17px}.asset-confirm-row:has(.asset-generation-status)>button{min-width:155px}
  .asset-visual-guidance{margin-top:15px;padding:13px 15px;border:1px solid #e2ded0;border-radius:11px;background:#faf8f1}.asset-visual-guidance>summary{cursor:pointer;font-size:12px;font-weight:800;color:#34373c}.asset-visual-guidance[open]>summary{margin-bottom:10px}.asset-visual-guidance ul{display:grid;gap:7px;margin:0;padding:0;list-style:none}.asset-visual-guidance li{display:grid;grid-template-columns:36px 1fr;gap:8px;align-items:start;font-size:11px;line-height:1.5;color:#555961}.asset-visual-guidance li strong{color:#222}.asset-visual-guidance p{margin:0!important;font-size:11px;color:#737780;line-height:1.55}
  .asset-source-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:15px}.asset-source-tabs button{border:1px solid #dfe1e5;background:#fff;border-radius:10px;padding:11px 9px;font-size:11px;font-weight:750;cursor:pointer}.asset-source-tabs button.active{background:#111;color:#fff;border-color:#111}.asset-source-panel,.asset-search-panel{margin-top:9px;border:1px solid #e2e3e6;border-radius:11px;padding:14px;background:#fafafa}.asset-source-panel{display:flex;align-items:center;justify-content:space-between;gap:15px}.asset-source-panel b,.asset-license-note b{font-size:12px}.asset-page-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.asset-page-actions button,.asset-search-controls button,.licensed-result-grid button{border:0;background:#111;color:#fff;border-radius:8px;padding:9px 11px;font-size:10px;font-weight:750;cursor:pointer}.asset-page-actions button:disabled{opacity:.5}.asset-license-note{background:#fff7df;border:1px solid #ecdca9;border-radius:9px;padding:11px}.asset-license-note p{line-height:1.55!important;color:#655c43!important}.asset-search-controls{display:grid;grid-template-columns:92px 1fr auto;gap:7px;margin-top:10px}.asset-search-controls select,.asset-search-controls input{border:1px solid #dfe1e5;border-radius:8px;background:#fff!important;color:#111!important;padding:9px;font-size:11px}.licensed-result-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:11px}.licensed-result-grid article{border:1px solid #e1e3e6;border-radius:9px;overflow:hidden;background:#fff}.licensed-result-grid img{width:100%;height:130px;object-fit:cover;background:#eee;display:block}.licensed-result-grid article>div{padding:9px;display:grid;gap:6px}.licensed-result-grid strong{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.licensed-result-grid small{font-size:9px;color:#747880}.licensed-result-grid article>div>div{display:flex;align-items:center;justify-content:space-between;gap:5px}.licensed-result-grid a,.asset-source-meta a{font-size:9px;color:#555;text-decoration:underline}.asset-source-meta{white-space:normal!important;line-height:1.4}.asset-source-meta a{display:inline}.licensed-result-grid button{padding:7px 8px}@media(max-width:900px){.asset-source-tabs,.licensed-result-grid{grid-template-columns:1fr}.asset-source-panel{align-items:flex-start;flex-direction:column}.asset-search-controls{grid-template-columns:1fr}.asset-page-actions{justify-content:flex-start}}
  .asset-source-tabs button{border-color:#111;background:#111;color:#fff!important;-webkit-text-fill-color:#fff!important;opacity:.72;transition:opacity .15s ease,box-shadow .15s ease}.asset-source-tabs button:hover{opacity:.88}.asset-source-tabs button.active{background:#111;color:#fff!important;-webkit-text-fill-color:#fff!important;border-color:#111;opacity:1;box-shadow:0 0 0 2px #fff,0 0 0 4px #111}
  .draft-start-row{display:flex;justify-content:flex-end;margin-top:12px}.draft-start-row button{border:0;border-radius:9px;background:#111;color:#fff;padding:11px 15px;font-size:11px;font-weight:800;cursor:pointer}.draft-start-row button:disabled{opacity:.5}.page-drafts{display:grid;gap:12px}.page-drafts>h4{margin:8px 0}.page-drafts article{display:grid;grid-template-columns:180px 1fr;border:1px solid #e1e3e6;border-radius:13px;overflow:hidden}.draft-assets-preview{width:180px;height:220px;display:grid;grid-template-columns:1fr;background:#f2f2f3}.draft-assets-preview.is-multi{grid-template-columns:1fr 1fr;gap:2px}.draft-assets-preview img,.draft-assets-preview .draft-no-image{width:100%;height:220px;min-width:0;object-fit:cover;background:#f2f2f3}.draft-no-image{display:grid;place-items:center;text-align:center;color:#777;font-size:10px;padding:8px;box-sizing:border-box}.page-drafts article>div:last-child{padding:16px}.page-drafts span{font-size:10px;font-weight:800;background:#111;color:#fff;border-radius:6px;padding:5px 7px}.page-drafts h5{font-size:17px;margin:12px 0 5px}.page-drafts h6{font-size:12px;margin:0 0 10px;color:#676b73}.page-drafts p{font-size:12px;line-height:1.55;color:#50545b}.page-drafts small{display:block;margin-top:10px;color:#8a8e96}.draft-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.draft-card-head>div{display:flex;gap:6px}.draft-card-head button,.draft-editor-actions button{border:0;border-radius:7px;padding:7px 10px;background:#f1f2f4;color:#222;font-size:10px;font-weight:800;cursor:pointer}.draft-card-head button.delete{background:#fff0f0;color:#b52a2a}.draft-editor{display:grid;gap:10px}.draft-editor label{display:grid;gap:5px}.draft-editor label>b{font-size:10px;color:#34373c}.draft-editor input,.draft-editor textarea,.draft-editor select{width:100%;box-sizing:border-box;border:1px solid #d9dce1;border-radius:8px;background:#fff;color:#111;padding:9px 10px;font:inherit;font-size:11px}.draft-editor textarea{min-height:82px;resize:vertical;line-height:1.5}.draft-editor-actions{display:flex;justify-content:flex-end;gap:7px}.draft-editor-actions button.primary{background:#111;color:#fff}.draft-editor-actions button:disabled{opacity:.5}@media(max-width:700px){.page-drafts article{grid-template-columns:1fr}.draft-assets-preview{width:100%;height:250px}.draft-assets-preview img,.draft-assets-preview .draft-no-image{height:250px}}
  .draft-asset-missing{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:14px;padding:12px 13px;border:1px solid #e4c7a3;border-radius:10px;background:#fff8e9}.draft-asset-missing b{font-size:12px;color:#4d2023}.draft-asset-missing p{margin:4px 0 0}.draft-asset-missing small{margin-top:4px;color:#6f5c42}.draft-asset-missing>div:last-child{display:flex;gap:7px;flex:0 0 auto}.draft-asset-missing button{border:1px solid #d5b88f;border-radius:7px;background:#fff;color:#222;padding:8px 10px;font-size:10px;font-weight:800;cursor:pointer}@media(max-width:700px){.draft-asset-missing{align-items:flex-start;flex-direction:column}.draft-asset-missing>div:last-child{width:100%;flex-wrap:wrap}}
  .draft-layout-detail{margin-top:12px;border-top:1px solid #ece8e3;padding-top:10px}.draft-layout-detail summary{width:max-content;cursor:pointer;color:var(--soon-oxblood);font-size:10px;font-weight:800}.draft-layout-detail p{margin:9px 0 0!important;border-radius:9px;background:#f7f5f2;padding:11px;color:#777b83!important;font-size:10px!important;line-height:1.55!important}.draft-layout-detail:not([open]) p{display:none}
  .studio-page{--soon-ivory:#f6f2eb;--soon-ink:#202126;--soon-oxblood:#6b2c30;--soon-oxblood-dark:#4d2023;--soon-clay:#b46a61;--soon-chartreuse:#c7e63a;--soon-line:#ded5cd;--soon-muted:#6f737d;background:var(--soon-ivory);color:var(--soon-ink)}.studio-shell{background:var(--soon-ivory)}.studio-topbar{min-height:86px;border-color:var(--soon-line);background:rgba(246,242,235,.94);padding:0 34px}.studio-topbar h1{font-size:26px;letter-spacing:-.035em}.studio-topbar p{color:var(--soon-muted)}.studio-topbar .secondary{border:1px solid var(--soon-line);background:#fff!important;color:var(--soon-oxblood)!important}.studio-layout{grid-template-columns:300px minmax(0,1fr);min-height:calc(100vh - 86px)}.project-list{border-color:var(--soon-line);background:#efe8df;padding:22px 16px}.project-list>div strong{color:var(--soon-oxblood);font-size:12px;letter-spacing:.06em}.project-list-card.active{border-color:#c9aaa5;box-shadow:4px 4px 0 #ddc6c1}.project-list-card.active .project-select-button{background:#fff}.project-delete-button{background:#f7eee9}.studio-workspace{max-width:1120px;padding:32px clamp(20px,4vw,46px)}.editor-card{border-color:var(--soon-line);background:#fff;box-shadow:none}.section-title span{color:var(--soon-oxblood)}.studio-step-nav{border-color:var(--soon-line);background:rgba(246,242,235,.94)}.studio-step-nav button{background:#ebe4dc}.studio-step-nav button.active{background:var(--soon-oxblood);color:#fff}.studio-step-nav button.done{background:#edf6d4;color:#52691a}.studio-step-footer{border-color:var(--soon-line);background:rgba(246,242,235,.96)}.studio-step-footer button,.actions button:not(.secondary),.asset-upload-button,.asset-page-actions button,.draft-start-row button,.draft-confirm-step button,.generation-next-step button,.generated-carousel-head button{background:var(--soon-oxblood);color:#fff}.format-grid button.active,.angle-options button.active,.asset-source-tabs button.active{border-color:var(--soon-oxblood);background:var(--soon-oxblood)}.production-ready b,.structure-status>b{background:#edf6d4;color:#52691a}.story-pages article>span,.page-drafts span{background:var(--soon-oxblood)}.welcome a,.generated-download-button{background:var(--soon-oxblood)!important}.next-production,.generation-next-step{border-color:#dce8b6;background:#f3f8e3}.studio-message{background:#f1ebe4;color:var(--soon-oxblood)}@media(max-width:900px){.studio-topbar{min-height:auto;padding:20px}.studio-topbar h1{font-size:23px}.studio-layout{min-height:0}.project-list{background:#efe8df}.studio-workspace{padding:18px 14px 70px}.editor-card{padding:19px 15px}.studio-step-footer{grid-template-columns:1fr 1fr}.studio-step-footer span{grid-column:1/-1;grid-row:1}.studio-step-footer button{min-height:44px}}
  .format-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.format-grid button{grid-template-columns:42px 1fr;align-items:center;gap:12px;min-height:116px}.format-grid button>i{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:#eee7df;color:var(--soon-oxblood);font-size:22px;font-style:normal}.format-grid button>span{display:grid;gap:4px}.format-grid button strong{font-size:15px}.format-grid button small{color:#777b83;font-size:11px;line-height:1.45}.format-grid button.active>i{background:var(--soon-chartreuse);color:var(--soon-oxblood)}.format-grid button.active small{color:#eadfdf}.slide-count-recommendation{display:grid;gap:14px;margin-top:16px;border:1px solid #d7e9a1;border-radius:14px;background:#f6fae8;padding:18px}.slide-count-recommendation>div:first-child{display:grid;gap:4px}.slide-count-recommendation>div:first-child strong{font-size:15px;color:var(--soon-ink)}.slide-count-recommendation>div:first-child small{color:var(--soon-muted);font-size:12px;line-height:1.5}.quantity-options{display:grid;grid-template-columns:repeat(8,minmax(58px,1fr));gap:8px}.quantity-options button{min-height:48px;border:1px solid var(--soon-line);border-radius:10px;background:#fff;color:var(--soon-ink);font-size:13px;font-weight:800;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}.quantity-options button small{font-size:9px;color:#71852e}.quantity-options button.active{border-color:var(--soon-oxblood);background:var(--soon-oxblood);color:#fff}.quantity-options button.active small{color:#e4f6a4}@media(max-width:1100px){.format-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.quantity-options{grid-template-columns:repeat(4,1fr)}}@media(max-width:760px){.format-grid{grid-template-columns:1fr}.format-grid button{min-height:88px}.quantity-options{grid-template-columns:repeat(4,1fr)}}
  .video-package-ready{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border:1px solid #d9e5b5;border-radius:14px;background:#f3f8e3;padding:18px}.video-package-ready>div{display:grid;gap:6px}.video-package-ready small{color:var(--soon-oxblood);font-size:10px;font-weight:850;letter-spacing:.08em}.video-package-ready h4{margin:0;font-size:18px}.video-package-ready p{margin:0;color:var(--soon-muted);font-size:11px}.video-package-ready ul{margin:4px 0 0;padding-left:18px;color:#565b62;font-size:11px;line-height:1.55}.video-package-ready>button{flex:none;border:0;border-radius:9px;background:var(--soon-oxblood);color:#fff;padding:11px 14px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.video-package-ready>span{color:#397552;font-size:11px;font-weight:800}@media(max-width:700px){.video-package-ready{flex-direction:column}.video-package-ready>button{width:100%}}
  .video-draft-start{display:flex;align-items:center;justify-content:space-between;gap:22px;border:1px solid var(--soon-line);border-radius:14px;background:#faf8f4;padding:18px}.video-draft-start>div{display:grid;gap:5px}.video-draft-start small{color:var(--soon-oxblood);font-size:10px;font-weight:850}.video-draft-start b{font-size:16px}.video-draft-start p{margin:0;color:var(--soon-muted);font-size:11px}.video-draft-start>button{flex:none;border:0;border-radius:9px;background:var(--soon-oxblood);color:#fff;padding:11px 14px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}@media(max-width:700px){.video-draft-start{align-items:stretch;flex-direction:column}}
  .style-intro{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:10px;border-radius:11px;background:#f3f8e3;padding:13px 15px}.style-intro>div{display:grid;gap:3px;min-width:0}.style-intro b{font-size:12px}.style-intro span{color:var(--soon-muted);font-size:10px}.style-intro>button{flex:0 0 auto;border:0;border-radius:9px;background:var(--soon-oxblood);color:#fff;padding:10px 13px;font-size:10px;font-weight:850;cursor:pointer;box-shadow:0 4px 10px rgba(107,44,48,.16)}.style-intro>button:hover{filter:brightness(.94)}.style-intro>button:disabled{cursor:not-allowed;opacity:.55}.style-preview-notice{display:flex;align-items:flex-start;gap:9px;margin:0 0 14px;border:1px solid #ead8b0;border-radius:10px;background:#fff8e8;color:#604b22;padding:10px 12px}.style-preview-notice>b{flex:0 0 auto;font-size:10px}.style-preview-notice>span{font-size:10px;line-height:1.5}.style-template-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.style-template-grid>article{min-width:0;overflow:hidden;border:1px solid var(--soon-line);border-radius:14px;background:#fff;color:var(--soon-ink);padding:0;text-align:left;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}.style-template-grid>article:hover{transform:translateY(-2px)}.style-template-grid>article.active{border-color:var(--soon-oxblood);box-shadow:0 0 0 1px var(--soon-oxblood),4px 4px 0 #ddc6c1}.template-preview{position:relative;height:150px;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:7px;padding:17px;overflow:hidden}.template-preview>i{position:absolute;width:78px;height:78px;right:-16px;top:-20px;border-radius:50%}.template-preview>small{position:relative;font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.72}.template-preview>strong{position:relative;max-width:88%;font-size:22px;line-height:1.05;letter-spacing:-.045em}.template-preview>p{position:relative;margin:0;font-size:9px;line-height:1.35;opacity:.75}.template-preview[data-style="product-focus"]{justify-content:center}.template-preview[data-style="product-focus"]>i{width:54px;height:88px;right:22px;top:26px;border-radius:8px;box-shadow:9px 9px 0 rgba(0,0,0,.08)}.template-preview[data-style="product-focus"]>strong,.template-preview[data-style="product-focus"]>p{max-width:58%}.template-preview[data-style="problem-solution"]>strong{font-size:20px}.template-preview[data-style="bold-social"]>strong{font-size:25px;text-transform:uppercase}.template-copy{display:grid;gap:5px;padding:13px}.template-copy>span{width:max-content;border-radius:999px;background:#edf6d4;color:#52691a;padding:4px 7px;font-size:8px;font-weight:850}.template-copy>strong{font-size:14px}.template-copy>small{min-height:30px;color:var(--soon-muted);font-size:10px;line-height:1.45}@media(max-width:850px){.style-template-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.style-intro{align-items:flex-start;flex-direction:column}.style-intro>button{width:100%}.style-preview-notice{display:grid}.style-template-grid{grid-template-columns:1fr}}
  .video-style-preview{--video-bg:#171719;--video-ink:#fff;--video-accent:#c7e63a;position:relative;width:min(190px,72%);aspect-ratio:9/16;margin:12px auto;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;background-color:var(--video-bg);background-position:center;background-size:cover;color:var(--video-ink);box-shadow:0 10px 25px rgba(25,20,18,.18)}.video-preview-top{display:flex;justify-content:space-between;align-items:center;padding:10px}.video-preview-top span,.video-preview-top b{border-radius:999px;background:rgba(0,0,0,.52);color:#fff;padding:4px 7px;font-size:7px;letter-spacing:.06em}.video-preview-scene{flex:1;display:grid;place-items:center;text-align:center;padding:14px}.video-preview-scene>i{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--video-accent);color:var(--video-bg);font-size:13px;font-style:normal;box-shadow:0 5px 15px rgba(0,0,0,.2)}.video-preview-scene.generating{align-content:center;gap:10px;background:rgba(246,242,235,.62);backdrop-filter:blur(5px)}.video-preview-scene.generating>i{box-sizing:border-box;width:26px;height:26px;border:3px solid rgba(107,44,48,.2);border-top-color:var(--soon-oxblood);background:transparent;animation:studio-loading-spin .8s linear infinite}.video-preview-scene small{max-width:145px;border-radius:999px;background:rgba(0,0,0,.62);color:#fff;padding:6px 9px;font-size:7px;line-height:1.35}.video-preview-caption{display:grid;gap:4px;padding:12px 12px 9px;background:linear-gradient(180deg,transparent,rgba(0,0,0,.88))}.video-preview-caption small{color:var(--video-accent);font-size:7px;font-weight:900;letter-spacing:.1em}.video-preview-caption strong{color:#fff;font-size:15px;line-height:1.15;letter-spacing:-.025em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.video-preview-timeline{display:flex;gap:3px;padding:0 12px 10px}.video-preview-timeline i{height:3px;flex:1;border-radius:99px;background:rgba(255,255,255,.35)}.video-preview-timeline i:first-child{background:var(--video-accent)}.video-style-preview[data-style*="diary"] .video-preview-caption strong{font-weight:600}.video-style-preview[data-style*="news"] .video-preview-caption{border-top:3px solid var(--video-accent)}.video-style-preview[data-style*="hook"] .video-preview-caption strong{font-size:17px;text-transform:uppercase}.style-preview-modal-panel .video-style-preview{width:min(300px,78vw);margin:18px auto}.style-template-grid>article:has(.video-style-preview){background:#f4f0ea}
  .brief-source-field textarea{min-height:150px;font-size:15px;line-height:1.65}.brief-source-field>small{color:var(--soon-muted);font-size:11px}.structure-evidence{border:1px solid var(--soon-line);border-radius:12px;background:#faf8f4;padding:13px 15px}.structure-evidence>summary,.page-visual-detail>summary{cursor:pointer;font-size:11px;font-weight:800;color:var(--soon-oxblood)}.structure-evidence>p{color:var(--soon-muted);font-size:11px;line-height:1.55}.structure-evidence .fact-grid{margin-top:12px}.story-pages article:not(:has(.page-editor))>div>p{max-width:1100px;white-space:pre-line;line-height:1.65}.page-visual-detail{margin-top:8px}.page-visual-detail p{display:block!important;margin-top:8px!important}.studio-message{position:fixed;z-index:90;top:22px;right:24px;width:min(430px,calc(100vw - 48px));box-sizing:border-box;margin:0!important;border:1px solid #d7dfbf;border-radius:12px!important;background:#f5f8eb!important;color:#334418!important;box-shadow:0 12px 34px rgba(31,25,20,.14);padding:15px 16px 15px 46px!important;font-size:13px!important;font-weight:750;line-height:1.45}.studio-message:before{content:"✓";position:absolute;left:16px;top:13px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#58731e;color:#fff;font-size:12px;font-weight:900}.studio-message.loading{border-color:#dbc8c1;background:#f7eee9!important;color:var(--soon-oxblood)!important}.studio-message.loading:before{content:"";box-sizing:border-box;top:15px;width:16px;height:16px;border:2px solid #c9aaa5;border-top-color:var(--soon-oxblood);background:transparent;animation:studio-loading-spin .8s linear infinite}.studio-message.error{border-color:#d9aaa7;background:#fff1ef!important;color:#742b30!important}.studio-message.error:before{content:"!";background:#742b30}@media(max-width:700px){.studio-message{top:12px;right:12px;width:calc(100vw - 24px)}}
  .new-content-entry{border:1px solid var(--soon-line);border-radius:20px;background:#fff;padding:clamp(22px,4vw,42px)}.new-content-head{max-width:560px;margin-bottom:26px}.new-content-head>span{color:var(--soon-oxblood);font-size:11px;font-weight:800;letter-spacing:.08em}.new-content-head h2{font-size:28px;margin:7px 0}.new-content-head p{margin:0;color:var(--soon-muted);font-size:13px}.entry-format-grid button{border:1px solid var(--soon-line);background:#faf8f4;color:var(--soon-ink)}.entry-format-grid button:hover{border-color:var(--soon-oxblood);transform:translateY(-2px)}.entry-format-grid button:disabled{opacity:.5;cursor:wait}.entry-topic-link{display:flex;justify-content:space-between;gap:15px;margin-top:24px;padding-top:18px;border-top:1px solid #eee8e2;font-size:12px}.entry-topic-link span{color:var(--soon-muted)}.entry-topic-link a{color:var(--soon-oxblood);font-weight:750;text-decoration:none}@media(max-width:760px){.new-content-entry{padding:20px 15px}.new-content-head h2{font-size:23px}.entry-topic-link{align-items:flex-start;flex-direction:column}}
  .production-ready b.working{box-sizing:border-box;background:transparent;border:3px solid #dce8b6;border-top-color:var(--soon-oxblood);animation:studio-loading-spin .8s linear infinite}
  .studio-load-error{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:18px;border:1px solid #dbc8c1;border-radius:12px;background:#f7eee9;padding:13px 15px;color:var(--soon-oxblood);font-size:13px;font-weight:750}.studio-load-error button{flex:none;border:1px solid var(--soon-oxblood);border-radius:9px;background:#fff;color:var(--soon-oxblood);padding:8px 12px;font:inherit;font-size:12px;cursor:pointer}@media(max-width:560px){.studio-load-error{align-items:flex-start;flex-direction:column}.studio-load-error button{width:100%}}
  .style-rule-preview{margin-top:14px;border:1px solid var(--soon-line);border-radius:12px;background:#faf8f4;padding:14px}.style-rule-preview summary{cursor:pointer;font-size:12px;font-weight:800;color:var(--soon-oxblood)}.style-rule-preview>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:14px 0}.style-rule-preview section{display:grid;align-content:start;gap:6px}.style-rule-preview section b{font-size:11px}.style-rule-preview section span{color:var(--soon-muted);font-size:10px;line-height:1.45}.style-rule-preview>small{color:#92959b;font-size:9px}@media(max-width:650px){.style-rule-preview>div{grid-template-columns:1fr}}
  .format-grid button{color:var(--soon-ink);transition:border-color .16s ease,transform .16s ease,background .16s ease}.format-grid button strong{color:var(--soon-ink);font-weight:800}.format-grid button small{color:#5f636b}.format-grid button[data-format="carousel"]>i{background:#f8e7a8;color:#6b5412}.format-grid button[data-format="single_image"]>i{background:#dce9f8;color:#315a82}.format-grid button[data-format="human_video"]>i{background:#e7dfef;color:#654a79}.format-grid button[data-format="ai_video"]>i{background:#dff0df;color:#35683c}.format-grid button.active strong{color:#fff}.format-grid button.active small{color:#eadfdf}.format-grid button.active>i{background:#fff;color:var(--soon-oxblood)}
  .new-content-entry{width:min(820px,100%);margin:22px auto;padding:clamp(28px,5vw,54px);box-sizing:border-box}.new-content-head{max-width:680px;margin-bottom:30px}.new-content-head h2{font-size:clamp(30px,4vw,42px);letter-spacing:-.045em}.new-content-head p{max-width:650px;font-size:15px;line-height:1.6}.entry-brief-field{display:grid!important;gap:9px!important;margin:0!important}.entry-brief-field>span{color:var(--soon-ink);font-size:13px;font-weight:800}.entry-brief-field textarea{display:block;width:100%;min-height:190px!important;box-sizing:border-box;resize:vertical;border:1px solid var(--soon-line);border-radius:14px;background:#fff!important;color:var(--soon-ink)!important;-webkit-text-fill-color:var(--soon-ink)!important;padding:17px 18px;font:inherit;font-size:16px!important;line-height:1.65;outline:none;color-scheme:light}.entry-brief-field textarea::placeholder{color:#99949a!important;-webkit-text-fill-color:#99949a!important;opacity:1}.entry-brief-field textarea:focus{border-color:var(--soon-oxblood);box-shadow:0 0 0 3px rgba(107,44,48,.1)}.entry-brief-field>small{color:var(--soon-muted);font-size:11px}.new-content-actions{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:24px}.new-content-actions>button{flex:none;border:0;border-radius:11px;background:var(--soon-oxblood);color:#fff;padding:13px 18px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.new-content-actions>button:disabled{opacity:.42;cursor:not-allowed}.new-content-actions .entry-topic-link{margin:0;padding:0;border:0;display:flex;gap:8px}.soon-recommended-badge{display:inline-flex;margin-left:7px;border-radius:999px;background:var(--soon-chartreuse);color:var(--soon-oxblood);padding:3px 6px;font-size:8px;font-style:normal;font-weight:900;vertical-align:middle}.format-grid button.active .soon-recommended-badge{background:var(--soon-chartreuse);color:var(--soon-oxblood)}@media(max-width:700px){.new-content-entry{margin:0 auto;padding:25px 18px}.new-content-head h2{font-size:29px}.new-content-actions{align-items:stretch;flex-direction:column}.new-content-actions>button{width:100%}}
`;
