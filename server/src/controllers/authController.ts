import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { setSessionCookie, clearSessionCookie } from '../middleware/authMiddleware.js';
import { generateCsrfToken, setCsrfCookie } from '../middleware/csrf.js';

export class AuthController {
  public static getCsrfToken(_req: Request, res: Response): void {
    const token = generateCsrfToken();
    setCsrfCookie(res, token);
    sendSuccess(res, { csrfToken: token }, 'CSRF token initialized');
  }

  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;

      const result = await AuthService.register({
        name,
        email,
        password,
        userAgent,
        ipAddress,
      });

      setSessionCookie(res, result.rawSessionToken);

      sendSuccess(
        res,
        {
          user: result.user,
          emailDelivery: result.emailDeliveryStatus,
        },
        'Registration successful',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;

      const result = await AuthService.login({
        email,
        password,
        userAgent,
        ipAddress,
      });

      setSessionCookie(res, result.rawSessionToken);

      sendSuccess(
        res,
        {
          user: result.user,
        },
        'Signed in successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.sessionToken || req.cookies?.apnavault_session;
      if (token) {
        await AuthService.logout(token);
      }
      clearSessionCookie(res);
      sendSuccess(res, null, 'Signed out successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, { user: req.user }, 'Current session profile', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      const updatedUser = await AuthService.verifyEmail(token);
      sendSuccess(res, { user: updatedUser }, 'Email verified successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      await AuthService.resendVerification(email);
      sendSuccess(
        res,
        null,
        'If an unverified account exists, verification instructions have been dispatched',
        200
      );
    } catch (error) {
      next(error);
    }
  }

  public static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      await AuthService.forgotPassword(email);
      sendSuccess(
        res,
        null,
        'If an account exists with this email address, password reset instructions have been dispatched',
        200
      );
    } catch (error) {
      next(error);
    }
  }

  public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;
      await AuthService.resetPassword(token, password);
      clearSessionCookie(res);
      sendSuccess(
        res,
        null,
        'Password has been reset successfully. Please sign in with your new password.',
        200
      );
    } catch (error) {
      next(error);
    }
  }
}
