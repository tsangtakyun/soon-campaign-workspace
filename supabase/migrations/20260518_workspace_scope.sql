-- Add workspace scoping to the dashboard data model.
-- Existing rows are backfilled to the user's first workspace so older data remains visible.

create extension if not exists pgcrypto;

alter table public.workspaces enable row level security;

drop policy if exists "Users own their workspaces" on public.workspaces;
create policy "Users own their workspaces"
  on public.workspaces for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

alter table public.brand_kits
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

alter table public.brand_assets
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

alter table public.content_preferences
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

alter table public.marketing_campaigns
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

alter table public.campaign_posts
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

alter table public.social_connections
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

insert into public.workspaces (name, type, owner_id, description)
select
  coalesce(nullif(trim(b.business_name), ''), '我的工作台'),
  'brand',
  b.user_id,
  b.elevator_pitch
from public.brand_kits b
where b.user_id is not null
  and not exists (
    select 1 from public.workspaces w where w.owner_id = b.user_id
  );

update public.brand_kits b
set workspace_id = (
  select w.id
  from public.workspaces w
  where w.owner_id = b.user_id
  order by w.created_at asc
  limit 1
)
where b.workspace_id is null
  and b.user_id is not null;

update public.brand_assets a
set workspace_id = b.workspace_id
from public.brand_kits b
where a.brand_kit_id = b.id
  and a.workspace_id is null
  and b.workspace_id is not null;

update public.content_preferences c
set workspace_id = (
  select w.id
  from public.workspaces w
  where w.owner_id = c.user_id
  order by w.created_at asc
  limit 1
)
where c.workspace_id is null
  and c.user_id is not null;

update public.marketing_campaigns m
set workspace_id = (
  select w.id
  from public.workspaces w
  where w.owner_id = m.user_id
  order by w.created_at asc
  limit 1
)
where m.workspace_id is null
  and m.user_id is not null;

update public.campaign_posts p
set workspace_id = m.workspace_id
from public.marketing_campaigns m
where p.campaign_id = m.id
  and p.workspace_id is null
  and m.workspace_id is not null;

update public.campaign_posts p
set workspace_id = (
  select w.id
  from public.workspaces w
  where w.owner_id = p.user_id
  order by w.created_at asc
  limit 1
)
where p.workspace_id is null
  and p.user_id is not null;

update public.social_connections s
set workspace_id = (
  select w.id
  from public.workspaces w
  where w.owner_id = s.user_id
  order by w.created_at asc
  limit 1
)
where s.workspace_id is null
  and s.user_id is not null;

alter table public.brand_kits
  drop constraint if exists brand_kits_user_id_key;

alter table public.content_preferences
  drop constraint if exists content_preferences_user_id_key;

alter table public.marketing_campaigns
  drop constraint if exists marketing_campaigns_user_id_source_key_key;

alter table public.social_connections
  drop constraint if exists social_connections_user_id_platform_key;

create unique index if not exists brand_kits_workspace_unique
  on public.brand_kits(workspace_id)
  where workspace_id is not null;

create unique index if not exists content_preferences_workspace_unique
  on public.content_preferences(workspace_id)
  where workspace_id is not null;

create unique index if not exists marketing_campaigns_workspace_source_unique
  on public.marketing_campaigns(workspace_id, source_key)
  where workspace_id is not null;

create unique index if not exists social_connections_workspace_platform_unique
  on public.social_connections(workspace_id, platform)
  where workspace_id is not null;

create index if not exists idx_brand_kits_workspace on public.brand_kits(workspace_id);
create index if not exists idx_brand_assets_workspace on public.brand_assets(workspace_id);
create index if not exists idx_content_preferences_workspace on public.content_preferences(workspace_id);
create index if not exists idx_marketing_campaigns_workspace on public.marketing_campaigns(workspace_id);
create index if not exists idx_campaign_posts_workspace on public.campaign_posts(workspace_id);
create index if not exists idx_social_connections_workspace on public.social_connections(workspace_id);
