#!/usr/bin/env node
// Emite un JWE ECDH-ES/A256GCM para pruebas manuales contra el API.
// Uso:
//   Bash/macOS: node scripts/smoke/mint.mjs <METHOD> </v1/path> '[jsonBody]'
//   Windows/PS: Set-Content -NoNewline -Encoding utf8 .\body.json '...'
//               $env:LIZCO_MINT_BODY_FILE='.\body.json'
//               node scripts/smoke/mint.mjs POST /v1/contact
//   Cualquier SO: pipe body via stdin con `-` como bodyArg.
//
// Clave pública: LIZCO_API_REQUEST_PUBKEY_JWK o LIZCO_API_REQUEST_PUBKEY_FILE.
import { readFileSync } from 'node:fs'
import { EncryptJWT, importJWK } from 'jose'
import { createHash, randomBytes, randomUUID } from 'node:crypto'

const [, , method, path, bodyArg] = process.argv
if (!method || !path) {
  console.error('usage: node scripts/smoke/mint.mjs <METHOD> </v1/path> [jsonBody|-|@file]')
  process.exit(1)
}

let pubJwkRaw = process.env.LIZCO_API_REQUEST_PUBKEY_JWK
if (!pubJwkRaw && process.env.LIZCO_API_REQUEST_PUBKEY_FILE) {
  pubJwkRaw = readFileSync(process.env.LIZCO_API_REQUEST_PUBKEY_FILE, 'utf8').trim()
}
if (!pubJwkRaw) {
  console.error('missing LIZCO_API_REQUEST_PUBKEY_JWK (env or file)')
  process.exit(1)
}

const jwk = JSON.parse(pubJwkRaw)
const key = await importJWK(jwk, jwk.alg ?? 'ECDH-ES')

function readStdinSync() {
  try {
    return readFileSync(0)
  } catch {
    return Buffer.alloc(0)
  }
}

let raw
if (process.env.LIZCO_MINT_BODY_FILE) {
  raw = readFileSync(process.env.LIZCO_MINT_BODY_FILE)
} else if (bodyArg === '-') {
  raw = readStdinSync()
} else if (typeof bodyArg === 'string' && bodyArg.startsWith('@')) {
  raw = readFileSync(bodyArg.slice(1))
} else if (bodyArg) {
  raw = Buffer.from(bodyArg)
} else {
  raw = Buffer.alloc(0)
}
const bodyHash = createHash('sha256').update(raw).digest('hex')

const token = await new EncryptJWT({
  method,
  path,
  bodyHash,
  nonce: randomBytes(16).toString('base64url'),
  userId: null,
})
  .setProtectedHeader({ alg: 'ECDH-ES', enc: 'A256GCM', kid: jwk.kid })
  .setIssuer('lizco-web')
  .setAudience('lizco-api')
  .setIssuedAt()
  .setExpirationTime('30s')
  .setJti(randomUUID())
  .encrypt(key)

process.stdout.write(token)
