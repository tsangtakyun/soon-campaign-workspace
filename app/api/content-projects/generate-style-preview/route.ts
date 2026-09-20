import { createHash } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isUuid } from "@/lib/oauth-connections";
import { consumeApiQuota, requirePlatformUser } from "@/lib/platform-access";
import { createServerSupabase } from "@/lib/server-supabase";
import { getWorkspaceAccess } from "@/lib/workspace-access";

export const runtime = "nodejs";
export const maxDuration = 120;

function text(value: unknown, max = 1200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function compact(value: unknown, max = 5000) {
  try { return JSON.stringify(value).slice(0, max); } catch { return ""; }
}

async function generatePreview(apiKey: string, prompt: string, referenceUrl: string, attempt = 0): Promise<string> {
  let response: Response;
  if (referenceUrl) {
    const imageResponse = await fetch(referenceUrl, { signal: AbortSignal.timeout(10_000) });
    if (!imageResponse.ok) throw new Error("Reference preview unavailable");
    const form = new FormData();
    form.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
    form.append("image", new File([await imageResponse.blob()], "reference.png", { type: imageResponse.headers.get("content-type") || "image/png" }));
    form.append("prompt", prompt);
    form.append("size", "1024x1536");
    form.append("quality", "medium");
    response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
  } else {
    response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1", prompt, size: "1024x1536", quality: "medium", output_format: "png" }),
      signal: AbortSignal.timeout(60_000),
    });
  }
  const payload = await response.json().catch(() => null);
  if (response.status === 429 && attempt < 2) {
    const retryAfter = Math.max(12, Number(response.headers.get("retry-after")) || 0);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return generatePreview(apiKey, prompt, referenceUrl, attempt + 1);
  }
  if (!response.ok) throw new Error(payload?.error?.message || "AI preview generation failed");
  const base64 = payload?.data?.[0]?.b64_json;
  if (!base64) throw new Error("AI preview service returned no image");
  return base64 as string;
}

export async function POST(request: Request) {
  const auth = await requirePlatformUser();
  if (auth.error) return auth.error;
  if (!(await consumeApiQuota(auth.access.user.id, "content-project-style-preview", 30))) {
    return NextResponse.json({ error: "請求次數過多，請稍後再試。" }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const workspaceId = text(body.workspaceId, 80);
    const projectId = text(body.projectId, 80);
    const styleCode = text(body.styleCode, 80).replace(/[^a-z0-9_-]/gi, "");
    const styleVersion = Math.max(1, Number(body.styleVersion) || 1);
    if (!isUuid(workspaceId) || !isUuid(projectId) || !styleCode) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI 圖片服務尚未設定" }, { status: 500 });
    const supabase = createServerSupabase(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId });
    if (!access?.canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: project, error } = await access.admin.from("content_projects")
      .select("id,title,brief,production,selected_format,format_decision,updated_at")
      .eq("id", projectId).eq("workspace_id", workspaceId).single();
    if (error || !project) throw error || new Error("Project not found");
    if (project.selected_format !== "short_video") return NextResponse.json({ error: "只適用於短片風格預覽" }, { status: 422 });

    const production = project.production && typeof project.production === "object" ? project.production as Record<string, any> : {};
    const script = Array.isArray(production.script) && production.script.length
      ? production.script : Array.isArray(production.pages) ? production.pages : [];
    const opening = script[0] || {};
    const topic = [project.title, text(project.brief?.angle), text(project.brief?.summary), text(opening.visual || opening.visualDirection), text(opening.dialogue || opening.copyDirection)].filter(Boolean).join("\n");
    const fingerprint = createHash("sha256").update(`${styleCode}:${styleVersion}:${topic}`).digest("hex").slice(0, 16);
    const previews = production.stylePreviews && typeof production.stylePreviews === "object" ? production.stylePreviews : {};
    if (previews[styleCode]?.fingerprint === fingerprint && previews[styleCode]?.url) {
      return NextResponse.json({ success: true, cached: true, preview: previews[styleCode], project: { id: project.id, production, updated_at: project.updated_at } });
    }

    const rules = body.rules && typeof body.rules === "object" ? body.rules : {};
    const suppliedReference = text(body.referenceUrl, 1500);
    const referenceUrl = suppliedReference.startsWith("/templates/")
      ? `${(process.env.SOON_CORE_URL || "https://soon-core.vercel.app").replace(/\/$/, "")}${suppliedReference}`
      : /^https:\/\/soon-core\.vercel\.app\/templates\//.test(suppliedReference) ? suppliedReference : "";
    const prompt = [
      "Create ONE finished vertical 9:16 opening frame for a premium short-form social video.",
      `TOPIC AND FIRST SHOT: ${topic || project.title}`,
      `CONTENT DIRECTION RULES: ${compact(rules)}`,
      referenceUrl
        ? "Use the supplied reference only for composition, shot energy, subject scale, camera distance and visual rhythm. Replace its people, place, objects and identity with imagery relevant to the new topic."
        : "Create a visually decisive first shot with one clear subject and cinematic depth.",
      "The image must be topic-specific, immediately understandable and visually led, not a text poster.",
      "Do not reproduce source people, brands, logos, costumes, locations or distinctive copyrighted characters.",
      "ABSOLUTELY NO visible words, letters, captions, titles, numbers, logos, UI, watermarks or signage. The app will add one short Hook separately.",
      "Photorealistic unless the direction explicitly requires illustration. Natural vertical composition, polished lighting, safe centre area for a very short caption.",
    ].join("\n");
    const base64 = await generatePreview(apiKey, prompt, referenceUrl);
    const id = crypto.randomUUID();
    const storagePath = `${user.id}/content-projects/${workspaceId}/${projectId}/style-previews/${styleCode}-v${styleVersion}-${fingerprint}-${id}.png`;
    const { error: uploadError } = await access.admin.storage.from("brand-assets")
      .upload(storagePath, Buffer.from(base64, "base64"), { contentType: "image/png", cacheControl: "31536000" });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = access.admin.storage.from("brand-assets").getPublicUrl(storagePath);
    const preview = { id, url: publicUrl.publicUrl, styleCode, styleVersion, fingerprint, width: 1024, height: 1536, generatedAt: new Date().toISOString() };
    const nextProduction = { ...production, stylePreviews: { ...previews, [styleCode]: preview } };
    const { data: saved, error: saveError } = await access.admin.from("content_projects")
      .update({ production: nextProduction, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq("id", projectId).eq("workspace_id", workspaceId).select("id,production,updated_at").single();
    if (saveError) throw saveError;
    return NextResponse.json({ success: true, cached: false, preview, project: saved });
  } catch (error) {
    console.error("[content-projects/generate-style-preview]", error);
    return NextResponse.json({ error: "未能生成短片首鏡預覽", detail: String(error) }, { status: 500 });
  }
}
