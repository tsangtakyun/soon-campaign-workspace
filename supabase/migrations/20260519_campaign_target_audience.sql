alter table public.marketing_campaigns
  add column if not exists target_audience text;
