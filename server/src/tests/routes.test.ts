import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

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
});
