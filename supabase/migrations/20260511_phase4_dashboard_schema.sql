-- ============================================
-- Phase 4: SOON Dashboard Schema
-- Keeps the existing creator marketplace schema intact.
-- ============================================

create extension if not exists pgcrypto;

-- 1. Brand Kit
create table if not exists public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text,
  business_type text,
  website_url text,
  elevator_pitch text,
  language text default 'zh-HK',
  logo_url text,
  audience jsonb,
  content_people jsonb,
  market_positioning jsonb,
  brand_profile jsonb,
  visual_style_id text,
  visual_style_title text,
  visual_style_preview text,
  typeface_id text,
  typeface_family text,
  typeface_weight text,
  raw_website_analysis jsonb,
  raw_business_profile jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- 2. Brand Assets
create table if not exists public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_kit_id uuid references public.brand_kits(id) on delete cascade,
  asset_type text not null,
  url text not null,
  filename text,
  is_used boolean default false,
  created_at timestamptz default now(),
  unique(brand_kit_id, asset_type, url)
);

-- 3. Content Preferences
create table if not exists public.content_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channels jsonb,
  channel_ids jsonb,
  schedule jsonb,
  cross_posting boolean default false,
  content_mix jsonb,
  photo_control_id text,
  photo_control_title text,
  photo_control_preview text,
  raw_distribution jsonb,
  raw_content_mix jsonb,
  raw_photo_control jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- 4. Marketing Campaigns
create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null default 'onboarding-v1',
  name text not null,
  theme text,
  call_to_action text,
  target_link text,
  strategy_id text,
  strategy_title text,
  strategy_emoji text,
  funnel_stage text,
  starts_on date,
  duration_weeks int default 1,
  status text default 'draft',
  campaign_themes jsonb,
  topic_review jsonb,
  raw_campaign_details jsonb,
  raw_campaign_themes jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, source_key)
);

-- 5. Campaign Posts
create table if not exists public.campaign_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.marketing_campaigns(id) on delete cascade,
  source_key text not null default '',
  title text,
  body text,
  post_type text,
  scheduled_at timestamptz,
  image_url text,
  design_id text,
  canvas_json jsonb,
  captions jsonb,
  status text default 'draft',
  approved_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(campaign_id, source_key)
);

-- 6. Designs
create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.campaign_posts(id) on delete set null,
  name text default 'Untitled',
  canvas_json jsonb,
  thumbnail_url text,
  canvas_width int default 1080,
  canvas_height int default 1080,
  is_draft boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. Social Connections
create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  account_name text,
  account_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connected_at timestamptz default now(),
  unique(user_id, platform)
);

-- ============================================
-- RLS Policies
-- ============================================

alter table public.brand_kits enable row level security;
alter table public.brand_assets enable row level security;
alter table public.content_preferences enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.campaign_posts enable row level security;
alter table public.designs enable row level security;
alter table public.social_connections enable row level security;

drop policy if exists "Users own their brand_kits" on public.brand_kits;
drop policy if exists "Users own their brand_assets" on public.brand_assets;
drop policy if exists "Users own their content_preferences" on public.content_preferences;
drop policy if exists "Users own their marketing_campaigns" on public.marketing_campaigns;
drop policy if exists "Users own their campaign_posts" on public.campaign_posts;
drop policy if exists "Users own their designs" on public.designs;
drop policy if exists "Users own their social_connections" on public.social_connections;

create policy "Users own their brand_kits"
  on public.brand_kits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their brand_assets"
  on public.brand_assets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their content_preferences"
  on public.content_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their marketing_campaigns"
  on public.marketing_campaigns for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their campaign_posts"
  on public.campaign_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their designs"
  on public.designs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their social_connections"
  on public.social_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- Indexes
-- ============================================

create index if not exists idx_brand_kits_user on public.brand_kits(user_id);
create index if not exists idx_brand_assets_user on public.brand_assets(user_id);
create index if not exists idx_content_preferences_user on public.content_preferences(user_id);
create index if not exists idx_marketing_campaigns_user on public.marketing_campaigns(user_id);
create index if not exists idx_campaign_posts_user on public.campaign_posts(user_id);
create index if not exists idx_campaign_posts_campaign on public.campaign_posts(campaign_id);
create index if not exists idx_campaign_posts_scheduled on public.campaign_posts(scheduled_at);
create index if not exists idx_designs_user on public.designs(user_id);
