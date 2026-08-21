create table if not exists public.workspace_topic_ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  source text not null,
  source_url text not null,
  image_url text,
  height text not null default 'medium' check (height in ('short', 'medium', 'tall')),
  category text not null default 'Trending 最新資訊',
  tags jsonb not null default '[]'::jsonb,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_topic_ideas_workspace_created
  on public.workspace_topic_ideas(workspace_id, created_at desc);

create unique index if not exists workspace_topic_ideas_workspace_source_unique
  on public.workspace_topic_ideas(workspace_id, source_url);

alter table public.workspace_topic_ideas enable row level security;

drop policy if exists "workspace_topic_ideas_member_select" on public.workspace_topic_ideas;
create policy "workspace_topic_ideas_member_select"
  on public.workspace_topic_ideas for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_topic_ideas.workspace_id
        and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_topic_ideas.workspace_id
        and wm.status = 'active'
        and (
          wm.user_id = auth.uid()
          or lower(wm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

drop policy if exists "workspace_topic_ideas_member_insert" on public.workspace_topic_ideas;
create policy "workspace_topic_ideas_member_insert"
  on public.workspace_topic_ideas for insert
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_topic_ideas.workspace_id
        and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_topic_ideas.workspace_id
        and wm.status = 'active'
        and (
          wm.user_id = auth.uid()
          or lower(wm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

drop policy if exists "workspace_topic_ideas_member_update" on public.workspace_topic_ideas;
create policy "workspace_topic_ideas_member_update"
  on public.workspace_topic_ideas for update
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_topic_ideas.workspace_id
        and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_topic_ideas.workspace_id
        and wm.status = 'active'
        and wm.user_id = auth.uid()
    )
  );

drop policy if exists "workspace_topic_ideas_member_delete" on public.workspace_topic_ideas;
create policy "workspace_topic_ideas_member_delete"
  on public.workspace_topic_ideas for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.workspaces w
      where w.id = workspace_topic_ideas.workspace_id
        and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_topic_ideas.workspace_id
        and wm.status = 'active'
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );
