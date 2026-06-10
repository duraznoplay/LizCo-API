require('reflect-metadata')
require('tsconfig-paths').register({
  baseUrl: './dist',
  paths: {
    '@/*': ['*'],
  },
})

const express = require('express')
const helmet = require('helmet')

let appPromise = null

async function createApp() {
  const { NestFactory } = require('@nestjs/core')
  const { ExpressAdapter } = require('@nestjs/platform-express')
  const { ValidationPipe } = require('@nestjs/common')
  const { AppModule } = require('@/app.module')
  const { SanitizedExceptionFilter } = require('@/common/filters/sanitized-exception.filter')

  const server = express()
  server.use(
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
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

module.exports = async function handler(req, res) {
  if (!appPromise) {
    appPromise = createApp().catch((err) => {
      appPromise = null
      throw err
    })
  }
  const app = await appPromise
  app(req, res)
}
