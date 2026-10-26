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
  folderId: z.string().nullable().optional(),
});

export interface DocumentMetadata {
  title: string;
  category: z.infer<typeof metadataSchema>['category'];
  description?: string;
  tags?: string[];
  issueDate?: string;
  expiryDate?: string;
  folderId?: string | null;
}

export interface DocumentListOptions {
  search?: string;
  category?: string;
  folderId?: string | null;
  isArchived?: boolean;
  sortBy?: string;
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
    throw new AppError(
      'Invalid document details',
      400,
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
    );
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

async function cleanupUpload(
  ownerId: Types.ObjectId,
  fileSize: number,
  storageKey?: string
): Promise<void> {
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

    let targetFolderId: Types.ObjectId | null = null;
    if (metadata.folderId && metadata.folderId !== 'root') {
      if (Types.ObjectId.isValid(metadata.folderId)) {
        targetFolderId = new Types.ObjectId(metadata.folderId);
      }
    }

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
        folderId: targetFolderId,
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

  public static async list(
    ownerId: Types.ObjectId,
    options: DocumentListOptions = {}
  ): Promise<IDocument[]> {
    assertStorageConfigured();
    const filter: Record<string, any> = {
      ownerId,
      isPersonal: true,
      isDeleted: false,
    };

    if (options.isArchived !== undefined) {
      filter.isArchived = options.isArchived;
    } else {
      filter.isArchived = false;
    }

    if (options.category && options.category !== 'all') {
      filter.category = options.category;
    }

    // Folder filtering:
    if (options.folderId !== undefined && options.folderId !== 'all') {
      if (options.folderId === 'root' || options.folderId === null || options.folderId === '') {
        filter.folderId = null;
      } else if (Types.ObjectId.isValid(options.folderId)) {
        filter.folderId = new Types.ObjectId(options.folderId);
      }
    }

    // Case-insensitive search across title, originalFileName, description, tags
    if (options.search && options.search.trim()) {
      const sanitized = options.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitized, 'i');
      filter.$or = [
        { title: searchRegex },
        { originalFileName: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ];
    }

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (options.sortBy === 'name_asc') sort = { title: 1 };
    else if (options.sortBy === 'name_desc') sort = { title: -1 };
    else if (options.sortBy === 'expiry_asc') sort = { expiryDate: 1 };

    return DocumentModel.find(filter).sort(sort).exec();
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

  public static async getStats(ownerId: Types.ObjectId) {
    assertStorageConfigured();
    const baseFilter = { ownerId, isPersonal: true, isDeleted: false, isArchived: false };
    const totalDocuments = await DocumentModel.countDocuments(baseFilter);

    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const expiringSoon = await DocumentModel.countDocuments({
      ...baseFilter,
      expiryDate: { $gt: now, $lte: in30Days },
    });

    const expired = await DocumentModel.countDocuments({
      ...baseFilter,
      expiryDate: { $lte: now },
    });

    const recentDocuments = await DocumentModel.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    const upcomingExpirations = await DocumentModel.find({
      ...baseFilter,
      expiryDate: { $exists: true, $ne: null },
    })
      .sort({ expiryDate: 1 })
      .limit(5)
      .exec();

    let activeReminders = 0;
    try {
      const { Reminder } = await import('../models/Reminder.js');
      activeReminders = await Reminder.countDocuments({
        userId: ownerId,
        status: 'active',
      });
    } catch {
      // Fallback
      activeReminders = expiringSoon;
    }

    let familyMembersCount = 1;
    try {
      const { Workspace } = await import('../models/Workspace.js');
      const { WorkspaceMember } = await import('../models/WorkspaceMember.js');
      let workspace = await Workspace.findOne({ ownerId, isArchived: false });
      if (!workspace) {
        const member = await WorkspaceMember.findOne({ userId: ownerId });
        if (member) {
          workspace = await Workspace.findById(member.workspaceId);
        }
      }
      if (workspace) {
        familyMembersCount = await WorkspaceMember.countDocuments({ workspaceId: workspace._id });
      }
    } catch {
      familyMembersCount = 1;
    }

    const user = await User.findById(ownerId).select('storageUsedBytes storageQuotaBytes');

    return {
      totalDocuments,
      expiringSoon,
      expired,
      activeReminders: activeReminders || expiringSoon,
      familyMembersCount,
      storageUsedBytes: user?.storageUsedBytes || 0,
      storageQuotaBytes: user?.storageQuotaBytes || env.APP_STORAGE_QUOTA_BYTES,
      recentDocuments,
      upcomingExpirations,
    };
  }

  public static async getPreview(ownerId: Types.ObjectId, id: string) {
    const document = await this.get(ownerId, id);
    const signedUrl = await getSignedDownloadUrl(document.storageKey, 120);

    const isPdf = document.mimeType === 'application/pdf';
    const isImage = document.mimeType.startsWith('image/');
    const isPreviewable = isPdf || isImage;

    return {
      url: signedUrl,
      expiresIn: 120,
      fileName: document.originalFileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      isPreviewable,
    };
  }

  public static async move(
    ownerId: Types.ObjectId,
    id: string,
    folderId: string | null
  ): Promise<IDocument> {
    const document = await this.get(ownerId, id);
    let targetFolderId: Types.ObjectId | null = null;

    if (folderId && folderId !== 'root') {
      if (!Types.ObjectId.isValid(folderId)) {
        throw new AppError('Invalid target folder ID', 400);
      }
      const { Folder } = await import('../models/Folder.js');
      const folder = await Folder.findOne({ _id: folderId, isDeleted: false });
      if (!folder) throw new AppError('Target folder not found', 404);
      targetFolderId = folder._id as Types.ObjectId;
    }

    document.folderId = targetFolderId;
    await document.save();
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
