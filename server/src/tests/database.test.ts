import { describe, it, expect } from 'vitest';
import { getDatabaseStatus, isDatabaseReady, connectDatabase } from '../config/database.js';

describe('Database Connection Lifecycle & Status Tracking', () => {
  it('getDatabaseStatus should return valid state and readyState', () => {
    const status = getDatabaseStatus();

    expect(status).toHaveProperty('state');
    expect(status).toHaveProperty('readyState');
    expect(status).toHaveProperty('isConnected');
    expect(['disconnected', 'connected', 'connecting', 'disconnecting']).toContain(status.state);
    expect([0, 1, 2, 3]).toContain(status.readyState);
  });

  it('isDatabaseReady should accurately reflect connection boolean', () => {
    const status = getDatabaseStatus();
    expect(isDatabaseReady()).toBe(status.readyState === 1);
  });

  it('connectDatabase should return false and not crash when provided an empty URI', async () => {
    const result = await connectDatabase('');
    expect(result).toBe(false);
  });
});
