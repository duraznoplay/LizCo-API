import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { EncryptJWT, exportJWK, generateKeyPair, importJWK } from 'jose'

export type LizcoJweMinter = (
  method: string,
  path: string,
  body?: Buffer,
) => Promise<string>

/**
 * Generates a fresh ECDH-ES keypair for tests: private JWK for Nest env,
 * public JWK used to mint JWEs the guard accepts.
 */
export async function createLizcoJweMinter(): Promise<{
  privJwkJson: string
  mint: LizcoJweMinter
}> {
  const { privateKey, publicKey } = await generateKeyPair('ECDH-ES', { crv: 'P-256', extractable: true })
  const kid = randomUUID()

  const privJwk = await exportJWK(privateKey)
  privJwk.kid = kid
  ;(privJwk as { alg?: string; use?: string }).alg = 'ECDH-ES'
  ;(privJwk as { use?: string }).use = 'enc'

  const pubJwk = await exportJWK(publicKey)
  pubJwk.kid = kid
  ;(pubJwk as { alg?: string; use?: string }).alg = 'ECDH-ES'
  ;(pubJwk as { use?: string }).use = 'enc'

  const encKey = await importJWK(pubJwk, 'ECDH-ES')

  const mint: LizcoJweMinter = async (method, path, body = Buffer.alloc(0)) => {
    const bodyHash = createHash('sha256').update(body).digest('hex')
    return new EncryptJWT({
      method: method.toUpperCase(),
      path,
      bodyHash,
      nonce: randomBytes(16).toString('base64url'),
      userId: null,
    })
      .setProtectedHeader({ alg: 'ECDH-ES', enc: 'A256GCM', kid })
      .setIssuer('lizco-web')
      .setAudience('lizco-api')
      .setIssuedAt()
      .setExpirationTime('30s')
      .setJti(randomUUID())
      .encrypt(encKey)
  }

  return { privJwkJson: JSON.stringify(privJwk), mint }
}

/** Build a minter from an existing private JWK (same JSON the API uses in LIZCO_API_REQUEST_PRIVKEY_JWK). */
export async function createMinterFromPrivJwk(privJwkJson: string): Promise<{ mint: LizcoJweMinter }> {
  const priv = JSON.parse(privJwkJson) as {
    kty?: string
    crv?: string
    x?: string
    y?: string
    kid?: string
    alg?: string
    use?: string
  }
  const pubJwk = {
    kty: priv.kty,
    crv: priv.crv,
    x: priv.x,
    y: priv.y,
    kid: priv.kid,
    alg: priv.alg ?? 'ECDH-ES',
    use: priv.use ?? 'enc',
  }
  const encKey = await importJWK(pubJwk as never, 'ECDH-ES')

  const mint: LizcoJweMinter = async (method, path, body = Buffer.alloc(0)) => {
    const bodyHash = createHash('sha256').update(body).digest('hex')
    return new EncryptJWT({
      method: method.toUpperCase(),
      path,
      bodyHash,
      nonce: randomBytes(16).toString('base64url'),
      userId: null,
    })
      .setProtectedHeader({ alg: 'ECDH-ES', enc: 'A256GCM', kid: priv.kid })
      .setIssuer('lizco-web')
      .setAudience('lizco-api')
      .setIssuedAt()
      .setExpirationTime('30s')
      .setJti(randomUUID())
      .encrypt(encKey)
  }

  return { mint }
}
