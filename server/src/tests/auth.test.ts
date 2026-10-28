// Helper to get CSRF cookie
function getCsrfCookie(res: any): string | undefined {
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  return cookies?.find((c) => c.startsWith('apnavault_csrf='));
}

// Helper to get session cookie
function getSessionCookie(res: any): string | undefined {
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  return cookies?.find((c) => c.startsWith('apnavault_session='));
}

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { TokenService } from '../services/tokenService.js';
import { PasswordService } from '../services/passwordService.js';
import { EmailService } from '../services/emailService.js';
import { env } from '../config/env.js';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  // Extend timeout for MongoMemoryServer startup on CI/slow environments
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}, 30000);

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

describe('Phase 4: Complete Authentication System', () => {
  const validUserPayload = {
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    password: 'SecurePassword123!',
  };

  describe('Registration (POST /api/v1/auth/register)', () => {
    it('should register a new user, hash password, set HttpOnly cookie, and return safe user DTO', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(validUserPayload.email);
      expect(res.body.data.user.name).toBe(validUserPayload.name);
      expect(res.body.data.user.isEmailVerified).toBe(false);

      // Verify no sensitive tokens or password hashes in response
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.emailVerificationToken).toBeUndefined();
      expect(res.body.data.user.passwordResetToken).toBeUndefined();

      // Verify cookie security attributes
      const cookieHeader = getSessionCookie(res);
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('Path=/');

      // Verify database record
      const dbUser = await User.findOne({ email: validUserPayload.email }).select('+passwordHash +emailVerificationToken');
      expect(dbUser).toBeDefined();
      expect(dbUser!.passwordHash).not.toBe(validUserPayload.password);
      expect(await PasswordService.verifyPassword(validUserPayload.password, dbUser!.passwordHash)).toBe(true);
      expect(dbUser!.emailVerificationToken).toBeDefined();
    });

    it('should reject duplicate email registration with a 409 Conflict error', async () => {
      await request(app).post('/api/v1/auth/register').send(validUserPayload);

      const duplicateRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUserPayload,
          name: 'Different Name',
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error.message).toContain('already exists');
    });

    it('should reject registration with weak passwords failing policy', async () => {
      const weakPasswords = [
        'short1!', // < 8 chars
        'alllowercase123!', // No uppercase
        'ALLUPPERCASE123!', // No lowercase
        'NoSpecialChar123', // No symbol
        'NoNumbersHere!@#', // No digits
      ];

      for (const password of weakPasswords) {
        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({ ...validUserPayload, password });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUserPayload, email: 'not-a-valid-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Login (POST /api/v1/auth/login)', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUserPayload);
    });

    it('should log in successfully with valid credentials and issue an active session', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: validUserPayload.email,
        password: validUserPayload.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUserPayload.email);

      // Verify cookie
      const cookieHeader = getSessionCookie(res);
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader).toContain('HttpOnly');

      // Verify active session in DB
      const sessionCount = await Session.countDocuments({ isValid: true });
      expect(sessionCount).toBeGreaterThanOrEqual(1);
    });

    it('should log in from the configured browser origin with matching CSRF cookie and header', async () => {
      const csrfRes = await request(app)
        .get('/api/v1/auth/csrf-token')
        .set('Origin', env.CLIENT_URL);
      const csrfToken = csrfRes.body.data.csrfToken as string;
      const csrfCookie = getCsrfCookie(csrfRes)?.split(';', 1)[0];

      expect(csrfToken).toHaveLength(64);
      expect(csrfCookie).toBe(`apnavault_csrf=${csrfToken}`);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', env.CLIENT_URL)
        .set('Cookie', csrfCookie!)
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: validUserPayload.email,
          password: validUserPayload.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(validUserPayload.email);
      expect(getSessionCookie(res)).toContain('HttpOnly');
    });

    it('should reject a browser-origin login when the CSRF header and cookie do not match', async () => {
      const csrfRes = await request(app).get('/api/v1/auth/csrf-token');
      const csrfCookie = getCsrfCookie(csrfRes)?.split(';', 1)[0];

      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', env.CLIENT_URL)
        .set('Cookie', csrfCookie!)
        .set('X-CSRF-Token', 'mismatched-csrf-token')
        .send({
          email: validUserPayload.email,
          password: validUserPayload.password,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('CSRF token');
    });

    it('should reject a browser-origin login when the CSRF cookie is missing', async () => {
      const csrfRes = await request(app).get('/api/v1/auth/csrf-token');
      const csrfToken = csrfRes.body.data.csrfToken as string;

      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', env.CLIENT_URL)
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: validUserPayload.email,
          password: validUserPayload.password,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('CSRF token');
    });

    it('should normalize email casing and whitespace on login', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: '   AARAV.sharma@EXAMPLE.com   ',
        password: validUserPayload.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return a generic 401 error for incorrect password without revealing details', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: validUserPayload.email,
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return a generic 401 error for nonexistent email', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent.user@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('CSRF token endpoint (GET /api/v1/auth/csrf-token)', () => {
    it('should return a token and set a matching frontend-readable cookie', async () => {
      const res = await request(app)
        .get('/api/v1/auth/csrf-token')
        .set('Origin', env.CLIENT_URL);

      const cookie = getCsrfCookie(res);
      expect(res.status).toBe(200);
      expect(res.body.data.csrfToken).toMatch(/^[a-f0-9]{64}$/);
      expect(cookie).toContain(`apnavault_csrf=${res.body.data.csrfToken}`);
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).not.toContain('HttpOnly');
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['access-control-allow-origin']).toBe(env.CLIENT_URL);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Current User & Protected Routes (GET /api/v1/auth/me)', () => {
    it('should return the authenticated user profile when a valid session cookie is provided', async () => {
      const loginRes = await request(app).post('/api/v1/auth/register').send(validUserPayload);
      const sessionCookie = getSessionCookie(loginRes);

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [sessionCookie!]);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe(validUserPayload.email);
      expect(meRes.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject requests without a session cookie with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject requests with an expired session', async () => {
      const loginRes = await request(app).post('/api/v1/auth/register').send(validUserPayload);
      const sessionCookie = getSessionCookie(loginRes);

      // Manually expire all sessions in the DB
      await Session.updateMany({}, { expiresAt: new Date(Date.now() - 10000) });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [sessionCookie!]);

      expect(res.status).toBe(401);
    });

    it('should reject requests with a revoked session', async () => {
      const loginRes = await request(app).post('/api/v1/auth/register').send(validUserPayload);
      const sessionCookie = getSessionCookie(loginRes);

      // Manually revoke the session in DB
      await Session.updateMany({}, { isValid: false, revokedAt: new Date() });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [sessionCookie!]);

      expect(res.status).toBe(401);
    });
  });

  describe('Logout (POST /api/v1/auth/logout)', () => {
    it('should revoke session in database and clear session cookie', async () => {
      // 1. Get CSRF token
      const csrfRes = await request(app).get('/api/v1/auth/csrf-token');
      const csrfCookie = getCsrfCookie(csrfRes);
      const csrfToken = csrfRes.body.data.csrfToken;

      // 2. Register
      const regRes = await request(app).post('/api/v1/auth/register').send(validUserPayload);
      const sessionCookie = getSessionCookie(regRes);

      // 3. Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [sessionCookie!, csrfCookie!])
        .set('X-CSRF-Token', csrfToken);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Verify session revoked in database
      const activeSessions = await Session.find({ isValid: true });
      expect(activeSessions.length).toBe(0);

      // 4. Verify subsequent request with old cookie fails with 401
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [sessionCookie!]);

      expect(meRes.status).toBe(401);
    });
  });

  describe('Email Verification (POST /api/v1/auth/verify-email)', () => {
    it('should verify email address with valid single-use token', async () => {
      await request(app).post('/api/v1/auth/register').send(validUserPayload);

      // Retrieve user and set a known token
      const rawToken = TokenService.generateRandomToken(32);
      const hashedToken = TokenService.hashToken(rawToken);

      await User.updateOne(
        { email: validUserPayload.email },
        {
          emailVerificationToken: hashedToken,
          emailVerificationExpiresAt: new Date(Date.now() + 3600 * 1000),
          isEmailVerified: false,
        }
      );

      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: rawToken });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.user.isEmailVerified).toBe(true);

      // Verify token was consumed and cleared
      const updatedUser = await User.findOne({ email: validUserPayload.email }).select('+emailVerificationToken');
      expect(updatedUser!.isEmailVerified).toBe(true);
      expect(updatedUser!.emailVerificationToken).toBeUndefined();

      // Verify token cannot be reused
      const reuseRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: rawToken });

      expect(reuseRes.status).toBe(400);
    });

    it('should reject expired verification tokens', async () => {
      const rawToken = TokenService.generateRandomToken(32);
      const hashedToken = TokenService.hashToken(rawToken);

      await User.create({
        name: 'Expired Test',
        email: 'expired@example.com',
        passwordHash: 'hash',
        isEmailVerified: false,
        emailVerificationToken: hashedToken,
        emailVerificationExpiresAt: new Date(Date.now() - 10000), // Expired
      });

      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: rawToken });

      expect(res.status).toBe(400);
    });

    it('should return uniform generic response for resend-verification without leaking account existence (F-05)', async () => {
      // 1. Non-existent email
      const nonExistentRes = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'nonexistent.user.12345@example.com' });

      expect(nonExistentRes.status).toBe(200);
      expect(nonExistentRes.body.success).toBe(true);
      expect(nonExistentRes.body.data).toBeNull();
      expect(nonExistentRes.body.message).toContain('If an unverified account exists');
      expect(JSON.stringify(nonExistentRes.body)).not.toContain('ACCOUNT_NOT_FOUND');

      // 2. Existing unverified email
      await request(app).post('/api/v1/auth/register').send({
        name: 'Unverified Test',
        email: 'unverified.resend@example.com',
        password: 'SecurePassword123!',
      });

      const unverifiedRes = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'unverified.resend@example.com' });

      expect(unverifiedRes.status).toBe(200);
      expect(unverifiedRes.body.success).toBe(true);
      expect(unverifiedRes.body.data).toBeNull();
      expect(unverifiedRes.body.message).toContain('If an unverified account exists');

      // 3. Already verified email
      await User.updateOne({ email: 'unverified.resend@example.com' }, { isEmailVerified: true });

      const verifiedRes = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'unverified.resend@example.com' });

      expect(verifiedRes.status).toBe(200);
      expect(verifiedRes.body.success).toBe(true);
      expect(verifiedRes.body.data).toBeNull();
      expect(JSON.stringify(verifiedRes.body)).not.toContain('ALREADY_VERIFIED');

      // Responses must be completely indistinguishable
      expect(nonExistentRes.body).toEqual(unverifiedRes.body);
      expect(unverifiedRes.body).toEqual(verifiedRes.body);
    });
  });

  describe('Password Reset (Forgot & Reset Password)', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUserPayload);
    });

    it('forgot-password should return generic success response without account enumeration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: validUserPayload.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const unknownRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(unknownRes.status).toBe(200);
      expect(unknownRes.body.success).toBe(true);
    });

    it('should reset password with valid token and revoke all existing sessions', async () => {
      const rawResetToken = TokenService.generateRandomToken(32);
      const hashedToken = TokenService.hashToken(rawResetToken);

      await User.updateOne(
        { email: validUserPayload.email },
        {
          passwordResetToken: hashedToken,
          passwordResetExpiresAt: new Date(Date.now() + 3600 * 1000),
        }
      );

      const newPassword = 'NewSecretPassword999!';

      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawResetToken, password: newPassword });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify old sessions were revoked
      const activeSessions = await Session.find({ isValid: true });
      expect(activeSessions.length).toBe(0);

      // Verify login with old password fails
      const oldLoginRes = await request(app).post('/api/v1/auth/login').send({
        email: validUserPayload.email,
        password: validUserPayload.password,
      });
      expect(oldLoginRes.status).toBe(401);

      // Verify login with new password succeeds
      const newLoginRes = await request(app).post('/api/v1/auth/login').send({
        email: validUserPayload.email,
        password: newPassword,
      });
      expect(newLoginRes.status).toBe(200);

      // Verify token cannot be reused
      const reuseRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawResetToken, password: 'AnotherPassword123!' });

      expect(reuseRes.status).toBe(400);
    });
  });

  describe('CSRF Protection', () => {
    it('GET /api/v1/auth/csrf-token should issue a valid CSRF token and cookie', async () => {
      const res = await request(app).get('/api/v1/auth/csrf-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.csrfToken).toBe('string');
      expect(res.body.data.csrfToken.length).toBe(64);

      const csrfCookie = getCsrfCookie(res);
      expect(csrfCookie).toBeDefined();
    });

    it('should reject cookie-authenticated state-changing requests when CSRF token is missing', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validUserPayload);
      const sessionCookie = getSessionCookie(regRes);

      // Call logout without CSRF token
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [sessionCookie!]);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('CSRF');
    });

    it('should reject requests when CSRF token header does not match cookie', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validUserPayload);
      const sessionCookie = getSessionCookie(regRes);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [sessionCookie!, 'apnavault_csrf=valid_cookie_value'])
        .set('X-CSRF-Token', 'different_mismatched_value');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('CSRF');
    });

    it('should reject Bearer-authenticated state-changing requests from a browser origin when CSRF token is missing (F-02)', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        name: 'Bearer User',
        email: 'bearer.csrf@example.com',
        password: 'SecurePassword123!',
      });
      const cookieHeader = getSessionCookie(regRes);
      const tokenMatch = cookieHeader?.match(/apnavault_session=([^;]+)/);
      const rawToken = tokenMatch ? tokenMatch[1] : '';

      // Call logout with Bearer token AND an Origin header (browser context), but no CSRF token
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${rawToken}`)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('CSRF');
    });

    it('should allow Bearer-authenticated state-changing requests from non-browser callers without Origin header (F-02)', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        name: 'Mobile User',
        email: 'mobile.nocsrf@example.com',
        password: 'SecurePassword123!',
      });
      const cookieHeader = getSessionCookie(regRes);
      const tokenMatch = cookieHeader?.match(/apnavault_session=([^;]+)/);
      const rawToken = tokenMatch ? tokenMatch[1] : '';

      // Call logout with Bearer token from a non-browser caller (no Origin header, no Cookie)
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${rawToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
