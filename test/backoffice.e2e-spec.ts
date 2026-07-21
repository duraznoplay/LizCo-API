/**
 * Backoffice E2E — requires real Supabase + seeded admin user.
 * Set E2E_TEST_ADMIN_EMAIL + E2E_TEST_ADMIN_PASSWORD in the environment to run.
 * Skips automatically when credentials are absent.
 */
import { createE2EContext, E2EContext } from './e2e-helpers'

const SKIP = !process.env.E2E_TEST_ADMIN_EMAIL || !process.env.E2E_TEST_ADMIN_PASSWORD

const describeE2E = SKIP ? describe.skip : describe

describeE2E('Backoffice E2E', () => {
  let ctx: E2EContext

  beforeAll(async () => {
    ctx = await createE2EContext()
    if (!ctx.adminToken) {
      throw new Error('E2E setup: login failed — check E2E_TEST_ADMIN_EMAIL / E2E_TEST_ADMIN_PASSWORD and Supabase seed')
    }
  }, 30_000)

  afterAll(async () => {
    await ctx.app?.close()
  })

  // ── helpers ──────────────────────────────────────────────────────────────

  async function authedGet(path: string) {
    const jwe = await ctx.mint('GET', path)
    return ctx.req.get(path)
      .set('X-LizCo-Request-Token', jwe)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
  }

  async function authedPost(path: string, body: object) {
    const jwe = await ctx.mint('POST', path, JSON.stringify(body))
    return ctx.req.post(path)
      .set('X-LizCo-Request-Token', jwe)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send(body)
  }

  async function authedPatch(path: string, body: object) {
    const jwe = await ctx.mint('PATCH', path, JSON.stringify(body))
    return ctx.req.patch(path)
      .set('X-LizCo-Request-Token', jwe)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send(body)
  }

  async function authedDelete(path: string) {
    const jwe = await ctx.mint('DELETE', path)
    return ctx.req.delete(path)
      .set('X-LizCo-Request-Token', jwe)
      .set('Authorization', `Bearer ${ctx.adminToken}`)
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  describe('Auth', () => {
    it('POST /v1/auth/login — valid credentials → 200 + accessToken', async () => {
      const res = await ctx.req
        .post('/v1/auth/login')
        .send({ email: process.env.E2E_TEST_ADMIN_EMAIL, password: process.env.E2E_TEST_ADMIN_PASSWORD })
        .expect(200)

      expect(res.body.ok).toBe(true)
      expect(typeof res.body.accessToken).toBe('string')
      expect(res.body.user.email).toBe(process.env.E2E_TEST_ADMIN_EMAIL)
      expect(res.body.user.password).toBeUndefined()
    })

    it('POST /v1/auth/login — wrong password → 401 invalid_credentials', async () => {
      const res = await ctx.req
        .post('/v1/auth/login')
        .send({ email: process.env.E2E_TEST_ADMIN_EMAIL, password: 'definitely_wrong_password' })
        .expect(401)

      expect(res.body.error).toBe('invalid_credentials')
    })

    it('POST /v1/auth/login — non-existent email → same 401 (no user enumeration)', async () => {
      const res = await ctx.req
        .post('/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever' })
        .expect(401)

      expect(res.body.error).toBe('invalid_credentials')
    })
  })

  // ── Guard chain ───────────────────────────────────────────────────────────

  describe('Guard chain', () => {
    it('without JWE → 401 (RequestTokenGuard rejects)', async () => {
      await ctx.req.get('/v1/admin/packages').expect(401)
    })

    it('with JWE but no Bearer JWT → 401 (JwtAdminGuard rejects)', async () => {
      const jwe = await ctx.mint('GET', '/v1/admin/packages')
      await ctx.req.get('/v1/admin/packages')
        .set('X-LizCo-Request-Token', jwe)
        .expect(401)
    })

    it('with JWE + valid Bearer JWT → 200', async () => {
      const res = await authedGet('/v1/admin/packages')
      expect(res.status).toBe(200)
    })
  })

  // ── Packages CRUD ─────────────────────────────────────────────────────────

  describe('Packages Admin CRUD', () => {
    let createdId: string

    it('POST /v1/admin/packages → 201 with new package', async () => {
      const res = await authedPost('/v1/admin/packages', {
        title: 'E2E Test Package',
        description: 'Descripción del paquete de prueba para el test E2E del backoffice.',
        price: 299.99,
        features: ['Feature A', 'Feature B'],
      })
      expect(res.status).toBe(201)
      expect(typeof res.body.id).toBe('string')
      createdId = res.body.id
    })

    it('GET /v1/admin/packages → list includes new package', async () => {
      const res = await authedGet('/v1/admin/packages')
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: createdId })])
      )
    })

    it('GET /v1/admin/packages/:id → returns the package', async () => {
      const res = await authedGet(`/v1/admin/packages/${createdId}`)
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(createdId)
    })

    it('PATCH /v1/admin/packages/:id → updates price', async () => {
      const res = await authedPatch(`/v1/admin/packages/${createdId}`, { price: 399.99 })
      expect(res.status).toBe(200)
      expect(res.body.price).toBe(399.99)
    })

    it('POST /v1/admin/packages with invalid data → 400', async () => {
      const res = await authedPost('/v1/admin/packages', { title: 'AB', price: -1 })
      expect(res.status).toBe(400)
    })

    it('DELETE /v1/admin/packages/:id → 204', async () => {
      const res = await authedDelete(`/v1/admin/packages/${createdId}`)
      expect(res.status).toBe(204)
    })

    it('GET /v1/admin/packages/:id after delete → 404', async () => {
      const res = await authedGet(`/v1/admin/packages/${createdId}`)
      expect(res.status).toBe(404)
    })
  })

  // ── Blog CRUD ─────────────────────────────────────────────────────────────

  describe('Blog Admin CRUD', () => {
    let createdId: string
    let createdSlug: string

    it('POST /v1/admin/blogs → 201 with auto-generated slug', async () => {
      const res = await authedPost('/v1/admin/blogs', {
        title: 'E2E Test Post Backoffice',
        content: 'Contenido del post de prueba para el test E2E del backoffice de LizCo Global Tours.',
      })
      expect(res.status).toBe(201)
      expect(res.body.slug).toBe('e2e-test-post-backoffice')
      createdId = res.body.id
      createdSlug = res.body.slug
    })

    it('GET /v1/admin/blogs → list includes new post', async () => {
      const res = await authedGet('/v1/admin/blogs')
      expect(res.status).toBe(200)
      expect(res.body.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: createdId })])
      )
    })

    it('POST /v1/admin/blogs with duplicate slug → 409', async () => {
      const res = await authedPost('/v1/admin/blogs', {
        title: 'Another Post',
        content: 'Contenido del segundo post de prueba para la prueba de colisión de slug.',
        slug: createdSlug,
      })
      expect(res.status).toBe(409)
    })

    it('PATCH /v1/admin/blogs/:id → updates title', async () => {
      const res = await authedPatch(`/v1/admin/blogs/${createdId}`, {
        title: 'E2E Test Post Updated',
      })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('E2E Test Post Updated')
    })

    it('DELETE /v1/admin/blogs/:id → 204', async () => {
      const res = await authedDelete(`/v1/admin/blogs/${createdId}`)
      expect(res.status).toBe(204)
    })
  })

  // ── Public routes unaffected ──────────────────────────────────────────────

  describe('Public routes unaffected by admin guards', () => {
    it('GET /health → 200', async () => {
      await ctx.req.get('/health').expect(200)
    })

    it('GET /v1/catalog/packages (JWE only, no JWT) → 200', async () => {
      const jwe = await ctx.mint('GET', '/v1/catalog/packages')
      const res = await ctx.req.get('/v1/catalog/packages')
        .set('X-LizCo-Request-Token', jwe)
      expect(res.status).toBe(200)
    })
  })
})
