import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createAdminSupabase,
  createServerSupabase,
} from "@/lib/server-supabase";
import { getWorkspaceAccess, withWorkspaceAuth } from "@/lib/workspace-access";

type RouteProps = { params: Promise<{ campaignId: string }> };
const statuses = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "declined",
] as const;

async function context(campaignId: string) {
  const server = createServerSupabase(await cookies());
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user?.id)
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  const admin = createAdminSupabase();
  const { data: campaign } = await admin
    .from("marketing_campaigns")
    .select("id,workspace_id,name")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign?.workspace_id)
    return {
      response: NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      ),
    };
  return { campaign, user };
}

export async function GET(_req: Request, { params }: RouteProps) {
  const { campaignId } = await params;
  const result = await context(campaignId);
  if ("response" in result) return result.response;
  const access = await getWorkspaceAccess({
    email: result.user.email,
    userId: result.user.id,
    workspaceId: result.campaign.workspace_id,
  });
  if (!access)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await access.admin
    .from("kol_campaign_applications")
    .select("*")
    .eq("campaign_id", result.campaign.id)
    .eq("workspace_id", result.campaign.workspace_id)
    .order("applied_at", { ascending: false });
  if (error)
    return NextResponse.json(
      { error: "Failed to load applications" },
      { status: 500 },
    );
  return NextResponse.json({ applications: data || [] });
}

export async function PATCH(req: Request, { params }: RouteProps) {
  const { campaignId } = await params;
  const body = (await req.json().catch(() => null)) as {
    application_id?: string;
    status?: string;
  } | null;
  if (
    !body?.application_id ||
    !statuses.includes(body.status as (typeof statuses)[number])
  ) {
    return NextResponse.json(
      { error: "Invalid application update" },
      { status: 400 },
    );
  }
  const result = await context(campaignId);
  if ("response" in result) return result.response;

  return withWorkspaceAuth(
    {
      email: result.user.email,
      userId: result.user.id,
      workspaceId: result.campaign.workspace_id,
    },
    { require: "canEdit" },
    async ({ admin }) => {
      const { data: previous } = await admin
        .from("kol_campaign_applications")
        .select("*")
        .eq("id", body.application_id)
        .eq("campaign_id", result.campaign.id)
        .eq("workspace_id", result.campaign.workspace_id)
        .maybeSingle();
      if (!previous)
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 },
        );

      const { data: application, error } = await admin
        .from("kol_campaign_applications")
        .update({ status: body.status, reviewed_at: new Date().toISOString() })
        .eq("id", body.application_id)
        .eq("campaign_id", result.campaign.id)
        .eq("workspace_id", result.campaign.workspace_id)
        .select("*")
        .maybeSingle();
      if (error || !application)
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 },
        );

      const eggBaseUrl =
        process.env.EGG_BASE_URL || "https://egg.sooncreator.network";
      const apiKey = process.env.SOON_INTERNAL_API_KEY;
      if (!apiKey)
        return NextResponse.json(
          { error: "Egg sync is not configured" },
          { status: 503 },
        );
      const syncResponse = await fetch(`${eggBaseUrl}/api/campaigns/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-soon-api-key": apiKey,
        },
        body: JSON.stringify({
          campaign_id: result.campaign.id,
          creator_id: application.egg_creator_id,
          status: body.status,
        }),
      }).catch(() => null);
      if (!syncResponse?.ok) {
        console.error(
          "[campaign applications] Egg status sync failed",
          syncResponse?.status,
        );
        await admin
          .from("kol_campaign_applications")
          .update({
            status: previous.status,
            reviewed_at: previous.reviewed_at,
          })
          .eq("id", previous.id);
        return NextResponse.json(
          { error: "Egg status sync failed; brand status was rolled back" },
          { status: 502 },
        );
      }
      return NextResponse.json({ success: true, application });
    },
  );
}
