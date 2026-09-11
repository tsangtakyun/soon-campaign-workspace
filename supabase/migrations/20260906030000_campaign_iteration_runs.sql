create table if not exists public.campaign_iteration_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  source_angle_id uuid not null references public.campaign_angles(id) on delete cascade,
  iteration_number integer not null,
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  evidence_snapshot jsonb not null default '{}'::jsonb,
  variation_plan jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(campaign_id, source_angle_id, iteration_number)
);

create index if not exists idx_campaign_iteration_runs_campaign
  on public.campaign_iteration_runs(campaign_id, iteration_number desc);
alter table public.campaign_iteration_runs enable row level security;
drop policy if exists "Workspace members can read campaign iterations" on public.campaign_iteration_runs;
create policy "Workspace members can read campaign iterations" on public.campaign_iteration_runs for select using (public.is_workspace_member(workspace_id));
drop policy if exists "Workspace editors can manage campaign iterations" on public.campaign_iteration_runs;
create policy "Workspace editors can manage campaign iterations" on public.campaign_iteration_runs for all using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));

comment on table public.campaign_iteration_runs is
  'Evidence-led creative iteration runs derived from a measured winning campaign angle.';
