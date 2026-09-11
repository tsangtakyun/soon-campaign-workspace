alter table public.marketing_campaigns
  add column if not exists content_pack_manifest jsonb not null default '{}'::jsonb;

comment on column public.marketing_campaigns.content_pack_manifest is
  'Recommended output plan created after campaign angle generation. It describes what to generate, not generated assets.';
