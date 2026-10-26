import { describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import { getDatabaseStatus, isDatabaseReady, connectDatabase, sanitizeMongoUri } from '../config/database.js';

describe('Database Connection Lifecycle & Status Tracking', () => {
  it('sanitizeMongoUri should redact passwords from connection strings (PR-03)', () => {
    const rawUri = 'mongodb+srv://admin_user:superSecretPassword987!@cluster0.mongodb.net/apnavault?retryWrites=true';
    const sanitized = sanitizeMongoUri(rawUri);

    expect(sanitized).toBe('mongodb+srv://admin_user:***@cluster0.mongodb.net/apnavault?retryWrites=true');
    expect(sanitized).not.toContain('superSecretPassword987!');

    // URI without password
    const noAuthUri = 'mongodb://127.0.0.1:27017/apnavault';
    expect(sanitizeMongoUri(noAuthUri)).toBe(noAuthUri);
  });

  it('connectDatabase should redact credentials when logging connection failures (PR-03)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const connectSpy = vi.spyOn(mongoose, 'connect').mockRejectedValueOnce(
      new Error('Failed to connect to mongodb://vault_admin:superSecretPass456@127.0.0.1:9999/apnavault_invalid: connection closed')
    );
    const credentialedInvalidUri = 'mongodb://vault_admin:superSecretPass456@127.0.0.1:9999/apnavault_invalid';

    const result = await connectDatabase(credentialedInvalidUri);
    expect(result).toBe(false);

    const errorCalls = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(errorCalls).not.toContain('superSecretPass456');
    expect(errorCalls).toContain('vault_admin:***@');

    connectSpy.mockRestore();
    consoleSpy.mockRestore();
  });
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
