-- Migration: 013_fix_blog_fk
-- Fix: blogs.created_by / updated_by were referencing auth.users(id) but backoffice
--      admins are stored in enterprise_tours.users — causes FK violation on any write.

SET search_path TO enterprise_tours;

-- Drop wrong FK constraints (names may vary; both forms covered)
ALTER TABLE blogs
  DROP CONSTRAINT IF EXISTS blogs_created_by_fkey,
  DROP CONSTRAINT IF EXISTS blogs_updated_by_fkey;

-- Re-add pointing to the correct table
ALTER TABLE blogs
  ADD CONSTRAINT blogs_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES enterprise_tours.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT blogs_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES enterprise_tours.users(id) ON DELETE SET NULL;

COMMIT;
