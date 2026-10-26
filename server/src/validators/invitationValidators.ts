import { z } from 'zod';

export const sendInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  role: z
    .enum(['admin', 'member', 'viewer'] as const, {
      message: 'Role must be one of: admin, member, viewer',
    })
    .default('member'),
});

export const respondInvitationParamsSchema = z.object({
  invitationId: z.string().trim().min(1, 'Invitation ID is required'),
});

export const respondInvitationBodySchema = z.object({
  action: z.enum(['accept', 'decline'] as const, {
    message: 'Action must be "accept" or "decline"',
  }),
});
