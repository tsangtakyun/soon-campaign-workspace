alter table public.brand_assets
  add column if not exists source_url text;

create index if not exists idx_brand_assets_workspace_source_url
  on public.brand_assets(workspace_id, source_url)
  where source_url is not null;
