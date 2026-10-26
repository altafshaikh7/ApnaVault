import { Types } from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env.js';
import { DocumentModel, type IDocument } from '../models/Document.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  assertPrivateBucketAvailable,
  assertStorageConfigured,
  createRandomStorageKey,
  deleteFromStorage,
  getSignedDownloadUrl,
  uploadToStorage,
  SIGNED_URL_EXPIRY_SECONDS,
} from './storageService.js';
import { sanitizeOriginalFilename, sha256Checksum } from '../utils/fileValidator.js';

const metadataSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.enum([
    'identity',
    'financial',
    'property',
    'insurance',
    'medical',
    'education',
    'legal',
    'other',
  ]),
  description: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

export interface DocumentMetadata {
  title: string;
  category: z.infer<typeof metadataSchema>['category'];
  description?: string;
  tags?: string[];
  issueDate?: string;
  expiryDate?: string;
}

function parseDate(value: string | undefined, fieldName: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
  return date;
}

function parseMetadata(raw: Record<string, unknown>): z.infer<typeof metadataSchema> {
  let tags = raw.tags;
  if (typeof tags === 'string') {
    try {
      tags = JSON.parse(tags) as unknown;
    } catch {
      throw new AppError('Tags must be a valid list', 400);
    }
  }
  const parsed = metadataSchema.safeParse({ ...raw, tags });
  if (!parsed.success) {
    throw new AppError('Invalid document details', 400, parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })));
  }
  return parsed.data;
}

async function releaseQuota(ownerId: Types.ObjectId, fileSize: number): Promise<void> {
  const result = await User.updateOne(
    { _id: ownerId, storageUsedBytes: { $gte: fileSize } },
    { $inc: { storageUsedBytes: -fileSize } }
  );
  if (result.modifiedCount !== 1) {
    throw new AppError('Storage quota could not be updated', 503);
  }
}

async function cleanupUpload(ownerId: Types.ObjectId, fileSize: number, storageKey?: string): Promise<void> {
  let storageRemoved = !storageKey;
  if (storageKey) {
    try {
      await deleteFromStorage(storageKey);
      storageRemoved = true;
    } catch {
      console.error('[Documents] Failed to clean up an incomplete storage upload');
    }
  }
  if (!storageRemoved) return;
  try {
    await releaseQuota(ownerId, fileSize);
  } catch {
    console.error('[Documents] Failed to release quota after an incomplete upload');
  }
}

async function finalizeDeletion(
  ownerId: Types.ObjectId,
  documentId: Types.ObjectId,
  fileSize: number
): Promise<void> {
  const session = await DocumentModel.startSession();
  try {
    await session.withTransaction(async () => {
      const pendingDocument = await DocumentModel.findOne({
        _id: documentId,
        ownerId,
        isPersonal: true,
        isDeleted: true,
      }).session(session);
      if (!pendingDocument) return;

      const quotaUpdate = await User.updateOne(
        { _id: ownerId, storageUsedBytes: { $gte: fileSize } },
        { $inc: { storageUsedBytes: -fileSize } },
        { session }
      );
      if (quotaUpdate.modifiedCount !== 1) {
        throw new AppError('Document deletion could not be completed', 503);
      }

      const documentDelete = await DocumentModel.deleteOne(
        { _id: documentId, ownerId, isPersonal: true, isDeleted: true },
        { session }
      );
      if (documentDelete.deletedCount !== 1) {
        throw new AppError('Document deletion could not be completed', 503);
      }
    });
  } finally {
    await session.endSession();
  }
}

