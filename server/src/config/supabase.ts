import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { getSupabaseServerKeyType, SupabaseConfigurationError } from './supabaseKey.js';

export const SUPABASE_BUCKET = env.SUPABASE_BUCKET_NAME || 'apnavault-documents';

let supabase: SupabaseClient | undefined;

export function assertSupabaseServerKey(
  key = env.SUPABASE_SERVICE_ROLE_KEY,
  storageAuthorizationJwt = env.SUPABASE_STORAGE_AUTHORIZATION_JWT
): ReturnType<typeof getSupabaseServerKeyType> {
  if (!key?.trim()) {
    throw new SupabaseConfigurationError('Document storage is not configured', 503);
  }

  const keyType = getSupabaseServerKeyType(key);
  if (keyType === 'publishable') {
    throw new SupabaseConfigurationError(
      'Document storage requires a Supabase secret API key or service-role key; publishable keys are not privileged',
      503
    );
  }
  if (keyType === 'secret') {
    if (getSupabaseServerKeyType(storageAuthorizationJwt ?? '') !== 'service_role') {
      throw new SupabaseConfigurationError(
        'Supabase Storage requires a legacy service_role JWT in SUPABASE_STORAGE_AUTHORIZATION_JWT when SUPABASE_SERVICE_ROLE_KEY is an sb_secret_ API key. Use the existing service_role API key from the Supabase Dashboard, not the JWT signing secret.',
        503
      );
    }
  }
  if (keyType === 'invalid') {
    throw new SupabaseConfigurationError(
      'Document storage requires a Supabase secret API key or valid legacy service_role JWT',
      503
    );
  }
  return keyType;
}

export function createSupabaseServerClient(
  url: string,
  key: string,
  storageAuthorizationJwt = env.SUPABASE_STORAGE_AUTHORIZATION_JWT
): SupabaseClient {
  if (!url.trim()) {
    throw new SupabaseConfigurationError('Document storage is not configured', 503);
  }

  const keyType = assertSupabaseServerKey(key, storageAuthorizationJwt);
  return createClient(url, key, {
    auth: { persistSession: false },
    ...(keyType === 'secret'
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${storageAuthorizationJwt}`,
            },
          },
        }
      : {}),
  });
}

export function getSupabaseClient(): SupabaseClient {
  if (!env.SUPABASE_URL?.trim() || !env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new SupabaseConfigurationError('Document storage is not configured', 503);
  }

  if (!supabase) {
    supabase = createSupabaseServerClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  return supabase;
}
