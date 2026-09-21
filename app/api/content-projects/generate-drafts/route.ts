import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { projectStyleContext, projectBrand } from '@/lib/project-style-context';
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { anthropicModel } from "@/lib/anthropic-models";
import { isUuid } from "@/lib/oauth-connections";
import { createServerSupabase } from "@/lib/server-supabase";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import { contentStylePromptFromDecision } from "@/lib/content-style-library";
import { isClearMagazineCarousel } from "@/lib/content-templates/clear-magazine-carousel-v1";

export const runtime = "nodejs";
export const maxDuration = 120;

type VisualAsset = Record<string, unknown> & {
  id?: string;
  url?: string;
  filename?: string;
  visualAnalysis?: Record<string, unknown>;
};

function parseJson(text: unknown) {
  const clean = String(text ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  if (!clean) throw new Error("AI 暫未回傳草稿內容，請重新生成");
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

async function analyzeVisualAssets(apiKey: string, assets: VisualAsset[]) {
  const pending = assets.filter((asset) => asset.id && asset.url && !asset.visualAnalysis).slice(0, 10);
  if (!pending.length) return assets;

  try {
    const content: Array<Record<string, unknown>> = [{
      type: "text",
      text: "逐張分析以下圖片。分析必須只根據畫面，不可從檔名猜測。",
    }];
    const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    const downloaded = await Promise.all(pending.map(async (asset) => {
      try {
        const response = await fetch(String(asset.url), { signal: AbortSignal.timeout(8_000) });
        if (!response.ok) return null;
        const mediaType = (response.headers.get("content-type") || "").split(";")[0];
        if (!supportedTypes.has(mediaType)) return null;
        const buffer = Buffer.from(await response.arrayBuffer());
        return buffer.byteLength <= 8_000_000 ? { asset, mediaType, buffer } : null;
      } catch {
        return null;
      }
    }));
    let totalBytes = 0;
    for (const item of downloaded) {
      if (!item || totalBytes + item.buffer.byteLength > 18_000_000) continue;
      const { asset, mediaType, buffer } = item;
      totalBytes += buffer.byteLength;
      content.push({ type: "text", text: `ASSET_ID: ${asset.id}\nFILENAME: ${asset.filename || "unknown"}` });
      content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: buffer.toString("base64") } });
    }
    if (content.length === 1) return assets;
    content.push({
      type: "text",
      text: [
        "只輸出 JSON，不要加解釋。每張圖片都要用 ASSET_ID 對應。",
        "subject 是主要畫面主體；objects 是可見的重要物件；scene 是場景；action 是正在發生的動作；visibleText 是清楚可辨認的文字。",
        "relationship 只可為 brand_product、competitor_or_comparison、process、people_or_lifestyle、place、information、unknown。",
        "contentUses 說明適合支持哪些內容意圖，例如產品特色、製作過程、口味、比較、人物體驗、店舖資料。distinctiveCues 寫出可區分相似圖片的視覺線索。",
        "background 只描述主體外圍背景；cutoutSuitability 只可為 high、medium、low，純色或乾淨淺色背景且主體輪廓完整為 high，複雜場景或主體被遮擋為 low。",
        '{"assets":[{"id":"","subject":"","objects":[],"scene":"","action":"","visibleText":[],"relationship":"unknown","contentUses":[],"distinctiveCues":[],"background":"","cutoutSuitability":"high|medium|low"}]}',
      ].join("\n"),
    });
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: anthropicModel(process.env.ANTHROPIC_PRODUCT_MODEL || process.env.ANTHROPIC_CONTENT_MODEL),
        max_tokens: 2400,
        temperature: 0,
        system: "You are a visual asset librarian. Return valid JSON only.",
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(28_000),
    });
    const data = await response.json();
    if (!response.ok) return assets;
    const text = Array.isArray(data.content)
      ? data.content.filter((item: { type?: string }) => item.type === "text").map((item: { text?: string }) => item.text || "").join("\n")
      : "";
    const parsed = parseJson(text);
    const analyses = new Map((Array.isArray(parsed.assets) ? parsed.assets : []).map((item: Record<string, unknown>) => [String(item.id || ""), item]));
    return assets.map((asset) => analyses.has(String(asset.id)) ? { ...asset, visualAnalysis: analyses.get(String(asset.id)) } : asset);
  } catch (error) {
    console.warn("[content-projects/generate-drafts] visual analysis skipped", error);
    return assets;
  }
}

