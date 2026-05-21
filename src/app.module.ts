import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'

import { AuthModule } from './auth/auth.module'
import { BackofficeAuthModule } from './modules/auth/auth.module'
import { BlogAdminModule } from './modules/admin/blog/blog-admin.module'
import { PackagesAdminModule } from './modules/admin/packages/packages-admin.module'
import { UsersModule } from './modules/users/users.module'
import { SanitizedExceptionFilter } from './common/filters/sanitized-exception.filter'
import { RequestTokenGuard } from './common/guards/request-token.guard'
import { validateEnv } from './config/env.schema'
import { CryptoModule } from './crypto/crypto.module'
import { AdminModule } from './modules/admin/admin.module'
import { AssistantModule } from './modules/assistant/assistant.module'
import { BookingModule } from './modules/booking/booking.module'
import { CatalogModule } from './modules/catalog/catalog.module'
import { ContactModule } from './modules/contact/contact.module'
import { HealthModule } from './modules/health/health.module'
import { MediaModule } from './modules/media/media.module'
import { SeedModule } from './modules/seed/seed.module'
import { SupabaseModule } from './supabase/supabase.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.LIZCO_E2E === '1' ? [] : ['.env.local', '.env'],
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers["x-lizco-request-token"]',
            'req.headers.cookie',
          ],
          censor: '[redacted]',
        },
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true, colorize: true } },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    CryptoModule,
    AuthModule,
    SupabaseModule,
    HealthModule,
    CatalogModule,
    BookingModule,
    ContactModule,
    AssistantModule,
    AdminModule,
    MediaModule,
    SeedModule,
    UsersModule,
    BackofficeAuthModule,
    PackagesAdminModule,
    BlogAdminModule,
  ],
  providers: [
    SanitizedExceptionFilter,
    { provide: APP_FILTER, useExisting: SanitizedExceptionFilter },
    { provide: APP_GUARD, useClass: RequestTokenGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
