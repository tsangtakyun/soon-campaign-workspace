-- ============================================
-- Phase 6: Instagram OAuth connections
-- Supports public onboarding session connections and later user claim.
-- ============================================

alter table public.social_connections
  alter column user_id drop not null,
  add column if not exists onboarding_session_id uuid,
  add column if not exists page_id text,
  add column if not exists page_access_token text;

drop index if exists public.social_connections_session_platform;
drop index if exists public.social_connections_user_platform;

alter table public.social_connections
  drop constraint if exists social_connections_user_id_platform_key,
  drop constraint if exists social_connections_session_platform_key,
  drop constraint if exists social_connections_user_platform_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'social_connections_session_platform_key'
  ) then
    alter table public.social_connections
      add constraint social_connections_session_platform_key unique (onboarding_session_id, platform);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'social_connections_user_platform_key'
  ) then
    alter table public.social_connections
      add constraint social_connections_user_platform_key unique (user_id, platform);
  end if;
end $$;

create index if not exists idx_social_connections_session
  on public.social_connections(onboarding_session_id);

drop policy if exists "Users own their social_connections" on public.social_connections;

create policy "Users own their social_connections"
  on public.social_connections for all
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  )
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or onboarding_session_id is not null
  );
