create table if not exists public.onboarding_drafts (
  id uuid primary key default gen_random_uuid(),
  onboarding_session_id uuid not null unique,
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onboarding_drafts_user_id_idx
  on public.onboarding_drafts(user_id);

create index if not exists onboarding_drafts_workspace_id_idx
  on public.onboarding_drafts(workspace_id);

alter table public.onboarding_drafts enable row level security;

revoke all on table public.onboarding_drafts from anon, authenticated;
grant all on table public.onboarding_drafts to service_role;
