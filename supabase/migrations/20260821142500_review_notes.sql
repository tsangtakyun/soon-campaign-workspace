create table if not exists public.review_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.content_projects(id) on delete cascade,
  post_id uuid references public.campaign_posts(id) on delete cascade,
  page_number integer,
  original_text text not null,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer text,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  check (project_id is not null or post_id is not null)
);

create index if not exists idx_review_notes_workspace_created
  on public.review_notes(workspace_id, created_at desc);

alter table public.review_notes enable row level security;
drop policy if exists "Workspace members read review notes" on public.review_notes;
create policy "Workspace members read review notes" on public.review_notes for select
  using (public.is_workspace_member(workspace_id));
