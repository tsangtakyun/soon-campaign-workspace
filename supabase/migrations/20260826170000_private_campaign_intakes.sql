-- campaign_intakes contains contact and campaign details and is server-only.
-- RLS already denies browser access; remove the underlying grants as defence in depth.
revoke all on table public.campaign_intakes from anon, authenticated;
