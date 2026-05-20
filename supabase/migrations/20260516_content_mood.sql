alter table public.content_preferences
  add column if not exists content_mood jsonb;
