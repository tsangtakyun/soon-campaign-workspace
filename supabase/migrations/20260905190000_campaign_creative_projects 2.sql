create unique index if not exists idx_content_projects_campaign_variant
  on public.content_projects(campaign_id, variant_key);

comment on column public.content_projects.variant_key is
  'Stable idempotency key for one creative within a campaign iteration.';
comment on column public.content_projects.creative_role is
  'Campaign-pack role such as reel_script, hero_visual, ugc_concept, thumbnail, or paid_social_creative.';
