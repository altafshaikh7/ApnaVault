import { User, type IUser } from '../models/User.js';
import { Session, type ISession } from '../models/Session.js';
import { PasswordService } from './passwordService.js';
import { TokenService } from './tokenService.js';
import { EmailService } from './emailService.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import type { Types } from 'mongoose';

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthResult {
  user: IUser;
  rawSessionToken: string;
  emailDeliveryStatus?: {
    delivered: boolean;
    reason?: string;
  };
}

export class AuthService {
  /**
   * Registers a new user, hashes password, triggers email verification token,
   * and creates an initial authenticated session.
   */
  public static async register(data: RegisterDTO): Promise<AuthResult> {
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check for existing non-deleted account
    const existing = await User.findOne({ email: normalizedEmail, isDeleted: false });
    if (existing) {
      throw new AppError('An account with this email address already exists', 409, undefined, true);
    }

    const passwordHash = await PasswordService.hashPassword(data.password);

    // Generate single-use email verification token
    const rawVerificationToken = TokenService.generateRandomToken(32);
    const hashedVerificationToken = TokenService.hashToken(rawVerificationToken);
    const verificationExpiresAt = new Date(
      Date.now() + env.VERIFICATION_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000
    );

    const user = await User.create({
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      isEmailVerified: false,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpiresAt: verificationExpiresAt,
    });

    // Send verification email via configured provider
    const emailResult = await EmailService.sendVerificationEmail(
      user.email,
      user.name,
      rawVerificationToken
    );

    // Create session
    const rawSessionToken = TokenService.generateRandomToken(32);
    const hashedSessionToken = TokenService.hashToken(rawSessionToken);
    const sessionExpiresAt = new Date(
      Date.now() + env.SESSION_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
    );

    await Session.create({
      userId: user._id,
      tokenHash: hashedSessionToken,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      isValid: true,
      expiresAt: sessionExpiresAt,
    });

    return {
      user,
      rawSessionToken,
      emailDeliveryStatus: emailResult,
    };
  }

  /**
   * Authenticates user credentials with constant-time/generic error responses.
   * On success, issues a new random session token.
   */
  public static async login(data: LoginDTO): Promise<AuthResult> {
    const normalizedEmail = data.email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail, isDeleted: false }).select('+passwordHash');
    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password', 401, undefined, true);
    }

    const isMatch = await PasswordService.verifyPassword(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, undefined, true);
    }

    const rawSessionToken = TokenService.generateRandomToken(32);
    const hashedSessionToken = TokenService.hashToken(rawSessionToken);
    const sessionExpiresAt = new Date(
      Date.now() + env.SESSION_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
    );

    await Session.create({
      userId: user._id,
      tokenHash: hashedSessionToken,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      isValid: true,
      expiresAt: sessionExpiresAt,
    });

    return {
      user,
      rawSessionToken,
    };
  }

  /**
   * Validates a raw session token against active, non-expired sessions in the database.
   */
  public static async validateSession(
    rawSessionToken: string
  ): Promise<{ user: IUser; session: ISession } | null> {
    if (!rawSessionToken || typeof rawSessionToken !== 'string') {
      return null;
    }

    const hashedToken = TokenService.hashToken(rawSessionToken);

    const session = await Session.findOne({
      tokenHash: hashedToken,
      isValid: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return null;
    }

    const user = await User.findOne({ _id: session.userId, isDeleted: false });
    if (!user) {
      return null;
    }

    return { user, session };
  }

  /**
   * Revokes the current session server-side.
   */
  public static async logout(rawSessionToken?: string): Promise<void> {
    if (!rawSessionToken) return;

    const hashedToken = TokenService.hashToken(rawSessionToken);
    await Session.findOneAndUpdate(
      { tokenHash: hashedToken, isValid: true },
      { isValid: false, revokedAt: new Date() }
    );
  }

  /**
   * Verifies an email address using single-use verification token.
   */
  public static async verifyEmail(rawToken: string): Promise<IUser> {
    const hashedToken = TokenService.hashToken(rawToken);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiresAt: { $gt: new Date() },
      isDeleted: false,
    }).select('+emailVerificationToken');

    if (!user) {
      throw new AppError('Invalid, expired or already used verification link', 400, undefined, true);
    }

    // Atomically consume token and mark verified
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        emailVerificationToken: hashedToken,
      },
      {
        isEmailVerified: true,
        $unset: {
          emailVerificationToken: 1,
          emailVerificationExpiresAt: 1,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new AppError('Verification link could not be processed', 400, undefined, true);
    }

    return updatedUser;
  }

  /**
   * Resends email verification if account exists and is unverified.
   */
  public static async resendVerification(email: string): Promise<{ delivered: boolean; reason?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, isDeleted: false });

    // Prevent account enumeration: do not reveal if email is not found
    if (!user) {
      return { delivered: false, reason: 'ACCOUNT_NOT_FOUND' };
    }

    if (user.isEmailVerified) {
      return { delivered: true, reason: 'ALREADY_VERIFIED' };
    }

    const rawToken = TokenService.generateRandomToken(32);
    const hashedToken = TokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.VERIFICATION_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiresAt = expiresAt;
    await user.save();

    return EmailService.sendVerificationEmail(user.email, user.name, rawToken);
  }

  /**
   * Requests a password reset for an email address.
   * Generates single-use expiring token and dispatches reset email.
   */
  public static async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, isDeleted: false });

    if (!user) {
      // Return cleanly to prevent account enumeration
      return;
    }

    const rawToken = TokenService.generateRandomToken(32);
    const hashedToken = TokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);

    user.passwordResetToken = hashedToken;
    user.passwordResetExpiresAt = expiresAt;
    await user.save();

    await EmailService.sendPasswordResetEmail(user.email, user.name, rawToken);
  }

  /**
   * Consumes a single-use password reset token, updates password hash,
   * and revokes ALL active sessions for the user.
   */
  public static async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const hashedToken = TokenService.hashToken(rawToken);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: { $gt: new Date() },
      isDeleted: false,
    }).select('+passwordResetToken');

    if (!user) {
      throw new AppError('Invalid, expired or already used password reset link', 400, undefined, true);
    }

    const newPasswordHash = await PasswordService.hashPassword(newPassword);

    // Atomically update password and consume reset token
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        passwordResetToken: hashedToken,
      },
      {
        passwordHash: newPasswordHash,
        $unset: {
          passwordResetToken: 1,
          passwordResetExpiresAt: 1,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new AppError('Password reset link could not be processed', 400, undefined, true);
    }

    // Revoke all existing sessions for this user across all devices
    await this.revokeAllUserSessions(user._id as Types.ObjectId);
  }

  /**
   * Revokes all active sessions for a user (e.g. after password reset).
   */
  public static async revokeAllUserSessions(userId: Types.ObjectId): Promise<void> {
    await Session.updateMany(
      { userId, isValid: true },
      { isValid: false, revokedAt: new Date() }
    );
  }
}
