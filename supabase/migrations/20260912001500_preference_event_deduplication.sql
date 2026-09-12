alter table public.content_preference_events add column if not exists dedupe_key text;
create unique index if not exists content_preference_events_dedupe_key_idx
  on public.content_preference_events(dedupe_key)
  where dedupe_key is not null;
