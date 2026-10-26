import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  // Strip query parameters to avoid exposing sensitive tokens or query parameters in error messages and logs (Finding F-04)
  const safePath = req.originalUrl.split('?')[0];
  next(new AppError(`Route not found: ${req.method} ${safePath}`, 404));
}
