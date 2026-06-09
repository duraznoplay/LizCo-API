-- Migration: 005_blog_posts
-- Descripción: Tabla de posts del blog para el backoffice administrativo
-- Ejecutar en: Supabase SQL Editor (schema enterprise_tours)
-- Idempotente: sí (CREATE OR REPLACE + IF NOT EXISTS)
-- Precondición: Ninguna — set_updated_at se define localmente con CREATE OR REPLACE

SET search_path TO enterprise_tours;

-- ============================================================
-- Función set_updated_at (también definida en 003 con nombre
-- update_updated_at_column; se define aquí con su nombre canónico
-- para que el trigger de blog_posts no dependa del orden de
-- aplicación de migraciones — CREATE OR REPLACE es idempotente).
-- ============================================================
CREATE OR REPLACE FUNCTION enterprise_tours.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Tabla blogs (alias blog_posts en la spec HU-401)
-- ============================================================
CREATE TABLE IF NOT EXISTS blogs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  image       TEXT,
  author      TEXT        NOT NULL DEFAULT 'LizCo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blogs_slug_key UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_blogs_created_at
  ON blogs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blogs_slug
  ON blogs (slug);

-- RLS: solo service_role puede acceder (backoffice interno)
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON blogs;
CREATE POLICY "service_role_only"
  ON blogs
  USING (auth.role() = 'service_role');

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS blogs_updated_at ON blogs;
CREATE TRIGGER blogs_updated_at
  BEFORE UPDATE ON blogs
  FOR EACH ROW
  EXECUTE FUNCTION enterprise_tours.set_updated_at();

COMMENT ON TABLE blogs IS 'Posts del blog gestionados desde el backoffice administrativo LizCo';
COMMENT ON COLUMN blogs.slug IS 'URL slug único, generado automáticamente del título si no se provee';
COMMENT ON COLUMN blogs.image IS 'URL https de imagen destacada del post';
