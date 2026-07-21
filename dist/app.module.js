"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const nestjs_pino_1 = require("nestjs-pino");
const auth_module_1 = require("./auth/auth.module");
const auth_module_2 = require("./modules/auth/auth.module");
const blog_admin_module_1 = require("./modules/admin/blog/blog-admin.module");
const packages_admin_module_1 = require("./modules/admin/packages/packages-admin.module");
const users_module_1 = require("./modules/users/users.module");
const sanitized_exception_filter_1 = require("./common/filters/sanitized-exception.filter");
const request_token_guard_1 = require("./common/guards/request-token.guard");
const env_schema_1 = require("./config/env.schema");
const crypto_module_1 = require("./crypto/crypto.module");
const admin_module_1 = require("./modules/admin/admin.module");
const assistant_module_1 = require("./modules/assistant/assistant.module");
const booking_module_1 = require("./modules/booking/booking.module");
const catalog_module_1 = require("./modules/catalog/catalog.module");
const contact_module_1 = require("./modules/contact/contact.module");
const health_module_1 = require("./modules/health/health.module");
const media_module_1 = require("./modules/media/media.module");
const supabase_module_1 = require("./supabase/supabase.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: process.env.LIZCO_E2E === '1' ? [] : ['.env.local', '.env'],
                validate: env_schema_1.validateEnv,
            }),
            nestjs_pino_1.LoggerModule.forRoot({
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
                    transport: process.env.NODE_ENV === 'production'
                        ? undefined
                        : { target: 'pino-pretty', options: { singleLine: true, colorize: true } },
                },
            }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
            crypto_module_1.CryptoModule,
            auth_module_1.SupabaseAuthModule,
            supabase_module_1.SupabaseModule,
            health_module_1.HealthModule,
            catalog_module_1.CatalogModule,
            booking_module_1.BookingModule,
            contact_module_1.ContactModule,
            assistant_module_1.AssistantModule,
            admin_module_1.AdminModule,
            media_module_1.MediaModule,
            users_module_1.UsersModule,
            auth_module_2.BackofficeAuthModule,
            packages_admin_module_1.PackagesAdminModule,
            blog_admin_module_1.BlogAdminModule,
        ],
        providers: [
            sanitized_exception_filter_1.SanitizedExceptionFilter,
            { provide: core_1.APP_FILTER, useExisting: sanitized_exception_filter_1.SanitizedExceptionFilter },
            { provide: core_1.APP_GUARD, useClass: request_token_guard_1.RequestTokenGuard },
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map