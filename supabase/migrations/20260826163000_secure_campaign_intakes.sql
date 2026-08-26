-- All public campaign intake submissions now pass through server-side routes.
-- Keep service_role access intact while preventing browser clients from bypassing validation.
drop policy if exists "Anyone can insert campaign intakes" on public.campaign_intakes;

revoke insert on table public.campaign_intakes from anon, authenticated;
