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

  const access = await getWorkspaceAccess({
    email: user.email,
    userId: user.id,
    workspaceId: campaign.workspace_id,
  });
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    return NextResponse.json({ error: "Failed to load campaign details" }, { status: 500 });
  }
  return NextResponse.json({ campaign, posts: posts || [], connections: connections || [] });
}
