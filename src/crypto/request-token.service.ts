import { Injectable, Logger } from '@nestjs/common'
import { jwtDecrypt, type JWTPayload } from 'jose'
import { createHash } from 'node:crypto'
import { LRUCache } from 'lru-cache'
import { KeyRingService } from './key-ring.service'

export type RequestTokenClaims = JWTPayload & {
  method: string
  path: string
  bodyHash: string
  nonce: string
  userId?: string | null
}

@Injectable()
export class RequestTokenService {
  private readonly log = new Logger(RequestTokenService.name)
  private readonly seenJti = new LRUCache<string, number>({
    max: 5_000,
    ttl: 60_000,
  })

  constructor(private readonly keyRing: KeyRingService) {}

  async verify(opts: {
    token: string
    method: string
    path: string
    rawBody: Buffer
  }): Promise<RequestTokenClaims> {
    const { token, method, path, rawBody } = opts

    const { payload, protectedHeader } = await jwtDecrypt<RequestTokenClaims>(
      token,
      async (header) => {
        const entry = this.keyRing.findByKid(header.kid)
        if (!entry) throw new Error('unknown_kid')
        return entry.key
      },
      {
        issuer: 'lizco-web',
        audience: 'lizco-api',
        clockTolerance: 5,
      },
    )

    if (protectedHeader.alg !== 'ECDH-ES' || protectedHeader.enc !== 'A256GCM') {
      throw new Error('bad_alg')
    }
    if (payload.method !== method) throw new Error('method_mismatch')
    if (payload.path !== path) throw new Error('path_mismatch')

    const computed = createHash('sha256').update(rawBody).digest('hex')
    if (payload.bodyHash !== computed) throw new Error('body_hash_mismatch')

    const jti = payload.jti
    if (!jti) throw new Error('missing_jti')
    if (this.seenJti.has(jti)) throw new Error('replay')
    this.seenJti.set(jti, Date.now())

    return payload
  }
}
