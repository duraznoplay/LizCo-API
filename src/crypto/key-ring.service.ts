import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { importJWK, type KeyLike } from 'jose'

type DecryptKey = KeyLike | Uint8Array
type KeyEntry = { kid: string; key: DecryptKey }

@Injectable()
export class KeyRingService implements OnModuleInit {
  private readonly log = new Logger(KeyRingService.name)
  private entries: KeyEntry[] = []

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const raws = [
      this.config.get<string>('LIZCO_API_REQUEST_PRIVKEY_JWK'),
      this.config.get<string>('LIZCO_API_REQUEST_PRIVKEY_JWK_PREV'),
    ]

    const loaded: KeyEntry[] = []
    for (const raw of raws) {
      if (!raw) continue
      try {
        const jwk = JSON.parse(raw) as { kid?: string; alg?: string; [k: string]: unknown }
        if (!jwk.kid) throw new Error('jwk missing kid')
        const key = (await importJWK(jwk as never, jwk.alg ?? 'ECDH-ES')) as DecryptKey
        loaded.push({ kid: jwk.kid, key })
      } catch (err) {
        this.log.error({ err }, 'failed to import JWE private key')
      }
    }

    if (loaded.length === 0) {
      throw new Error('no_jwe_keys_loaded')
    }
    this.entries = loaded
    this.log.log(`JWE key-ring loaded (${loaded.length} key(s): ${loaded.map((e) => e.kid).join(', ')})`)
  }

  findByKid(kid: string | undefined): KeyEntry | null {
    if (!kid) return null
    return this.entries.find((e) => e.kid === kid) ?? null
  }

  get size(): number {
    return this.entries.length
  }
}
