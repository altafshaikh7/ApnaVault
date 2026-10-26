import { Router } from 'express';
import { healthRouter } from './health.js';
import { authRouter } from './auth.js';
import { documentsRouter } from './documents.js';

export const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/documents', documentsRouter);
