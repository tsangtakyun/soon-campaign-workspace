create table if not exists public.content_preference_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_project_id uuid references public.content_projects(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('selected','changed','rejected','edited','approved','published','performed')),
  dimension text not null check (dimension in ('format','template','production_method','copy','design')),
  value text not null,
  previous_value text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists content_preference_events_workspace_created_idx
  on public.content_preference_events(workspace_id, created_at desc);
create index if not exists content_preference_events_project_idx
  on public.content_preference_events(content_project_id);

alter table public.content_preference_events enable row level security;

drop policy if exists "content preference member read" on public.content_preference_events;
create policy "content preference member read" on public.content_preference_events
  for select to authenticated using (
    exists(select 1 from public.workspace_members m where m.workspace_id=content_preference_events.workspace_id and m.user_id=auth.uid() and m.status='active')
    or exists(select 1 from public.workspaces w where w.id=content_preference_events.workspace_id and w.owner_id=auth.uid())
  );

drop policy if exists "content preference editor insert" on public.content_preference_events;
create policy "content preference editor insert" on public.content_preference_events
  for insert to authenticated with check (
    actor_id=auth.uid() and (
      exists(select 1 from public.workspace_members m where m.workspace_id=content_preference_events.workspace_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin','member'))
      or exists(select 1 from public.workspaces w where w.id=content_preference_events.workspace_id and w.owner_id=auth.uid())
    )
  );
