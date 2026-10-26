import { vi } from 'vitest';

const { mockGetSupabaseClient } = vi.hoisted(() => ({
  mockGetSupabaseClient: vi.fn(),
}));

vi.mock('../config/supabase.js', () => ({
  getSupabaseClient: mockGetSupabaseClient,
  SUPABASE_BUCKET: 'test-private-documents',
}));

import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi as vitest } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { app } from '../app.js';
import { DocumentModel } from '../models/Document.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { TokenService } from '../services/tokenService.js';
import { AppError } from '../utils/AppError.js';
import { MAX_FILE_SIZE, validateFile } from '../utils/fileValidator.js';
import { env } from '../config/env.js';
import { DocumentService } from '../services/documentService.js';
import { StorageServiceError, SIGNED_URL_EXPIRY_SECONDS } from '../services/storageService.js';
import { describeSmokeFailure } from '../scripts/supabaseSmokeDiagnostics.js';
import { getSupabaseServerKeyType } from '../config/supabaseKey.js';

const pdfBuffer = Buffer.from('%PDF-1.7\nvalid test document');
let mongod: MongoMemoryReplSet;
let storageClient: {
  storage: {
    getBucket: ReturnType<typeof vitest.fn>;
    from: ReturnType<typeof vitest.fn>;
  };
};
let uploadObject: ReturnType<typeof vitest.fn>;
let signedUrl: ReturnType<typeof vitest.fn>;
let removeObject: ReturnType<typeof vitest.fn>;
let existsObject: ReturnType<typeof vitest.fn>;

function setStorageClient(options?: { publicBucket?: boolean }): void {
  uploadObject = vitest.fn().mockResolvedValue({ error: null });
  signedUrl = vitest.fn().mockResolvedValue({
    data: { signedUrl: 'https://storage.example/signed-document' },
    error: null,
  });
  removeObject = vitest.fn().mockResolvedValue({ error: null });
  existsObject = vitest.fn().mockResolvedValue({ data: true, error: null });
  storageClient = {
    storage: {
      getBucket: vitest.fn().mockResolvedValue({
        data: { public: options?.publicBucket ?? false },
        error: null,
      }),
      from: vitest.fn(() => ({
        upload: uploadObject,
        createSignedUrl: signedUrl,
        remove: removeObject,
        exists: existsObject,
      })),
    },
  };
  mockGetSupabaseClient.mockReturnValue(storageClient as unknown as SupabaseClient);
}

async function createAuthenticatedUser(quotaBytes = 950 * 1024 * 1024) {
  const user = await User.create({
    email: `user-${new Types.ObjectId().toString()}@example.com`,
    name: 'Document Owner',
    passwordHash: 'test-hash',
    storageQuotaBytes: quotaBytes,
  });
  const rawToken = TokenService.generateRandomToken(32);
  await Session.create({
    userId: user._id,
    tokenHash: TokenService.hashToken(rawToken),
    expiresAt: new Date(Date.now() + 60_000),
  });
  return {
    user,
    cookie: `apnavault_session=${rawToken}; apnavault_csrf=test-csrf`,
  };
}

function uploadRequest(cookie: string, filename = 'identity.pdf', buffer = pdfBuffer) {
  return request(app)
    .post('/api/v1/documents')
    .set('Cookie', cookie)
    .set('X-CSRF-Token', 'test-csrf')
    .field('title', 'Identity document')
    .field('category', 'identity')
    .field('tags', JSON.stringify(['personal']))
    .attach('file', buffer, { filename, contentType: 'application/pdf' });
}

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Session.deleteMany({}), DocumentModel.deleteMany({})]);
  mockGetSupabaseClient.mockReset();
  setStorageClient();
});

