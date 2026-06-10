-- Migration: 003_backoffice_admin_packages
-- Descripción: Tabla de paquetes para el backoffice administrativo
-- Ejecutar en: Supabase SQL Editor (schema enterprise_tours)
-- Idempotente: sí (IF NOT EXISTS)

SET search_path TO enterprise_tours;

CREATE TABLE IF NOT EXISTS backoffice_packages (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT           NOT NULL,
  description TEXT,
  price       NUMERIC(10,2)  NOT NULL DEFAULT 0,
  features    TEXT[],
  image       TEXT,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Índice para paginación por fecha de creación (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_backoffice_packages_created_at
  ON backoffice_packages (created_at DESC);

-- RLS: solo service_role puede acceder (backoffice interno)
ALTER TABLE backoffice_packages ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY no soporta IF NOT EXISTS en ninguna versión de PostgreSQL.
-- Usar DROP ... IF EXISTS + CREATE para idempotencia.
DROP POLICY IF EXISTS "service_role_only" ON backoffice_packages;
CREATE POLICY "service_role_only"
  ON backoffice_packages
  USING (auth.role() = 'service_role');

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_backoffice_packages_updated_at ON backoffice_packages;
CREATE TRIGGER set_backoffice_packages_updated_at
  BEFORE UPDATE ON backoffice_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE backoffice_packages IS 'Paquetes de tours gestionados desde el backoffice administrativo LizCo';
COMMENT ON COLUMN backoffice_packages.price IS 'Precio base en USD';
COMMENT ON COLUMN backoffice_packages.features IS 'Array de características del paquete';
COMMENT ON COLUMN backoffice_packages.image IS 'URL https de imagen representativa del paquete';
