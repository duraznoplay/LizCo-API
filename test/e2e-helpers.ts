import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { SanitizedExceptionFilter } from '../src/common/filters/sanitized-exception.filter'
import { createLizcoJweMinter } from './helpers/mint-jwe'

export type MintFn = (method: string, path: string, body?: string | Buffer) => Promise<string>

export interface E2EContext {
  app: INestApplication
  req: ReturnType<typeof request>
  mint: MintFn
  adminToken: string
}

const E2E_TEST_ADMIN_EMAIL = process.env.E2E_TEST_ADMIN_EMAIL
const E2E_TEST_ADMIN_PASSWORD = process.env.E2E_TEST_ADMIN_PASSWORD

export async function createE2EContext(): Promise<E2EContext> {
  const { AppModule } = await import('../src/app.module')

  const { mint: rawMint, privJwkJson } = await createLizcoJweMinter()
  process.env.LIZCO_API_REQUEST_PRIVKEY_JWK = privJwkJson

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
  const app = moduleRef.createNestApplication({ rawBody: true })

  app.setGlobalPrefix('v1', { exclude: ['health', 'ready'] })
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  app.useGlobalFilters(app.get(SanitizedExceptionFilter))
  await app.init()

  const mint: MintFn = (method, path, body = Buffer.alloc(0)) => {
    const buf = typeof body === 'string' ? Buffer.from(body) : body
    return rawMint(method, path, buf)
  }

  const server = app.getHttpServer()
  const superReq = request(server)

  const loginRes = await superReq
    .post('/v1/auth/login')
    .send({ email: E2E_TEST_ADMIN_EMAIL, password: E2E_TEST_ADMIN_PASSWORD })

  const adminToken: string = loginRes.body?.accessToken ?? ''

  return { app, req: superReq, mint, adminToken }
}
