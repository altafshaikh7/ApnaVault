import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const CSRF_COOKIE_NAME = 'apnavault_csrf';

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by frontend client to pass in header
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Validates CSRF tokens and Origin headers on state-changing requests.
 */
export function validateCsrf(req: Request, _res: Response, next: NextFunction): void {
  // Safe HTTP methods do not change state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // 1. Validate Origin header if present
  const origin = req.headers.origin;
  if (origin) {
    const allowedOrigins = [env.CLIENT_URL, env.FRONTEND_URL];
    if (!allowedOrigins.includes(origin)) {
      return next(new AppError('Cross-origin request rejected', 403, undefined, true));
    }
  }

  // 2. Token-based CSRF validation for cookie-authenticated or CSRF-protected requests
  const headerToken =
    (req.headers['x-csrf-token'] as string) || (req.headers['x-xsrf-token'] as string);
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const hasSessionCookie = Boolean(req.cookies?.[env.SESSION_COOKIE_NAME]);

  // If a session cookie is present, CSRF token is mandatory
  if (hasSessionCookie) {
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return next(
        new AppError('Invalid or missing CSRF token. Please refresh and try again.', 403, undefined, true)
      );
    }
  } else if (headerToken || cookieToken) {
    // If client supplied CSRF tokens even without session cookie, verify they match
    if (headerToken !== cookieToken) {
      return next(new AppError('Invalid CSRF token', 403, undefined, true));
    }
  }

  next();
}
