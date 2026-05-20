alter table brand_kits
  add column if not exists typeface_direction text,
  add column if not exists typeface_name text,
  add column if not exists typeface_name_en text,
  add column if not exists typeface_cdn_url text;
