import type { Request, Response, NextFunction } from 'express';

function cleanObject(target: unknown): unknown {
  if (target === null || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    return target.map((item) => cleanObject(item));
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(target as Record<string, unknown>)) {
    // Prohibit MongoDB operator injection keys starting with $ or containing .
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    cleaned[key] = cleanObject(value);
  }
  return cleaned;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = cleanObject(req.query) as Request['query'];
  }
  if (req.params && typeof req.params === 'object') {
    req.params = cleanObject(req.params) as Request['params'];
  }
  next();
}
