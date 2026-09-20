alter table public.marketing_campaigns
  add column if not exists delivery_manifest jsonb not null default '{}'::jsonb;

comment on column public.marketing_campaigns.delivery_manifest is
  'Approval, packaging, and publishing readiness snapshot for a generated campaign.';
