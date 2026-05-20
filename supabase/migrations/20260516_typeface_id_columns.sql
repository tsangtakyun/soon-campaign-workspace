alter table brand_kits
  add column if not exists typeface_direction varchar,
  add column if not exists typeface_id varchar;
