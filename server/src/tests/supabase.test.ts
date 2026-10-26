import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSupabaseServerClient,
} from '../config/supabase.js';
import { SupabaseConfigurationError } from '../config/supabaseKey.js';
import { env } from '../config/env.js';
import { describeSmokeFailure } from '../scripts/supabaseSmokeDiagnostics.js';

const supabaseUrl = 'https://project.example';

function serviceRoleJwt(): string {
  const payload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
  return `header.${payload}.signature`;
}

describe('Supabase server client authorization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function captureStorageHeaders(
    key: string,
    storageAuthorizationJwt?: string
  ): Promise<Headers> {
    const fetchMock = vi.fn(async (
      _input: RequestInfo | URL,
      _init?: RequestInit
    ): Promise<Response> =>
      new Response(JSON.stringify({
        id: 'private-documents',
        name: 'private-documents',
        public: false,
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createSupabaseServerClient(supabaseUrl, key, storageAuthorizationJwt);
    const { data, error } = await client.storage.getBucket('private-documents');

    expect(error).toBeNull();
    expect(data?.public).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
    return new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
  }

  it('sends the sb_secret API key as apikey and the existing service-role JWT as Authorization', async () => {
    const secretKey = 'sb_secret_test-secret';
    const authorizationJwt = serviceRoleJwt();
    const headers = await captureStorageHeaders(secretKey, authorizationJwt);

    expect(headers.get('apikey')).toBe(secretKey);
    expect(headers.get('authorization')).toBe(`Bearer ${authorizationJwt}`);
    expect(headers.get('authorization')).not.toContain(secretKey);
  });

  it('continues to support a legacy service-role JWT as both SDK headers', async () => {
    const key = serviceRoleJwt();
    const headers = await captureStorageHeaders(key);

    expect(headers.get('apikey')).toBe(key);
    expect(headers.get('authorization')).toBe(`Bearer ${key}`);
  });

  it('reports a safe configuration error when the secret key has no Storage JWT', () => {
    const secretKey = 'sb_secret_test-secret';
    expect(() => createSupabaseServerClient(supabaseUrl, secretKey, ''))
      .toThrow(SupabaseConfigurationError);

    let configurationError: unknown;
    try {
      createSupabaseServerClient(supabaseUrl, secretKey, '');
    } catch (error) {
      configurationError = error;
    }
    const failure = describeSmokeFailure(
      'validate_server_credentials',
      configurationError,
      {
        ...env,
        SUPABASE_SERVICE_ROLE_KEY: secretKey,
        SUPABASE_STORAGE_AUTHORIZATION_JWT: '',
      }
    );
    expect(failure.category).toBe('configuration');
    expect(failure.message).toContain('not the JWT signing secret');
    expect(JSON.stringify(failure)).not.toContain(secretKey);
  });

  it('rejects publishable keys for privileged Storage operations', () => {
    expect(() => createSupabaseServerClient(supabaseUrl, 'sb_publishable_test-key'))
      .toThrow('publishable keys are not privileged');
  });

  it('rejects the JWT signing secret as an authorization credential', () => {
    expect(() => createSupabaseServerClient(
      supabaseUrl,
      'sb_secret_test-secret',
      'not-a-jwt-signing-secret'
    )).toThrow('not the JWT signing secret');
  });
});
