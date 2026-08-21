"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  DashboardSidebar,
  dashboardSidebarStyles,
} from "@/components/dashboard/DashboardSidebar";
import { ClaimOnboardingSession } from "@/components/onboarding/ClaimOnboardingSession";
import {
  resolveActiveWorkspace,
  WORKSPACE_CHANGED_EVENT,
  type WorkspaceSummary,
} from "@/lib/workspace-client";
import { createClient } from "@/lib/supabase";

type ProjectAsset = {
  id: string;
  url: string;
  filename: string;
  width: number;
  height: number;
  assignedPage: string;
  isCover: boolean;
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
  format_decision?: Record<string, string>;
  production?: Record<string, unknown>;
  creator?: {
    avatarUrl: string | null;
    displayName: string;
  } | null;
  updated_at: string;
};

type Permissions = {
  canApprove: boolean;
  canEdit: boolean;
  canManagePrompt: boolean;
  canManageWorkspace: boolean;
  role: string;
};

const formats = [
  { id: "carousel", label: "Carousel", note: "多頁 editorial／故事結構" },
  { id: "single_image", label: "單圖／Meme", note: "一個清晰概念或 punchline" },
  {
    id: "short_video",
    label: "Reel／短片",
    note: "短片腳本、storyboard 或生成提示",
  },
  { id: "story_series", label: "小故事系列", note: "角色或情節連續內容" },
];

