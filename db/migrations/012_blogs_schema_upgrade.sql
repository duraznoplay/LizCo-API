-- Migration: Upgrade blogs table schema for Phase 1
-- Adds status management, SEO fields, and soft-delete support
-- Created: 2026-06-10

SET search_path TO enterprise_tours;

-- Add new columns to blogs table
ALTER TABLE blogs
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS meta_description VARCHAR(160),
  ADD COLUMN IF NOT EXISTS meta_keywords VARCHAR(500),
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_featured ON blogs(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_blogs_deleted_at ON blogs(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blogs_created_by ON blogs(created_by);
CREATE INDEX IF NOT EXISTS idx_blogs_updated_by ON blogs(updated_by);

-- Update trigger to automatically set updated_at
CREATE OR REPLACE FUNCTION enterprise_tours.update_blogs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_blogs_updated_at ON blogs;
CREATE TRIGGER set_blogs_updated_at
  BEFORE UPDATE ON blogs
  FOR EACH ROW EXECUTE FUNCTION enterprise_tours.update_blogs_updated_at();

-- RLS Policy: Allow admins to manage all blogs, soft-deleted or not
DROP POLICY IF EXISTS allow_admin_blogs ON blogs;
CREATE POLICY allow_admin_blogs ON blogs
  FOR ALL
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'staff') OR
    auth.uid() = created_by
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'staff') OR
    auth.uid() = created_by
  );

-- RLS Policy: Allow public (frontend) to view published non-deleted blogs only
DROP POLICY IF EXISTS allow_select_published_blogs ON blogs;
CREATE POLICY allow_select_published_blogs ON blogs
  FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

COMMIT;
