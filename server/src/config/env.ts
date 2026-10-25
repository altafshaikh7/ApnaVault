import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI must not be empty').default('mongodb://127.0.0.1:27017/apnavault'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000),
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
