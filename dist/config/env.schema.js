"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(4000),
    FRONTEND_ORIGIN: zod_1.z.string().min(1),
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(30),
    SUPABASE_JWKS_URL: zod_1.z.string().url(),
    LIZCO_API_REQUEST_PRIVKEY_JWK: zod_1.z.string().min(10),
    LIZCO_API_REQUEST_PRIVKEY_JWK_PREV: zod_1.z.string().optional().or(zod_1.z.literal('')),
    HCAPTCHA_SECRET: zod_1.z.string().optional().or(zod_1.z.literal('')),
    REDIS_URL: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    JWT_ADMIN_SECRET: zod_1.z.string().min(32),
    JWT_ADMIN_EXPIRES_IN: zod_1.z.string().default('8h'),
    AWS_REGION: zod_1.z.string().min(1).optional(),
    AWS_ACCESS_KEY_ID: zod_1.z.string().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string().min(1).optional(),
    S3_BUCKET_NAME: zod_1.z.string().min(1).optional(),
    CLOUDFRONT_DOMAIN: zod_1.z.string().min(1).optional(),
});
function validateEnv(raw) {
    const parsed = exports.envSchema.safeParse(raw);
    if (!parsed.success) {
        const issues = parsed.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('\n  ');
        throw new Error(`[env] invalid configuration:\n  ${issues}`);
    }
    return parsed.data;
}
//# sourceMappingURL=env.schema.js.map