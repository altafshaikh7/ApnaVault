import type { Request, Response } from 'express';
import { HealthService } from '../services/healthService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export class HealthController {
  public static getHealth(_req: Request, res: Response): void {
    const report = HealthService.getLiveness();
    sendSuccess(res, report, 'Service is operational', 200);
  }

  public static getReadiness(_req: Request, res: Response): void {
    const readiness = HealthService.getReadiness();

    if (readiness.ready) {
      sendSuccess(res, readiness, 'Service and database are ready', 200);
    } else {
      // Return 503 when database is not ready; never claim database is connected when it is not
      res.status(503).json({
        success: false,
        error: {
          message: 'Database is not ready or currently disconnected',
          code: 'DATABASE_NOT_READY',
          details: {
            database: readiness.database,
          },
        },
        data: readiness,
      });
    }
  }
}
