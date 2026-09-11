-- Phase 0: bind anonymous onboarding rows to their unguessable session UUID.
-- Deploy the browser client header change before applying this migration.

create or replace function public.soon_onboarding_session_id()
returns uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when coalesce(current_setting('request.headers', true), '') = '' then null
    when nullif(current_setting('request.headers', true)::json ->> 'x-soon-onboarding-session', '')
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (current_setting('request.headers', true)::json ->> 'x-soon-onboarding-session')::uuid
    else null
  end
$$;

revoke execute on function public.soon_onboarding_session_id() from public;
grant execute on function public.soon_onboarding_session_id() to anon, authenticated, service_role;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'campaign_posts',
    'marketing_campaigns',
    'brand_kits',
    'brand_assets',
    'content_preferences',
    'designs',
    'social_connections'
  ] loop
    policy_name := format('Users own their %s', table_name);
    execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (
        (auth.uid() is not null and auth.uid() = user_id)
        or (onboarding_session_id is not null and onboarding_session_id = public.soon_onboarding_session_id())
      ) with check (
        (auth.uid() is not null and auth.uid() = user_id)
        or (onboarding_session_id is not null and onboarding_session_id = public.soon_onboarding_session_id())
      )',
      policy_name,
      table_name
    );
  end loop;
end
$$;

-- OAuth credentials remain service-side even when a browser can see the
-- connection metadata for its own workspace/onboarding session.
revoke select on table public.social_connections from anon, authenticated;
grant select (
  id,
  user_id,
  workspace_id,
  platform,
  account_name,
  account_id,
  page_id,
  token_expires_at,
  connected_at,
  onboarding_session_id
) on table public.social_connections to anon, authenticated;

notify pgrst, 'reload schema';
