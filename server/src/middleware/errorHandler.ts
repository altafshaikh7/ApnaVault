import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;

  // Never expose internal database/system errors or stack traces in production
  const message =
    isAppError || env.NODE_ENV !== 'production'
      ? err.message
      : 'An unexpected internal server error occurred';

  // Redact secrets and sensitive tokens if logging
  const safeMessage = err.message.replace(
    /(password|token|secret|authorization|bearer)[^\s,;]+/gi,
    '[REDACTED]'
  );

  if (env.NODE_ENV !== 'test') {
    console.error(`[Error] [${statusCode}] ${safeMessage}`);
    if (env.NODE_ENV === 'development' && err.stack) {
      console.error(err.stack);
    }
  }

  const details = isAppError ? err.details : undefined;
  sendError(res, message, statusCode, isAppError ? undefined : 'INTERNAL_SERVER_ERROR', details);
}
