import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import {
  User,
  DocumentModel,
  Workspace,
  WorkspaceMember,
  DocumentPermission,
  Reminder,
  Notification,
  AuditLog,
  Invitation,
} from '../models/index.js';

describe('Database Model Schema Validations (In-Memory)', () => {
  const dummyId = new mongoose.Types.ObjectId();

  it('User model should require email, passwordHash, and valid email format', async () => {
    const invalidUser = new User({});
    const error = invalidUser.validateSync();

    expect(error?.errors.email).toBeDefined();
    expect(error?.errors.passwordHash).toBeDefined();
    expect(error?.errors.name).toBeDefined();

    const badEmailUser = new User({
      email: 'not-an-email',
      passwordHash: 'hash123',
      name: 'Test User',
    });
    const emailError = badEmailUser.validateSync();
    expect(emailError?.errors.email).toBeDefined();
  });

  it('Document model should validate required fields and enforce supported categories', async () => {
    const invalidCategoryDoc = new DocumentModel({
      title: 'Aadhaar Card',
      category: 'crypto_currency' as any, // Unsupported category
      storageKey: 'key_123',
      originalFileName: 'aadhaar.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      ownerId: dummyId,
    });

    const error = invalidCategoryDoc.validateSync();
    expect(error?.errors.category).toBeDefined();

    const validDoc = new DocumentModel({
      title: 'Aadhaar Card',
      category: 'identity',
      storageKey: 'unique_s3_key_123',
      originalFileName: 'aadhaar.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      ownerId: dummyId,
      isPersonal: true,
    });

    const validError = validDoc.validateSync();
    expect(validError).toBeUndefined();
  });

  it('Workspace model should require name and ownerId', () => {
    const invalidWorkspace = new Workspace({});
    const error = invalidWorkspace.validateSync();

    expect(error?.errors.name).toBeDefined();
    expect(error?.errors.ownerId).toBeDefined();
  });

  it('WorkspaceMember model should enforce valid roles', () => {
    const memberWithInvalidRole = new WorkspaceMember({
      workspaceId: dummyId,
      userId: dummyId,
      role: 'superadmin' as any, // Invalid role
    });

    const error = memberWithInvalidRole.validateSync();
    expect(error?.errors.role).toBeDefined();

    const validMember = new WorkspaceMember({
      workspaceId: dummyId,
      userId: dummyId,
      role: 'admin',
    });
    expect(validMember.validateSync()).toBeUndefined();
  });

  it('DocumentPermission model should enforce view, edit, admin permission levels', () => {
    const invalidPerm = new DocumentPermission({
      documentId: dummyId,
      grantedToUserId: dummyId,
      grantedByUserId: dummyId,
      permission: 'execute' as any,
    });
    expect(invalidPerm.validateSync()?.errors.permission).toBeDefined();

    const validPerm = new DocumentPermission({
      documentId: dummyId,
      grantedToUserId: dummyId,
      grantedByUserId: dummyId,
      permission: 'view',
    });
    expect(validPerm.validateSync()).toBeUndefined();
  });

  it('Reminder model should enforce valid daysBefore intervals', () => {
    const invalidReminder = new Reminder({
      documentId: dummyId,
      userId: dummyId,
      dueDate: new Date(),
      daysBefore: 999 as any, // Not an allowed interval
    });
    expect(invalidReminder.validateSync()?.errors.daysBefore).toBeDefined();

    const validReminder = new Reminder({
      documentId: dummyId,
      userId: dummyId,
      dueDate: new Date(),
      daysBefore: 30,
    });
    expect(validReminder.validateSync()).toBeUndefined();
  });

  it('Invitation model should validate required fields and status enum', () => {
    const invalidInvite = new Invitation({});
    const error = invalidInvite.validateSync();

    expect(error?.errors.workspaceId).toBeDefined();
    expect(error?.errors.email).toBeDefined();
    expect(error?.errors.token).toBeDefined();

    const badRoleInvite = new Invitation({ role: 'superadmin' as any });
    expect(badRoleInvite.validateSync()?.errors.role).toBeDefined();
  });

  it('Notification model should enforce notification types', () => {
    const invalidNotification = new Notification({
      userId: dummyId,
      type: 'marketing' as any,
      title: 'Promo',
      message: 'Discount',
    });
    expect(invalidNotification.validateSync()?.errors.type).toBeDefined();
  });

  it('AuditLog model should require action field', () => {
    const invalidAudit = new AuditLog({});
    expect(invalidAudit.validateSync()?.errors.action).toBeDefined();

    const validAudit = new AuditLog({
      action: 'user.login',
      status: 'success',
    });
    expect(validAudit.validateSync()).toBeUndefined();
  });
});
