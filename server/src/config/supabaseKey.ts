import { AppError } from '../utils/AppError.js';

export type SupabaseServerKeyType = 'secret' | 'service_role' | 'publishable' | 'invalid';

export class SupabaseConfigurationError extends AppError {}

export function getSupabaseServerKeyType(key: string): SupabaseServerKeyType {
  if (key.startsWith('sb_secret_')) return 'secret';
  if (key.startsWith('sb_publishable_')) return 'publishable';

  const parts = key.split('.');
  if (parts.length !== 3 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) {
    return 'invalid';
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as { role?: unknown };
    return payload.role === 'service_role' ? 'service_role' : 'invalid';
  } catch {
    return 'invalid';
  }
}
