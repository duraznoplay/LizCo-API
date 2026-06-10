-- Migration: Media Metadata Management
-- Create table to store metadata for S3 media assets in enterprise_tours schema

SET search_path TO enterprise_tours;

CREATE TABLE IF NOT EXISTS media_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  s3_key TEXT NOT NULL UNIQUE,
  section TEXT NOT NULL,
  slug TEXT,
  variant TEXT,
  title TEXT,
  description TEXT,
  alt_text TEXT,
  size_bytes BIGINT,
  content_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_media_metadata_section ON media_metadata(section);
CREATE INDEX IF NOT EXISTS idx_media_metadata_slug ON media_metadata(slug);
CREATE INDEX IF NOT EXISTS idx_media_metadata_section_slug ON media_metadata(section, slug);
CREATE INDEX IF NOT EXISTS idx_media_metadata_created_at ON media_metadata(created_at DESC);

-- Enable RLS
ALTER TABLE media_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS allow_select_media_metadata ON media_metadata;
CREATE POLICY allow_select_media_metadata ON media_metadata
  FOR SELECT USING (true);

DROP POLICY IF EXISTS allow_insert_media_metadata ON media_metadata;
CREATE POLICY allow_insert_media_metadata ON media_metadata
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS allow_delete_media_metadata ON media_metadata;
CREATE POLICY allow_delete_media_metadata ON media_metadata
  FOR DELETE USING (true);

DROP POLICY IF EXISTS allow_update_media_metadata ON media_metadata;
CREATE POLICY allow_update_media_metadata ON media_metadata
  FOR UPDATE USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_media_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_media_metadata_updated_at ON media_metadata;
CREATE TRIGGER set_media_metadata_updated_at
  BEFORE UPDATE ON media_metadata
  FOR EACH ROW EXECUTE FUNCTION update_media_metadata_updated_at();
