import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDatabaseStatus } from '../config/database.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    success: true,
    data: {
      name: 'ApnaVault API',
      version: '1.0.0',
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
    },
  });
});
