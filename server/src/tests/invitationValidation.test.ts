import { describe, it, expect } from 'vitest';
import {
  sendInvitationSchema,
  respondInvitationParamsSchema,
  respondInvitationBodySchema,
} from '../validators/invitationValidators.js';
import { Invitation } from '../models/Invitation.js';
import mongoose from 'mongoose';

describe('Invitation Validators & Model Constraints', () => {
  describe('sendInvitationSchema', () => {
    it('should validate and normalize valid email and role', async () => {
      const parsed = await sendInvitationSchema.parseAsync({
        email: '  TEST.USER@Example.COM  ',
        role: 'admin',
      });
      expect(parsed.email).toBe('test.user@example.com');
      expect(parsed.role).toBe('admin');
    });

    it('should default role to "member" when omitted', async () => {
      const parsed = await sendInvitationSchema.parseAsync({
        email: 'member@example.com',
      });
      expect(parsed.role).toBe('member');
    });

    it('should reject invalid email address', async () => {
      await expect(
        sendInvitationSchema.parseAsync({ email: 'invalid-email', role: 'member' })
      ).rejects.toThrow();
    });

    it('should reject invalid role', async () => {
      await expect(
        sendInvitationSchema.parseAsync({ email: 'test@example.com', role: 'owner' as any })
      ).rejects.toThrow();

      await expect(
        sendInvitationSchema.parseAsync({ email: 'test@example.com', role: 'superadmin' as any })
      ).rejects.toThrow();
    });
  });

  describe('respondInvitationBodySchema', () => {
    it('should accept "accept"', async () => {
      const parsed = await respondInvitationBodySchema.parseAsync({ action: 'accept' });
      expect(parsed.action).toBe('accept');
    });

    it('should accept "decline"', async () => {
      const parsed = await respondInvitationBodySchema.parseAsync({ action: 'decline' });
      expect(parsed.action).toBe('decline');
    });

    it('should reject invalid action values', async () => {
      await expect(
        respondInvitationBodySchema.parseAsync({ action: 'maybe' as any })
      ).rejects.toThrow();

      await expect(
        respondInvitationBodySchema.parseAsync({ action: 'pending' as any })
      ).rejects.toThrow();
    });
  });

  describe('respondInvitationParamsSchema', () => {
    it('should accept non-empty invitationId', async () => {
      const parsed = await respondInvitationParamsSchema.parseAsync({
        invitationId: '65e0123456789abcdef01234',
      });
      expect(parsed.invitationId).toBe('65e0123456789abcdef01234');
    });

    it('should reject empty invitationId', async () => {
      await expect(
        respondInvitationParamsSchema.parseAsync({ invitationId: '   ' })
      ).rejects.toThrow();
    });
  });

  describe('Invitation Model Schema Validation', () => {
    const dummyId = new mongoose.Types.ObjectId();

    it('should require workspaceId, email, token, invitedBy, and expiresAt', () => {
      const inv = new Invitation({});
      const error = inv.validateSync();
      expect(error?.errors.workspaceId).toBeDefined();
      expect(error?.errors.email).toBeDefined();
      expect(error?.errors.token).toBeDefined();
      expect(error?.errors.invitedBy).toBeDefined();
      expect(error?.errors.expiresAt).toBeDefined();
    });

    it('should accept valid invitation document', () => {
      const inv = new Invitation({
        workspaceId: dummyId,
        email: 'valid@example.com',
        role: 'member',
        token: 'token1234567890abcdef',
        invitedBy: dummyId,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      expect(inv.validateSync()).toBeUndefined();
    });

    it('should reject invalid status', () => {
      const inv = new Invitation({
        workspaceId: dummyId,
        email: 'valid@example.com',
        role: 'member',
        token: 'token1234567890abcdef',
        invitedBy: dummyId,
        status: 'unknown_status' as any,
        expiresAt: new Date(),
      });
      const error = inv.validateSync();
      expect(error?.errors.status).toBeDefined();
    });
  });
});
