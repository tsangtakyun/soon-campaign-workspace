import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createAdminSupabase, createServerSupabase } from "@/lib/server-supabase";
import { getWorkspaceAccess } from "@/lib/workspace-access";

type RouteProps = { params: Promise<{ campaignId: string }> };

export async function GET(_req: Request, { params }: RouteProps) {
  const { campaignId } = await params;
  const server = createServerSupabase(await cookies());
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: campaign, error: campaignError } = await admin
    .from("marketing_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (campaignError || !campaign?.workspace_id) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Legacy campaigns already carry their creator/owner in user_id. Avoid a
  // second membership lookup for that owner; other users still require an
  // active workspace membership.
  if (campaign.user_id !== user.id) {
    try {
      const access = await getWorkspaceAccess({
        email: user.email,
        userId: user.id,
        workspaceId: campaign.workspace_id,
      });
      if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } catch (error) {
      console.error("[campaign detail] workspace access lookup failed", {
        campaignId,
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
      });
      return NextResponse.json({ error: "Workspace access temporarily unavailable" }, { status: 503 });
    }
  }

  const [{ data: posts, error: postsError }, { data: connections, error: connectionsError }] =
    await Promise.all([
      admin
        .from("campaign_posts")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("workspace_id", campaign.workspace_id)
        .order("scheduled_at", { ascending: true }),
      admin
        .from("social_connections")
        .select("id,platform,account_name")
        .eq("workspace_id", campaign.workspace_id)
        .in("platform", ["instagram", "facebook", "threads"]),
    ]);

  if (postsError || connectionsError) {
    console.error("[campaign detail] related data query failed", {
      campaignId,
      connectionsError: connectionsError?.message,
      postsError: postsError?.message,
    });
    return NextResponse.json({ error: "Failed to load campaign details" }, { status: 500 });
  }
  return NextResponse.json({ campaign, posts: posts || [], connections: connections || [] });
}
