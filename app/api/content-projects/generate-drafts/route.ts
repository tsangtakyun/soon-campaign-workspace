import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { anthropicModel } from "@/lib/anthropic-models";
import { isUuid } from "@/lib/oauth-connections";
import { createServerSupabase } from "@/lib/server-supabase";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import { contentStylePromptFromDecision } from "@/lib/content-style-library";

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
      .select("id,title,brief,production,prompt_version_id,selected_format,format_decision")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .single();
    if (error) throw error;
    const isVideo = project.selected_format === "short_video";
    if (
      project.production?.status !== "structure_confirmed" ||
      (!isVideo && project.production?.assetStatus !== "confirmed")
    ) {
      return NextResponse.json(
        { error: isVideo ? "請先確認短片結構" : "請先確認故事結構及圖片素材" },
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
    const { data: contentPreferences } = await access.admin
      .from("content_preferences").select("content_mood")
      .eq("workspace_id", workspaceId).maybeSingle();
    const contentMood = contentPreferences?.content_mood && typeof contentPreferences.content_mood === "object"
      ? contentPreferences.content_mood as Record<string, unknown> : {};
    const languageStyle = contentMood.languageStyle === "written" || contentMood.languageStyle === "conversational"
      ? contentMood.languageStyle : "brand";
    const languageInstruction = languageStyle === "written"
      ? "使用自然、簡潔的繁體中文書面語，避免有冇、係咪、睇、揀、唔、咁、佢等口語。"
      : languageStyle === "conversational"
        ? "使用自然香港廣東話及短句，保持清楚、可信。"
        : "優先遵從 Workspace Prompt 內的品牌慣用語氣。";
    const isClearMagazine = ["clear-magazine-carousel-v1", "clear_magazine_carousel", "editorial-clear"]
      .includes(String(project.format_decision?.renderTemplateCode || project.format_decision?.templateCode || ""));
    const videoMethod = project.format_decision?.videoMethod === "ai_video_generation"
      ? "ai_video_generation"
      : "human_filming";
    const outputInstruction = isVideo
      ? videoMethod === "ai_video_generation"
        ? [
            "你正在建立 AI 短片生成計劃。不要聲稱影片已經生成。",
            "輸出開場句、片長、連續鏡頭、畫面生成提示、旁白／字幕及貼文文案。",
            '只輸出 JSON：{"captionDraft":"社交媒體貼文文案","hook":"首三秒開場句","durationSeconds":20,"pages":[{"page":"S.1","headline":"鏡頭名稱","subheadline":"秒數","body":["旁白或字幕"],"assetId":"","layout":"ai_scene","designDirection":"可供 AI 影片模型使用的具體畫面、動作及鏡頭指示"}]}',
          ]
        : [
            "你正在建立真人拍攝短片製作包。內容必須以一般品牌團隊可執行的方式撰寫。",
            "輸出開場句、片長、逐鏡腳本、人物動作、對白／旁白、拍攝清單及貼文文案。",
            '只輸出 JSON：{"captionDraft":"社交媒體貼文文案","hook":"首三秒開場句","durationSeconds":20,"shotList":["需要準備的拍攝項目"],"pages":[{"page":"S.1","headline":"鏡頭名稱","subheadline":"秒數","body":["對白、旁白或字幕"],"assetId":"","layout":"human_scene","designDirection":"人物動作、場景及實際拍攝方法"}]}',
          ]
      : [
          project.selected_format === "single_image"
            ? "你正在執行單張社交貼文的圖片生成前草稿階段。只可輸出一個 P.1。"
            : "你正在執行 IG 輪播貼文圖片生成前的逐頁製作草稿階段。不要生成圖片。",
          "嚴格遵從 Workspace Production Prompt，但今次只輸出最終文案、圖片配對及版面方向。",
          '只輸出 JSON：{"captionDraft":"IG caption","pages":[{"page":"P.1","role":"cover|longform|split|comparison|feature|end","headline":"","subheadline":"","body":["段落一","段落二"],"assetId":"主要素材 id 或空字串","assetIds":["主要素材 id","第二素材 id"],"layout":"頁面角色","designDirection":"具體排版方向"}]}',
          ...(isClearMagazine ? [
            "頁型必須按每頁內容決定，不可按頁碼套用固定次序。封面用 cover；長文用 longform；兩項互補內容用 split；比較、差異或 A vs B 內容必須用 comparison；單一重點用 feature；結尾資料或 CTA 用 end。",
            "每頁 headline 建議不超過 18 個中文字。cover 及 end 的 body 最多 2 段；其餘頁面最多 4 段，每段只寫一個重點。不得以縮小字體容納過長內容。",
            "comparison 頁的 body[0] 與 body[1] 是左右兩項標籤，其餘段落才是比較結論。",
            "comparison 頁必須按語意選擇兩張不同素材，assetIds 依次為左圖、右圖；不足兩張合適素材時只填合適的一張，不可隨機補圖。",
            "split 頁可按內容使用一至兩張素材；其他頁只需一張主要素材。assetId 必須等於 assetIds 第一項。",
          ] : []),
        ];
    const input = [
      ...outputInstruction,
      "\n【Production Prompt】\n" + prompt.production_prompt,
      "\n【SOON Style 製作規格】\n" + contentStylePromptFromDecision(project.format_decision, project.selected_format),
      "\n【Project】\n" + project.title,
      "Brief：" + JSON.stringify(project.brief || {}),
      "已選內容風格：" + JSON.stringify(project.format_decision || {}),
      "已確認故事結構：" + JSON.stringify(pages),
      isVideo ? "參考圖片素材：" + JSON.stringify(assets) : "圖片素材（必須用 asset id 引用）：" + JSON.stringify(assets),
      "圖片必須按每頁主題及畫面用途配對，不可按照上載次序機械分配。",
      languageInstruction,
      "鏡頭／頁數及次序必須與已確認結構一致。不要新增未經核實的事實；除非來源明確支持，不能把受推薦、最受歡迎或最多人選擇寫成事實。",
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
    const validAssetIds = new Set(assets.map((asset: { id?: string }) => asset.id).filter(Boolean));
    const comparisonLanguage = /(?:比較|對比|分別|不同|唔同|差異|有咩(?:唔同|不同)|\bvs\.?\b)/i;
    const validRoles = new Set(["cover", "longform", "split", "comparison", "feature", "end"]);
    const normalizedPages = (Array.isArray(drafts.pages) ? drafts.pages : []).map((draft: Record<string, unknown>) => {
      const requestedIds = [...(Array.isArray(draft.assetIds) ? draft.assetIds : []), draft.assetId]
        .filter((id): id is string => typeof id === "string" && validAssetIds.has(id));
      const assetIds = [...new Set(requestedIds)];
      const draftText = [draft.headline, draft.subheadline, ...(Array.isArray(draft.body) ? draft.body : [])]
        .filter((item): item is string => typeof item === "string")
        .join(" ");
      const requestedRole = String(draft.role || draft.layout || "");
      const modelRole = validRoles.has(requestedRole) ? requestedRole : "longform";
      // Content semantics outrank the model's page-role label. A page that
      // explicitly discusses a difference must render as a comparison; a page
      // labelled comparison without comparative content falls back to feature.
      const role = comparisonLanguage.test(draftText)
        ? "comparison"
        : modelRole === "comparison" ? "feature" : modelRole;
      const allowedIds = role === "comparison" || role === "split" ? assetIds.slice(0, 2) : assetIds.slice(0, 1);
      return { ...draft, role, layout: role, assetId: allowedIds[0] || "", assetIds: allowedIds };
    });
    const pagesWithComparisonAssets = normalizedPages.map((draft, index, allDrafts) => {
      const role = String(draft.role || draft.layout || "");
      const currentIds = Array.isArray(draft.assetIds) ? draft.assetIds as string[] : [];
      const draftText = [draft.headline, draft.subheadline, ...(Array.isArray(draft.body) ? draft.body : [])]
        .filter((item): item is string => typeof item === "string")
        .join(" ");
      const needsPair = role === "comparison" || (role === "split" && comparisonLanguage.test(draftText));
      if (!needsPair || currentIds.length >= 2) return draft;

      // The model often identifies the contrasting asset correctly for the next
      // page but omits it from the comparison page. Reuse the nearest semantic
      // candidate instead of leaving a one-sided comparison layout.
      const nearbyDrafts = [...allDrafts.slice(index + 1), ...allDrafts.slice(0, index)].filter((item) => item !== draft);
      const secondaryId = nearbyDrafts
        .flatMap((item) => Array.isArray(item.assetIds) ? item.assetIds as string[] : [])
        .find((id) => validAssetIds.has(id) && !currentIds.includes(id));
      if (!secondaryId) return draft;
      const pairedIds = [...currentIds, secondaryId].slice(0, 2);
      return { ...draft, assetId: pairedIds[0] || "", assetIds: pairedIds };
    });
    const production = {
      ...project.production,
      pageDrafts: pagesWithComparisonAssets,
      captionDraft: drafts.captionDraft || "",
      ...(isVideo ? {
        videoPlan: {
          method: videoMethod,
          hook: drafts.hook || "",
          durationSeconds: Number(drafts.durationSeconds) || 20,
          shotList: Array.isArray(drafts.shotList) ? drafts.shotList : [],
        },
      } : {}),
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
