import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { importJWK, jwtDecrypt } from 'jose'
import request from 'supertest'
import { SanitizedExceptionFilter } from '../src/common/filters/sanitized-exception.filter'
import { createLizcoJweMinter } from './helpers/mint-jwe'

describe('HTTP surface (e2e)', () => {
  let app: INestApplication
  let mint: Awaited<ReturnType<typeof createLizcoJweMinter>>['mint']
  let privJwkJson: string

  beforeAll(async () => {
    process.env.LIZCO_E2E = '1'
    process.env.NODE_ENV = 'development'
    process.env.PORT = '4010'
    process.env.FRONTEND_ORIGIN = 'http://localhost:3000'
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(40)
    process.env.SUPABASE_JWKS_URL = 'https://example.supabase.co/auth/v1/.well-known/jwks.json'
    process.env.JWT_ADMIN_SECRET = 'e2e-test-secret-minimum-32-chars-ok!'
    process.env.JWT_ADMIN_EXPIRES_IN = '8h'

    const pair = await createLizcoJweMinter()
    privJwkJson = pair.privJwkJson
    process.env.LIZCO_API_REQUEST_PRIVKEY_JWK = privJwkJson
    mint = pair.mint

    const { AppModule } = await import('../src/app.module')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication({ rawBody: true })
    app.setGlobalPrefix('v1', { exclude: ['health', 'ready'] })
    app.useGlobalFilters(app.get(SanitizedExceptionFilter))
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('GET /health -> 200 ok (public)', async () => {
    const res = await request(app.getHttpServer()).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('GET /v1/catalog/packages without token -> 401 invalid_request_token', async () => {
    const res = await request(app.getHttpServer()).get('/v1/catalog/packages')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('invalid_request_token')
  })

  it('POST /v1/contact without token -> 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/contact')
      .send({ name: 'a', email: 'a@a.co', subject: 'info', message: 'hi' })
    expect(res.status).toBe(401)
  })

  it('JWE mint round-trips with API private key', async () => {
    const tok = await mint('GET', '/v1/catalog/destinations')
    const jwk = JSON.parse(privJwkJson) as { kid?: string; alg?: string }
    const decKey = await importJWK(jwk as never, jwk.alg ?? 'ECDH-ES')
    const { payload } = await jwtDecrypt(tok, decKey, {
      issuer: 'lizco-web',
      audience: 'lizco-api',
    })
    expect(payload.path).toBe('/v1/catalog/destinations')
    expect(payload.method).toBe('GET')
  })

  it('GET /v1/catalog/destinations with valid JWE -> not 401', async () => {
    const tok = await mint('GET', '/v1/catalog/destinations')
    const res = await request(app.getHttpServer())
      .get('/v1/catalog/destinations')
      .set('X-LizCo-Request-Token', tok)
    expect(res.status).not.toBe(401)
  })

  it('GET /v1/catalog/blogs with valid JWE -> not 401', async () => {
    const tok = await mint('GET', '/v1/catalog/blogs')
    const res = await request(app.getHttpServer())
      .get('/v1/catalog/blogs')
      .set('X-LizCo-Request-Token', tok)
    expect(res.status).not.toBe(401)
  })

  it('GET /v1/booking/quote with valid JWE and query -> not 401', async () => {
    const sp = 'packageSlug=test&date=2099-01-01&pax=2'
    const tok = await mint('GET', '/v1/booking/quote')
    const res = await request(app.getHttpServer())
      .get(`/v1/booking/quote?${sp}`)
      .set('X-LizCo-Request-Token', tok)
    expect(res.status).not.toBe(401)
  })

  describe('Auth endpoints (HU-102 / HU-103)', () => {
    it('POST /v1/auth/login is @Public — no JWE required, returns 401 when DB unavailable', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'admin@global.tours', password: 'somepassword' })
      // @Public() skips RequestTokenGuard; LocalStrategy returns 401 because fake Supabase
      expect(res.status).toBe(401)
    })

    it('POST /v1/auth/login with bad credentials -> 401 invalid_credentials', async () => {
      // AuthGuard('local') runs before ValidationPipe; LocalStrategy rejects → 401
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'wrongpassword123' })
      expect(res.status).toBe(401)
    })

    it('POST /v1/auth/logout without JWE -> 401 from RequestTokenGuard', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/logout')
      expect(res.status).toBe(401)
    })

    it('POST /v1/auth/logout with JWE but no Bearer JWT -> 401 from JwtAdminGuard', async () => {
      const tok = await mint('POST', '/v1/auth/logout', Buffer.from(JSON.stringify({})))
      const res = await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .set('X-LizCo-Request-Token', tok)
      expect(res.status).toBe(401)
    })
  })
})
