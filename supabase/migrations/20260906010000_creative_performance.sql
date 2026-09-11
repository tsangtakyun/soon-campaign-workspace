create table if not exists public.creative_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  campaign_angle_id uuid references public.campaign_angles(id) on delete set null,
  content_project_id uuid not null references public.content_projects(id) on delete cascade,
  campaign_post_id uuid references public.campaign_posts(id) on delete set null,
  platform text not null,
  external_media_id text,
  period_start timestamptz,
  period_end timestamptz not null,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  engagements bigint not null default 0,
  conversions numeric not null default 0,
  spend numeric not null default 0,
  raw_metrics jsonb not null default '{}'::jsonb,
  source text not null default 'platform_sync',
  created_at timestamptz not null default now(),
  unique(content_project_id, platform, period_end)
);

create index if not exists idx_creative_performance_campaign_angle
  on public.creative_performance_snapshots(campaign_id, campaign_angle_id, period_end desc);

alter table public.creative_performance_snapshots enable row level security;
drop policy if exists "Workspace members can read creative performance" on public.creative_performance_snapshots;
create policy "Workspace members can read creative performance" on public.creative_performance_snapshots for select using (public.is_workspace_member(workspace_id));
drop policy if exists "Workspace editors can manage creative performance" on public.creative_performance_snapshots;
create policy "Workspace editors can manage creative performance" on public.creative_performance_snapshots for all using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));

comment on table public.creative_performance_snapshots is
  'Platform metric snapshots attributed to a post, creative project, campaign, and test angle.';
