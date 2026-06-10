"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const nestjs_pino_1 = require("nestjs-pino");
const app_module_1 = require("./app.module");
const sanitized_exception_filter_1 = require("./common/filters/sanitized-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
        rawBody: true,
    });
    app.useLogger(app.get(nestjs_pino_1.Logger));
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'same-site' },
    }));
    const origins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    app.enableCors({
        origin: origins,
        credentials: false,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type', 'X-LizCo-Request-Token'],
        maxAge: 600,
    });
    app.setGlobalPrefix('v1', { exclude: ['health', 'ready'] });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(app.get(sanitized_exception_filter_1.SanitizedExceptionFilter));
    const port = Number(process.env.PORT ?? 4000);
    await app.listen(port, '0.0.0.0');
    const logger = app.get(nestjs_pino_1.Logger);
    logger.log(`lizco-api listening on :${port}`);
}
void bootstrap();
//# sourceMappingURL=main.js.map