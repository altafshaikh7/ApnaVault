import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { DocumentService } from '../services/documentService.js';
import { SIGNED_URL_EXPIRY_SECONDS } from '../services/storageService.js';
import type { IDocument } from '../models/Document.js';

function getOwnerId(req: Request): Types.ObjectId {
  if (!req.user?._id) throw new AppError('Authentication required', 401);
  return req.user._id;
}

function getDocumentId(req: Request): string {
  const id = req.params.id;
  if (typeof id !== 'string') throw new AppError('Document not found', 404);
  return id;
}

function toDocumentDto(document: IDocument) {
  return {
    id: document._id.toString(),
    title: document.title,
    category: document.category,
    description: document.description,
    tags: document.tags,
    fileName: document.originalFileName,
    fileSize: document.fileSize,
    mimeType: document.mimeType,
    fileChecksum: document.fileChecksum,
    issueDate: document.issueDate?.toISOString(),
    expiryDate: document.expiryDate?.toISOString(),

    isArchived: document.isArchived,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export class DocumentController {
  public static async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('A document file is required', 400);
      const document = await DocumentService.upload(getOwnerId(req), req.file, req.body);
      sendSuccess(res, { document: toDocumentDto(document) }, 'Document uploaded', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documents = await DocumentService.list(getOwnerId(req));
      sendSuccess(res, { documents: documents.map(toDocumentDto) }, 'Documents retrieved');
    } catch (error) {
      next(error);
    }
  }

  public static async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const document = await DocumentService.get(getOwnerId(req), getDocumentId(req));
      sendSuccess(res, { document: toDocumentDto(document) }, 'Document retrieved');
    } catch (error) {
      next(error);
    }
  }

  public static async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = await DocumentService.getDownloadUrl(getOwnerId(req), getDocumentId(req));
      sendSuccess(res, { url, expiresIn: SIGNED_URL_EXPIRY_SECONDS }, 'Temporary download link created');
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await DocumentService.delete(getOwnerId(req), getDocumentId(req));
      sendSuccess(res, null, 'Document deleted');
    } catch (error) {
      next(error);
    }
  }
}
