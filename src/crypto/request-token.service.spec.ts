import { exportJWK, EncryptJWT, generateKeyPair, importJWK, type KeyLike } from 'jose'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { KeyRingService } from './key-ring.service'
import { RequestTokenService } from './request-token.service'

type EncKey = KeyLike | Uint8Array

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair('ECDH-ES', {
    crv: 'P-256',
    extractable: true,
  })
  const pubJwk = await exportJWK(publicKey)
  const privJwk = await exportJWK(privateKey)
  const kid = randomUUID()
  pubJwk.kid = kid
  privJwk.kid = kid

  const keyRing = new KeyRingService({
    get: (k: string) =>
      k === 'LIZCO_API_REQUEST_PRIVKEY_JWK' ? JSON.stringify({ ...privJwk, alg: 'ECDH-ES' }) : undefined,
  } as never)
  await keyRing.onModuleInit()
  const svc = new RequestTokenService(keyRing)
  return { svc, pubKey: (await importJWK(pubJwk as never, 'ECDH-ES')) as EncKey, kid }
}

async function mintToken(opts: {
  pubKey: EncKey
  kid: string
  method: string
  path: string
  body?: unknown
  exp?: string
  jti?: string
}) {
  const raw = opts.body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(opts.body))
  const bodyHash = createHash('sha256').update(raw).digest('hex')
  return new EncryptJWT({
    method: opts.method,
    path: opts.path,
    bodyHash,
    nonce: randomBytes(16).toString('base64url'),
    userId: null,
  })
    .setProtectedHeader({ alg: 'ECDH-ES', enc: 'A256GCM', kid: opts.kid })
    .setIssuer('lizco-web')
    .setAudience('lizco-api')
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '30s')
    .setJti(opts.jti ?? randomUUID())
    .encrypt(opts.pubKey)
}

describe('RequestTokenService', () => {
  it('accepts a valid token', async () => {
    const { svc, pubKey, kid } = await setup()
    const body = { hello: 'world' }
    const token = await mintToken({ pubKey, kid, method: 'POST', path: '/v1/contact', body })
    const rawBody = Buffer.from(JSON.stringify(body))
    const claims = await svc.verify({ token, method: 'POST', path: '/v1/contact', rawBody })
    expect(claims.method).toBe('POST')
    expect(claims.path).toBe('/v1/contact')
  })

  it('rejects replay (same jti twice)', async () => {
    const { svc, pubKey, kid } = await setup()
    const body = { a: 1 }
    const token = await mintToken({ pubKey, kid, method: 'POST', path: '/v1/x', body })
    const rawBody = Buffer.from(JSON.stringify(body))
    await svc.verify({ token, method: 'POST', path: '/v1/x', rawBody })
    await expect(svc.verify({ token, method: 'POST', path: '/v1/x', rawBody })).rejects.toThrow(/replay/)
  })

  it('rejects bodyHash tampering', async () => {
    const { svc, pubKey, kid } = await setup()
    const token = await mintToken({ pubKey, kid, method: 'POST', path: '/v1/x', body: { a: 1 } })
    await expect(
      svc.verify({
        token,
        method: 'POST',
        path: '/v1/x',
        rawBody: Buffer.from(JSON.stringify({ a: 999 })),
      }),
    ).rejects.toThrow(/body_hash_mismatch/)
  })

  it('rejects method mismatch', async () => {
    const { svc, pubKey, kid } = await setup()
    const token = await mintToken({ pubKey, kid, method: 'GET', path: '/v1/x' })
    await expect(
      svc.verify({ token, method: 'POST', path: '/v1/x', rawBody: Buffer.alloc(0) }),
    ).rejects.toThrow(/method_mismatch/)
  })

  it('rejects path mismatch', async () => {
    const { svc, pubKey, kid } = await setup()
    const token = await mintToken({ pubKey, kid, method: 'POST', path: '/v1/a' })
    await expect(
      svc.verify({ token, method: 'POST', path: '/v1/b', rawBody: Buffer.alloc(0) }),
    ).rejects.toThrow(/path_mismatch/)
  })

  it('rejects unknown kid', async () => {
    const { svc, pubKey } = await setup()
    const token = await mintToken({ pubKey, kid: 'not-a-known-kid', method: 'POST', path: '/v1/x' })
    await expect(
      svc.verify({ token, method: 'POST', path: '/v1/x', rawBody: Buffer.alloc(0) }),
    ).rejects.toThrow()
  })

  it('rejects expired token', async () => {
    const { svc, pubKey, kid } = await setup()
    const token = await mintToken({
      pubKey,
      kid,
      method: 'POST',
      path: '/v1/x',
      exp: '1s',
    })
    await new Promise((r) => setTimeout(r, 8000))
    await expect(
      svc.verify({ token, method: 'POST', path: '/v1/x', rawBody: Buffer.alloc(0) }),
    ).rejects.toThrow()
  }, 15000)
})
