import { NextResponse } from "next/server";

import { isAuthorizedInternalRequest } from "@/lib/internal-api-auth";
import { createAdminSupabase } from "@/lib/server-supabase";

type CampaignDetails = {
  application_deadline?: string | null;
  brand_overview?: string | null;
  brand_website?: string | null;
  budget_range?: string | null;
  collab_formats?: string[] | null;
  deliverables?: string[] | null;
};

export async function GET(req: Request) {
  if (!isAuthorizedInternalRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("marketing_campaigns")
    .select(
      `
      id,
      name,
      theme,
      status,
      starts_on,
      duration_weeks,
      target_audience,
      call_to_action,
      target_link,
      cover_image_url,
      workspace_id,
      created_at,
      raw_campaign_details,
      workspaces!inner(name)
    `,
    )
    .eq("kol_open", true)
    .not("status", "in", "(completed,archived,cancelled)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[public/campaigns] query failed", error);
    return NextResponse.json(
      { error: "Failed to load campaigns" },
      { status: 500 },
    );
  }

  const campaigns = (data || []).map((campaign) => {
    const details = (campaign.raw_campaign_details || {}) as CampaignDetails;
    return {
      application_deadline: details.application_deadline ?? null,
      brand_overview: details.brand_overview ?? null,
      brand_website: details.brand_website ?? campaign.target_link ?? null,
      budget_range: details.budget_range ?? null,
      call_to_action: campaign.call_to_action,
      collab_formats: details.collab_formats ?? details.deliverables ?? [],
      cover_image_url: campaign.cover_image_url,
      created_at: campaign.created_at,
      duration_weeks: campaign.duration_weeks,
      id: campaign.id,
      name: campaign.name,
      starts_on: campaign.starts_on,
      status: campaign.status,
      target_audience: campaign.target_audience,
      theme: campaign.theme,
      workspace_id: campaign.workspace_id,
      workspaces: campaign.workspaces,
    };
  });

  return NextResponse.json({ campaigns });
}
