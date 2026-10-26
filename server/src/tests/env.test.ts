import { describe, it, expect } from 'vitest';
import { validateEnv, DEFAULT_SESSION_SECRET } from '../config/env.js';

describe('Environment Configuration Validation', () => {
  it('should validate valid environment variables with default values', () => {
    const config = validateEnv({
      NODE_ENV: 'test',
      PORT: '5001',
      CLIENT_URL: 'http://localhost:5173',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/test_db',
    });

    expect(config.NODE_ENV).toBe('test');
    expect(config.PORT).toBe(5001);
    expect(config.CLIENT_URL).toBe('http://localhost:5173');
    expect(config.MONGODB_URI).toBe('mongodb://127.0.0.1:27017/test_db');
  });

  it('should use safe default values when optional variables are omitted', () => {
    const config = validateEnv({
      NODE_ENV: 'development',
    });

    expect(config.PORT).toBe(5000);
    expect(config.CLIENT_URL).toBe('http://localhost:5173');
    expect(config.RATE_LIMIT_WINDOW_MS).toBe(900000);
    expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(1000);
  });

  it('should treat blank Supabase settings as unconfigured', () => {
    const config = validateEnv({
      NODE_ENV: 'test',
      SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '   ',
    });

    expect(config.SUPABASE_URL).toBeUndefined();
    expect(config.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it('should throw an error when CLIENT_URL is not a valid URL', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'test',
        CLIENT_URL: 'invalid-url-string',
      })
    ).toThrow(/Environment validation failed/);
  });

  it('should throw an error when NODE_ENV is an unrecognized environment', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'staging' as any,
      })
    ).toThrow(/Environment validation failed/);
  });

  it('should throw an error when SESSION_SECRET uses the default value in production', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        SESSION_SECRET: DEFAULT_SESSION_SECRET,
      })
    ).toThrow(/SESSION_SECRET must be set to a secure custom value/);

    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
      })
    ).toThrow(/SESSION_SECRET must be set to a secure custom value/);
  });

  it('should accept a custom 32+ character SESSION_SECRET in production', () => {
    const config = validateEnv({
      NODE_ENV: 'production',
      SESSION_SECRET: 'a_very_secure_production_secret_key_12345',
    });

    expect(config.NODE_ENV).toBe('production');
    expect(config.SESSION_SECRET).toBe('a_very_secure_production_secret_key_12345');
  });
});
