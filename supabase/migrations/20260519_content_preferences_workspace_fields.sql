alter table public.workspaces
  add column if not exists avoided_keywords jsonb default '[]'::jsonb,
  add column if not exists market_locations jsonb default '[]'::jsonb,
  add column if not exists audience_gender text default '全部性別',
  add column if not exists content_persona_age text default '不限',
  add column if not exists content_persona_gender text default '全部性別',
  add column if not exists content_persona_ethnicity text default '不限';
