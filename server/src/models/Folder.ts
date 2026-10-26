import mongoose, { Schema, Document as MongooseDocument, Types } from 'mongoose';

export interface IFolder extends MongooseDocument {
  name: string;
  workspaceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  parentId?: Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      minlength: [1, 'Folder name cannot be empty'],
      maxlength: [100, 'Folder name cannot exceed 100 characters'],
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required'],
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate active folder names within the same parent folder in a workspace
folderSchema.index(
  { workspaceId: 1, parentId: 1, name: 1, isDeleted: 1 },
  { unique: true }
);

export const Folder = mongoose.model<IFolder>('Folder', folderSchema);
