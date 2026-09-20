create table if not exists public.creative_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  content_project_id uuid not null references public.content_projects(id) on delete cascade,
  job_type text not null check (job_type in ('image', 'video_storyboard')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  attempt integer not null default 0,
  max_attempts integer not null default 3,
  prompt_snapshot jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(content_project_id, job_type)
);

create index if not exists idx_creative_generation_jobs_campaign
  on public.creative_generation_jobs(campaign_id, status, created_at);

alter table public.creative_generation_jobs enable row level security;

drop policy if exists "Workspace members can read creative jobs" on public.creative_generation_jobs;
create policy "Workspace members can read creative jobs" on public.creative_generation_jobs for select using (
  public.is_workspace_member(workspace_id)
);

drop policy if exists "Workspace editors can manage creative jobs" on public.creative_generation_jobs;
create policy "Workspace editors can manage creative jobs" on public.creative_generation_jobs for all using (
  public.can_edit_workspace(workspace_id)
) with check (
  public.can_edit_workspace(workspace_id)
);

comment on table public.creative_generation_jobs is
  'Retryable, independently observable asset generation work for campaign creative projects.';
