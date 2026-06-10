import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ExpressAdapter } from '@nestjs/platform-express'
import { ValidationPipe } from '@nestjs/common'
import helmet from 'helmet'
import express, { type Express } from 'express'
import type { IncomingMessage, ServerResponse } from 'http'
import { AppModule } from '../src/app.module'
import { SanitizedExceptionFilter } from '../src/common/filters/sanitized-exception.filter'

// Force Vercel redeploy - cache bust
let appPromise: Promise<Express> | null = null

async function createApp(): Promise<Express> {
  const server = express()
  // Pre-attach body parsers so NestJS's isMiddlewareApplied check (which calls
  // app.get('router') and throws on Express 4) is never triggered.
  server.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf
      },
    }),
  )
  server.use(express.urlencoded({ extended: true, limit: '10mb' }))

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bufferLogs: false,
    bodyParser: false,
  })

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  )

  const origins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  app.enableCors({
    origin: origins,
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-LizCo-Request-Token'],
    maxAge: 600,
  })

  app.setGlobalPrefix('v1', { exclude: ['health', 'ready'] })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(app.get(SanitizedExceptionFilter))

  await app.init()
  return server
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = createApp().catch((err) => {
      appPromise = null
      throw err
    })
  }
  const app = await appPromise
  app(req, res)
}
