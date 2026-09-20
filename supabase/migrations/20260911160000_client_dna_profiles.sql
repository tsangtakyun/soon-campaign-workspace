create table if not exists public.client_dna_profiles (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  primary_industry_code text not null,
  secondary_industry_codes text[] not null default '{}',
  campaign_objectives text[] not null default '{}',
  audience_summary text,
  brand_tone text[] not null default '{}',
  preferred_formats text[] not null default '{}',
  restrictions text[] not null default '{}',
  profile_status text not null default 'draft' check (profile_status in ('draft','confirmed')),
  profile_version integer not null default 1,
  inferred_from jsonb not null default '{}'::jsonb,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.client_dna_profiles enable row level security;
drop policy if exists "client dna member read" on public.client_dna_profiles;
create policy "client dna member read" on public.client_dna_profiles for select to authenticated using (exists(select 1 from public.workspace_members m where m.workspace_id=client_dna_profiles.workspace_id and m.user_id=auth.uid() and m.status='active') or exists(select 1 from public.workspaces w where w.id=client_dna_profiles.workspace_id and w.owner_id=auth.uid()));
drop policy if exists "client dna manager write" on public.client_dna_profiles;
create policy "client dna manager write" on public.client_dna_profiles for all to authenticated using (exists(select 1 from public.workspace_members m where m.workspace_id=client_dna_profiles.workspace_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')) or exists(select 1 from public.workspaces w where w.id=client_dna_profiles.workspace_id and w.owner_id=auth.uid())) with check (exists(select 1 from public.workspace_members m where m.workspace_id=client_dna_profiles.workspace_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')) or exists(select 1 from public.workspaces w where w.id=client_dna_profiles.workspace_id and w.owner_id=auth.uid()));

insert into public.client_dna_profiles(workspace_id,primary_industry_code,audience_summary,inferred_from)
select w.id,
  case
    when lower(coalesce(bp.business_overview,'')||' '||coalesce(w.description,'')||' '||coalesce(w.name,'')) ~ '餐飲|餐廳|食品|food|restaurant' then 'food_beverage'
    when lower(coalesce(bp.business_overview,'')||' '||coalesce(w.description,'')||' '||coalesce(w.name,'')) ~ '旅遊|酒店|travel|hotel' then 'travel_experience'
    when lower(coalesce(bp.business_overview,'')||' '||coalesce(w.description,'')||' '||coalesce(w.name,'')) ~ '健身|運動|復康|fitness|sport' then 'sports_wellness'
    when lower(coalesce(bp.business_overview,'')||' '||coalesce(w.description,'')||' '||coalesce(w.name,'')) ~ '家居|家電|裝修|home|furniture' then 'home_living'
    when lower(coalesce(bp.business_overview,'')||' '||coalesce(w.description,'')||' '||coalesce(w.name,'')) ~ '醫美|診所|保健|medical|clinic' then 'medical_aesthetics_wellness'
    when lower(coalesce(bp.business_overview,'')||' '||coalesce(w.description,'')||' '||coalesce(w.name,'')) ~ '美容|美妝|護膚|化妝|beauty|cosmetic' then 'beauty_cosmetics'
    else 'trend_culture'
  end,
  null,
  jsonb_build_object('business_overview',bp.business_overview,'description',w.description,'source','existing_workspace')
from public.workspaces w
left join public.brand_profiles bp on bp.workspace_id=w.id
on conflict (workspace_id) do nothing;
