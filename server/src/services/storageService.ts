import { getSupabaseClient, SUPABASE_BUCKET } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { randomUUID } from 'crypto';

export class StorageServiceError extends AppError {
  public readonly operation: string;
  public readonly providerError?: unknown;

  constructor(operation: string, message: string, providerError?: unknown) {
    super(message, 503);
    this.operation = operation;
    this.providerError = providerError;
  }
}

export function assertStorageConfigured(): void {
  getSupabaseClient();
}

async function ensureBucket(): Promise<void> {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client.storage.getBucket(SUPABASE_BUCKET);
    if (error) {
      throw new StorageServiceError('check_private_bucket', 'Private document storage is unavailable', error);
    }
    if (!data || data.public) {
      throw new StorageServiceError('check_private_bucket', 'Private document storage is unavailable');
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new StorageServiceError('check_private_bucket', 'Private document storage is unavailable', error);
  }
}

export async function assertPrivateBucketAvailable(): Promise<void> {
  await ensureBucket();
}

export function createRandomStorageKey(): string {
  return randomUUID();
}

export async function uploadToStorage(
  buffer: Buffer,
  mimeType: string,
  storageKey: string,
): Promise<string> {
  await ensureBucket();
  const client = getSupabaseClient();
  try {
    const { error } = await client.storage.from(SUPABASE_BUCKET).upload(storageKey, buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) throw new StorageServiceError('upload_object', 'Document upload failed', error);
  } catch (error) {
    try {
      const { error: cleanupError } = await client.storage.from(SUPABASE_BUCKET).remove([storageKey]);
      if (cleanupError) {
        console.error('[Documents] Failed to clean up an incomplete storage upload');
      }
    } catch {
      console.error('[Documents] Failed to clean up an incomplete storage upload');
    }
    if (error instanceof AppError) throw error;
    throw new StorageServiceError('upload_object', 'Document upload failed', error);
  }
  return storageKey;
}

export async function getSignedDownloadUrl(storageKey: string, expiresIn = 60): Promise<string> {
  await ensureBucket();
  try {
    const { data, error } = await getSupabaseClient()
      .storage.from(SUPABASE_BUCKET)
      .createSignedUrl(storageKey, expiresIn);
    if (error || !data?.signedUrl) {
      throw new StorageServiceError(
        'create_signed_url',
        'Document download is unavailable',
        error
      );
    }
    return data.signedUrl;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new StorageServiceError('create_signed_url', 'Document download is unavailable', error);
  }
}

export async function deleteFromStorage(storageKey: string): Promise<void> {
  await ensureBucket();
  const bucket = getSupabaseClient().storage.from(SUPABASE_BUCKET);
  try {
    const existing = await bucket.exists(storageKey);
    if (existing.error) {
      if ('status' in existing.error && existing.error.status === 404) return;
      throw new StorageServiceError('check_object_exists', 'Document deletion failed', existing.error);
    }
    if (!existing.data) return;

    const { error } = await bucket.remove([storageKey]);
    if (error) {
      const afterDelete = await bucket.exists(storageKey);
      if (afterDelete.error && 'status' in afterDelete.error && afterDelete.error.status === 404) return;
      if (!afterDelete.error && !afterDelete.data) return;
      throw new StorageServiceError('delete_object', 'Document deletion failed', error);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new StorageServiceError('delete_object', 'Document deletion failed', error);
  }
}