describe('Document file validation', () => {
  it('accepts supported signatures and rejects empty, oversized, mismatched MIME, extension, or content', () => {
    validateFile({
      originalname: 'valid.pdf',
      mimetype: 'application/pdf',
      size: pdfBuffer.length,
      buffer: pdfBuffer,
    });

    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    validateFile({
      originalname: 'valid.png',
      mimetype: 'image/png',
      size: png.length,
      buffer: png,
    });
    validateFile({
      originalname: 'valid.jpeg',
      mimetype: 'image/jpeg',
      size: jpeg.length,
      buffer: jpeg,
    });
    expect(() => validateFile({
      originalname: 'empty.pdf',
      mimetype: 'application/pdf',
      size: 0,
      buffer: Buffer.alloc(0),
    })).toThrow('must not be empty');
    expect(() => validateFile({
      originalname: 'large.pdf',
      mimetype: 'application/pdf',
      size: MAX_FILE_SIZE + 1,
      buffer: pdfBuffer,
    })).toThrow('10 MiB');
    expect(() => validateFile({
      originalname: 'wrong.png',
      mimetype: 'application/pdf',
      size: pdfBuffer.length,
      buffer: pdfBuffer,
    })).toThrow('extension');
    expect(() => validateFile({
      originalname: 'fake.pdf',
      mimetype: 'application/pdf',
      size: 8,
      buffer: png,
    })).toThrow('contents');
    expect(() => validateFile({
      originalname: 'fake.gif',
      mimetype: 'image/gif',
      size: png.length,
      buffer: png,
    })).toThrow('Only PDF');
  });
});

describe('Supabase smoke test diagnostics', () => {
  it('accepts only server-side Supabase key formats for storage credentials', () => {
    const serviceRolePayload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
    const anonymousPayload = Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url');

    expect(getSupabaseServerKeyType('sb_secret_test-value')).toBe('secret');
    expect(getSupabaseServerKeyType('sb_publishable_test-value')).toBe('publishable');
    expect(getSupabaseServerKeyType(`header.${serviceRolePayload}.signature`)).toBe('service_role');
    expect(getSupabaseServerKeyType(`header.${anonymousPayload}.signature`)).toBe('invalid');
    expect(getSupabaseServerKeyType('not-a-server-key')).toBe('invalid');
  });

  it('reports safe provider context without leaking keys, URLs, or test content', () => {
    const details = describeSmokeFailure(
      'upload_object',
      new StorageServiceError('upload_object', 'Document upload failed'),
      {
        ...env,
        SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test-only-secret',
      },
      ['private smoke-test document contents']
    );

    expect(details).toMatchObject({
      operation: 'upload_object',
      category: 'supabase_api',
      message: 'Document upload failed',
    });
    expect(JSON.stringify(details)).not.toContain('sb_secret_test-only-secret');
    expect(JSON.stringify(details)).not.toContain('private smoke-test document contents');
    expect(JSON.stringify(details)).not.toContain('https://');
  });

  it('reports safe provider error name, status, and code', () => {
    const details = describeSmokeFailure(
      'upload_object',
      new StorageServiceError('upload_object', 'Document upload failed', {
        name: 'StorageApiError',
        message: 'Bucket policy denied https://storage.example/object?token=private',
        statusCode: 403,
        code: 'AccessDenied',
      }),
      env
    );

    expect(details).toEqual({
      operation: 'upload_object',
      category: 'supabase_api',
      message: 'Bucket policy denied [REDACTED_URL]',
      name: 'StorageApiError',
      status: 403,
      code: 'AccessDenied',
    });
  });

  it('explains Storage signature failures without exposing Authorization material', () => {
    const authorizationJwt = 'header.private-token.signature';
    const details = describeSmokeFailure(
      'check_private_bucket',
      new StorageServiceError('check_private_bucket', 'Private document storage is unavailable', {
        name: 'StorageApiError',
        message: `signature verification failed: Bearer ${authorizationJwt}`,
        status: 400,
        code: 'AccessDenied',
      }),
      {
        ...env,
        SUPABASE_STORAGE_AUTHORIZATION_JWT: authorizationJwt,
      }
    );

    expect(details).toMatchObject({
      category: 'supabase_api',
      message: expect.stringContaining('current service_role API key for this project'),
      status: 400,
      code: 'AccessDenied',
    });
    expect(JSON.stringify(details)).not.toContain(authorizationJwt);
  });

  it('redacts configured credentials and authorization material from provider messages', () => {
    const testEnv = {
      ...env,
      SUPABASE_URL: 'https://project.example',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test-only-secret',
    };
    const details = describeSmokeFailure(
      'check_private_bucket',
      new StorageServiceError('check_private_bucket', 'Private document storage is unavailable', {
        name: 'StorageApiError',
        message: `Denied ${testEnv.SUPABASE_URL} ${testEnv.SUPABASE_SERVICE_ROLE_KEY} Authorization: Bearer eyJhbGci.signature.payload`,
        status: 401,
        code: 'AccessDenied',
      }),
      testEnv
    );

    const serialized = JSON.stringify(details);
    expect(serialized).not.toContain(testEnv.SUPABASE_URL);
    expect(serialized).not.toContain(testEnv.SUPABASE_SERVICE_ROLE_KEY);
    expect(serialized).not.toContain('eyJhbGci.signature.payload');
    expect(details).toMatchObject({
      operation: 'check_private_bucket',
      category: 'supabase_api',
      status: 401,
      code: 'AccessDenied',
    });
  });
});

