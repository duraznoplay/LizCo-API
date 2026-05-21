import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().min(1),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(30),
  SUPABASE_JWKS_URL: z.string().url(),

  LIZCO_API_REQUEST_PRIVKEY_JWK: z.string().min(10),
  LIZCO_API_REQUEST_PRIVKEY_JWK_PREV: z.string().optional().or(z.literal('')),

  HCAPTCHA_SECRET: z.string().optional().or(z.literal('')),
  REDIS_URL: z.string().url().optional().or(z.literal('')),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),

  JWT_ADMIN_SECRET: z.string().min(32),
  JWT_ADMIN_EXPIRES_IN: z.string().default('8h'),

  AWS_REGION: z.string().min(1).optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_BUCKET_NAME: z.string().min(1).optional(),
  CLOUDFRONT_DOMAIN: z.string().min(1).optional(),
})

export type AppEnv = z.infer<typeof envSchema>

export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n  ')
    throw new Error(`[env] invalid configuration:\n  ${issues}`)
  }
  return parsed.data
}
