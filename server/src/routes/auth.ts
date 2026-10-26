import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  authLimiter,
  passwordResetLimiter,
  verificationLimiter,
} from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileUpdateSchema,
} from '../validators/authValidators.js';

export const authRouter = Router();

// CSRF Token
authRouter.get('/csrf-token', AuthController.getCsrfToken);

// Registration & Login
authRouter.post(
  '/register',
  authLimiter,
  validateRequest({ body: registerSchema }),
  AuthController.register
);

authRouter.post(
  '/login',
  authLimiter,
  validateRequest({ body: loginSchema }),
  AuthController.login
);

// Session Profile & Logout (Protected)
authRouter.get('/me', requireAuth, AuthController.getMe);
authRouter.put('/me', requireAuth, validateRequest({ body: profileUpdateSchema }), AuthController.updateMe);
authRouter.post('/logout', requireAuth, AuthController.logout);

// Email Verification
authRouter.post(
  '/verify-email',
  validateRequest({ body: verifyEmailSchema }),
  AuthController.verifyEmail
);

authRouter.post(
  '/resend-verification',
  verificationLimiter,
  validateRequest({ body: resendVerificationSchema }),
  AuthController.resendVerification
);

// Password Reset
authRouter.post(
  '/forgot-password',
  passwordResetLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  AuthController.forgotPassword
);

authRouter.post(
  '/reset-password',
  passwordResetLimiter,
  validateRequest({ body: resetPasswordSchema }),
  AuthController.resetPassword
);
