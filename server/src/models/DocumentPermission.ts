import mongoose, { Schema, Document as MongooseDocument, Types } from 'mongoose';

export type PermissionLevel = 'view' | 'edit' | 'admin';

export interface IDocumentPermission extends MongooseDocument {
  documentId: Types.ObjectId;
  grantedToUserId: Types.ObjectId;
  grantedByUserId: Types.ObjectId;
  permission: PermissionLevel;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const documentPermissionSchema = new Schema<IDocumentPermission>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Document ID is required'],
      index: true,
    },
    grantedToUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient User ID is required'],
      index: true,
    },
    grantedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Granter User ID is required'],
    },
    permission: {
      type: String,
      required: [true, 'Permission level is required'],
      enum: {
        values: ['view', 'edit', 'admin'],
        message: '{VALUE} is not a valid permission level',
      },
      default: 'view',
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// One permission record per document per recipient
documentPermissionSchema.index({ documentId: 1, grantedToUserId: 1 }, { unique: true });
documentPermissionSchema.index({ grantedToUserId: 1, expiresAt: 1 });

export const DocumentPermission = mongoose.model<IDocumentPermission>(
  'DocumentPermission',
  documentPermissionSchema
);
