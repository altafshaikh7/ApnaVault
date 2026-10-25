import mongoose, { Schema, Document as MongooseDocument, Types } from 'mongoose';

export interface IWorkspace extends MongooseDocument {
  name: string;
  ownerId: Types.ObjectId;
  description?: string;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [100, 'Workspace name cannot exceed 100 characters'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Workspace must have an owner'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    storageQuotaBytes: {
      type: Number,
      default: 10 * 1024 * 1024 * 1024, // 10 GB default
    },
    storageUsedBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

workspaceSchema.index({ ownerId: 1, isArchived: 1 });

export const Workspace = mongoose.model<IWorkspace>('Workspace', workspaceSchema);
