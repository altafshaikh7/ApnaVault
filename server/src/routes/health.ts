import { Router } from 'express';
import { HealthController } from '../controllers/healthController.js';

export const healthRouter = Router();

healthRouter.get('/', HealthController.getHealth);
healthRouter.get('/readiness', HealthController.getReadiness);