export class DocumentService {
  public static async upload(
    ownerId: Types.ObjectId,
    file: Express.Multer.File,
    rawMetadata: Record<string, unknown>
  ): Promise<IDocument> {
    assertStorageConfigured();
    const metadata = parseMetadata(rawMetadata);
    const issueDate = parseDate(metadata.issueDate, 'issue date');
    const expiryDate = parseDate(metadata.expiryDate, 'expiry date');
    await assertPrivateBucketAvailable();

    const reservation = await User.findOneAndUpdate(
      {
        _id: ownerId,
        isDeleted: false,
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ['$storageUsedBytes', 0] }, file.size] },
            {
              $cond: [
                {
                  $lt: [
                    { $ifNull: ['$storageQuotaBytes', env.APP_STORAGE_QUOTA_BYTES] },
                    env.APP_STORAGE_QUOTA_BYTES,
                  ],
                },
                { $ifNull: ['$storageQuotaBytes', env.APP_STORAGE_QUOTA_BYTES] },
                env.APP_STORAGE_QUOTA_BYTES,
              ],
            },
          ],
        },
      },
      { $inc: { storageUsedBytes: file.size } },
      { new: true }
    );
    if (!reservation) {
      throw new AppError('Storage quota exceeded', 413);
    }

    let storageKey: string | undefined;
    try {
      storageKey = createRandomStorageKey();
      await uploadToStorage(file.buffer, file.mimetype, storageKey);
      return await DocumentModel.create({
        title: metadata.title,
        category: metadata.category,
        description: metadata.description,
        tags: metadata.tags,
        ownerId,
        isPersonal: true,
        storageKey,
        originalFileName: sanitizeOriginalFilename(file.originalname),
        fileSize: file.size,
        mimeType: file.mimetype,
        fileChecksum: sha256Checksum(file.buffer),
        issueDate,
        expiryDate,
      });
    } catch (error) {
      await cleanupUpload(ownerId, file.size, storageKey);
      if (error instanceof AppError) throw error;
      throw new AppError('Document upload could not be completed', 503);
    }
  }

  public static async list(ownerId: Types.ObjectId): Promise<IDocument[]> {
    assertStorageConfigured();
    return DocumentModel.find({ ownerId, isPersonal: true, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  public static async get(ownerId: Types.ObjectId, id: string): Promise<IDocument> {
    assertStorageConfigured();
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Document not found', 404);
    }
    const document = await DocumentModel.findOne({
      _id: id,
      ownerId,
      isPersonal: true,
      isDeleted: false,
    });
    if (!document) throw new AppError('Document not found', 404);
    return document;
  }

  public static async getDownloadUrl(ownerId: Types.ObjectId, id: string): Promise<string> {
    const document = await this.get(ownerId, id);
    return getSignedDownloadUrl(document.storageKey, SIGNED_URL_EXPIRY_SECONDS);
  }

  public static async delete(ownerId: Types.ObjectId, id: string): Promise<void> {
    assertStorageConfigured();
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError('Document not found', 404);
    }
    let document = await DocumentModel.findOne({
      _id: id,
      ownerId,
      isPersonal: true,
    });
    if (!document) throw new AppError('Document not found', 404);

    const alreadyPending = document.isDeleted;
    if (!document.isDeleted) {
      const hiddenDocument = await DocumentModel.findOneAndUpdate(
        { _id: document._id, ownerId, isPersonal: true, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
      if (!hiddenDocument) throw new AppError('Document not found', 404);
      document = hiddenDocument;
    }

    try {
      await deleteFromStorage(document.storageKey);
    } catch (error) {
      if (!alreadyPending) {
        try {
          await DocumentModel.updateOne(
            { _id: document._id, ownerId, isDeleted: true },
            { $set: { isDeleted: false }, $unset: { deletedAt: 1 } }
          );
        } catch {
          console.error('[Documents] Failed to restore document metadata after storage deletion failed');
        }
      }
      throw error;
    }

    try {
      await finalizeDeletion(ownerId, document._id, document.fileSize);
    } catch {
      console.error('[Documents] Storage deletion completed; database cleanup is pending reconciliation');
      throw new AppError('Document deletion could not be completed', 503);
    }
  }

  public static async reconcilePendingDeletions(): Promise<void> {
    let pendingDocuments: IDocument[];
    try {
      pendingDocuments = await DocumentModel.find({ isPersonal: true, isDeleted: true })
        .sort({ deletedAt: 1 })
        .limit(50)
        .exec();
    } catch {
      console.error('[Documents] Could not load pending deletions for reconciliation');
      return;
    }

    for (const document of pendingDocuments) {
      try {
        await deleteFromStorage(document.storageKey);
        await finalizeDeletion(document.ownerId, document._id, document.fileSize);
      } catch {
        console.error('[Documents] Pending deletion reconciliation will be retried');
      }
    }
  }
}
