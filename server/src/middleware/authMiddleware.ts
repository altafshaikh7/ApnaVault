import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { env } from '../config/env.js';
import { getCookieSecurityOptions } from '../config/cookieOptions.js';
import { AppError } from '../utils/AppError.js';
import type { IUser } from '../models/User.js';
import type { ISession } from '../models/Session.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      session?: ISession;
      sessionToken?: string;
    }
  }
}

/**
 * Sets the browser session HttpOnly cookie with secure parameters.
 */
export function setSessionCookie(res: Response, token: string): void {
  const maxAge = env.SESSION_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;
  res.cookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    ...getCookieSecurityOptions(env.NODE_ENV),
    path: '/',
    maxAge,
  });
}

/**
 * Clears the browser session cookie with matching attributes.
 */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    ...getCookieSecurityOptions(env.NODE_ENV),
    path: '/',
  });
}

/**
 * Middleware that extracts and resolves the session from cookie or Authorization header.
 * Attaches req.user and req.session if valid.
 */
export async function authenticateSession(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined = req.cookies?.[env.SESSION_COOKIE_NAME];

    // Mobile readiness: Support Authorization: Bearer <token>
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7).trim();
    }

    if (!token) {
      req.user = undefined;
      req.session = undefined;
      req.sessionToken = undefined;
      return next();
    }

    const auth = await AuthService.validateSession(token);
    if (!auth) {
      req.user = undefined;
      req.session = undefined;
      req.sessionToken = undefined;
      return next();
    }

    req.user = auth.user;
    req.session = auth.session;
    req.sessionToken = token;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Strictly requires authentication. Rejects unauthenticated requests with 401.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(
      new AppError('Authentication required. Please sign in to access this resource.', 401, undefined, true)
    );
  }
  next();
}

/**
 * Role-based authorization middleware factory for workspaces.
 */
export function requireWorkspaceRole(allowedRoles: string[]) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    next(new AppError(`Forbidden. Required role: ${allowedRoles.join(', ')}`, 403, undefined, true));
  };
}
