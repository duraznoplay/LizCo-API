-- Migration: 006_packages_admin_fields
-- Description: Enrich the packages (catalog) table with admin content fields
-- Target schema: enterprise_tours
-- Idempotent: yes (IF NOT EXISTS on all additions)

SET search_path TO enterprise_tours;

-- Add missing fields to packages table
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS features TEXT[],
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure updated_at trigger function exists (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger on packages
DROP TRIGGER IF EXISTS set_packages_updated_at ON packages;
CREATE TRIGGER set_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN packages.description IS 'Long-form package description';
COMMENT ON COLUMN packages.features IS 'Array of feature/amenity strings';
COMMENT ON COLUMN packages.image IS 'Primary image URL (https)';
COMMENT ON COLUMN packages.updated_at IS 'Auto-maintained by trigger';
