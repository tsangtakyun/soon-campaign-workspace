-- Phase 6: Real credit system

create table if not exists user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  balance integer not null default 0,
  total_earned integer not null default 0,
  total_spent integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  type text not null check (type in ('earned', 'spent', 'refunded', 'bonus')),
  description text,
  content_type text,
  campaign_id uuid,
  created_at timestamptz default now()
);

create table if not exists user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_type text not null check (plan_type in ('trial', 'strategy-workspace', 'managed-service')),
  monthly_credit_allowance integer not null default 0,
  status text not null default 'active',
  current_period_start timestamptz default now(),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

alter table user_credits enable row level security;
alter table credit_transactions enable row level security;
alter table user_plans enable row level security;

drop policy if exists "Users can view own credits" on user_credits;
drop policy if exists "Users can view own transactions" on credit_transactions;
drop policy if exists "Users can view own plan" on user_plans;

create policy "Users can view own credits"
  on user_credits for select
  using (auth.uid() = user_id);

create policy "Users can view own transactions"
  on credit_transactions for select
  using (auth.uid() = user_id);

create policy "Users can view own plan"
  on user_plans for select
  using (auth.uid() = user_id);

create index if not exists idx_credit_transactions_user_created
  on credit_transactions(user_id, created_at desc);

create index if not exists idx_user_plans_user
  on user_plans(user_id);
