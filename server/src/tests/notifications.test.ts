import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Notification } from '../models/Notification.js';
import { Invitation } from '../models/Invitation.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { EmailService } from '../services/emailService.js';

let mongod: MongoMemoryServer;

function getSessionCookie(res: any): string | undefined {
  const cookies = res.headers['set-cookie'] as string[] | undefined;
  return cookies?.find((c) => c.startsWith('apnavault_session='));
}

async function getCsrf() {
  const csrfRes = await request(app).get('/api/v1/auth/csrf-token');
  const rawCookieHeader = csrfRes.headers['set-cookie'];
  let csrfCookie: string | undefined;
  if (Array.isArray(rawCookieHeader)) {
    csrfCookie = rawCookieHeader.find((c) => c.startsWith('apnavault_csrf='));
  } else if (typeof rawCookieHeader === 'string') {
    csrfCookie = rawCookieHeader.startsWith('apnavault_csrf=') ? rawCookieHeader : undefined;
  }
  return { token: csrfRes.body.data.csrfToken as string, cookie: csrfCookie! };
}

async function registerUser(payload: { name: string; email: string; password: string }) {
  const res = await request(app).post('/api/v1/auth/register').send(payload);
  const sessionCookie = getSessionCookie(res)!;
  const user = await User.findOne({ email: payload.email });
  return { res, sessionCookie, user: user! };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
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
  await Notification.deleteMany({});
  await Invitation.deleteMany({});
  await Workspace.deleteMany({});
  await WorkspaceMember.deleteMany({});
  vi.spyOn(EmailService, 'sendVerificationEmail').mockResolvedValue({ delivered: false, reason: 'MOCKED' });
});

const userA = { name: 'Owner User', email: 'owner@example.com', password: 'Password123!' };
const userB = { name: 'Recipient User', email: 'recipient@example.com', password: 'Password123!' };

describe('Notification Bell & Unread Count API', () => {
  it('GET /api/v1/notifications/unread-count returns 0 when no unread notifications exist', async () => {
    const { sessionCookie } = await registerUser(userA);

    const res = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Cookie', [sessionCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unreadCount).toBe(0);
  });

  it('increments unread-count and creates notification when a family invitation is sent to user', async () => {
    const { sessionCookie: ownerCookie } = await registerUser(userA);
    const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

    const { sessionCookie: recipientCookie, user: recipient } = await registerUser(userB);

    // Initial recipient unread count is 0
    const initialRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Cookie', [recipientCookie]);
    expect(initialRes.body.data.unreadCount).toBe(0);

    // Owner sends invitation to recipient
    const inviteRes = await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', [ownerCookie, csrfCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({ email: userB.email, role: 'member' });
    expect(inviteRes.status).toBe(201);

    // Recipient checks unread count: should be 1
    const afterInviteRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Cookie', [recipientCookie]);

    expect(afterInviteRes.status).toBe(200);
    expect(afterInviteRes.body.data.unreadCount).toBe(1);

    // Verify Notification record in DB
    const notif = await Notification.findOne({ userId: recipient._id, type: 'workspace_invite' });
    expect(notif).toBeDefined();
    expect(notif!.isRead).toBe(false);
  });

  it('marks notification as read and decrements unread count', async () => {
    const { sessionCookie, user } = await registerUser(userA);
    const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

    // Create 2 notifications
    const notif1 = await Notification.create({
      userId: user._id,
      type: 'reminder',
      title: 'Reminder 1',
      message: 'Expiring soon',
      isRead: false,
    });
    await Notification.create({
      userId: user._id,
      type: 'reminder',
      title: 'Reminder 2',
      message: 'Expiring soon',
      isRead: false,
    });

    const countRes1 = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Cookie', [sessionCookie]);
    expect(countRes1.body.data.unreadCount).toBe(2);

    // Mark 1 as read
    const readRes = await request(app)
      .patch(`/api/v1/notifications/${notif1._id}/read`)
      .set('Cookie', [sessionCookie, csrfCookie])
      .set('X-CSRF-Token', csrfToken);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.unreadCount).toBe(1);

    const countRes2 = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Cookie', [sessionCookie]);
    expect(countRes2.body.data.unreadCount).toBe(1);
  });

  it('POST /api/v1/notifications/read-all marks all unread notifications as read (unread count = 0)', async () => {
    const { sessionCookie, user } = await registerUser(userA);
    const { token: csrfToken, cookie: csrfCookie } = await getCsrf();

    await Notification.create([
      { userId: user._id, type: 'reminder', title: 'R1', message: 'M1', isRead: false },
      { userId: user._id, type: 'reminder', title: 'R2', message: 'M2', isRead: false },
      { userId: user._id, type: 'reminder', title: 'R3', message: 'M3', isRead: false },
    ]);

    const res = await request(app)
      .post('/api/v1/notifications/read-all')
      .set('Cookie', [sessionCookie, csrfCookie])
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.data.unreadCount).toBe(0);

    const checkRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Cookie', [sessionCookie]);
    expect(checkRes.body.data.unreadCount).toBe(0);
  });

  it('marks invitation notification as read when recipient responds (accepts) invitation', async () => {
    const { sessionCookie: ownerCookie } = await registerUser(userA);
    const { token: csrfOwner, cookie: csrfOwnerCookie } = await getCsrf();

    const { sessionCookie: recipientCookie } = await registerUser(userB);
    const { token: csrfRec, cookie: csrfRecCookie } = await getCsrf();

    // Send invitation
    const invRes = await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', [ownerCookie, csrfOwnerCookie])
      .set('X-CSRF-Token', csrfOwner)
      .send({ email: userB.email, role: 'member' });
    const invitationId = invRes.body.data.invitation.id;

    // Recipient has 1 unread notification
    const unreadBefore = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Cookie', [recipientCookie]);
    expect(unreadBefore.body.data.unreadCount).toBe(1);

    // Recipient accepts invitation
    const acceptRes = await request(app)
      .patch(`/api/v1/invitations/${invitationId}/respond`)
      .set('Cookie', [recipientCookie, csrfRecCookie])
      .set('X-CSRF-Token', csrfRec)
      .send({ action: 'accept' });
    expect(acceptRes.status).toBe(200);

    // Recipient unread count should now be 0
    const unreadAfter = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Cookie', [recipientCookie]);
    expect(unreadAfter.body.data.unreadCount).toBe(0);
  });
});
