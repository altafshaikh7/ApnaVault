import { Resend } from 'resend';
import { env } from '../config/env.js';

export interface EmailDeliveryResult {
  delivered: boolean;
  messageId?: string;
  reason?: string;
}

export class EmailService {
  private static resendClient: Resend | null = null;

  public static isConfigured(): boolean {
    if (env.EMAIL_PROVIDER === 'resend' && Boolean(env.RESEND_API_KEY)) {
      return true;
    }
    return false;
  }

  private static getResend(): Resend | null {
    if (!this.resendClient && env.EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY) {
      this.resendClient = new Resend(env.RESEND_API_KEY);
    }
    return this.resendClient;
  }

  private static maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '[REDACTED_EMAIL]';
    const [local, domain] = parts;
    const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
    return `${maskedLocal}@${domain}`;
  }

  public static async sendVerificationEmail(
    to: string,
    name: string,
    rawToken: string
  ): Promise<EmailDeliveryResult> {
    const masked = this.maskEmail(to);

    if (!this.isConfigured()) {
      if (env.NODE_ENV !== 'test') {
        console.warn(`[EmailService] Email provider unconfigured. Verification email delivery skipped for: ${masked}`);
      }
      return {
        delivered: false,
        reason: 'EMAIL_PROVIDER_UNCONFIGURED',
      };
    }

    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;

    try {
      const resend = this.getResend();
      if (!resend) {
        return { delivered: false, reason: 'EMAIL_PROVIDER_UNAVAILABLE' };
      }

      const response = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: [to],
        subject: 'Verify your ApnaVault Account',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0f172a; margin-bottom: 8px;">Verify your ApnaVault Account</h2>
            <p style="color: #475569; font-size: 14px;">Namaste ${name},</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">
              Thank you for setting up your family document vault. Please verify your email address by clicking the button below:
            </p>
            <div style="margin: 24px 0;">
              <a href="${verificationUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #64748b; font-size: 12px;">This link will expire in ${env.VERIFICATION_TOKEN_EXPIRES_HOURS} hours. If you did not create an ApnaVault account, you can safely ignore this email.</p>
          </div>
        `,
      });

      if (response.error) {
        console.error(`[EmailService] Failed to deliver verification email to ${masked}:`, response.error.message);
        return { delivered: false, reason: response.error.message };
      }

      console.log(`[EmailService] Verification email sent to ${masked}. Message ID: ${response.data?.id}`);
      return { delivered: true, messageId: response.data?.id };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[EmailService] Unexpected error sending verification email to ${masked}:`, msg);
      return { delivered: false, reason: msg };
    }
  }

  public static async sendPasswordResetEmail(
    to: string,
    name: string,
    rawToken: string
  ): Promise<EmailDeliveryResult> {
    const masked = this.maskEmail(to);

    if (!this.isConfigured()) {
      if (env.NODE_ENV !== 'test') {
        console.warn(`[EmailService] Email provider unconfigured. Password reset delivery skipped for: ${masked}`);
      }
      return {
        delivered: false,
        reason: 'EMAIL_PROVIDER_UNCONFIGURED',
      };
    }

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    try {
      const resend = this.getResend();
      if (!resend) {
        return { delivered: false, reason: 'EMAIL_PROVIDER_UNAVAILABLE' };
      }

      const response = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: [to],
        subject: 'Reset your ApnaVault Password',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0f172a; margin-bottom: 8px;">Reset your ApnaVault Password</h2>
            <p style="color: #475569; font-size: 14px;">Namaste ${name},</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">
              We received a request to reset the password for your ApnaVault account. Click the button below to choose a new password:
            </p>
            <div style="margin: 24px 0;">
              <a href="${resetUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #64748b; font-size: 12px;">This single-use link expires in ${env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES} minutes. If you did not request a password reset, your account is safe and no action is needed.</p>
          </div>
        `,
      });

      if (response.error) {
        console.error(`[EmailService] Failed to deliver password reset to ${masked}:`, response.error.message);
        return { delivered: false, reason: response.error.message };
      }

      console.log(`[EmailService] Password reset email sent to ${masked}. Message ID: ${response.data?.id}`);
      return { delivered: true, messageId: response.data?.id };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[EmailService] Unexpected error sending password reset email to ${masked}:`, msg);
      return { delivered: false, reason: msg };
    }
  }
}
