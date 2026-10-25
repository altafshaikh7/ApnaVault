import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI must not be empty').default('mongodb://127.0.0.1:27017/apnavault'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(15), // 15 attempts per 15 min for login/register
  RESET_RATE_LIMIT_MAX: z.coerce.number().default(5), // 5 attempts per 15 min for password reset/verification

  // Session & Security
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters long').default('apnavault_default_session_secret_32_characters_long_min'),
  SESSION_COOKIE_NAME: z.string().default('apnavault_session'),
  SESSION_EXPIRES_IN_DAYS: z.coerce.number().default(7),
  VERIFICATION_TOKEN_EXPIRES_HOURS: z.coerce.number().default(24),
  PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: z.coerce.number().default(60),

  // Email Service Configuration
  EMAIL_PROVIDER: z.enum(['none', 'resend', 'smtp']).default('none'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('ApnaVault <noreply@apnavault.in>'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(customEnv?: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(customEnv ?? process.env);
  if (!parsed.success) {
    const errorDetails = JSON.stringify(parsed.error.format(), null, 2);
    if ((customEnv?.NODE_ENV ?? process.env.NODE_ENV) !== 'test') {
      console.error('Invalid environment configuration:');
      console.error(errorDetails);
    }
    throw new Error(`Environment validation failed:\n${errorDetails}`);
  }
  return parsed.data;
}

export const env = validateEnv();
