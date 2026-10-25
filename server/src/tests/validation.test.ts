import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { validateRequest } from '../middleware/validateRequest.js';
import { AppError } from '../utils/AppError.js';

describe('validateRequest Middleware', () => {
  const schema = {
    body: z.object({
      title: z.string().min(3),
      count: z.number().positive(),
    }),
  };

  it('should call next() with no errors for valid input', async () => {
    const req = {
      body: { title: 'Valid Document', count: 5 },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    const middleware = validateRequest(schema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should pass an AppError with status 400 and details on validation failure', async () => {
    const req = {
      body: { title: 'ab', count: -1 },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    const middleware = validateRequest(schema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const errorArg = (next as any).mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(AppError);
    expect(errorArg.statusCode).toBe(400);
    expect(Array.isArray(errorArg.details)).toBe(true);
    expect(errorArg.details.length).toBeGreaterThanOrEqual(1);
  });
});
