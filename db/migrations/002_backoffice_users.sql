-- Migration: 002_backoffice_users
-- Descripción: Tabla de usuarios admin para backoffice
-- Ejecutar en: Supabase SQL Editor (schema enterprise_tours)

SET search_path TO enterprise_tours;

CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        UNIQUE NOT NULL,
  password    TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'ADMIN'
                          CHECK (role IN ('ADMIN', 'STAFF')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsqueda por email (login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- RLS: solo service_role puede acceder (admin interno, no usuario final)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON users
  USING (auth.role() = 'service_role');

-- Comentarios de documentación
COMMENT ON TABLE users IS 'Usuarios administrativos del backoffice LizCo';
COMMENT ON COLUMN users.password IS 'Hash bcrypt (12 rounds). Nunca texto plano.';
COMMENT ON COLUMN users.role IS 'ADMIN: acceso total. STAFF: solo lectura (futuro).';
