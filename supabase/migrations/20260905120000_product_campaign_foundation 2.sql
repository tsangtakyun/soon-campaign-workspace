-- Product-led campaign foundation.
-- Additive only: legacy onboarding campaigns and source_key relationships remain valid.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null default 'product'
    check (kind in ('product', 'service', 'offer')),
  name text not null,
  source_url text,
  description text,
  price_label text,
  currency text,
  selling_points jsonb not null default '[]'::jsonb,
  target_audiences jsonb not null default '[]'::jsonb,
  claims jsonb not null default '[]'::jsonb,
  restrictions jsonb not null default '[]'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  asset_type text not null default 'reference'
    check (asset_type in ('original', 'reference', 'logo', 'packaging', 'service', 'generated')),
  url text not null,
  storage_path text,
  filename text,
  mime_type text,
  width integer,
  height integer,
  metadata jsonb not null default '{}'::jsonb,
  is_primary boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.marketing_campaigns
  add column if not exists campaign_type text not null default 'brand_content',
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists objective text,
  add column if not exists primary_metric text,
  add column if not exists hypothesis text,
  add column if not exists measurement_plan jsonb not null default '{}'::jsonb,
  add column if not exists iteration_number integer not null default 1,
  add column if not exists parent_campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  add column if not exists generation_status text not null default 'not_started';

create table if not exists public.campaign_angles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  name text not null,
  hook text,
  audience_tension text,
  promise text,
  proof_mechanism text,
  rationale text,
  funnel_stage text,
  recommended_formats jsonb not null default '[]'::jsonb,
  strategy_refs jsonb not null default '[]'::jsonb,
  claim_risks jsonb not null default '[]'::jsonb,
  primary_metric text,
  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'rejected', 'testing', 'paused', 'winner', 'archived')),
  sort_order integer not null default 0,
  iteration_number integer not null default 1,
  parent_angle_id uuid references public.campaign_angles(id) on delete set null,
  generation_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_projects
  add column if not exists campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  add column if not exists campaign_angle_id uuid references public.campaign_angles(id) on delete set null,
  add column if not exists variant_key text,
  add column if not exists creative_role text,
  add column if not exists generation_recipe jsonb not null default '{}'::jsonb,
  add column if not exists parent_project_id uuid references public.content_projects(id) on delete set null;

alter table public.campaign_posts
  add column if not exists content_project_id uuid references public.content_projects(id) on delete set null,
  add column if not exists campaign_angle_id uuid references public.campaign_angles(id) on delete set null;

create index if not exists idx_products_workspace_status
  on public.products(workspace_id, status, updated_at desc);
create index if not exists idx_product_assets_product
  on public.product_assets(product_id, is_primary desc, created_at);
create unique index if not exists idx_product_assets_one_primary
  on public.product_assets(product_id) where is_primary;
create index if not exists idx_marketing_campaigns_product
  on public.marketing_campaigns(product_id, created_at desc) where product_id is not null;
create index if not exists idx_campaign_angles_campaign
  on public.campaign_angles(campaign_id, sort_order, created_at);
create index if not exists idx_campaign_angles_parent
  on public.campaign_angles(parent_angle_id) where parent_angle_id is not null;
create index if not exists idx_content_projects_campaign_angle
  on public.content_projects(campaign_id, campaign_angle_id, updated_at desc);
create index if not exists idx_campaign_posts_content_project
  on public.campaign_posts(content_project_id) where content_project_id is not null;
create index if not exists idx_campaign_posts_angle
  on public.campaign_posts(campaign_angle_id) where campaign_angle_id is not null;

alter table public.products enable row level security;
alter table public.product_assets enable row level security;
alter table public.campaign_angles enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['products', 'product_assets', 'campaign_angles']
  loop
    execute format('drop policy if exists "Workspace members can read" on public.%I', table_name);
    execute format('drop policy if exists "Workspace editors can insert" on public.%I', table_name);
    execute format('drop policy if exists "Workspace editors can update" on public.%I', table_name);
    execute format('drop policy if exists "Workspace editors can delete" on public.%I', table_name);

    execute format(
      'create policy "Workspace members can read" on public.%I for select using (public.is_workspace_member(workspace_id))',
      table_name
    );
    execute format(
      'create policy "Workspace editors can insert" on public.%I for insert with check (public.can_edit_workspace(workspace_id))',
      table_name
    );
    execute format(
      'create policy "Workspace editors can update" on public.%I for update using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id))',
      table_name
    );
    execute format(
      'create policy "Workspace editors can delete" on public.%I for delete using (public.can_edit_workspace(workspace_id))',
      table_name
    );
  end loop;
end $$;

grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_assets to authenticated;
grant select, insert, update, delete on public.campaign_angles to authenticated;

comment on table public.products is
  'Workspace-owned products, services, and offers that can be promoted across multiple campaigns.';
comment on table public.campaign_angles is
  'Stable campaign hypotheses used to connect creative production with performance results.';
comment on column public.marketing_campaigns.campaign_type is
  'Canonical campaign classification. Existing rows default to brand_content.';
comment on column public.content_projects.campaign_angle_id is
  'The angle this creative is testing; required for future performance attribution.';
