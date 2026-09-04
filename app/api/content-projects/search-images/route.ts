import { NextRequest, NextResponse } from "next/server";

import { anthropicModel } from "@/lib/anthropic-models";
import { requirePlatformUser } from "@/lib/platform-access";

export const runtime = "nodejs";

const ALLOWED_LICENSES = new Set(["by", "by-sa", "cc0", "pdm"]);

export async function GET(request: NextRequest) {
  const auth = await requirePlatformUser();
  if (auth.error) return auth.error;

  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (query.length < 2) {
    return NextResponse.json({ error: "請輸入至少兩個字嘅搜尋內容" }, { status: 400 });
  }

  let optimizedQuery = query.slice(0, 160);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: anthropicModel(process.env.ANTHROPIC_CONTENT_MODEL),
          max_tokens: 60,
          temperature: 0,
          system: "Convert a visual direction into a concise English stock-photo search query. Return keywords only, no punctuation or explanation. Avoid brands and sensitive traits.",
          messages: [{ role: "user", content: optimizedQuery }],
        }),
        signal: AbortSignal.timeout(8_000),
      });
      const aiPayload = await aiResponse.json().catch(() => null);
      const text = aiPayload?.content?.find((item: any) => item?.type === "text")?.text?.trim();
      if (aiResponse.ok && text) optimizedQuery = text.slice(0, 160);
    } catch {
      // Searching with the original query is still useful when AI optimization is unavailable.
    }
  }

  const endpoint = new URL("https://api.openverse.org/v1/images/");
  endpoint.searchParams.set("q", optimizedQuery);
  endpoint.searchParams.set("page_size", "12");
  endpoint.searchParams.set("license_type", "commercial");
  endpoint.searchParams.set("mature", "false");

  try {
    const response = await fetch(endpoint, {
      headers: { "user-agent": "SOON Content Studio/1.0" },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`Openverse HTTP ${response.status}`);
    const payload = await response.json();
    const results = (Array.isArray(payload?.results) ? payload.results : [])
      .filter((item: any) =>
        item?.id && item?.url && item?.thumbnail && ALLOWED_LICENSES.has(String(item.license || "")),
      )
      .map((item: any) => ({
        id: String(item.id),
        title: String(item.title || "未命名圖片"),
        creator: String(item.creator || "作者未提供"),
        creatorUrl: item.creator_url || null,
        license: String(item.license || "").toUpperCase(),
        licenseUrl: item.license_url || null,
        sourceUrl: item.foreign_landing_url || null,
        url: String(item.url),
        thumbnail: String(item.thumbnail),
        width: Number(item.width) || 0,
        height: Number(item.height) || 0,
        provider: String(item.provider || item.source || "Openverse"),
      }));
    return NextResponse.json({ results, optimizedQuery, notice: "授權資料由來源提供，使用前仍需核對原頁授權及署名要求。" });
  } catch (error) {
    return NextResponse.json(
      { error: "暫時未能搜尋授權圖片", detail: String(error) },
      { status: 502 },
    );
  }
}
