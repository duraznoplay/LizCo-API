# LizCo-api

API NestJS de LizCo Global Tours. Reemplaza las rutas `app/api/*` del monolito Next.
Supabase queda como motor Postgres (sin SDK en el navegador). Todo tráfico del
frontend hacia el API viaja cifrado con un token JWE de corta duración (canal
seguro además de TLS).

## Requisitos

- Node.js `>=20`
- `yarn` (v1.22+ via corepack o `npm i -g yarn`)
- Acceso a un proyecto Supabase con los schemas `enterprise_tours` + función
  `public.lizco_calculate_total_price`
- SQL de grants PostgREST (una vez): `db/migrations/001_enterprise_tours_grants.sql`
  (editor SQL de Supabase o `psql`)

## Primer uso

```bash
yarn install
yarn keygen > .jwe-keys.local.env    # genera par ECDH-ES P-256
cp .env.example .env.local           # rellena SUPABASE_* + PRIVKEY
yarn start:dev                       # arranca en http://localhost:4000
```

## Seguridad — canal cifrado

- Cada request debe traer `X-LizCo-Request-Token`: un JWE (ECDH-ES + A256GCM) de
  30s de vida, firmado por el BFF Next con la clave pública.
- El guard `RequestTokenGuard` valida `iss`/`aud`/`exp`, comprueba `bodyHash` y
  rechaza replays por `jti` cacheado.
- `/health` y `/ready` son los únicos endpoints `@Public()` exentos.
- Rotación trimestral: publicar la nueva clave como `LIZCO_API_REQUEST_PRIVKEY_JWK`
  y conservar la anterior en `..._PREV` durante 24h para aceptar tokens en vuelo.

## Endpoints

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/ready` | Readiness |
| GET | `/v1/catalog/destinations` | Lista destinos activos |
| GET | `/v1/catalog/packages` | Catálogo de paquetes |
| GET | `/v1/catalog/packages/:slug/add-ons` | Add-ons por paquete |
| GET | `/v1/catalog/add-ons` | Lista de add-ons |
| GET | `/v1/catalog/blogs` | Lista blogs |
| GET | `/v1/catalog/blogs/:slug` | Detalle blog |
| GET | `/v1/booking/quote` | Precio server-side |
| POST | `/v1/booking` | Crea booking + customer |
| POST | `/v1/contact` | Contact lead |
| POST | `/v1/newsletter` | Alta newsletter |
| POST | `/v1/assistant/tour-catalog` | Snapshot catálogo para IA |
| GET | `/v1/admin/me` | Requiere Supabase JWT + rol admin/staff |

## Pruebas

```bash
yarn test             # unit (Jest)
yarn test:cov         # unit + cobertura
yarn test:e2e         # e2e supertest (sin DB real)
API=http://localhost:4000 \
  LIZCO_API_REQUEST_PUBKEY_FILE=.jwe-pub.json \
  yarn smoke          # smoke curl real contra el API corriendo
```

## Deploy (Render)

- Web Service Node 20, build `yarn build`, start `yarn start:prod`.
- Health check path `/health`.
- Env: todas las vars de `.env.example` con valores reales.
 