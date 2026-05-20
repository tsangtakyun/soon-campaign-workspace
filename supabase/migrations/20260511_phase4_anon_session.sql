-- ============================================
-- Phase 4: Anonymous onboarding persistence
-- Public onboarding can persist by session id, then claim after auth.
-- ============================================

alter table public.brand_kits
  alter column user_id drop not null,
  add column if not exists onboarding_session_id uuid,
  add column if not exists claimed_at timestamptz;

alter table public.brand_assets
  alter column user_id drop not null,
  add column if not exists onboarding_session_id uuid;

alter table public.content_preferences
  alter column user_id drop not null,
  add column if not exists onboarding_session_id uuid,
  add column if not exists claimed_at timestamptz;

alter table public.marketing_campaigns
  alter column user_id drop not null,
  add column if not exists onboarding_session_id uuid,
  add column if not exists claimed_at timestamptz;

alter table public.campaign_posts
  alter column user_id drop not null,
  add column if not exists onboarding_session_id uuid;

alter table public.designs
  alter column user_id drop not null,
  add column if not exists onboarding_session_id uuid;

create index if not exists idx_brand_kits_session on public.brand_kits(onboarding_session_id);
create index if not exists idx_brand_assets_session on public.brand_assets(onboarding_session_id);
create index if not exists idx_content_preferences_session on public.content_preferences(onboarding_session_id);
create index if not exists idx_marketing_campaigns_session on public.marketing_campaigns(onboarding_session_id);
create index if not exists idx_campaign_posts_session on public.campaign_posts(onboarding_session_id);
create index if not exists idx_designs_session on public.designs(onboarding_session_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'brand_kits_session_unique'
  ) then
    alter table public.brand_kits
      add constraint brand_kits_session_unique unique (onboarding_session_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'content_preferences_session_unique'
  ) then
    alter table public.content_preferences
      add constraint content_preferences_session_unique unique (onboarding_session_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'marketing_campaigns_session_source_unique'
  ) then
    alter table public.marketing_campaigns
      add constraint marketing_campaigns_session_source_unique unique (onboarding_session_id, source_key);
  end if;
end $$;

drop policy if exists "Users own their brand_kits" on public.brand_kits;
drop policy if exists "Users own their brand_assets" on public.brand_assets;
drop policy if exists "Users own their content_preferences" on public.content_preferences;
drop policy if exists "Users own their marketing_campaigns" on public.marketing_campaigns;
drop policy if exists "Users own their campaign_posts" on public.campaign_posts;
drop policy if exists "Users own their designs" on public.designs;

create policy "Users own their brand_kits"
  on public.brand_kits for all
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  )
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  );

create policy "Users own their brand_assets"
  on public.brand_assets for all
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  )
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  );

create policy "Users own their content_preferences"
  on public.content_preferences for all
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  )
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  );

create policy "Users own their marketing_campaigns"
  on public.marketing_campaigns for all
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  )
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  );

create policy "Users own their campaign_posts"
  on public.campaign_posts for all
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  )
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  );

create policy "Users own their designs"
  on public.designs for all
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  )
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  );
