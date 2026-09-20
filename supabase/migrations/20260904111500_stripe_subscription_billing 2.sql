-- Stripe subscription state and idempotent credit grants.

alter table public.user_plans
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists last_credit_reference text;

create unique index if not exists user_plans_stripe_subscription_unique
  on public.user_plans (stripe_subscription_id)
  where stripe_subscription_id is not null;

create unique index if not exists credit_transactions_stripe_grant_unique
  on public.credit_transactions (user_id, description)
  where content_type = 'stripe-credit-grant';

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('completed', 'ignored')),
  created_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from anon, authenticated;
grant all on table public.stripe_webhook_events to service_role;

create or replace function public.apply_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_user_id uuid,
  p_plan_type text,
  p_status text,
  p_customer_id text,
  p_subscription_id text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_credit_reference text default null,
  p_credit_allowance integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_event_count integer := 0;
  should_credit boolean := false;
  next_balance integer := 0;
begin
  if p_event_id is null or p_event_id = '' then
    raise exception 'Missing Stripe event id';
  end if;

  insert into public.stripe_webhook_events (event_id, event_type, user_id, status)
  values (p_event_id, p_event_type, p_user_id, case when p_user_id is null then 'ignored' else 'completed' end)
  on conflict (event_id) do nothing;
  get diagnostics inserted_event_count = row_count;

  if inserted_event_count = 0 then
    return jsonb_build_object('duplicate', true, 'credited', false);
  end if;

  if p_user_id is null then
    return jsonb_build_object('duplicate', false, 'credited', false, 'ignored', true);
  end if;

  if p_credit_allowance > 0 and p_credit_reference is not null then
    select not exists (
      select 1 from public.credit_transactions
      where user_id = p_user_id
        and content_type = 'stripe-credit-grant'
        and description = p_credit_reference
    ) into should_credit;
  end if;

  insert into public.user_plans (
    user_id,
    plan_type,
    monthly_credit_allowance,
    status,
    current_period_start,
    current_period_end,
    stripe_customer_id,
    stripe_subscription_id,
    last_credit_reference,
    updated_at
  ) values (
    p_user_id,
    p_plan_type,
    p_credit_allowance,
    p_status,
    p_period_start,
    p_period_end,
    p_customer_id,
    p_subscription_id,
    case when p_credit_allowance > 0 then p_credit_reference else null end,
    now()
  )
  on conflict (user_id) do update set
    plan_type = excluded.plan_type,
    monthly_credit_allowance = excluded.monthly_credit_allowance,
    status = excluded.status,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    last_credit_reference = case
      when p_credit_allowance > 0
        and p_credit_reference is distinct from public.user_plans.last_credit_reference
        then p_credit_reference
      else public.user_plans.last_credit_reference
    end,
    updated_at = now();

  if should_credit then
    insert into public.user_credits (user_id, balance, total_earned, total_spent, updated_at)
    values (p_user_id, p_credit_allowance, p_credit_allowance, 0, now())
    on conflict (user_id) do update set
      balance = public.user_credits.balance + p_credit_allowance,
      total_earned = public.user_credits.total_earned + p_credit_allowance,
      updated_at = now()
    returning balance into next_balance;

    insert into public.credit_transactions (user_id, amount, type, description, content_type)
    values (p_user_id, p_credit_allowance, 'earned', p_credit_reference, 'stripe-credit-grant');
  end if;

  return jsonb_build_object(
    'duplicate', false,
    'credited', should_credit,
    'balance', case when should_credit then next_balance else null end
  );
end;
$$;

revoke all on function public.apply_stripe_subscription_event(text, text, uuid, text, text, text, text, timestamptz, timestamptz, text, integer) from public, anon, authenticated;
grant execute on function public.apply_stripe_subscription_event(text, text, uuid, text, text, text, text, timestamptz, timestamptz, text, integer) to service_role;
