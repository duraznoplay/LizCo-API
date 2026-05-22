-- Expose enterprise_tours schema and grant required privileges so PostgREST
-- (service_role, authenticated, anon) can reach catalog, booking and RPC calls.
-- Idempotent. Apply via Supabase SQL editor, `psql`, or `supabase db execute`.

-- 1. Role-level privileges on schema and objects
GRANT USAGE ON SCHEMA enterprise_tours TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA enterprise_tours TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA enterprise_tours TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA enterprise_tours TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA enterprise_tours TO service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA enterprise_tours TO anon, authenticated, service_role;

-- Future objects created by postgres/owner also grant these privileges automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA enterprise_tours
  GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA enterprise_tours
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA enterprise_tours
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA enterprise_tours
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA enterprise_tours
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- 2. Expose the schema to PostgREST so it routes ?Accept-Profile=enterprise_tours.
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, enterprise_tours';

-- 3. Hot-reload PostgREST config (runs inside the Supabase DB instance).
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
