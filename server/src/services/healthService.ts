import { getDatabaseStatus, isDatabaseReady, type DatabaseStatus } from '../config/database.js';

export interface HealthReport {
  name: string;
  version: string;
  status: 'healthy';
  uptime: number;
  timestamp: string;
  database: DatabaseStatus;
}

export interface ReadinessReport {
  ready: boolean;
  status: 'ready' | 'unready';
  database: DatabaseStatus['state'];
}

export class HealthService {
  public static getLiveness(): HealthReport {
    return {
      name: 'ApnaVault API',
      version: '1.0.0',
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: getDatabaseStatus(),
    };
  }

  public static getReadiness(): ReadinessReport {
    const isReady = isDatabaseReady();
    const dbStatus = getDatabaseStatus();

    return {
      ready: isReady,
      status: isReady ? 'ready' : 'unready',
      database: dbStatus.state,
    };
  }
}
