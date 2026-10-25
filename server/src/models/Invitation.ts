import mongoose, { Schema, Document as MongooseDocument, Types } from 'mongoose';
import type { WorkspaceRole } from './WorkspaceMember.js';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface IInvitation extends MongooseDocument {
  workspaceId: Types.ObjectId;
  email: string;
  role: WorkspaceRole;
  token: string;
  invitedBy: Types.ObjectId;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Invitee email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    role: {
      type: String,
      required: [true, 'Invitation role is required'],
      enum: ['admin', 'member', 'viewer'],
      default: 'member',
    },
    token: {
      type: String,
      required: [true, 'Invitation token is required'],
      unique: true,
      index: true,
      select: false,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter User ID is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: true,
    },
    acceptedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

invitationSchema.index({ workspaceId: 1, email: 1, status: 1 });

export const Invitation = mongoose.model<IInvitation>('Invitation', invitationSchema);