export async function POST(req: Request) {
  let generationId = "";
  let generationAdmin: SupabaseClient | null = null;
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
      .select("id,title,source_note,brief,production,prompt_version_id,selected_format,format_decision")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .single();
    if (error) throw error;
    if (project.format_decision?.inputHash && project.format_decision.inputHash !== projectStyleContext(project,await projectBrand(access.admin,workspaceId)).inputHash) {
      return NextResponse.json({ error: "題材、故事或素材已改變，請重新確認風格。" }, { status: 409 });
    }
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

    const structure = isVideo && Array.isArray(project.production.script) && project.production.script.length
      ? project.production.script
      : project.production.pages || [];
    const assets: VisualAsset[] = project.production.assets || [];
    const analyzedAssets = isVideo ? assets : await analyzeVisualAssets(apiKey, assets);
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
    const isClearMagazine = isClearMagazineCarousel(
      String(project.format_decision?.renderTemplateCode || project.format_decision?.templateCode || ""),
    );
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
          '只輸出 JSON：{"captionDraft":"IG caption","pages":[{"page":"P.1","role":"cover|longform|split|comparison|feature|end","templateArtboardId":"01_COVER|02_FULL_BLEED_TEXT|03_IMAGE_TOP_TEXT_BOTTOM|04_COMPARISON|05_LEFT_TEXT_RIGHT_IMAGE|06_END_CTA","headline":"","subheadline":"","body":["段落一","段落二"],"assetId":"主要素材 id 或空字串","assetIds":["主要素材 id","第二素材 id"],"imageTreatment":"auto|cutout|full-bleed|card","assetStatus":"matched|missing","assetRequest":{"reason":"現有圖片為何未能支持本頁內容","suggestions":["建議上載的具體畫面"]},"layout":"頁面角色","designDirection":"具體排版方向"}]}',
          ...(isClearMagazine ? [
            "頁型必須按每頁內容決定，不可按頁碼套用固定次序。封面用 cover；長文用 longform；兩項互補內容用 split；比較、差異或 A vs B 內容必須用 comparison；單一重點用 feature；結尾資料或 CTA 用 end。",
            "每頁必須保存固定 templateArtboardId：cover=01_COVER、longform=02_FULL_BLEED_TEXT、split=03_IMAGE_TOP_TEXT_BOTTOM、comparison=04_COMPARISON、feature=05_LEFT_TEXT_RIGHT_IMAGE、end=06_END_CTA。",
            "每頁 headline 建議不超過 18 個中文字。cover 及 end 的 body 最多 2 段；其餘內容頁，尤其 P.2 至 P.5，body 應忠實保留已確認 copyDirection 的具體資料，通常拆成 3 至 5 個短段，每段只寫一個重點。不得為了變短而刪走有來源支持的重要細節，亦不得以縮小字體容納過長內容。",
            "逐頁文案只可整理及改寫已確認故事結構、Brief 與來源資料。不得新增任何數字、背景、因果、影響、例子或評價；資料不足時寧可較短，不可以常識或套話填充。報道及當事人說法必須保留歸因字眼。",
            "cover 的 subheadline 是短 Eyebrow，最多 10 個中文字；headline 不可含任何標點並須能平衡分成最多兩行；body 只可有一個短句，建議不超過 28 個中文字。",
            "end 頁 subheadline 使用短分類如『店舖資料』或『出發前留意』；headline 不可用直線或其他標點作分隔，最多兩行；場景或帶白底的產品相預設保留原圖，不可自動退地。",
            "longform 的 headline 不可含標點並應寫成兩個可獨立斷行的短語；body 每個短句獨立成一行，最多七行，不可用逗號將多個重點塞進同一行。longform 全頁必須使用自然、簡潔的繁體中文書面語，不可使用『唔係、係、嘅、拎、睇、薯仔』等廣東話口語。",
            "版面文案使用雜誌式換行建立節奏。body 每個陣列項目應是一個完整短段，段尾不要加入逗號、句號、分號或冒號；問號及感嘆號只在語意確實需要時使用。",
            "comparison 頁的 body[0]、body[1] 是左右標籤；body[2]、body[3] 分別解釋左、右兩項；如有必要，body[4] 才是簡短總結。左右內容不可合併成一段放在卡片外。",
            "comparison 頁 headline 不可包含標點；左右說明各自最多四個短句，每句獨立成行，避免段內逗號及句號。",
            "comparison 頁必須按語意選擇兩張不同素材，assetIds 依次為左圖、右圖；右圖在內容相關的前提下，優先選擇 cutoutSuitability 為 high 的獨立產品或包裝圖片，其次才使用 medium；不可為了退地而選擇不相關圖片。不足兩張合適素材時只填合適的一張，不可隨機補圖。",
            "split 頁只在兩張圖片分別支持兩項互補內容時使用一至兩張素材；其他頁只需一張主要素材。不可為了填滿版面而增加第二張圖片。assetId 必須等於 assetIds 第一項。",
            "split 頁 headline 不可包含標點；subheadline 必須是短 Eyebrow；body 分成兩個主要段落，每段可包含一至兩個有來源支持的短句，避免加入無資料支持的補充或免責文字。",
            "若沒有圖片足以證明或呈現該頁所述人物、產品、服務、場景或比較項目，assetStatus 必須為 missing，assetIds 留空或只保留確實合適的圖片，並在 assetRequest 寫出原因及 2 至 4 個具體上載建議。不可用只有共同關鍵字但內容不符的圖片頂替。",
            "imageTreatment 按畫面決定：包裝、獨立產品或人物全身而背景雜亂可用 cutout；場景、製作過程或環境氣氛用 full-bleed 或 card；無法可靠退地時用 card。不要要求所有圖片退地。",
            "feature 頁如使用食物、環境或製作場景相片，必須保留原圖並用 card，不可退地；只有清晰獨立產品相片才可用 cutout。feature headline 不可包含標點並最多兩行。",
          ] : []),
        ];
    const input = [
      ...outputInstruction,
      "\n【Production Prompt】\n" + prompt.production_prompt,
      "\n【SOON Style 製作規格】\n" + contentStylePromptFromDecision(project.format_decision, project.selected_format),
      "\n【Project】\n" + project.title,
      "Brief：" + JSON.stringify(project.brief || {}),
      "已選內容風格：" + JSON.stringify(project.format_decision || {}),
      (isVideo ? "已確認短片劇本：" : "已確認故事結構：") + JSON.stringify(structure),
      isVideo ? "參考圖片素材：" + JSON.stringify(analyzedAssets) : "圖片素材及畫面分析（必須用 asset id 引用）：" + JSON.stringify(analyzedAssets),
      "圖片必須按每頁主題及畫面用途配對，不可按照上載次序機械分配。",
      "配圖時必須比較該頁完整意圖與 visualAnalysis，不可只因兩者共有產品名稱或單一名詞便配對。",
      "competitor_or_comparison 素材主要用於比較頁；口味、功能或產品特色頁不可使用不相關的競品包裝。process、place、people_or_lifestyle 亦必須配合頁面所述場景。",
      "圖片是否合適要以圖片實際可見內容能否支持該頁訊息判斷。若頁面介紹其他產品或服務，但現有圖片只見主要產品或製作過程，必須標示 missing 並要求相關產品或服務圖片。",
      "若素材 assignedPage 不是 auto，必須優先遵從用家的指定頁面。除非版面需要，不要在不同頁重複使用同一素材。",
      languageInstruction,
      "鏡頭／頁數及次序必須與已確認結構一致。不要新增未經核實的事實；除非來源明確支持，不能把受推薦、最受歡迎或最多人選擇寫成事實。",
      isVideo ? "以已確認短片結構為事實依據，按選定風格調整開場、對白及視覺節奏；不得新增痛點、功效、親身經驗或使用場景。" : "",
    ].join("\n");
    generationId = randomUUID();
    generationAdmin = access.admin;
    const {error:recordError}=await access.admin.from('content_project_generation_runs').insert({id:generationId,project_id:projectId,workspace_id:workspaceId,actor_id:user.id,status:'pending',model:anthropicModel(process.env.ANTHROPIC_CONTENT_MODEL),input:{prompt:input,style:project.format_decision}});
    if(recordError) throw recordError;
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
      signal: AbortSignal.timeout(72_000),
    });
    const data = await response.json();
    const {error:outputError}=await access.admin.from('content_project_generation_runs').update({output:data,updated_at:new Date().toISOString()}).eq('id',generationId);
    if(outputError) throw outputError;
    if (!response.ok)
      throw new Error(data?.error?.message || "AI request failed");
    const text = Array.isArray(data.content)
      ? data.content
          .filter((item: any) => item.type === "text")
          .map((item: any) => item.text || "")
          .join("\n")
      : "";
    const drafts = parseJson(text);
    const validAssetIds = new Set(analyzedAssets.map((asset) => asset.id).filter(Boolean));
    const comparisonLanguage = /(?:比較|對比|分別|不同|唔同|差異|有咩(?:唔同|不同)|\bvs\.?\b)/i;
    const validRoles = new Set(["cover", "longform", "split", "comparison", "feature", "end"]);
    const artboardByRole: Record<string, string> = { cover: "01_COVER", longform: "02_FULL_BLEED_TEXT", split: "03_IMAGE_TOP_TEXT_BOTTOM", comparison: "04_COMPARISON", feature: "05_LEFT_TEXT_RIGHT_IMAGE", end: "06_END_CTA" };
    const styledVideo = isVideo && Boolean(project.format_decision?.recommendationId);
    if (styledVideo && (!Array.isArray(drafts.pages) || drafts.pages.length !== structure.length || drafts.pages.some((page: Record<string,unknown>) => !Array.isArray(page.body) || !page.body.length || typeof page.designDirection !== 'string'))) {
      throw new Error('風格劇本未完整生成，請重試。');
    }
    const normalizedPages = isVideo ? structure.map((segment: Record<string, unknown>, index: number) => {
      const body = [segment.dialogue, segment.caption]
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      const styled = styledVideo ? drafts.pages[index] as Record<string,unknown> : null;
      return {
        page: `S.${index + 1}`,
        headline: String(segment.section || `鏡頭 ${index + 1}`),
        subheadline: String(segment.time || ""),
        body: styled ? (styled.body as unknown[]).filter((line): line is string => typeof line === "string") : body,
        assetId: "",
        assetIds: [],
        assetStatus: "missing",
        layout: videoMethod === "ai_video_generation" ? "ai_scene" : "human_scene",
        designDirection: styled ? String(styled.designDirection) : [segment.visual, segment.productionNote].filter(Boolean).join("；"),
        sourceEvidence: String(segment.sourceEvidence || ""),
        groundingStatus: String(segment.groundingStatus || "needs_confirmation"),
      };
    }) : (Array.isArray(drafts.pages) ? drafts.pages : []).map((draft: Record<string, unknown>) => {
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
      const needsAnotherImage = role === "comparison" && allowedIds.length < 2;
      const modelMissing = draft.assetStatus === "missing";
      const assetStatus = modelMissing || allowedIds.length === 0 || needsAnotherImage ? "missing" : "matched";
      const request = draft.assetRequest && typeof draft.assetRequest === "object"
        ? draft.assetRequest
        : {
            reason: needsAnotherImage ? "這一頁需要兩張能清楚呈現比較雙方的圖片。" : "現有圖片未能清楚支持這一頁的內容。",
            suggestions: needsAnotherImage ? ["比較項目左方的清晰圖片", "比較項目右方的清晰圖片"] : ["能直接呈現這一頁主題的產品、服務或場景圖片"],
          };
      return { ...draft, role, layout: role, templateArtboardId: artboardByRole[role], assetId: allowedIds[0] || "", assetIds: allowedIds, assetStatus, assetRequest: assetStatus === "missing" ? request : undefined };
    });
    const production = {
      ...project.production,
      assets: analyzedAssets,
      pageDrafts: normalizedPages,
      captionDraft: drafts.captionDraft || "",
      ...(isVideo ? {
        captionDraft: styledVideo ? String(drafts.captionDraft || "") : structure.flatMap((segment: Record<string, unknown>) => [segment.dialogue, segment.caption]).filter((item): item is string => typeof item === "string" && item.trim().length > 0).join("\n"),
        videoPlan: {
          method: videoMethod,
          hook: styledVideo ? String(drafts.hook || normalizedPages[0]?.body?.[0] || "") : String(structure[0]?.dialogue || structure[0]?.caption || ""),
          durationSeconds: Number(drafts.durationSeconds) || 20,
          shotList: styledVideo ? normalizedPages.map((page: Record<string,unknown>) => page.designDirection).filter(Boolean) : structure.map((segment: Record<string, unknown>) => [segment.visual, segment.productionNote].filter(Boolean).join("；")).filter(Boolean),
        },
      } : {}),
      productionStatus: "drafts_ready",
      draftsGeneratedAt: new Date().toISOString(),
      draftGenerationId: generationId,
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
    const {error:completeError}=await access.admin.from("content_project_generation_runs").update({status:"ready",updated_at:new Date().toISOString()}).eq("id",generationId);
    if(completeError) throw completeError;
    return NextResponse.json({ success: true, project: saved });
  } catch (error) {
    console.error("[content-projects/generate-drafts]", error);
    if(generationId && generationAdmin) await generationAdmin.from("content_project_generation_runs").update({status:"failed",error:"生成未完成，請重試。",updated_at:new Date().toISOString()}).eq("id",generationId);
    return NextResponse.json(
      { error: "未能生成逐頁文案及版面草稿", detail: String(error) },
      { status: 500 },
    );
  }
}

export async function GET(req:Request) {
 const url=new URL(req.url),workspaceId=url.searchParams.get('workspaceId') || '',id=url.searchParams.get('id') || '';
 if(!isUuid(workspaceId)||!isUuid(id))return NextResponse.json({error:'Invalid request'},{status:400});
 const {data:{user}}=await createServerSupabase(await cookies()).auth.getUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const access=await getWorkspaceAccess({email:user.email,userId:user.id,workspaceId});
 if(!access || !['owner','admin'].includes(access.role))return NextResponse.json({error:'Forbidden'},{status:403});
 const {data,error}=await access.admin.from('content_project_generation_runs').select('id,project_id,status,model,output,error,created_at').eq('id',id).eq('workspace_id',workspaceId).maybeSingle();
 if(error)return NextResponse.json({error:'Unavailable'},{status:503});
 return NextResponse.json(data || {error:'Not found'},{status:data?200:404,headers:{'Cache-Control':'private, no-store'}});
}
