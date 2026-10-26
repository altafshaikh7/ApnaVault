import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Folder, type IFolder } from '../models/Folder.js';
import { DocumentModel } from '../models/Document.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';

async function resolveWorkspaceId(userId: Types.ObjectId): Promise<Types.ObjectId> {
  let workspace = await Workspace.findOne({ ownerId: userId, isArchived: false });
  if (!workspace) {
    const membership = await WorkspaceMember.findOne({ userId });
    if (membership && membership.workspaceId) {
      return membership.workspaceId;
    }
  }

  if (!workspace) {
    workspace = await Workspace.create({
      name: `Personal Vault`,
      ownerId: userId,
      isArchived: false,
    });
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId,
      role: 'owner',
      invitedBy: userId,
    });
  }

  return workspace._id as Types.ObjectId;
}

function toFolderDto(folder: IFolder, documentCount = 0) {
  return {
    id: folder._id.toString(),
    name: folder.name,
    workspaceId: folder.workspaceId.toString(),
    ownerId: folder.ownerId.toString(),
    parentId: folder.parentId ? folder.parentId.toString() : null,
    documentCount,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

export class FolderController {
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;
      const workspaceId = await resolveWorkspaceId(userId);

      const parentIdQuery = req.query.parentId;
      const filter: Record<string, any> = {
        workspaceId,
        isDeleted: false,
      };

      if (parentIdQuery === 'root' || parentIdQuery === 'null') {
        filter.parentId = null;
      } else if (typeof parentIdQuery === 'string' && Types.ObjectId.isValid(parentIdQuery)) {
        filter.parentId = new Types.ObjectId(parentIdQuery);
      }

      const folders = await Folder.find(filter).sort({ name: 1 }).exec();

      // Get document counts for each folder
      const folderIds = folders.map((f) => f._id);
      const counts = await DocumentModel.aggregate([
        {
          $match: {
            folderId: { $in: folderIds },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: '$folderId',
            count: { $sum: 1 },
          },
        },
      ]);

      const countMap = new Map<string, number>();
      counts.forEach((c) => countMap.set(c._id.toString(), c.count));

      const dtos = folders.map((f) => toFolderDto(f, countMap.get(f._id.toString()) || 0));

      sendSuccess(res, { folders: dtos }, 'Folders retrieved');
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;
      const workspaceId = await resolveWorkspaceId(userId);
      const { name, parentId } = req.body as { name: string; parentId?: string | null };

      const trimmedName = (name || '').trim();
      if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 100) {
        return next(new AppError('Folder name must be between 1 and 100 characters', 400));
      }

      if (trimmedName.includes('/') || trimmedName.includes('\\')) {
        return next(new AppError('Folder name cannot contain slashes', 400));
      }

      let parentObjectId: Types.ObjectId | null = null;
      if (parentId && parentId !== 'root') {
        if (!Types.ObjectId.isValid(parentId)) {
          return next(new AppError('Invalid parent folder ID', 400));
        }
        const parentFolder = await Folder.findOne({
          _id: parentId,
          workspaceId,
          isDeleted: false,
        });
        if (!parentFolder) {
          return next(new AppError('Parent folder not found', 404));
        }
        parentObjectId = parentFolder._id as Types.ObjectId;
      }

      // Check for duplicate folder name in the same parent
      const existing = await Folder.findOne({
        workspaceId,
        parentId: parentObjectId,
        name: trimmedName,
        isDeleted: false,
      });

      if (existing) {
        return next(
          new AppError('A folder with this name already exists in this directory', 409)
        );
      }

      const folder = await Folder.create({
        name: trimmedName,
        workspaceId,
        ownerId: userId,
        parentId: parentObjectId,
        isDeleted: false,
      });

      sendSuccess(res, { folder: toFolderDto(folder, 0) }, 'Folder created', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async rename(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;
      const workspaceId = await resolveWorkspaceId(userId);
      const folderId = req.params.id as string;
      const { name } = req.body as { name: string };

      if (!Types.ObjectId.isValid(folderId)) {
        return next(new AppError('Invalid folder ID', 400));
      }

      const trimmedName = (name || '').trim();
      if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 100) {
        return next(new AppError('Folder name must be between 1 and 100 characters', 400));
      }

      const folder = await Folder.findOne({
        _id: folderId,
        workspaceId,
        isDeleted: false,
      });

      if (!folder) {
        return next(new AppError('Folder not found', 404));
      }

      const duplicate = await Folder.findOne({
        _id: { $ne: folder._id },
        workspaceId,
        parentId: folder.parentId,
        name: trimmedName,
        isDeleted: false,
      });

      if (duplicate) {
        return next(new AppError('A folder with this name already exists in this directory', 409));
      }

      folder.name = trimmedName;
      await folder.save();

      const documentCount = await DocumentModel.countDocuments({
        folderId: folder._id,
        isDeleted: false,
      });

      sendSuccess(res, { folder: toFolderDto(folder, documentCount) }, 'Folder renamed');
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;
      const workspaceId = await resolveWorkspaceId(userId);
      const folderId = req.params.id as string;

      if (!Types.ObjectId.isValid(folderId)) {
        return next(new AppError('Invalid folder ID', 400));
      }

      const folder = await Folder.findOne({
        _id: folderId,
        workspaceId,
        isDeleted: false,
      });

      if (!folder) {
        return next(new AppError('Folder not found', 404));
      }

      // Move contained documents to parent or root so they are preserved
      await DocumentModel.updateMany(
        { folderId: folder._id },
        { $set: { folderId: folder.parentId || null } }
      );

      // Move subfolders to parent or root
      await Folder.updateMany(
        { parentId: folder._id },
        { $set: { parentId: folder.parentId || null } }
      );

      folder.isDeleted = true;
      folder.deletedAt = new Date();
      await folder.save();

      sendSuccess(res, null, 'Folder deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
