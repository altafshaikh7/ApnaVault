import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { v1Router } from './routes/index.js';
import { healthRouter } from './routes/health.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Security and middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Direct health alias and versioned API routes
app.use('/health', healthRouter);
app.use('/api/v1', v1Router);

// 404 and centralized error handling
app.use(notFoundHandler);
app.use(errorHandler);
