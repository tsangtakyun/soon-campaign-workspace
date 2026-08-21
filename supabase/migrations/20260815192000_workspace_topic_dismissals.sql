create table if not exists public.workspace_topic_idea_dismissals (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  idea_id text not null,
  dismissed_by uuid references auth.users(id) on delete set null,
  dismissed_at timestamptz not null default now(),
  primary key (workspace_id, idea_id)
);

create index if not exists idx_workspace_topic_dismissals_workspace
  on public.workspace_topic_idea_dismissals(workspace_id);

alter table public.workspace_topic_idea_dismissals enable row level security;

drop policy if exists "workspace_topic_dismissals_member_select" on public.workspace_topic_idea_dismissals;
create policy "workspace_topic_dismissals_member_select"
  on public.workspace_topic_idea_dismissals for select
  using (
    exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_topic_idea_dismissals.workspace_id
        and wm.status = 'active'
        and (wm.user_id = auth.uid() or lower(wm.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    )
  );
