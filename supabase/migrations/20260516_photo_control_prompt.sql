alter table public.content_preferences
  add column if not exists photo_control_prompt text;