describe('Document API', () => {
  it('requires authentication for document operations', async () => {
    const response = await request(app).get('/api/v1/documents');
    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain('Authentication required');
  });

  it('uploads a valid file with a random key, sanitized filename, checksum, and quota reservation', async () => {
    const { user, cookie } = await createAuthenticatedUser();
    const response = await uploadRequest(cookie, '..\\private\\identity.pdf');

    expect(response.status).toBe(201);
    expect(response.body.data.document.fileName).toBe('identity.pdf');
    expect(response.body.data.document.ownerId).toBeUndefined();
    expect(response.body.data.document.fileChecksum).toBe(
      '9260151371056588d1d4eb733b7d9a76cea400bc4ac4cec6f0b4a69319cceeb3'
    );
    const storedDocument = await DocumentModel.findById(response.body.data.document.id);
    expect(storedDocument?.storageKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(storedDocument?.storageKey).not.toContain('identity');
    expect((await User.findById(user._id))?.storageUsedBytes).toBe(pdfBuffer.length);
    expect(uploadObject).toHaveBeenCalledOnce();
  });

  it('rejects unsupported file signatures before storage upload', async () => {
    const { cookie } = await createAuthenticatedUser();
    const response = await uploadRequest(cookie, 'not-a-pdf.pdf', Buffer.from('not a PDF'));
    expect(response.status).toBe(400);
    expect(uploadObject).not.toHaveBeenCalled();
  });

  it('enforces the 10 MiB multipart request limit', async () => {
    const { cookie } = await createAuthenticatedUser();
    const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE + 1);
    pdfBuffer.copy(oversizedBuffer);
    const response = await uploadRequest(cookie, 'large.pdf', oversizedBuffer);
    expect(response.status).toBe(413);
    expect(response.body.error.message).toContain('10 MiB');
    expect(uploadObject).not.toHaveBeenCalled();
  });

  it('rejects uploads that would exceed the configured quota', async () => {
    const { user, cookie } = await createAuthenticatedUser(pdfBuffer.length - 1);
    const response = await uploadRequest(cookie);
    expect(response.status).toBe(413);
    expect(response.body.error.message).toBe('Storage quota exceeded');
    expect(uploadObject).not.toHaveBeenCalled();
    expect((await User.findById(user._id))?.storageUsedBytes).toBe(0);
  });

  it('applies the configured per-user quota cap to existing users without rewriting their quota', async () => {
    const previousQuota = env.APP_STORAGE_QUOTA_BYTES;
    env.APP_STORAGE_QUOTA_BYTES = pdfBuffer.length - 1;
    const { user, cookie } = await createAuthenticatedUser(5 * 1024 * 1024 * 1024);

    try {
      const response = await uploadRequest(cookie);
      expect(response.status).toBe(413);
      expect((await User.findById(user._id))?.storageQuotaBytes).toBe(5 * 1024 * 1024 * 1024);
      expect((await User.findById(user._id))?.storageUsedBytes).toBe(0);
    } finally {
      env.APP_STORAGE_QUOTA_BYTES = previousQuota;
    }
  });

  it('atomically prevents concurrent uploads from exceeding the quota', async () => {
    const { user, cookie } = await createAuthenticatedUser(pdfBuffer.length);
    const [first, second] = await Promise.all([
      uploadRequest(cookie, 'first.pdf'),
      uploadRequest(cookie, 'second.pdf'),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 413]);
    expect((await User.findById(user._id))?.storageUsedBytes).toBe(pdfBuffer.length);
    expect(await DocumentModel.countDocuments({ ownerId: user._id })).toBe(1);
  });

  it('does not issue download links or delete documents owned by another user', async () => {
    const owner = await createAuthenticatedUser();
    const otherUser = await createAuthenticatedUser();
    const upload = await uploadRequest(owner.cookie);
    const id = upload.body.data.document.id;

    const download = await request(app)
      .get(`/api/v1/documents/${id}/download`)
      .set('Cookie', otherUser.cookie);
    const detail = await request(app)
      .get(`/api/v1/documents/${id}`)
      .set('Cookie', otherUser.cookie);
    const otherUserList = await request(app)
      .get('/api/v1/documents')
      .set('Cookie', otherUser.cookie);
    const deletion = await request(app)
      .delete(`/api/v1/documents/${id}`)
      .set('Cookie', otherUser.cookie)
      .set('X-CSRF-Token', 'test-csrf');

    expect(download.status).toBe(404);
    expect(detail.status).toBe(404);
    expect(otherUserList.status).toBe(200);
    expect(otherUserList.body.data.documents).toHaveLength(0);
    expect(deletion.status).toBe(404);
    expect(signedUrl).not.toHaveBeenCalled();
    expect(removeObject).not.toHaveBeenCalled();
    expect(await DocumentModel.findById(id)).not.toBeNull();
  });

  it('lists only owned documents, signs downloads after ownership checks, and deletes storage and metadata', async () => {
    const { user, cookie } = await createAuthenticatedUser();
    const upload = await uploadRequest(cookie);
    const id = upload.body.data.document.id;

    const list = await request(app).get('/api/v1/documents').set('Cookie', cookie);
    expect(list.status).toBe(200);
    expect(list.body.data.documents).toHaveLength(1);

    const detail = await request(app).get(`/api/v1/documents/${id}`).set('Cookie', cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data.document.id).toBe(id);

    const download = await request(app)
      .get(`/api/v1/documents/${id}/download`)
      .set('Cookie', cookie);
    expect(download.status).toBe(200);
    expect(download.body.data.url).toBe('https://storage.example/signed-document');
    expect(signedUrl).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f-]{36}$/i), SIGNED_URL_EXPIRY_SECONDS);

    const deletion = await request(app)
      .delete(`/api/v1/documents/${id}`)
      .set('Cookie', cookie)
      .set('X-CSRF-Token', 'test-csrf');
    expect(deletion.status).toBe(200);
    expect(removeObject).toHaveBeenCalledOnce();
    expect(await DocumentModel.findById(id)).toBeNull();
    expect((await User.findById(user._id))?.storageUsedBytes).toBe(0);
  });

  it('finalizes a pending deletion when the object is already absent from storage', async () => {
    const { user, cookie } = await createAuthenticatedUser();
    const upload = await uploadRequest(cookie);
    existsObject.mockResolvedValueOnce({ data: false, error: { status: 404 } });

    const deletion = await request(app)
      .delete(`/api/v1/documents/${upload.body.data.document.id}`)
      .set('Cookie', cookie)
      .set('X-CSRF-Token', 'test-csrf');

    expect(deletion.status).toBe(200);
    expect(removeObject).not.toHaveBeenCalled();
    expect(await DocumentModel.findById(upload.body.data.document.id)).toBeNull();
    expect((await User.findById(user._id))?.storageUsedBytes).toBe(0);
  });

  it('returns safe 503 errors when storage configuration is missing without breaking health routes', async () => {
    mockGetSupabaseClient.mockImplementation(() => {
      throw new AppError('Document storage is not configured', 503);
    });
    const { cookie } = await createAuthenticatedUser();

    const list = await request(app).get('/api/v1/documents').set('Cookie', cookie);
    const health = await request(app).get('/api/v1/health');
    expect(list.status).toBe(503);
    expect(list.body.error.message).toBe('Document storage is not configured');
    expect(health.status).toBe(200);
  });

  it('rejects public storage buckets and does not expose provider error details', async () => {
    setStorageClient({ publicBucket: true });
    const { cookie } = await createAuthenticatedUser();
    const response = await uploadRequest(cookie);
    expect(response.status).toBe(503);
    expect(response.body.error.message).toBe('Private document storage is unavailable');
    expect(response.body.error.message).not.toContain('Supabase');
  });

  it('cleans up the uploaded object and quota reservation if database persistence fails', async () => {
    const { user, cookie } = await createAuthenticatedUser();
    const createSpy = vitest.spyOn(DocumentModel, 'create').mockRejectedValueOnce(new Error('database failure'));

    try {
      const response = await uploadRequest(cookie);
      expect(response.status).toBe(503);
      expect(removeObject).toHaveBeenCalledOnce();
      expect((await User.findById(user._id))?.storageUsedBytes).toBe(0);
      expect(await DocumentModel.countDocuments()).toBe(0);
    } finally {
      createSpy.mockRestore();
    }
  });

  it('restores document visibility when storage deletion fails', async () => {
    const { user, cookie } = await createAuthenticatedUser();
    const upload = await uploadRequest(cookie);
    removeObject.mockResolvedValueOnce({ error: { message: 'private provider details' } });
    const deletion = await request(app)
      .delete(`/api/v1/documents/${upload.body.data.document.id}`)
      .set('Cookie', cookie)
      .set('X-CSRF-Token', 'test-csrf');

    expect(deletion.status).toBe(503);
    expect(deletion.body.error.message).toBe('Document deletion failed');
    expect(await DocumentModel.countDocuments({ _id: upload.body.data.document.id, isDeleted: false })).toBe(1);
    expect((await User.findById(user._id))?.storageUsedBytes).toBe(pdfBuffer.length);
  });

  it('reconciles a tombstoned delete after transactional MongoDB cleanup fails', async () => {
    const { user, cookie } = await createAuthenticatedUser();
    const upload = await uploadRequest(cookie);
    const documentId = upload.body.data.document.id;
    const updateSpy = vitest.spyOn(User, 'updateOne').mockRejectedValueOnce(new Error('database unavailable'));

    try {
      const deletion = await request(app)
        .delete(`/api/v1/documents/${documentId}`)
        .set('Cookie', cookie)
        .set('X-CSRF-Token', 'test-csrf');

      expect(deletion.status).toBe(503);
      expect(await DocumentModel.countDocuments({ _id: documentId, isDeleted: true })).toBe(1);
      expect((await User.findById(user._id))?.storageUsedBytes).toBe(pdfBuffer.length);
    } finally {
      updateSpy.mockRestore();
    }

    await DocumentService.reconcilePendingDeletions();

    expect(await DocumentModel.findById(documentId)).toBeNull();
    expect((await User.findById(user._id))?.storageUsedBytes).toBe(0);
    expect(removeObject).toHaveBeenCalledTimes(2);
  });

  it('releases quota when storage upload fails', async () => {
    const { user, cookie } = await createAuthenticatedUser();
    uploadObject.mockResolvedValueOnce({ error: { message: 'private provider details' } });
    const response = await uploadRequest(cookie);

    expect(response.status).toBe(503);
    expect(response.body.error.message).toBe('Document upload failed');
    expect(response.body.error.message).not.toContain('private provider details');
    expect((await User.findById(user._id))?.storageUsedBytes).toBe(0);
  });

  it('retains the quota reservation if failed storage cleanup may have left an orphan object', async () => {
    const { user, cookie } = await createAuthenticatedUser();
    const errorSpy = vitest.spyOn(console, 'error').mockImplementation(() => undefined);
    uploadObject.mockResolvedValueOnce({ error: { message: 'private provider details' } });
    removeObject.mockResolvedValue({ error: { message: 'cleanup unavailable' } });

    try {
      const response = await uploadRequest(cookie);
      expect(response.status).toBe(503);
      expect(response.body.error.message).toBe('Document upload failed');
      expect((await User.findById(user._id))?.storageUsedBytes).toBe(pdfBuffer.length);
      expect(errorSpy).toHaveBeenCalledWith(
        '[Documents] Failed to clean up an incomplete storage upload'
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
