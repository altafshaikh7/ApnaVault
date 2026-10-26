import mongoose, { Schema, Document as MongooseDocument, Types } from 'mongoose';

export type DocumentCategory =
  | 'identity'
  | 'financial'
  | 'property'
  | 'insurance'
  | 'medical'
  | 'education'
  | 'legal'
  | 'other';

export interface IDocument extends MongooseDocument {
  title: string;
  category: DocumentCategory;
  description?: string;
  tags: string[];
  ownerId: Types.ObjectId;
  workspaceId?: Types.ObjectId;
  folderId?: Types.ObjectId | null;
  isPersonal: boolean;
  storageKey: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  fileChecksum?: string;
  issueDate?: Date;
  expiryDate?: Date;
  renewalDate?: Date;
  isArchived: boolean;
  archivedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Document category is required'],
      enum: {
        values: [
          'identity',
          'financial',
          'property',
          'insurance',
          'medical',
          'education',
          'legal',
          'other',
        ],
        message: '{VALUE} is not a valid category',
      },
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Document must have an owner'],
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true,
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },
    isPersonal: {
      type: Boolean,
      default: true,
      index: true,
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      unique: true,
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size must be greater than 0'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      enum: ['application/pdf', 'image/jpeg', 'image/png'],
    },
    fileChecksum: {
      type: String,
      index: true,
    },
    issueDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
      index: true,
    },
    renewalDate: {
      type: Date,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
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

// Compound indexes for authorization and common search queries
documentSchema.index({ ownerId: 1, isPersonal: 1, isDeleted: 1 });
documentSchema.index({ workspaceId: 1, isPersonal: 1, isDeleted: 1 });
documentSchema.index({ folderId: 1, isDeleted: 1 });
documentSchema.index({ expiryDate: 1, isDeleted: 1 });
documentSchema.index({ category: 1, ownerId: 1 });

export const DocumentModel = mongoose.model<IDocument>('Document', documentSchema);
