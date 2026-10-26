import { z } from 'zod';

export const passwordPolicySchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: passwordPolicySchema,
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, 'Verification token is required'),
});

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Password reset token is required'),
  password: passwordPolicySchema,
});

// Profile update schema – allows only mutable fields.
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(100, 'Name cannot exceed 100 characters').optional(),
  phone: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
}).strict();
