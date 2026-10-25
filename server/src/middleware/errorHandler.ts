import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
    stack?: string;
  };
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const message =
    isAppError || env.NODE_ENV !== 'production'
      ? err.message
      : 'An unexpected internal server error occurred';

  // Do not log sensitive credentials, passwords, or personal data
  console.error(`[Error] [${statusCode}] ${err.message}`);
  if (env.NODE_ENV === 'development' && err.stack) {
    console.error(err.stack);
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      message,
      ...(isAppError && err.details ? { details: err.details } : {}),
      ...(env.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {}),
    },
  };

  res.status(statusCode).json(response);
}
