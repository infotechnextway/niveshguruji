import { z } from 'zod';

/**
 * Infrastructure environment — validated at boot; the process refuses to start
 * on invalid config (fail-fast). Business numbers do NOT live here (NFR-8);
 * they live in the app_config collection via AppConfigService.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TZ: z.string().default('Asia/Kolkata'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  ENGINE_PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  /** Public base URL used in email links (verification, password reset). */
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),

  /** RS256 keypair, base64-encoded PEM (generate with `npm run generate:keys`). */
  JWT_PRIVATE_KEY_B64: z.string().min(1, 'JWT_PRIVATE_KEY_B64 is required'),
  JWT_PUBLIC_KEY_B64: z.string().min(1, 'JWT_PUBLIC_KEY_B64 is required'),

  /** Key material for at-rest AES-256-GCM encryption (KYC docs, TOTP secrets, PII fields). */
  DATA_ENC_SECRET: z.string().min(16, 'DATA_ENC_SECRET must be at least 16 chars'),

  /** Root directory for encrypted file storage (KYC documents). */
  STORAGE_DIR: z.string().default('./data'),

  /** Server-side pepper mixed into OTP hashes. */
  OTP_PEPPER: z.string().min(16, 'OTP_PEPPER must be at least 16 chars'),

  SMS_PROVIDER: z.enum(['console', 'msg91']).default('console'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),

  MAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  /** e.g. smtps://user:pass@smtp.example.com:465 */
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('RIDGELINE CAPITAL <no-reply@localhost>'),

  MARKET_FEED: z.enum(['simulator', 'upstox', 'angel', 'dhan']).default('simulator'),
  UPSTOX_ACCESS_TOKEN: z.string().optional(),
  UPSTOX_API_KEY: z.string().optional(),
  UPSTOX_API_SECRET: z.string().optional(),

  ANGEL_API_KEY: z.string().optional(),
  ANGEL_CLIENT_CODE: z.string().optional(),
  ANGEL_JWT_TOKEN: z.string().optional(),
  ANGEL_FEED_TOKEN: z.string().optional(),

  DHAN_CLIENT_ID: z.string().optional(),
  DHAN_ACCESS_TOKEN: z.string().optional(),

  PAYMENT_PROVIDER: z.enum(['manual', 'razorpay']).default('manual'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
}).superRefine((env, ctx) => {
  if (env.SMS_PROVIDER === 'msg91' && (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are required when SMS_PROVIDER=msg91' });
  }
  if (env.MAIL_PROVIDER === 'smtp' && !env.SMTP_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SMTP_URL is required when MAIL_PROVIDER=smtp' });
  }
  // UPSTOX_ACCESS_TOKEN may be supplied at runtime via Admin → Upstox API (encrypted in Mongo).
  // Env token remains an optional boot-time fallback; feed waits if neither is set.
  if (env.PAYMENT_PROVIDER === 'razorpay' && (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are required when PAYMENT_PROVIDER=razorpay' });
  }
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`.trim()).join('; ');
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  return parsed.data;
}
