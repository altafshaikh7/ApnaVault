import type { EnvConfig } from '../config/env.js';
import { SupabaseConfigurationError } from '../config/supabaseKey.js';
import { StorageServiceError } from '../services/storageService.js';

export interface SmokeFailureDetails {
  operation: string;
  category: 'configuration' | 'supabase_api' | 'runtime';
  message: string;
  name?: string;
  status?: string | number;
  code?: string;
}

function getSafeProperty(error: unknown, key: string): unknown {
  if (!error || typeof error !== 'object') return undefined;
  return key in error ? (error as Record<string, unknown>)[key] : undefined;
}

function safeIdentifier(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const text = String(value);
  return /^[A-Za-z0-9_.-]{1,80}$/.test(text) ? text : undefined;
}

function safeMessage(value: unknown, env: EnvConfig, sensitiveContent: string[]): string {
  let message =
    typeof value === 'string'
      ? value
      : value instanceof Error
        ? value.message
        : 'Storage operation failed';

  for (const secret of [
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.SUPABASE_STORAGE_AUTHORIZATION_JWT,
    ...sensitiveContent,
  ]) {
    if (secret) message = message.split(secret).join('[REDACTED]');
  }

  return message
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[REDACTED_URL]')
    .replace(/\b(?:sb_secret|sb_publishable)_[A-Za-z0-9_-]+/gi, '[REDACTED_KEY]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
    .replace(/\b(authorization|apikey|api[_-]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .slice(0, 300);
}

export function describeSmokeFailure(
  operation: string,
  error: unknown,
  env: EnvConfig,
  sensitiveContent: string[] = []
): SmokeFailureDetails {
  const storageError = error instanceof StorageServiceError ? error : undefined;
  const category: SmokeFailureDetails['category'] = error instanceof SupabaseConfigurationError
    ? 'configuration'
    : storageError
      ? 'supabase_api'
      : 'runtime';
  const providerError = storageError?.providerError ?? error;
  const rawStatus = getSafeProperty(providerError, 'status')
    ?? getSafeProperty(providerError, 'statusCode');
  const status =
    typeof rawStatus === 'number' && Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599
      ? rawStatus
      : safeIdentifier(rawStatus);
  const code = safeIdentifier(getSafeProperty(providerError, 'code'));
  const name = safeIdentifier(getSafeProperty(providerError, 'name'));
  const errorMessage =
    getSafeProperty(providerError, 'message') ??
    (providerError instanceof Error ? providerError.message : undefined) ??
    (storageError ? storageError.message : undefined);
  const rawCode = getSafeProperty(providerError, 'code');
  const rawName = getSafeProperty(providerError, 'name');
  const isStorageSignatureFailure =
    storageError &&
    rawCode === 'AccessDenied' &&
    rawName === 'StorageApiError' &&
    typeof errorMessage === 'string' &&
    /signature verification failed/i.test(errorMessage);

  return {
    operation: storageError?.operation ?? operation,
    category,
    message: isStorageSignatureFailure
      ? 'Supabase rejected the Storage Authorization JWT signature. Verify it is the current service_role API key for this project from Settings > API Keys; do not use the JWT signing secret.'
      : safeMessage(errorMessage, env, sensitiveContent),
    ...(name ? { name } : {}),
    ...(status ? { status } : {}),
    ...(code ? { code } : {}),
  };
}
