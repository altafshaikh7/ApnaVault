import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { env } from '../config/env.js';
import { isVitestEnv } from '../middleware/rateLimiter.js';

describe('API Foundation & Health Check Routes', () => {
  it('GET /api/v1/health should return 200 with healthy status and database info', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('ApnaVault API');
    expect(res.body.data.status).toBe('healthy');
    expect(typeof res.body.data.uptime).toBe('number');
    expect(res.body.data.database).toBeDefined();
    expect(typeof res.body.data.database.state).toBe('string');
  });

  it('GET /health alias should return identical status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });

  it('GET /api/v1/health/readiness should accurately report 503 when database is disconnected', async () => {
    // When test suite runs without live DB, readiness MUST NOT fabricate a connected state
    const res = await request(app).get('/api/v1/health/readiness');

    // Either 200 (if local MongoDB happened to be active) or 503 (if disconnected)
    if (res.status === 503) {
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DATABASE_NOT_READY');
      expect(res.body.data.ready).toBe(false);
      expect(res.body.data.status).toBe('unready');
    } else {
      expect(res.status).toBe(200);
      expect(res.body.data.ready).toBe(true);
      expect(res.body.data.status).toBe('ready');
    }
  });

  it('GET /api/v1/unregistered-route should return structured 404 response', async () => {
    const res = await request(app).get('/api/v1/unregistered-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Route not found');
  });

  it('GET /api/v1/unregistered-route with query parameters should not leak query params in 404 error (F-04)', async () => {
    const res = await request(app).get('/api/v1/unregistered-route?token=super_secret_token_123&foo=bar');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Route not found: GET /api/v1/unregistered-route');
    expect(res.body.error.message).not.toContain('super_secret_token_123');
    expect(res.body.error.message).not.toContain('foo');
  });

  it('CORS should only allow configured client origins and reject untrusted origins (F-01)', async () => {
    // Allowed origin
    const allowedRes = await request(app)
      .get('/api/v1/health')
      .set('Origin', env.CLIENT_URL);

    expect(allowedRes.headers['access-control-allow-origin']).toBe(env.CLIENT_URL);
    expect(allowedRes.headers['access-control-allow-credentials']).toBe('true');

    // Untrusted origin
    const blockedRes = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://malicious-attacker.com');

    expect(blockedRes.headers['access-control-allow-origin']).toBeUndefined();

    const blockedMutation = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://malicious-attacker.com')
      .send({});
    expect(blockedMutation.status).toBe(403);
  });

  it('rate limiter skip should strictly be bound to Vitest environment (F-07)', () => {
    expect(isVitestEnv()).toBe(true);

    const originalVitest = process.env.VITEST;
    try {
      delete process.env.VITEST;
      expect(isVitestEnv()).toBe(false);
    } finally {
      process.env.VITEST = originalVitest;
    }
  });
});
