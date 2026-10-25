import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const standardRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'test' ? 10000 : env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP address. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  skip: () => env.NODE_ENV === 'test',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
  skip: () => env.NODE_ENV === 'test',
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : env.RESET_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many password reset requests. Please try again in 15 minutes.',
      code: 'RESET_RATE_LIMIT_EXCEEDED',
    },
  },
  skip: () => env.NODE_ENV === 'test',
});

export const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 1000 : env.RESET_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many verification requests. Please try again in 15 minutes.',
      code: 'VERIFICATION_RATE_LIMIT_EXCEEDED',
    },
  },
  skip: () => env.NODE_ENV === 'test',
});
