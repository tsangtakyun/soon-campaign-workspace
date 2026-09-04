import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isUuid } from "@/lib/oauth-connections";
import { consumeApiQuota, requirePlatformUser } from "@/lib/platform-access";
import { createServerSupabase } from "@/lib/server-supabase";
import { getWorkspaceAccess } from "@/lib/workspace-access";

export const runtime = "nodejs";
export const maxDuration = 120;

class ImageGenerationError extends Error {
  constructor(message: string, readonly safetyRelated: boolean) {
    super(message);
  }
}

function imageOnlyDirection(value: unknown) {
  const direction = typeof value === "string" ? value : "";
  return direction
    .replace(/(?:大字|文字|標題|副題|文案|字句|清單|列表|圖示|排版|typography|headline|caption|copy)[^，。；;.]*/gi, "")
    .replace(/[，,。；;\s]+/g, " ")
    .trim() || "clean relevant editorial lifestyle photography with generous negative space";
}

function isSafetyError(payload: any, status: number) {
  const text = [payload?.error?.code, payload?.error?.type, payload?.error?.message]
    .filter(Boolean)
    .join(" ");
  return status === 400 && /(safety|moderation|content policy|policy violation|blocked|guardrail|unsafe)/i.test(text);
}

async function generateImage(apiKey: string, prompt: string) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt,
      size: "1024x1536",
      quality: "medium",
      output_format: "png",
    }),
    signal: AbortSignal.timeout(32_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ImageGenerationError(
      payload?.error?.message || "AI 圖片生成失敗",
      isSafetyError(payload, response.status),
    );
  }
  const base64 = payload?.data?.[0]?.b64_json;
  if (!base64) throw new ImageGenerationError("AI 圖片服務未有回傳圖片", false);
  return base64 as string;
}

async function rewriteSafePrompt(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_CONTENT_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 350,
        temperature: 0,
        system: [
          "Rewrite an image prompt into a safe, non-graphic, non-exploitative editorial visual that preserves the communication goal.",
          "Do not evade safeguards. Replace sensitive depictions with symbolic objects, environments, silhouettes, or non-identifiable adult subjects.",
          "For child-related topics, use fully clothed, age-appropriate, non-intimate family contexts or objects/environments without a child.",
          "Return only the revised English image prompt. It must explicitly contain no text, letters, numbers, logos, captions, signage, UI, or watermarks.",
        ].join(" "),
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const payload = await response.json().catch(() => null);
    const text = payload?.content?.find((item: any) => item?.type === "text")?.text?.trim();
    return response.ok && text ? text : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await requirePlatformUser();
  if (auth.error) return auth.error;
  if (!(await consumeApiQuota(auth.access.user.id, "content-project-generate-asset", 20))) {
    return NextResponse.json({ error: "請求次數過多，請稍後再試。" }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const page = typeof body.page === "string" ? body.page : "P.1";
    if (!isUuid(workspaceId) || !isUuid(projectId)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI 圖片服務尚未設定" }, { status: 500 });

    const supabase = createServerSupabase(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = await getWorkspaceAccess({ email: user.email, userId: user.id, workspaceId });
    if (!access?.canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: project, error: projectError } = await access.admin
      .from("content_projects")
      .select("id,title,production")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .single();
    if (projectError || !project) throw projectError || new Error("Project not found");

    const production = project.production && typeof project.production === "object" ? project.production : {};
    const pages = Array.isArray((production as any).pages) ? (production as any).pages : [];
    const pageIndex = Math.max(0, pages.findIndex((item: any, index: number) => (item?.page || `P.${index + 1}`) === page));
    const pageData = pages[pageIndex] || {};
    const originalVisualDirection = pageData.visualDirection || pageData.copyDirection || "";
    const cleanedDirection = imageOnlyDirection(originalVisualDirection);
    const prompt = [
      "Create a premium editorial social media photograph in portrait 4:5 composition.",
      `The editorial subject is ${project.title}. The words are context only and must never appear in the image.`,
      `Image-only visual direction: ${cleanedDirection}.`,
      "Leave generous clean negative space for typography that will be added later by the layout system.",
      "ABSOLUTELY NO visible text, letters, words, numbers, captions, typography, logos, signage, labels, watermarks or UI anywhere in the image.",
      "Avoid identifiable brands. Photorealistic, natural lighting, culturally appropriate, non-graphic and ready for a polished carousel layout.",
    ].join(" ");

    let finalPrompt = prompt;
    let promptAdjustmentReason: string | null = null;
    let base64: string;
    try {
      base64 = await generateImage(apiKey, finalPrompt);
    } catch (error) {
      if (!(error instanceof ImageGenerationError) || !error.safetyRelated) throw error;
      promptAdjustmentReason = "原畫面涉及較敏感表達，系統已自動改為合規、非直接描繪嘅視覺方向";
      const neutralPrompt = [
        "Create a calm, neutral editorial still life in portrait 4:5 composition using symbolic everyday objects and a clean softly lit environment.",
        "No people, no sensitive action and no graphic content.",
        "Leave generous negative space for later layout.",
        "No text, letters, words, numbers, logos, labels, signage, captions, watermarks or UI.",
      ].join(" ");
      finalPrompt = await rewriteSafePrompt(prompt) || neutralPrompt;
      try {
        base64 = await generateImage(apiKey, finalPrompt);
      } catch (retryError) {
        if (!(retryError instanceof ImageGenerationError) || !retryError.safetyRelated || finalPrompt === neutralPrompt) {
          throw retryError;
        }
        promptAdjustmentReason = "敏感畫面改寫後仍受限制，系統已改用中性象徵式 editorial 畫面";
        finalPrompt = neutralPrompt;
        base64 = await generateImage(apiKey, finalPrompt);
      }
    }

    const id = crypto.randomUUID();
    const storagePath = `${user.id}/content-projects/${workspaceId}/${projectId}/ai-${page.replace(/[^a-zA-Z0-9.-]/g, "-")}-${id}.png`;
    const { error: uploadError } = await access.admin.storage
      .from("brand-assets")
      .upload(storagePath, Buffer.from(base64, "base64"), { contentType: "image/png", cacheControl: "3600" });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = access.admin.storage.from("brand-assets").getPublicUrl(storagePath);
    const existing = Array.isArray((production as any).assets) ? (production as any).assets : [];
    const asset = {
      id,
      url: publicUrl.publicUrl,
      filename: `AI ${page}.png`,
      width: 1024,
      height: 1536,
      assignedPage: page,
      isCover: existing.length === 0 || page === "P.1",
      sourceType: "ai_generated",
      sourceLabel: "AI 生成",
      originalVisualDirection,
      safeImagePrompt: finalPrompt,
      promptAdjustmentReason,
    };
    const assets = asset.isCover
      ? existing.map((item: any) => ({ ...item, isCover: false })).concat(asset)
      : existing.concat(asset);
    const { data: saved, error: saveError } = await access.admin
      .from("content_projects")
      .update({ production: { ...production, assets, assetStatus: "pending" }, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .select("id,production,updated_at")
      .single();
    if (saveError) throw saveError;
    return NextResponse.json({ success: true, asset, project: saved, promptAdjusted: Boolean(promptAdjustmentReason), promptAdjustmentReason });
  } catch (error) {
    console.error("[content-projects/generate-asset]", error);
    return NextResponse.json({ error: "未能生成圖片", detail: String(error) }, { status: 500 });
  }
}
