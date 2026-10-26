import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Invitation } from '../models/Invitation.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { EmailService } from '../services/emailService.js';

let mongod: MongoMemoryServer;

// Helper to extract session cookie
function getSessionCookie(res: any): string | undefined {
  const cookies = res.headers['set-cookie'] as string[] | undefined;
  return cookies?.find((c) => c.startsWith('apnavault_session='));
}

// Helper to get a fresh CSRF token cookie+value pair
async function getCsrf() {
  const csrfRes = await request(app).get('/api/v1/auth/csrf-token');
  const rawCookieHeader = csrfRes.headers['set-cookie'];
  let csrfCookie: string | undefined;
  if (Array.isArray(rawCookieHeader)) {
    csrfCookie = rawCookieHeader.find((c) => c.startsWith('apnavault_csrf='));
  } else if (typeof rawCookieHeader === 'string') {
    csrfCookie = (rawCookieHeader as string).startsWith('apnavault_csrf=')
      ? (rawCookieHeader as string)
      : undefined;
  }
  return { token: csrfRes.body.data.csrfToken as string, cookie: csrfCookie! };
}

// Register a user and return session cookie
async function registerUser(payload: { name: string; email: string; password: string }) {
  const res = await request(app).post('/api/v1/auth/register').send(payload);
  const sessionCookie = getSessionCookie(res)!;
  const user = await User.findOne({ email: payload.email });
  return { res, sessionCookie, user: user! };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}, 30000);

beforeEach(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
  await Invitation.deleteMany({});
  await Workspace.deleteMany({});
  await WorkspaceMember.deleteMany({});
  vi.spyOn(EmailService, 'sendVerificationEmail').mockResolvedValue({ delivered: false, reason: 'MOCKED_TEST' });
  vi.spyOn(EmailService, 'sendPasswordResetEmail').mockResolvedValue({ delivered: false, reason: 'MOCKED_TEST' });
});

const adminUser = { name: 'Admin User', email: 'admin@example.com', password: 'AdminPass123!' };
const recipientUser = { name: 'Recipient User', email: 'recipient@example.com', password: 'RecipPass123!' };
const otherUser = { name: 'Other User', email: 'other@example.com', password: 'OtherPass123!' };

