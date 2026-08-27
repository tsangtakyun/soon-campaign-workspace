import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createAdminSupabase,
  createServerSupabase,
} from "@/lib/server-supabase";
import { withWorkspaceAuth } from "@/lib/workspace-access";

type RouteProps = { params: Promise<{ campaignId: string }> };

export async function PATCH(req: Request, { params }: RouteProps) {
  const { campaignId } = await params;
  const body = (await req.json().catch(() => null)) as {
    kol_open?: boolean;
  } | null;
  if (typeof body?.kol_open !== "boolean") {
    return NextResponse.json(
      { error: "kol_open is required" },
      { status: 400 },
    );
  }

  const server = createServerSupabase(await cookies());
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: campaign, error } = await admin
    .from("marketing_campaigns")
    .select("id,workspace_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (error || !campaign?.workspace_id) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return withWorkspaceAuth(
    { email: user.email, userId: user.id, workspaceId: campaign.workspace_id },
    { require: "canEdit" },
    async ({ admin: scopedAdmin }) => {
      const { error: updateError } = await scopedAdmin
        .from("marketing_campaigns")
        .update({
          kol_open: body.kol_open,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id)
        .eq("workspace_id", campaign.workspace_id);
      if (updateError) {
        console.error("[campaign kol-open] update failed", updateError);
        return NextResponse.json(
          { error: "Failed to update campaign" },
          { status: 500 },
        );
      }
      return NextResponse.json({ success: true, kol_open: body.kol_open });
    },
  );
}
