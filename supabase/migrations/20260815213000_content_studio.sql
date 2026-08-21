create table if not exists public.workspace_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default 'Content workflow',
  version integer not null default 1,
  brief_prompt text not null default '',
  format_prompt text not null default '',
  production_prompt text not null default '',
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, version)
);

create table if not exists public.content_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  topic_idea_id uuid references public.workspace_topic_ideas(id) on delete set null,
  prompt_version_id uuid references public.workspace_prompt_versions(id) on delete set null,
  title text not null,
  source_url text,
  source_name text,
  source_note text,
  stage text not null default 'brief' check (stage in ('brief', 'format', 'production', 'approval', 'scheduled', 'archived')),
  selected_format text,
  brief jsonb not null default '{}'::jsonb,
  format_decision jsonb not null default '{}'::jsonb,
  production jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_projects_workspace_stage
  on public.content_projects(workspace_id, stage, updated_at desc);

alter table public.workspace_prompt_versions enable row level security;
alter table public.content_projects enable row level security;

-- Raw prompts are owner-only. Admins and members execute them through server APIs.
drop policy if exists "Workspace owners manage prompts" on public.workspace_prompt_versions;
create policy "Workspace owners manage prompts"
  on public.workspace_prompt_versions for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

drop policy if exists "Workspace members read content projects" on public.content_projects;
create policy "Workspace members read content projects"
  on public.content_projects for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace editors create content projects" on public.content_projects;
create policy "Workspace editors create content projects"
  on public.content_projects for insert
  with check (public.can_edit_workspace(workspace_id));

drop policy if exists "Workspace editors update content projects" on public.content_projects;
create policy "Workspace editors update content projects"
  on public.content_projects for update
  using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id));

drop policy if exists "Workspace editors delete content projects" on public.content_projects;
create policy "Workspace editors delete content projects"
  on public.content_projects for delete
  using (public.can_edit_workspace(workspace_id));

insert into public.workspace_prompt_versions (
  workspace_id, name, version, config, is_active
)
select
  wp.workspace_id,
  case
    when wp.prompt_profile_key = 'egg-carousel-v1' then 'Egg.soon Carousel Workflow'
    when wp.prompt_profile_key = 'bunchill-content-v1' then 'Bunchill Content Workflow'
    else 'Standard Content Workflow'
  end,
  1,
  jsonb_build_object('profileKey', coalesce(wp.prompt_profile_key, 'default-content-v1')),
  true
from public.workspace_profiles wp
on conflict (workspace_id, version) do nothing;