describe('Family Invitations API', () => {

  // ─── Send Invitation ───────────────────────────────────────────────────────

  describe('POST /api/v1/invitations — send invitation', () => {
    it('should create an invitation and return safe data (no token exposed)', async () => {
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

      const res = await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: recipientUser.email, role: 'member' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invitation.email).toBe(recipientUser.email);
      expect(res.body.data.invitation.role).toBe('member');
      expect(res.body.data.invitation.status).toBe('pending');
      // Token must NOT be in response
      expect(res.body.data.invitation.token).toBeUndefined();
    });

    it('should persist invitation in database linked to invitee email', async () => {
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

      await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: recipientUser.email, role: 'member' });

      const inv = await Invitation.findOne({ email: recipientUser.email });
      expect(inv).toBeTruthy();
      expect(inv!.status).toBe('pending');
      expect(inv!.email).toBe(recipientUser.email);
    });

    it('should reject unauthenticated invitation attempts with 401', async () => {
      const res = await request(app)
        .post('/api/v1/invitations')
        .send({ email: recipientUser.email, role: 'member' });
      expect(res.status).toBe(401);
    });

    it('should reject invalid email with 400', async () => {
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

      const res = await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'not-an-email', role: 'member' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid role with 400', async () => {
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

      const res = await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: recipientUser.email, role: 'superadmin' });

      expect(res.status).toBe(400);
    });

    it('should reject self-invitation with 400', async () => {
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

      const res = await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: adminUser.email, role: 'member' });

      expect(res.status).toBe(400);
    });

    it('should reject duplicate pending invitation with 409', async () => {
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

      await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: recipientUser.email, role: 'member' });

      const { token: csrf2, cookie: csrf2Cookie } = await getCsrf();
      const res = await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrf2Cookie])
        .set('X-CSRF-Token', csrf2)
        .send({ email: recipientUser.email, role: 'member' });

      expect(res.status).toBe(409);
    });
  });

  // ─── Get My Invitations ────────────────────────────────────────────────────

  describe('GET /api/v1/invitations/mine — recipient retrieves their invitations', () => {
    it('should return pending invitations for the authenticated recipient', async () => {
      // Admin sends invitation to recipient
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();
      await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: recipientUser.email, role: 'member' });

      // Recipient logs in and fetches their invitations
      const { sessionCookie: recipientCookie } = await registerUser(recipientUser);
      const res = await request(app)
        .get('/api/v1/invitations/mine')
        .set('Cookie', [recipientCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invitations).toHaveLength(1);
      expect(res.body.data.invitations[0].role).toBe('member');
      expect(res.body.data.invitations[0].status).toBe('pending');
    });

    it('should return empty list when no pending invitations exist', async () => {
      const { sessionCookie: recipientCookie } = await registerUser(recipientUser);
      const res = await request(app)
        .get('/api/v1/invitations/mine')
        .set('Cookie', [recipientCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.invitations).toHaveLength(0);
    });

    it('should not show invitations addressed to a different email', async () => {
      // Admin invites recipient
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();
      await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: recipientUser.email, role: 'member' });

      // OTHER user fetches their invitations — should see nothing
      const { sessionCookie: otherCookie } = await registerUser(otherUser);
      const res = await request(app)
        .get('/api/v1/invitations/mine')
        .set('Cookie', [otherCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.invitations).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/v1/invitations/mine');
      expect(res.status).toBe(401);
    });
  });

  // ─── Accept/Decline ────────────────────────────────────────────────────────

  describe('PATCH /api/v1/invitations/:id/respond — accept or decline', () => {
    async function setupInvitation() {
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();
      const invRes = await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: recipientUser.email, role: 'member' });

      const invitationId = invRes.body.data.invitation.id as string;
      const { sessionCookie: recipientCookie } = await registerUser(recipientUser);
      return { invitationId, recipientCookie, adminCookie };
    }

    it('should allow recipient to accept invitation and add them as workspace member', async () => {
      const { invitationId, recipientCookie } = await setupInvitation();
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

      const res = await request(app)
        .patch(`/api/v1/invitations/${invitationId}/respond`)
        .set('Cookie', [recipientCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ action: 'accept' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify DB status
      const inv = await Invitation.findById(invitationId);
      expect(inv!.status).toBe('accepted');
      expect(inv!.acceptedAt).toBeDefined();

      // Verify workspace membership created
      const recipientInDb = await User.findOne({ email: recipientUser.email });
      const member = await WorkspaceMember.findOne({ userId: recipientInDb!._id });
      expect(member).toBeTruthy();
      expect(member!.role).toBe('member');
    });

    it('should allow recipient to decline invitation', async () => {
      const { invitationId, recipientCookie } = await setupInvitation();
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

      const res = await request(app)
        .patch(`/api/v1/invitations/${invitationId}/respond`)
        .set('Cookie', [recipientCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ action: 'decline' });

      expect(res.status).toBe(200);

      const inv = await Invitation.findById(invitationId);
      expect(inv!.status).toBe('declined');

      // No workspace member created
      const recipientInDb = await User.findOne({ email: recipientUser.email });
      const member = await WorkspaceMember.findOne({ userId: recipientInDb!._id });
      expect(member).toBeNull();
    });

    it('should prevent a different user from responding to another user invitation', async () => {
      const { invitationId } = await setupInvitation();
      const { sessionCookie: otherCookie } = await registerUser(otherUser);
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

      const res = await request(app)
        .patch(`/api/v1/invitations/${invitationId}/respond`)
        .set('Cookie', [otherCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ action: 'accept' });

      expect(res.status).toBe(403);
    });

    it('should reject duplicate response to already-accepted invitation with 409', async () => {
      const { invitationId, recipientCookie } = await setupInvitation();
      const { token: csrf1, cookie: csrf1Cookie } = await getCsrf();

      await request(app)
        .patch(`/api/v1/invitations/${invitationId}/respond`)
        .set('Cookie', [recipientCookie, csrf1Cookie])
        .set('X-CSRF-Token', csrf1)
        .send({ action: 'accept' });

      const { token: csrf2, cookie: csrf2Cookie } = await getCsrf();
      const res = await request(app)
        .patch(`/api/v1/invitations/${invitationId}/respond`)
        .set('Cookie', [recipientCookie, csrf2Cookie])
        .set('X-CSRF-Token', csrf2)
        .send({ action: 'accept' });

      expect(res.status).toBe(409);
    });

    it('should return 400 for invalid action value', async () => {
      const { invitationId, recipientCookie } = await setupInvitation();
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

      const res = await request(app)
        .patch(`/api/v1/invitations/${invitationId}/respond`)
        .set('Cookie', [recipientCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ action: 'maybe' });

      expect(res.status).toBe(400);
    });

    it('should require authentication', async () => {
      const { invitationId } = await setupInvitation();
      const res = await request(app)
        .patch(`/api/v1/invitations/${invitationId}/respond`)
        .send({ action: 'accept' });
      expect(res.status).toBe(401);
    });
  });

  // ─── Cancel Invitation ─────────────────────────────────────────────────────

  describe('DELETE /api/v1/invitations/:id — cancel invitation', () => {
    it('should allow sender to cancel a pending invitation', async () => {
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrf1, cookie: csrf1Cookie } = await getCsrf();

      const invRes = await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrf1Cookie])
        .set('X-CSRF-Token', csrf1)
        .send({ email: recipientUser.email, role: 'member' });

      const invitationId = invRes.body.data.invitation.id as string;
      const { token: csrf2, cookie: csrf2Cookie } = await getCsrf();

      const res = await request(app)
        .delete(`/api/v1/invitations/${invitationId}`)
        .set('Cookie', [adminCookie, csrf2Cookie])
        .set('X-CSRF-Token', csrf2);

      expect(res.status).toBe(200);
      const inv = await Invitation.findById(invitationId);
      expect(inv!.status).toBe('cancelled');
    });

    it('should prevent non-sender from cancelling invitation', async () => {
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrf1, cookie: csrf1Cookie } = await getCsrf();
      const invRes = await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrf1Cookie])
        .set('X-CSRF-Token', csrf1)
        .send({ email: recipientUser.email, role: 'member' });

      const invitationId = invRes.body.data.invitation.id as string;
      const { sessionCookie: otherCookie } = await registerUser(otherUser);
      const { token: csrf2, cookie: csrf2Cookie } = await getCsrf();

      const res = await request(app)
        .delete(`/api/v1/invitations/${invitationId}`)
        .set('Cookie', [otherCookie, csrf2Cookie])
        .set('X-CSRF-Token', csrf2);

      expect(res.status).toBe(403);
    });
  });

  // ─── Sent Invitations ──────────────────────────────────────────────────────

  describe('GET /api/v1/invitations/sent — admin sees sent invitations', () => {
    it('should return invitations sent by the admin', async () => {
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrfToken, cookie: csrfCookie } = await getCsrf();
      await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: recipientUser.email, role: 'member' });

      const res = await request(app)
        .get('/api/v1/invitations/sent')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.invitations).toHaveLength(1);
      expect(res.body.data.invitations[0].email).toBe(recipientUser.email);
      // Token must not be in response
      expect(res.body.data.invitations[0].token).toBeUndefined();
    });
  });

  // ─── Workspace Member Removal ──────────────────────────────────────────────

  describe('DELETE /api/v1/invitations/workspace/members/:memberId', () => {
    it('should allow workspace owner to remove a member', async () => {
      // Admin registers
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrfAdmin, cookie: csrfAdminCookie } = await getCsrf();

      // Recipient registers
      const { user: recUser, sessionCookie: recipientCookie } = await registerUser(recipientUser);
      const { token: csrfRec, cookie: csrfRecCookie } = await getCsrf();

      // Admin sends invitation
      const invRes = await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrfAdminCookie])
        .set('X-CSRF-Token', csrfAdmin)
        .send({ email: recipientUser.email, role: 'member' });
      const invitationId = invRes.body.data.invitation.id;

      // Recipient accepts
      await request(app)
        .patch(`/api/v1/invitations/${invitationId}/respond`)
        .set('Cookie', [recipientCookie, csrfRecCookie])
        .set('X-CSRF-Token', csrfRec)
        .send({ action: 'accept' });

      // Verify recipient is a member
      const memberBefore = await WorkspaceMember.findOne({ userId: recUser._id });
      expect(memberBefore).toBeDefined();

      // Owner removes the member
      const removeRes = await request(app)
        .delete(`/api/v1/invitations/workspace/members/${recUser._id}`)
        .set('Cookie', [adminCookie, csrfAdminCookie])
        .set('X-CSRF-Token', csrfAdmin);

      expect(removeRes.status).toBe(200);
      expect(removeRes.body.success).toBe(true);

      // Verify membership is deleted in MongoDB
      const memberAfter = await WorkspaceMember.findOne({ userId: recUser._id });
      expect(memberAfter).toBeNull();
    });

    it('should prevent removing the workspace owner', async () => {
      const { user: admin, sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrf, cookie: csrfCookie } = await getCsrf();

      // Provision workspace
      await request(app).get('/api/v1/invitations/workspace').set('Cookie', [adminCookie]);

      const res = await request(app)
        .delete(`/api/v1/invitations/workspace/members/${admin._id}`)
        .set('Cookie', [adminCookie, csrfCookie])
        .set('X-CSRF-Token', csrf);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('owner cannot be removed');
    });

    it('should prevent non-admin/non-owner from removing members', async () => {
      const { sessionCookie: adminCookie } = await registerUser(adminUser);
      const { token: csrfAdmin, cookie: csrfAdminCookie } = await getCsrf();

      const { user: recUser, sessionCookie: recipientCookie } = await registerUser(recipientUser);
      const { token: csrfRec, cookie: csrfRecCookie } = await getCsrf();

      const { user: targetUser } = await registerUser(otherUser);

      // Invite recipient as viewer
      const invRes = await request(app)
        .post('/api/v1/invitations')
        .set('Cookie', [adminCookie, csrfAdminCookie])
        .set('X-CSRF-Token', csrfAdmin)
        .send({ email: recipientUser.email, role: 'viewer' });

      await request(app)
        .patch(`/api/v1/invitations/${invRes.body.data.invitation.id}/respond`)
        .set('Cookie', [recipientCookie, csrfRecCookie])
        .set('X-CSRF-Token', csrfRec)
        .send({ action: 'accept' });

      // Recipient (viewer) attempts to remove targetUser
      const res = await request(app)
        .delete(`/api/v1/invitations/workspace/members/${targetUser._id}`)
        .set('Cookie', [recipientCookie, csrfRecCookie])
        .set('X-CSRF-Token', csrfRec);

      expect(res.status).toBe(403);
    });
  });
});
