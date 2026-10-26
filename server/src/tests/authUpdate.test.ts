import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { EmailService } from '../services/emailService.js';

// Helper to extract session cookie
function getSessionCookie(res: any): string | undefined {
  const cookies = res.headers['set-cookie'] as string[] | undefined;
  return cookies?.find((c) => c.startsWith('apnavault_session='));
}

let mongod: MongoMemoryServer;

beforeAll(async () => {
  // Extend timeout for MongoMemoryServer startup on CI/slow environments
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}, 20000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
  vi.spyOn(EmailService, 'sendVerificationEmail').mockResolvedValue({ delivered: false, reason: 'MOCKED_TEST' });
  vi.spyOn(EmailService, 'sendPasswordResetEmail').mockResolvedValue({ delivered: false, reason: 'MOCKED_TEST' });
});

// Helper to obtain CSRF token and cookie
async function getCsrf(sessionCookie: string) {
  const csrfRes = await request(app).get('/api/v1/auth/csrf-token');
  const rawCookieHeader = csrfRes.headers['set-cookie'];
  let csrfCookie: string | undefined;
  if (Array.isArray(rawCookieHeader)) {
    csrfCookie = rawCookieHeader.find((c) => c.startsWith('apnavault_csrf='));
  } else if (typeof rawCookieHeader === 'string') {
    csrfCookie = rawCookieHeader.startsWith('apnavault_csrf=') ? rawCookieHeader : undefined;
  }
  return { token: csrfRes.body.data.csrfToken, cookie: csrfCookie };
}

describe('Profile Update Endpoint (PUT /api/v1/auth/me)', () => {
  const userPayload = {
    name: 'Ravi Kumar',
    email: 'ravi.kumar@example.com',
    password: 'StrongPass123!',
  };

  it('should update name, phone, and timezone for authenticated user', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(userPayload);
    const sessionCookie = getSessionCookie(registerRes);
    expect(sessionCookie).toBeDefined();

    const { token: csrfToken, cookie: csrfCookie } = await getCsrf(sessionCookie!);

    const updateBody = { name: 'Ravi Updated', phone: '+91 99999 88888', timezone: 'UTC' };
    const updateRes = await request(app)
      .put('/api/v1/auth/me')
      .set('Cookie', [sessionCookie!, csrfCookie!])
      .set('X-CSRF-Token', csrfToken)
      .send(updateBody);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.user.name).toBe(updateBody.name);
    expect(updateRes.body.data.user.phone).toBe(updateBody.phone);
    expect(updateRes.body.data.user.timezone).toBe(updateBody.timezone);

    const meRes = await request(app).get('/api/v1/auth/me').set('Cookie', [sessionCookie!]);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.name).toBe(updateBody.name);
    expect(meRes.body.data.user.phone).toBe(updateBody.phone);
    expect(meRes.body.data.user.timezone).toBe(updateBody.timezone);
  });

  it('should reject unauthenticated update attempts with 401', async () => {
    const res = await request(app).put('/api/v1/auth/me').send({ name: 'No Auth' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid input (name too short)', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(userPayload);
    const sessionCookie = getSessionCookie(registerRes);
    const { token: csrfToken, cookie: csrfCookie } = await getCsrf(sessionCookie!);
    const res = await request(app)
      .put('/api/v1/auth/me')
      .set('Cookie', [sessionCookie!, csrfCookie!])
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject attempts to modify protected fields (email) with 400', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(userPayload);
    const sessionCookie = getSessionCookie(registerRes);
    const { token: csrfToken, cookie: csrfCookie } = await getCsrf(sessionCookie!);
    const res = await request(app)
      .put('/api/v1/auth/me')
      .set('Cookie', [sessionCookie!, csrfCookie!])
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'hacker@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
