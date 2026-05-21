import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import helmet from 'helmet'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { SanitizedExceptionFilter } from './common/filters/sanitized-exception.filter'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  })

  app.useLogger(app.get(Logger))

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

  const port = Number(process.env.PORT ?? 4000)
  await app.listen(port, '0.0.0.0')
  const logger = app.get(Logger)
  logger.log(`lizco-api listening on :${port}`)
}

void bootstrap()
