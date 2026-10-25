import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { v1Router } from './routes/index.js';
import { healthRouter } from './routes/health.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sanitizeInput } from './middleware/sanitize.js';
import { standardRateLimiter } from './middleware/rateLimiter.js';
import { authenticateSession } from './middleware/authMiddleware.js';
import { validateCsrf } from './middleware/csrf.js';

export const app = express();

// Trust reverse proxy in production/deployment for secure cookies and accurate client IP
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security headers
app.use(helmet());

// Strict CORS configuration
app.use(
  cors({
    origin: [env.CLIENT_URL, env.FRONTEND_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'X-XSRF-Token'],
  })
);

// Cookie parsing
app.use(cookieParser(env.SESSION_SECRET));

// Body parsing with safe size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization against NoSQL injection
app.use(sanitizeInput);

// Global rate limiter
app.use(standardRateLimiter);

// Session authentication (resolves req.user / req.session if valid)
app.use(authenticateSession);

// CSRF validation on mutating requests
app.use(validateCsrf);

// Direct health alias and versioned API routes
app.use('/health', healthRouter);
app.use('/api/v1', v1Router);

// Centralized 404 and Error handling
app.use(notFoundHandler);
app.use(errorHandler);
