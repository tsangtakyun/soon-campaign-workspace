-- Configurable identity and workflow metadata for every client/IP workspace.
-- The prompt bodies themselves can be added later without changing the workspace switch.

create table if not exists public.workspace_profiles (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  slug text,
  logo_url text,
  brand_config jsonb not null default '{}'::jsonb,
  workflow_config jsonb not null default '{}'::jsonb,
  prompt_profile_key text,
  prompt_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspace_profiles_slug_unique
  on public.workspace_profiles(lower(slug))
  where slug is not null;

alter table public.workspace_profiles enable row level security;

drop policy if exists "Workspace members can read profiles" on public.workspace_profiles;
create policy "Workspace members can read profiles"
  on public.workspace_profiles for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace editors can insert profiles" on public.workspace_profiles;
create policy "Workspace editors can insert profiles"
  on public.workspace_profiles for insert
  with check (public.can_edit_workspace(workspace_id));

drop policy if exists "Workspace editors can update profiles" on public.workspace_profiles;
create policy "Workspace editors can update profiles"
  on public.workspace_profiles for update
  using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id));

drop policy if exists "Workspace editors can delete profiles" on public.workspace_profiles;
create policy "Workspace editors can delete profiles"
  on public.workspace_profiles for delete
  using (public.can_edit_workspace(workspace_id));

insert into public.workspace_profiles (workspace_id, slug, logo_url, prompt_profile_key, brand_config, workflow_config)
select
  w.id,
  case
    when lower(replace(coalesce(b.business_name, w.name), ' ', '')) like '%egg.soon%' then 'eggsoon'
    when lower(replace(coalesce(b.business_name, w.name), ' ', '')) like '%eggsoon%' then 'eggsoon'
    when lower(replace(coalesce(b.business_name, w.name), ' ', '')) like '%bunchill%' then 'bunchill'
    when lower(replace(coalesce(b.business_name, w.name), ' ', '')) like '%bechilltogether%' then 'bunchill'
    else null
  end,
  b.logo_url,
  case
    when lower(replace(coalesce(b.business_name, w.name), ' ', '')) like '%egg%' then 'egg-carousel-v1'
    when lower(replace(coalesce(b.business_name, w.name), ' ', '')) like '%bunchill%'
      or lower(replace(coalesce(b.business_name, w.name), ' ', '')) like '%bechilltogether%' then 'bunchill-content-v1'
    else 'default-content-v1'
  end,
  jsonb_build_object('displayName', coalesce(b.business_name, w.name)),
  jsonb_build_object(
    'stages', jsonb_build_array('collect', 'brief', 'format', 'produce', 'approve', 'schedule'),
    'enabled', true
  )
from public.workspaces w
left join public.brand_kits b on b.workspace_id = w.id
on conflict (workspace_id) do nothing;
