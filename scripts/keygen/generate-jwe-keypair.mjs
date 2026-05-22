import { exportJWK, generateKeyPair } from 'jose'
import { randomUUID } from 'node:crypto'

const { publicKey, privateKey } = await generateKeyPair('ECDH-ES', {
  crv: 'P-256',
  extractable: true,
})

const kid = randomUUID()
const pub = { ...(await exportJWK(publicKey)), kid, alg: 'ECDH-ES', use: 'enc' }
const priv = { ...(await exportJWK(privateKey)), kid, alg: 'ECDH-ES', use: 'enc' }

process.stdout.write(
  `# Par de claves JWE (ECDH-ES P-256) — kid=${kid}\n` +
    `# Copia la PRIVADA al API (LIZCO_API_REQUEST_PRIVKEY_JWK) y la PUBLICA al frontend (LIZCO_API_REQUEST_PUBKEY_JWK).\n` +
    `# Ambas variables son server-only; NUNCA prefijar con NEXT_PUBLIC_.\n\n` +
    `LIZCO_API_REQUEST_PUBKEY_JWK=${JSON.stringify(pub)}\n\n` +
    `LIZCO_API_REQUEST_PRIVKEY_JWK=${JSON.stringify(priv)}\n`,
)
