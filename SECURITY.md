# Security — LizCo-api

API NestJS que centraliza el acceso a Supabase (schema `enterprise_tours`). Todo
tráfico entrante (excepto `/health` y `/ready`) exige un JWE válido en el header
`X-LizCo-Request-Token`.

## Credenciales críticas

| Variable | Rotación | Dónde vive |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | cuando exista sospecha de exposición | Render secret manager |
| `SUPABASE_DB_PASSWORD` | según política de Supabase | Supabase dashboard |
| `LIZCO_API_REQUEST_PRIVKEY_JWK` | trimestral (ver más abajo) | Render secret manager |
| `HCAPTCHA_SECRET` | anual o si se regenera | Render secret manager |

Ninguna credencial se commitea. `.env*.local` está en `.gitignore`.

## Rotación de la clave del canal cifrado (trimestral)

Ventana de doble-kid 24h para aceptar tokens firmados con clave anterior.

1. Genera nuevo par:
   ```bash
   yarn keygen > .jwe-keys.local.env
   ```
2. En el API (Render):
   - Mueve el valor actual de `LIZCO_API_REQUEST_PRIVKEY_JWK` a
     `LIZCO_API_REQUEST_PRIVKEY_JWK_PREV`.
   - Publica la nueva privada como `LIZCO_API_REQUEST_PRIVKEY_JWK`.
   - Redeploy. El `KeyRingService` carga ambas.
3. En el frontend (Vercel):
   - Reemplaza `LIZCO_API_REQUEST_PUBKEY_JWK` con la nueva pública.
   - Redeploy.
4. Tras 24h, elimina `LIZCO_API_REQUEST_PRIVKEY_JWK_PREV` del API.

## Rotación de claves Supabase (manual — dashboard)

1. Supabase Dashboard → Project Settings → API → regenerar `service_role`,
   `anon` y `publishable`.
2. Supabase Dashboard → Project Settings → Database → rotar password DB.
3. Actualiza los secrets del API en Render con los nuevos valores.
4. Redeploy y corre `yarn smoke` contra staging.

## Modelo de amenazas (resumen)

- Browser hostil → no tiene acceso directo al API; el BFF de Next es la única vía
  y rechaza peticiones con `Origin` distinto al propio.
- Cliente del BFF filtrado → expiran los JWE en 30s, `jti` evita replay, y el
  `bodyHash` evita tampering del payload tras emisión.
- API sin canal cifrado → rechazado: `RequestTokenGuard` es global excepto
  para `/health`/`/ready`.
- Supabase RLS → capa de defensa en profundidad; se revoca el acceso anon a
  tablas mutables una vez el API centraliza escrituras.

## Reporte de vulnerabilidades

security@lizcoglobal.co — incluye versión del API, endpoint afectado, pasos de
repro, impacto. No abras issues públicas.
