import { randomUUID } from 'crypto';
import { env } from '../config/env.js';
import { assertSupabaseServerKey } from '../config/supabase.js';
import { assertPrivateBucketAvailable, deleteFromStorage, getSignedDownloadUrl, uploadToStorage } from '../services/storageService.js';
import { describeSmokeFailure } from './supabaseSmokeDiagnostics.js';
import { validateFile } from '../utils/fileValidator.js';

async function runSmokeTest(): Promise<void> {
  if (!env.SUPABASE_URL?.trim() || !env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.info('[Supabase smoke test] PENDING: server storage credentials are not configured');
    process.exitCode = 2;
    return;
  }

  const storageKey = `apnavault-smoke-${randomUUID()}`;
  const payload = Buffer.from('%PDF-1.4\n% ApnaVault private storage integration smoke test\n');
  const sensitiveContent = [payload.toString('utf8')];
  let uploaded = false;
  let operation = 'check_private_bucket';
  let failure: unknown;

  try {
    operation = 'validate_smoke_file';
    validateFile({
      originalname: 'smoke-test.pdf',
      mimetype: 'application/pdf',
      size: payload.length,
      buffer: payload,
    });

    operation = 'validate_server_credentials';
    assertSupabaseServerKey();

    operation = 'check_private_bucket';
    await assertPrivateBucketAvailable();

    operation = 'upload_object';
    await uploadToStorage(payload, 'application/pdf', storageKey);
    uploaded = true;

    operation = 'create_signed_url';
    const signedUrl = await getSignedDownloadUrl(storageKey, 60);
    if (!URL.canParse(signedUrl)) {
      throw new Error('Signed URL validation failed');
    }

    operation = 'download_signed_object';
    const download = await fetch(signedUrl);
    if (!download.ok) {
      throw new Error(`Signed URL download failed with status ${download.status}`);
    }
    const downloadedContent = Buffer.from(await download.arrayBuffer());
    if (!downloadedContent.equals(payload)) {
      throw new Error('Signed URL returned unexpected smoke-test content');
    }
  } catch (error) {
    failure = error;
  }

  if (uploaded) {
    operation = 'delete_object';
    try {
      await deleteFromStorage(storageKey);
    } catch (error) {
      if (!failure) failure = error;
    }
  }

  if (failure) {
    const details = describeSmokeFailure(operation, failure, env, sensitiveContent);
    console.error(
      `[Supabase smoke test] FAIL category=${details.category} operation=${details.operation} message="${details.message}"` +
      `${details.name ? ` name=${details.name}` : ''}` +
      `${details.status ? ` status=${details.status}` : ''}` +
      `${details.code ? ` code=${details.code}` : ''}`
    );
    process.exitCode = 1;
    return;
  }

  console.info('[Supabase smoke test] PASS: private bucket upload, signed URL, and cleanup completed');
}

void runSmokeTest().catch((error: unknown) => {
  const details = describeSmokeFailure('initialize', error, env);
  console.error(
    `[Supabase smoke test] FAIL category=${details.category} operation=${details.operation} message="${details.message}"` +
    `${details.name ? ` name=${details.name}` : ''}` +
    `${details.status ? ` status=${details.status}` : ''}` +
    `${details.code ? ` code=${details.code}` : ''}`
  );
  process.exitCode = 1;
});
