import { describe, expect, it } from 'vitest';
import { getCookieSecurityOptions } from '../config/cookieOptions.js';

describe('Cookie security options', () => {
  it('uses Secure and SameSite=None in production for cross-site cookies', () => {
    expect(getCookieSecurityOptions('production')).toEqual({
      secure: true,
      sameSite: 'none',
    });
  });

  it('keeps SameSite=Lax and non-Secure cookies for local development', () => {
    expect(getCookieSecurityOptions('development')).toEqual({
      secure: false,
      sameSite: 'lax',
    });
  });
});
