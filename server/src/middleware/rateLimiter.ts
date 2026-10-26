import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Helper to identify whether code is running inside the automated Vitest test runner (Finding F-07).
 * Prevents accidental rate limiter bypass if NODE_ENV is set to 'test' in non-test or staging deployments.
 */
export const isVitestEnv = (): boolean => process.env.VITEST === 'true';

export const standardRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: isVitestEnv() ? 10000 : env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP address. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  skip: () => isVitestEnv(),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isVitestEnv() ? 1000 : env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
  skip: () => isVitestEnv(),
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isVitestEnv() ? 1000 : env.RESET_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many password reset requests. Please try again in 15 minutes.',
      code: 'RESET_RATE_LIMIT_EXCEEDED',
    },
  },
  skip: () => isVitestEnv(),
});

export const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isVitestEnv() ? 1000 : env.RESET_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many verification requests. Please try again in 15 minutes.',
      code: 'VERIFICATION_RATE_LIMIT_EXCEEDED',
    },
  },
  skip: () => isVitestEnv(),
});
