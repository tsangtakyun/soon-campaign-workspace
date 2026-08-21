import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { anthropicModel } from "@/lib/anthropic-models";
import { isUuid } from "@/lib/oauth-connections";
import { createServerSupabase } from "@/lib/server-supabase";
import { getWorkspaceAccess } from "@/lib/workspace-access";

function parseJson(text: string) {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start)
      return JSON.parse(clean.slice(start, end + 1));
    throw new Error("AI response is not valid JSON");
  }
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
      return NextResponse.json(
        { error: "內容製作只限 Workspace Owner 或 Admin" },
        { status: 403 },
      );

    const { data: project, error } = await access.admin
      .from("content_projects")
      .select("id,title,brief,production,prompt_version_id")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .single();
    if (error) throw error;
    if (
      project.production?.status !== "structure_confirmed" ||
      project.production?.assetStatus !== "confirmed"
    ) {
      return NextResponse.json(
        { error: "請先確認故事結構及圖片素材" },
        { status: 400 },
      );
    }

    const { data: prompt } = await access.admin
      .from("workspace_prompt_versions")
      .select("version,production_prompt")
      .eq("id", project.prompt_version_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!prompt?.production_prompt?.trim())
      return NextResponse.json(
        { error: "Workspace 製作 Prompt 未設定" },
        { status: 400 },
      );
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 500 },
      );

    const pages = project.production.pages || [];
    const assets = project.production.assets || [];
    const input = [
      "你正在執行 IG Carousel 圖片生成前的逐頁製作草稿階段。不要生成圖片。",
      "嚴格遵從 Workspace Production Prompt，但今次只輸出每頁最終文案、圖片配對及 layout direction。",
      "\n【Production Prompt】\n" + prompt.production_prompt,
      "\n【Project】\n" + project.title,
      "Brief：" + JSON.stringify(project.brief || {}),
      "已確認故事結構：" + JSON.stringify(pages),
      "圖片素材（必須用 asset id 引用）：" + JSON.stringify(assets),
      "\n只輸出 JSON：",
      '{"captionDraft":"IG caption","pages":[{"page":"P.1","headline":"","subheadline":"","body":["段落一","段落二"],"assetId":"已提供素材 id 或空字串","layout":"cover|editorial_article","designDirection":"具體排版方向"}]}',
      "頁數及頁碼必須與已確認故事結構完全一致。中文不用句號。不要新增未經核實的事實。",
    ].join("\n");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: anthropicModel(process.env.ANTHROPIC_CONTENT_MODEL),
        max_tokens: 6500,
        temperature: 0.25,
        system: "You are SOON Content Studio. Return valid JSON only.",
        messages: [{ role: "user", content: input }],
      }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data?.error?.message || "AI request failed");
    const text = Array.isArray(data.content)
      ? data.content
          .filter((item: any) => item.type === "text")
          .map((item: any) => item.text || "")
          .join("\n")
      : "";
    const drafts = parseJson(text);
    const production = {
      ...project.production,
      pageDrafts: drafts.pages || [],
      captionDraft: drafts.captionDraft || "",
      productionStatus: "drafts_ready",
      draftsGeneratedAt: new Date().toISOString(),
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
    console.error("[content-projects/generate-drafts]", error);
    return NextResponse.json(
      { error: "未能生成逐頁文案及版面草稿", detail: String(error) },
      { status: 500 },
    );
  }
}
