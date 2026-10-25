import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Authentication foundation middleware.
 * Strictly enforces authentication: will reject unauthenticated requests
 * with 401 Unauthorized. Full session resolution will be wired in Phase 4.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('Authentication required. Please sign in to access this resource.', 401, undefined, true));
    return;
  }
  next();
}

/**
 * Role-based authorization middleware factory for workspaces.
 */
export function requireWorkspaceRole(allowedRoles: string[]) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // In future phases, will verify workspace membership from session / request context
    next(new AppError(`Forbidden. Required role: ${allowedRoles.join(', ')}`, 403));
  };
}
