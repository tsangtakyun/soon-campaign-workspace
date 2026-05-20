alter table campaign_posts
  add column if not exists visual_style text,
  add column if not exists content_mood text[],
  add column if not exists typeface text,
  add column if not exists photo_control text;
