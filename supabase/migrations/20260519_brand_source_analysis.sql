create table if not exists public.brand_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  url text not null,
  type text not null default 'website',
  status text not null default 'pending' check (status in ('pending', 'scanning', 'done', 'error')),
  last_scanned_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_brand_sources_workspace
  on public.brand_sources(workspace_id);

create table if not exists public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_name text,
  business_overview text,
  market_positioning jsonb,
  competitors jsonb,
  competitive_advantages jsonb,
  customer_segments jsonb,
  updated_at timestamptz not null default now(),
  unique(workspace_id)
);

create table if not exists public.brand_voices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  purpose text,
  audience text,
  tone jsonb,
  emotion jsonb,
  character jsonb,
  syntax jsonb,
  language jsonb,
  updated_at timestamptz not null default now(),
  unique(workspace_id)
);

alter table public.workspaces
  add column if not exists logo_url text,
  add column if not exists visual_style text,
  add column if not exists font_style text,
  add column if not exists visual_identity_description text,
  add column if not exists brand_colors jsonb;

create unique index if not exists brand_assets_workspace_asset_url_unique
  on public.brand_assets(workspace_id, asset_type, url)
  where workspace_id is not null;

alter table public.brand_sources enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.brand_voices enable row level security;

drop policy if exists "brand_sources_workspace_owner_select" on public.brand_sources;
create policy "brand_sources_workspace_owner_select"
  on public.brand_sources for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = brand_sources.workspace_id
        and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = brand_sources.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

drop policy if exists "brand_profiles_workspace_owner_select" on public.brand_profiles;
create policy "brand_profiles_workspace_owner_select"
  on public.brand_profiles for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = brand_profiles.workspace_id
        and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = brand_profiles.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );

drop policy if exists "brand_voices_workspace_owner_select" on public.brand_voices;
create policy "brand_voices_workspace_owner_select"
  on public.brand_voices for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = brand_voices.workspace_id
        and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = brand_voices.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );
