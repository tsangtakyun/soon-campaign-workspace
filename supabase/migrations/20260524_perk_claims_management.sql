ALTER TABLE perk_claims
ADD COLUMN IF NOT EXISTS brand_notes text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS claimed_at timestamptz DEFAULT now();
