alter table public.marketing_campaigns
  add column if not exists cover_image_url text;

create index if not exists idx_marketing_campaigns_cover_image
  on public.marketing_campaigns(cover_image_url);