const stageLabels: Record<Project["stage"], string> = {
  brief: "建立 Brief",
  format: "判斷格式",
  production: "製作",
  approval: "等待審批",
  scheduled: "已排程",
  archived: "已封存",
};

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
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [generatingCarousel, setGeneratingCarousel] = useState(false);
  const [message, setMessage] = useState("");
  const [brief, setBrief] = useState({ angle: "交由 AI 決定", summary: "" });
  const [selectedFormat, setSelectedFormat] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<number | null>(null);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [removingAssetId, setRemovingAssetId] = useState<string | null>(null);
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

  const selected = useMemo(
    () =>
      projects.find((project) => project.id === selectedId) ||
      projects[0] ||
      null,
    [projects, selectedId],
  );
  const angleOptions = useMemo(
    () => workspaceAngleOptions(workspace),
    [workspace],
  );

  async function loadStudio() {
    setLoading(true);
    setMessage("");
    try {
      const resolved = await resolveActiveWorkspace();
      setWorkspace(resolved.activeWorkspace);
      setWorkspaceId(resolved.workspaceId);
      if (!resolved.workspaceId) {
        setProjects([]);
        return;
      }
      const response = await fetch(
        `/api/content-projects?workspaceId=${encodeURIComponent(resolved.workspaceId)}`,
        { cache: "no-store" },
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
      setProjects(payload.projects || []);
      setPermissions(payload.permissions || null);
      const brandResponse = await fetch(
        `/api/brand-kit-data?workspace_id=${encodeURIComponent(resolved.workspaceId)}`,
        { cache: "no-store" },
      );
      const brandPayload = await brandResponse.json().catch(() => null);
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
      const requestedProjectId = new URLSearchParams(
        window.location.search,
      ).get("project");
      setSelectedId((current) => {
        const preferred = requestedProjectId || current;
        return preferred &&
          payload.projects?.some((item: Project) => item.id === preferred)
          ? preferred
          : payload.projects?.[0]?.id || null;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未能載入內容製作");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudio();
    const changed = () => void loadStudio();
    window.addEventListener(WORKSPACE_CHANGED_EVENT, changed);
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, changed);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setBrief({
      angle: selected.brief?.angle || "交由 AI 決定",
      summary: selected.brief?.summary || selected.source_note || "",
    });
    setSelectedFormat(selected.selected_format || "");
  }, [selected?.id]);

  async function saveProject(
    updates: Record<string, unknown>,
    successMessage: string,
  ) {
    if (!workspaceId || !selected || !permissions?.canEdit) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/content-projects", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: selected.id,
          workspaceId,
          ...updates,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(payload?.detail || payload?.error || "未能儲存");
      setProjects((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, ...payload.project } : item,
        ),
      );
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未能儲存");
    } finally {
      setSaving(false);
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

      setProjects((current) => {
        const remaining = current.filter((item) => item.id !== project.id);
        if (selectedId === project.id) setSelectedId(remaining[0]?.id || null);
        return remaining;
      });
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
    setMessage("AI 正在整理資料核查同 P.1–P.N 故事結構，通常需要約半分鐘…");
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
      setMessage("資料核查同故事結構已完成，請檢查後確認");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未能生成故事結構");
    } finally {
      setSaving(false);
    }
  }

  async function confirmStructure() {
    if (!selected?.production) return;
    await saveProject(
      {
        production: {
          ...selected.production,
          status: "structure_confirmed",
          confirmedAt: new Date().toISOString(),
        },
      },
      "故事結構已確認，下一步可以接駁全套圖片生成",
    );
  }

  function updateStoryPage(index: number, field: string, value: string) {
    if (!selected?.production || !Array.isArray(selected.production.pages))
      return;
    const pages = selected.production.pages.map((page: any, pageIndex) =>
      pageIndex === index ? { ...page, [field]: value } : page,
    );
    setProjects((current) =>
      current.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              production: {
                ...selected.production,
                pages,
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
      "故事結構修改已儲存",
    );
    setEditingPage(null);
  }

  async function deleteStoryPage(index: number) {
    if (!selected?.production || !Array.isArray(selected.production.pages))
      return;
    if (
      !window.confirm(`確定刪除 P.${index + 1}？刪除後其餘頁面會自動重新編號`)
    )
      return;
    const pages = selected.production.pages
      .filter((_: unknown, pageIndex: number) => pageIndex !== index)
      .map((page: any, pageIndex: number) => ({
        ...page,
        page: `P.${pageIndex + 1}`,
      }));
    await saveProject(
      {
        production: {
          ...selected.production,
          pages,
          status: "structure_ready",
          confirmedAt: null,
        },
      },
      `P.${index + 1} 已刪除，頁碼已重新排列`,
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

  async function uploadProjectAssets(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !workspaceId || !selected?.production) return;
    setUploadingAssets(true);
    setMessage("圖片上載中…");
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
        if (!file.type.startsWith("image/")) continue;
        const dimensions = await imageDimensions(file);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const id = crypto.randomUUID();
        const storagePath = `${user.id}/content-projects/${workspaceId}/${selected.id}/${id}-${safeName}`;
        const { error } = await supabase.storage
          .from("brand-assets")
          .upload(storagePath, file, { cacheControl: "3600", upsert: false });
        if (error) throw error;
        const { data } = supabase.storage
          .from("brand-assets")
          .getPublicUrl(storagePath);
        uploaded.push({
          id,
          url: data.publicUrl,
          filename: file.name,
          ...dimensions,
          assignedPage: "auto",
          isCover: existing.length === 0 && uploaded.length === 0,
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "圖片上載失敗");
    } finally {
      setUploadingAssets(false);
      event.target.value = "";
    }
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

  async function confirmAssets() {
    if (!selected?.production || !Array.isArray(selected.production.assets))
      return;
    if (!selected.production.assets.length) {
      setMessage("請先上載至少一張圖片素材");
      return;
    }
    await saveProject(
      {
        production: {
          ...selected.production,
          assetStatus: "confirmed",
          assetsConfirmedAt: new Date().toISOString(),
        },
      },
      "圖片素材已確認，下一步進入逐頁文案及版面製作",
    );
  }

  async function generatePageDrafts() {
    if (!workspaceId || !selected) return;
    setSaving(true);
    setMessage("AI 正在生成逐頁文案、圖片配對及版面草稿…");
    try {
      const response = await fetch("/api/content-projects/generate-drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, projectId: selected.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          payload?.detail || payload?.error || "未能生成逐頁草稿",
        );
      setProjects((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, ...payload.project } : item,
        ),
      );
      setMessage("逐頁文案及版面草稿已完成");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未能生成逐頁草稿");
    } finally {
      setSaving(false);
    }
  }

  function updatePageDraft(index: number, field: string, value: unknown) {
    if (!selected?.production || !Array.isArray(selected.production.pageDrafts))
      return;
    const pageDrafts = selected.production.pageDrafts.map(
      (draft: any, draftIndex: number) =>
        draftIndex === index ? { ...draft, [field]: value } : draft,
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
    );
    setEditingDraft(null);
  }

  async function deletePageDraft(index: number) {
    if (!selected?.production || !Array.isArray(selected.production.pageDrafts))
      return;
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

  async function confirmPageDrafts() {
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
    await saveProject(
      {
        production: {
          ...selected.production,
          productionStatus: "drafts_confirmed",
          draftsConfirmedAt: new Date().toISOString(),
        },
      },
      "逐頁文案及版面草稿已確認，已進入全套圖片生成階段",
    );
  }

  async function generateCarouselImages() {
    if (!workspaceId || !selected) return;
    setGeneratingCarousel(true);
    setSaving(true);
    setMessage("正在生成全套 Carousel 圖片，請勿關閉頁面…");
    try {
      const response = await fetch("/api/content-projects/generate-carousel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, projectId: selected.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(payload?.detail || payload?.error || "未能生成圖片");
      setProjects((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, ...payload.project } : item,
        ),
      );
      setMessage("全套 Carousel 圖片已生成");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "未能生成圖片");
    } finally {
      setGeneratingCarousel(false);
      setSaving(false);
    }
  }

  return (
    <main className="studio-page">
      <ClaimOnboardingSession />
      <DashboardSidebar activeItem="內容製作" />
      <section className="studio-shell">
        <header className="studio-topbar">
          <div>
            <h1>內容製作</h1>
            <p>
              {workspace?.brandName || workspace?.name || "目前工作台"} · Brief
              → 格式 → 製作
            </p>
          </div>
          {permissions?.canManagePrompt ? (
            <button className="secondary" onClick={openPromptManager}>
              Prompt 管理
            </button>
          ) : null}
        </header>

        <div className="studio-layout">
          <aside className="project-list">
            <div>
              <strong>製作中</strong>
              <span>{projects.length}</span>
            </div>
            {loading ? (
              <p className="empty">載入中…</p>
            ) : projects.length ? (
              projects.map((project) => (
                <article
                  key={project.id}
                  className={`project-list-card ${project.id === selected?.id ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className="project-select-button"
                    onClick={() => setSelectedId(project.id)}
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
              <div className="studio-loading" role="status">
                <span className="studio-loading-spinner" aria-hidden="true" />
                <h2>內容載入中…</h2>
                <p>正在載入目前 Workspace 嘅 Content Studio</p>
                <div className="studio-loading-skeleton" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
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
                  <div className="stage-track">
                    <b className="done">1 Brief</b>
                    <i />
                    <b className={selected.stage !== "brief" ? "done" : ""}>
                      2 格式
                    </b>
                    <i />
                    <b
                      className={
                        selected.stage === "production" ||
                        selected.stage === "approval" ||
                        selected.stage === "scheduled"
                          ? "done"
                          : ""
                      }
                    >
                      3 製作
                    </b>
                  </div>
                </div>

                {selected.stage === "brief" ? (
                  <div className="editor-card">
                    <div className="section-title">
                      <div>
                        <span>STEP 1</span>
                        <h3>建立 Content Brief</h3>
                      </div>
                      <em>會使用目前 Workspace 嘅 Prompt Profile</em>
                    </div>
                    <label>
                      <span>題材摘要</span>
                      <textarea
                        value={brief.summary}
                        onChange={(event) =>
                          setBrief({ ...brief, summary: event.target.value })
                        }
                        placeholder="今次題材講緊乜？"
                      />
                    </label>
                    <div className="angle-field">
                      <span>想要方向／角度</span>
                      <div className="angle-options">
                        {angleOptions.map((option) => (
                          <button
                            type="button"
                            key={option}
                            className={brief.angle === option ? "active" : ""}
                            onClick={() =>
                              setBrief({ ...brief, angle: option })
                            }
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      <small>
                        目標觀眾、資料核查及內容限制會由 AI 按 Workspace Prompt
                        自動處理
                      </small>
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
                          !brief.summary.trim() ||
                          !permissions?.canEdit
                        }
                        onClick={() =>
                          saveProject(
                            { brief, stage: "format" },
                            "Brief 已確認，進入格式判斷",
                          )
                        }
                      >
                        確認 Brief →
                      </button>
                    </div>
                  </div>
                ) : selected.stage === "format" ? (
                  <div className="editor-card">
                    <div className="section-title">
                      <div>
                        <span>STEP 2</span>
                        <h3>判斷內容格式</h3>
                      </div>
                      <em>Content Master 建議後由你確認</em>
                    </div>
                    <div className="format-grid">
                      {formats.map((format) => (
                        <button
                          key={format.id}
                          className={
                            selectedFormat === format.id ? "active" : ""
                          }
                          onClick={() => setSelectedFormat(format.id)}
                        >
                          <strong>{format.label}</strong>
                          <span>{format.note}</span>
                        </button>
                      ))}
                    </div>
                    <label>
                      <span>格式判斷備註</span>
                      <textarea
                        value={selected.format_decision?.reason || ""}
                        onChange={(event) =>
                          setProjects((current) =>
                            current.map((item) =>
                              item.id === selected.id
                                ? {
                                    ...item,
                                    format_decision: {
                                      reason: event.target.value,
                                    },
                                  }
                                : item,
                            ),
                          )
                        }
                        placeholder="點解呢個格式最適合今次題材？"
                      />
                    </label>
                    <div className="actions">
                      <button
                        className="secondary"
                        onClick={() =>
                          saveProject({ stage: "brief" }, "已返回 Brief")
                        }
                      >
                        ← 返回 Brief
                      </button>
                      <button
                        disabled={
                          saving || !selectedFormat || !permissions?.canEdit
                        }
                        onClick={() =>
                          saveProject(
                            {
                              formatDecision: selected.format_decision || {},
                              selectedFormat,
                              stage: "production",
                            },
                            "格式已確認，進入製作",
                          )
                        }
                      >
                        確認格式 →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="editor-card production-card">
                    <div className="section-title">
                      <div>
                        <span>STEP 3</span>
                        <h3>{selected.selected_format || "內容"} 製作</h3>
                      </div>
                      <em>按 Project 鎖定嘅 Workspace Prompt 執行</em>
                    </div>
                    {selected.production?.status ? (
                      <div className="structure-result">
                        <div className="structure-status">
                          <b>✓</b>
                          <div>
                            <h4>
                              {selected.production.status ===
                              "structure_confirmed"
                                ? "故事結構已確認"
                                : "資料核查＋故事結構"}
                            </h4>
                            <p>
                              {String(
                                selected.production.verificationSummary || "",
                              )}
                            </p>
                          </div>
                        </div>
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
                        <div className="story-pages">
                          <h4>P.1–P.N 故事結構</h4>
                          {(Array.isArray(selected.production.pages)
                            ? selected.production.pages
                            : []
                          ).map((page: any, index) => (
                            <article key={index}>
                              <span>{page.page || `P.${index + 1}`}</span>
                              <div>
                                {editingPage === index ? (
                                  <div className="page-editor">
                                    <label>
                                      <span>Headline</span>
                                      <input
                                        value={page.headline || ""}
                                        onChange={(event) =>
                                          updateStoryPage(
                                            index,
                                            "headline",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </label>
                                    <label>
                                      <span>內容方向</span>
                                      <textarea
                                        value={
                                          page.copyDirection ||
                                          page.purpose ||
                                          ""
                                        }
                                        onChange={(event) =>
                                          updateStoryPage(
                                            index,
                                            "copyDirection",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </label>
                                    <label>
                                      <span>畫面方向</span>
                                      <textarea
                                        value={page.visualDirection || ""}
                                        onChange={(event) =>
                                          updateStoryPage(
                                            index,
                                            "visualDirection",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </label>
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
                                      <h5>{page.headline || "未命名頁面"}</h5>
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
                                    <p>
                                      <strong>內容：</strong>
                                      {page.copyDirection || page.purpose || ""}
                                    </p>
                                    {page.visualDirection ? (
                                      <p>
                                        <strong>畫面：</strong>
                                        {page.visualDirection}
                                      </p>
                                    ) : null}
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
                                  <p>一次過上載原圖，再指定封面或分配頁面</p>
                                </div>
                                <div className="asset-upload-actions">
                                  {brandLibraryAssets.length ? (
                                    <button
                                      type="button"
                                      className="asset-library-button"
                                      disabled={saving}
                                      onClick={() =>
                                        void addBrandLibraryAssets()
                                      }
                                    >
                                      從品牌素材庫加入
                                    </button>
                                  ) : null}
                                  <label className="asset-upload-button">
                                    {uploadingAssets ? "上載中…" : "+ 上載圖片"}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      disabled={uploadingAssets}
                                      onChange={uploadProjectAssets}
                                    />
                                  </label>
                                </div>
                              </div>
                              <div className="asset-visual-guidance">
                                <b>AI 建議畫面</b>
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
                              </div>
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
                                          {asset.width < 1080 ||
                                          asset.height < 1080
                                            ? " · 解像度偏低"
                                            : ""}
                                        </small>
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
                                  {selected.production.assetStatus ===
                                  "confirmed" ? (
                                    <span>✓ 圖片素材已確認</span>
                                  ) : (
                                    <span>
                                      完成封面及頁面分配後，確認進入製作
                                    </span>
                                  )}
                                  <button
                                    disabled={saving}
                                    onClick={confirmAssets}
                                  >
                                    {selected.production.assetStatus ===
                                    "confirmed"
                                      ? "重新確認圖片素材"
                                      : "確認圖片素材 → 進入逐頁製作"}
                                  </button>
                                </div>
                              ) : null}
                              {selected.production.assetStatus ===
                              "confirmed" ? (
                                <div className="draft-start-row">
                                  <button
                                    disabled={saving}
                                    onClick={generatePageDrafts}
                                  >
                                    {saving
                                      ? "AI 製作中…"
                                      : selected.production.productionStatus ===
                                          "drafts_ready"
                                        ? "重新生成逐頁文案及版面草稿"
                                        : "開始 AI 逐頁文案及版面草稿 →"}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                            {(selected.production.productionStatus ===
                              "drafts_ready" ||
                              selected.production.productionStatus ===
                                "drafts_confirmed" ||
                              selected.production.productionStatus ===
                                "images_ready") &&
                            Array.isArray(selected.production.pageDrafts) ? (
                              <div className="page-drafts">
                                <div className="page-drafts-heading">
                                  <h4>逐頁文案及版面草稿</h4>
                                  {selected.production.productionStatus ===
                                  "drafts_confirmed" ? (
                                    <span className="confirmed-pill">
                                      已確認
                                    </span>
                                  ) : null}
                                </div>
                                {selected.production.pageDrafts.map(
                                  (draft: any, index: number) => {
                                    const asset = Array.isArray(
                                      selected.production?.assets,
                                    )
                                      ? (
                                          selected.production
                                            .assets as ProjectAsset[]
                                        ).find(
                                          (item) => item.id === draft.assetId,
                                        )
                                      : null;
                                    return (
                                      <article key={index}>
                                        {asset ? (
                                          <img src={asset.url} alt="" />
                                        ) : (
                                          <div className="draft-no-image">
                                            未指定圖片
                                          </div>
                                        )}
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
                                              <label>
                                                <b>正文（段落之間留一行）</b>
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
                                              </label>
                                              <label>
                                                <b>配對圖片</b>
                                                <select
                                                  value={draft.assetId || ""}
                                                  onChange={(event) =>
                                                    updatePageDraft(
                                                      index,
                                                      "assetId",
                                                      event.target.value,
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
                                              <label>
                                                <b>版面類型</b>
                                                <select
                                                  value={
                                                    draft.layout ||
                                                    "editorial_article"
                                                  }
                                                  onChange={(event) =>
                                                    updatePageDraft(
                                                      index,
                                                      "layout",
                                                      event.target.value,
                                                    )
                                                  }
                                                >
                                                  <option value="cover">
                                                    封面 cover
                                                  </option>
                                                  <option value="editorial_article">
                                                    內容頁 editorial article
                                                  </option>
                                                </select>
                                              </label>
                                              <label>
                                                <b>版面指示</b>
                                                <textarea
                                                  value={
                                                    draft.designDirection || ""
                                                  }
                                                  onChange={(event) =>
                                                    updatePageDraft(
                                                      index,
                                                      "designDirection",
                                                      event.target.value,
                                                    )
                                                  }
                                                />
                                              </label>
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
                                              <small>
                                                {draft.layout} ·{" "}
                                                {draft.designDirection}
                                              </small>
                                            </>
                                          )}
                                        </div>
                                      </article>
                                    );
                                  },
                                )}
                                {selected.production.productionStatus ===
                                "drafts_ready" ? (
                                  <div className="draft-confirm-step">
                                    <div>
                                      <b>
                                        草稿確認後，下一步生成全套 Carousel 圖
                                      </b>
                                      <p>
                                        請先檢查每頁文案、圖片配對及版面指示；確認後會鎖定今次製作版本
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={saving || editingDraft !== null}
                                      onClick={() => void confirmPageDrafts()}
                                    >
                                      確認逐頁草稿，進入圖片生成 →
                                    </button>
                                  </div>
                                ) : selected.production.productionStatus ===
                                  "drafts_confirmed" ? (
                                  <div className="generation-next-step">
                                    <div>
                                      <b>下一步｜生成全套 Carousel 圖</b>
                                      <p>
                                        系統會按已確認文案、圖片配對及 Workspace
                                        Production Prompt，輸出 1080 × 1350 px
                                        圖片
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={saving}
                                      onClick={() =>
                                        void generateCarouselImages()
                                      }
                                    >
                                      {saving
                                        ? "生成中…"
                                        : "開始生成全套 Carousel 圖 →"}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="generated-carousel">
                                    <div className="generated-carousel-head">
                                      <div>
                                        <b>全套 Carousel 圖已生成</b>
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
                                                  <a
                                                    className="generated-edit-button"
                                                    href={`/onboarding/scheduled-posts?editImage=${encodeURIComponent(page.url)}&editPage=${encodeURIComponent(page.page)}&editTitle=${encodeURIComponent(selected.title || "Carousel 圖片")}`}
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
                                                            /egg[.\s_-]*soon/i.test(
                                                              workspace?.name ||
                                                                "",
                                                            )
                                                              ? "GenSenRounded2"
                                                              : "",
                                                        }),
                                                      );
                                                    }}
                                                  >
                                                    編輯圖片
                                                  </a>
                                                  <a
                                                    className="generated-download-button"
                                                    href={page.url}
                                                    download
                                                    target="_blank"
                                                    rel="noreferrer"
                                                  >
                                                    下載圖片
                                                  </a>
                                                </div>
                                              </div>
                                            </article>
                                          ))
                                        : null}
                                    </div>
                                    <p className="caption-draft">
                                      <b>IG Caption Draft</b>
                                      <br />
                                      {String(
                                        selected.production.captionDraft || "",
                                      )}
                                    </p>
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
                                          onClick={() =>
                                            void saveProject(
                                              {
                                                stage: "approval",
                                                production: {
                                                  ...selected.production,
                                                  approvalStatus: "pending",
                                                  submittedForApprovalAt:
                                                    new Date().toISOString(),
                                                },
                                              },
                                              "全套 Carousel 已提交審批",
                                            )
                                          }
                                        >
                                          {saving
                                            ? "提交中…"
                                            : "提交審批，下一步 →"}
                                        </button>
                                      </div>
                                    ) : selected.stage === "approval" ? (
                                      <div className="carousel-approval-status">
                                        <span>✓ 已提交審批</span>
                                        <Link href="/onboarding">
                                          返回「審批」→
                                        </Link>
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <div className="production-ready">
                        <b>✓</b>
                        <h4>Brief 同內容格式已確認</h4>
                        <p>
                          下一步先由 AI 按 Workspace Prompt 完成資料核查，再提出
                          P.1–P.N 故事結構俾你確認，暫時唔會生成圖片。
                        </p>
                      </div>
                    )}
                    <div className="actions">
                      <button
                        className="secondary"
                        disabled={saving}
                        onClick={() =>
                          saveProject({ stage: "format" }, "已返回格式判斷")
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
                            ? "AI 整理中…"
                            : "開始 AI 資料核查及故事結構 →"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {message ? <p className="studio-message">{message}</p> : null}
              </>
            ) : (
              <div className="welcome">
                <span>✦</span>
                <h2>由一個好題材開始</h2>
                <p>
                  去題材庫撳「喜歡」，SOON 會喺目前 Workspace 建立獨立 Content
                  Project。
                </p>
                <a href="/onboarding/topic-library">前往題材庫</a>
                {message ? <small>{message}</small> : null}
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
                <h2>Workspace Prompt 管理</h2>
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
              <span>Content Master／格式判斷 Prompt</span>
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
  .site-nav{display:none}.studio-page{min-height:100vh;background:#f7f7f8;color:#202126;display:grid;grid-template-columns:240px minmax(0,1fr)}.studio-shell{min-width:0;background:#fff}.studio-topbar{min-height:72px;border-bottom:1px solid #ebecef;padding:0 28px;display:flex;align-items:center;justify-content:space-between}.studio-topbar h1{font-size:22px;margin:0}.studio-topbar p{font-size:13px;color:#777b84;margin:4px 0 0}.studio-topbar button,.actions button,.prompt-modal footer button{border:0;border-radius:10px;padding:11px 17px;background:#111;color:#fff;font-weight:750;cursor:pointer}.secondary{background:#f0f1f3!important;color:#27292e!important}.studio-layout{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:calc(100vh - 72px)}.project-list{background:#f7f7f8;border-right:1px solid #e8e9ec;padding:20px 14px}.project-list>div{display:flex;justify-content:space-between;padding:0 8px 12px}.project-list>div span{color:#8a8e96}.project-list>button{width:100%;border:1px solid transparent;background:transparent;border-radius:12px;text-align:left;padding:13px;margin-bottom:7px;display:grid;gap:5px;cursor:pointer}.project-list>button.active{background:#fff;border-color:#dedfe3;box-shadow:0 5px 18px rgba(0,0,0,.05)}.project-list button span{font-size:11px;color:#777b84}.project-list button strong{font-size:14px;line-height:1.35}.project-list button em{font-style:normal;font-size:11px;color:#a0a3aa}.empty{font-size:13px;color:#8a8e96;padding:20px 8px;line-height:1.6}.studio-workspace{padding:30px;max-width:1050px;width:100%;box-sizing:border-box}.project-head{display:flex;justify-content:space-between;gap:30px;align-items:flex-start;margin-bottom:26px}.project-head>div>span{font-size:12px;font-weight:750;color:#777b84}.project-head h2{font-size:25px;line-height:1.3;margin:6px 0}.project-head a{font-size:12px;color:#555961}.stage-track{display:flex;align-items:center;gap:8px;white-space:nowrap;padding-top:8px}.stage-track b{font-size:11px;color:#a4a7ae}.stage-track b.done{color:#111}.stage-track i{display:block;width:26px;height:1px;background:#d9dadd}.editor-card{border:1px solid #e1e2e5;border-radius:18px;padding:26px;box-shadow:0 10px 35px rgba(20,22,26,.05)}.section-title{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #ededee;padding-bottom:18px;margin-bottom:22px}.section-title span{font-size:10px;font-weight:800;letter-spacing:.1em;color:#888c94}.section-title h3{margin:4px 0 0;font-size:20px}.section-title em{font-size:11px;color:#8c9098;font-style:normal}.editor-card label,.prompt-modal label{display:grid;gap:7px;margin:15px 0}.editor-card label>span,.prompt-modal label>span{font-size:12px;font-weight:750;color:#555961}.editor-card input,.editor-card textarea,.prompt-modal input,.prompt-modal textarea{appearance:none;border:1px solid #dfe1e5;border-radius:10px;padding:12px 13px;font:inherit;resize:vertical;background:#fff!important;color:#111!important;-webkit-text-fill-color:#111!important;color-scheme:light}.editor-card input::placeholder,.editor-card textarea::placeholder,.prompt-modal input::placeholder,.prompt-modal textarea::placeholder{color:#8b8e95!important;-webkit-text-fill-color:#8b8e95!important;opacity:1}.editor-card textarea{min-height:90px}.two-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.angle-field{display:grid;gap:9px;margin:18px 0}.angle-field>span{font-size:12px;font-weight:750;color:#555961}.angle-field small{color:#8b8f97;font-size:11px}.angle-options{display:flex;gap:8px;flex-wrap:wrap}.angle-options button{border:1px solid #dfe1e5;background:#fff;color:#2b2d31;border-radius:999px;padding:9px 13px;font-weight:700;cursor:pointer}.angle-options button.active{background:#111;color:#fff;border-color:#111}.actions{display:flex;justify-content:flex-end;gap:9px;margin-top:22px;flex-wrap:wrap}.actions button:disabled{opacity:.45;cursor:not-allowed}.format-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.format-grid button{border:1px solid #dedfe3;background:#fafafa;border-radius:13px;padding:17px;text-align:left;display:grid;gap:5px;cursor:pointer}.format-grid button.active{background:#111;color:#fff;border-color:#111}.format-grid span{font-size:12px;color:#7d8189}.format-grid .active span{color:#ccc}.production-ready{text-align:center;padding:45px 20px}.production-ready b{display:grid;place-items:center;margin:auto;width:44px;height:44px;border-radius:50%;background:#e8f8ed;color:#20813d;font-size:20px}.production-ready h4{font-size:19px;margin:14px 0 7px}.production-ready p{max-width:500px;margin:auto;color:#737780;line-height:1.6}.structure-result{display:grid;gap:22px}.structure-status{display:flex;gap:14px;align-items:flex-start;background:#f5faf6;border-radius:13px;padding:16px}.structure-status>b{display:grid;place-items:center;flex:0 0 32px;height:32px;border-radius:50%;background:#dff4e5;color:#20813d}.structure-status h4,.story-pages>h4{margin:2px 0 6px;font-size:16px}.structure-status p{margin:0;color:#646971;line-height:1.55}.fact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.fact-grid section{background:#f7f7f8;border-radius:12px;padding:14px}.fact-grid h5,.structure-sources h5{margin:0 0 9px;font-size:12px}.fact-grid ul{margin:0;padding-left:17px;color:#5f636b;font-size:12px;line-height:1.55}.story-pages{display:grid;gap:9px}.story-pages article{display:grid;grid-template-columns:48px 1fr;gap:12px;border:1px solid #e4e5e8;border-radius:12px;padding:13px}.story-pages article>span{font-size:11px;font-weight:800;background:#111;color:#fff;border-radius:8px;padding:7px;height:max-content;text-align:center}.story-pages h5{margin:1px 0 6px}.story-pages p{font-size:12px;color:#656a72;line-height:1.5;margin:3px 0}.story-pages p strong{color:#2b2e33}.structure-sources{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.structure-sources h5{width:100%}.structure-sources a{font-size:11px;color:#454951;background:#f1f2f4;padding:7px 10px;border-radius:999px;text-decoration:none}.next-production{border:1px dashed #cfd2d7;border-radius:12px;padding:15px}.next-production p{margin:5px 0 0;color:#747880;font-size:12px}.studio-message{background:#f4f4f5;border-radius:9px;padding:10px 13px;font-size:12px}.welcome{text-align:center;padding:100px 20px}.welcome>span{font-size:40px}.welcome h2{margin:14px 0 8px}.welcome p{color:#777b84}.welcome a{display:inline-block;background:#111;color:#fff;border-radius:10px;padding:11px 16px;text-decoration:none;margin-top:10px}.welcome small{display:block;margin-top:18px;color:#a33}.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.46);z-index:100;display:grid;place-items:center;padding:22px}.prompt-modal{background:#fff!important;color:#111!important;color-scheme:light;width:min(760px,100%);max-height:90vh;overflow:auto;border-radius:18px;padding:24px}.prompt-modal header{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding-bottom:15px}.prompt-modal header span{font-size:10px;font-weight:800;background:#fff0c2;padding:4px 7px;border-radius:6px}.prompt-modal h2{margin:8px 0 3px;color:#111}.prompt-modal header p{margin:0;color:#777;font-size:12px}.prompt-modal header button{border:0;background:transparent;color:#111;font-size:25px;cursor:pointer}.prompt-modal textarea{min-height:130px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.prompt-modal footer{display:flex;justify-content:flex-end;gap:9px;margin-top:20px}@media(max-width:900px){.studio-page{grid-template-columns:1fr}.studio-layout{grid-template-columns:1fr}.project-list{border-right:0;border-bottom:1px solid #ddd}.project-head{display:block}.stage-track{margin-top:18px}.two-fields,.format-grid,.fact-grid{grid-template-columns:1fr}.studio-workspace{padding:20px}}
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
  .generated-carousel-head button:disabled{opacity:.45;cursor:not-allowed}
  .carousel-generation-status{display:flex;align-items:center;gap:8px;border-radius:9px;background:#e8f3eb;color:#24653a;padding:10px 12px;font-size:11px;font-weight:800}
  .carousel-generation-status span{width:14px;height:14px;border:2px solid #9bc4a7;border-top-color:#24653a;border-radius:50%;animation:carousel-generation-spin .8s linear infinite}
  .carousel-approval-status{border-radius:11px;background:#e8f3eb;color:#24653a;padding:13px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;font-weight:800}.carousel-approval-status a{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 17px;border-radius:9px;background:#176b38;color:#fff;text-decoration:none;white-space:nowrap;font-size:12px}.carousel-approval-status a:hover{background:#10592d}@media(max-width:600px){.carousel-approval-status{align-items:stretch;flex-direction:column}.carousel-approval-status a{width:100%;box-sizing:border-box;min-height:48px;font-size:14px}}
  @keyframes carousel-generation-spin{to{transform:rotate(360deg)}}
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
  .asset-upload-head{display:flex;justify-content:space-between;gap:18px;align-items:center}.asset-upload-head p{margin:5px 0 0!important}.asset-upload-actions{display:flex;align-items:center;gap:7px}.asset-upload-button,.asset-library-button{display:block!important;margin:0!important;border:0;background:#111;color:#fff;border-radius:9px;padding:10px 14px;font-size:12px;font-weight:750;cursor:pointer}.asset-library-button{background:#eceef1;color:#222}.asset-upload-button input{display:none}.asset-empty{text-align:center;color:#92969e;background:#f7f7f8;border-radius:10px;padding:28px;margin-top:15px;font-size:12px}.asset-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-top:16px}.asset-grid article{border:1px solid #e1e3e6;border-radius:11px;overflow:hidden;background:#fff}.asset-grid img{width:100%;height:150px;object-fit:contain;background:#f2f2f3;display:block}.asset-grid article>div{padding:10px;display:grid;gap:7px}.asset-grid strong{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.asset-grid small{font-size:10px;color:#898d95}.asset-grid select{width:100%;border:1px solid #dedfe3;border-radius:7px;background:#fff!important;color:#111!important;-webkit-text-fill-color:#111!important;color-scheme:light;padding:7px;font-size:10px}.asset-grid select option{background:#fff!important;color:#111!important}.asset-actions{display:flex;gap:5px}.asset-actions button{flex:1;border:0;border-radius:7px;padding:7px;background:#f0f1f3;font-size:10px;font-weight:700;cursor:pointer}.asset-actions button.active{background:#e4f5e9;color:#1c7837}.asset-confirm-row{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-top:17px;padding-top:15px;border-top:1px solid #e6e7ea}.asset-confirm-row span{font-size:11px;color:#686d75}.asset-confirm-row button{border:0;border-radius:9px;background:#111;color:#fff;padding:10px 14px;font-size:11px;font-weight:750;cursor:pointer}.asset-confirm-row button:disabled{opacity:.5}@media(max-width:900px){.asset-grid{grid-template-columns:1fr 1fr}.asset-upload-head{align-items:flex-start}.asset-upload-actions{align-items:stretch;flex-direction:column}.asset-confirm-row{align-items:flex-start;flex-direction:column}}
  .asset-visual-guidance{margin-top:15px;padding:14px 15px;border:1px solid #e2ded0;border-radius:11px;background:#faf8f1}.asset-visual-guidance>b{display:block;font-size:12px;margin-bottom:8px}.asset-visual-guidance ul{display:grid;gap:7px;margin:0;padding:0;list-style:none}.asset-visual-guidance li{display:grid;grid-template-columns:36px 1fr;gap:8px;align-items:start;font-size:11px;line-height:1.5;color:#555961}.asset-visual-guidance li strong{color:#222}.asset-visual-guidance p{margin:0!important;font-size:11px;color:#737780;line-height:1.55}
  .draft-start-row{display:flex;justify-content:flex-end;margin-top:12px}.draft-start-row button{border:0;border-radius:9px;background:#111;color:#fff;padding:11px 15px;font-size:11px;font-weight:800;cursor:pointer}.draft-start-row button:disabled{opacity:.5}.page-drafts{display:grid;gap:12px}.page-drafts>h4{margin:8px 0}.page-drafts article{display:grid;grid-template-columns:180px 1fr;border:1px solid #e1e3e6;border-radius:13px;overflow:hidden}.page-drafts img,.draft-no-image{width:180px;height:220px;object-fit:contain;background:#f2f2f3}.draft-no-image{display:grid;place-items:center;color:#999;font-size:11px}.page-drafts article>div:last-child{padding:16px}.page-drafts span{font-size:10px;font-weight:800;background:#111;color:#fff;border-radius:6px;padding:5px 7px}.page-drafts h5{font-size:17px;margin:12px 0 5px}.page-drafts h6{font-size:12px;margin:0 0 10px;color:#676b73}.page-drafts p{font-size:12px;line-height:1.55;color:#50545b}.page-drafts small{display:block;margin-top:10px;color:#8a8e96}.draft-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.draft-card-head>div{display:flex;gap:6px}.draft-card-head button,.draft-editor-actions button{border:0;border-radius:7px;padding:7px 10px;background:#f1f2f4;color:#222;font-size:10px;font-weight:800;cursor:pointer}.draft-card-head button.delete{background:#fff0f0;color:#b52a2a}.draft-editor{display:grid;gap:10px}.draft-editor label{display:grid;gap:5px}.draft-editor label>b{font-size:10px;color:#34373c}.draft-editor input,.draft-editor textarea,.draft-editor select{width:100%;box-sizing:border-box;border:1px solid #d9dce1;border-radius:8px;background:#fff;color:#111;padding:9px 10px;font:inherit;font-size:11px}.draft-editor textarea{min-height:82px;resize:vertical;line-height:1.5}.draft-editor-actions{display:flex;justify-content:flex-end;gap:7px}.draft-editor-actions button.primary{background:#111;color:#fff}.draft-editor-actions button:disabled{opacity:.5}@media(max-width:700px){.page-drafts article{grid-template-columns:1fr}.page-drafts img,.draft-no-image{width:100%;height:250px}}
`;
