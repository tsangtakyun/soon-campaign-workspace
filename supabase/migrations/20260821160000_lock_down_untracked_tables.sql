-- These legacy tables are server-only. They are not consumed directly by either application.
alter table if exists public.perk_claims enable row level security;
revoke all on table public.perk_claims from anon, authenticated;

alter table if exists public.brand_perks enable row level security;
revoke all on table public.brand_perks from anon, authenticated;

alter table if exists public.kol_campaign_applications enable row level security;
revoke all on table public.kol_campaign_applications from anon, authenticated;

alter table if exists public.project_briefs enable row level security;
revoke all on table public.project_briefs from anon, authenticated;

alter table if exists public.workspace_notifications enable row level security;
revoke all on table public.workspace_notifications from anon, authenticated;
