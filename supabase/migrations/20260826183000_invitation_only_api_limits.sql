create table if not exists public.api_rate_limits (
  user_id uuid not null,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  primary key (user_id, action)
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;
grant all on public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_user_id uuid,
  p_action text,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if p_limit < 1 or length(coalesce(p_action, '')) > 100 then
    return false;
  end if;

  insert into public.api_rate_limits (user_id, action, window_started_at, request_count)
  values (p_user_id, p_action, now(), 1)
  on conflict (user_id, action) do update
  set
    window_started_at = case
      when api_rate_limits.window_started_at < now() - interval '1 hour' then now()
      else api_rate_limits.window_started_at
    end,
    request_count = case
      when api_rate_limits.window_started_at < now() - interval '1 hour' then 1
      else api_rate_limits.request_count + 1
    end
  returning request_count into current_count;

  return current_count <= p_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(uuid, text, integer) to service_role;
