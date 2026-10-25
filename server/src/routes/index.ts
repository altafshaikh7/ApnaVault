import { Router } from 'express';
import { healthRouter } from './health.js';
import { authRouter } from './auth.js';

export const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
