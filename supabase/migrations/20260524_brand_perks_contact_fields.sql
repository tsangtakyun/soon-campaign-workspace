ALTER TABLE brand_perks
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS contact_email text;
