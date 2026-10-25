import mongoose, { Schema, Document as MongooseDocument, Types } from 'mongoose';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface IWorkspaceMember extends MongooseDocument {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  role: WorkspaceRole;
  joinedAt: Date;
  invitedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    role: {
      type: String,
      required: [true, 'Member role is required'],
      enum: {
        values: ['owner', 'admin', 'member', 'viewer'],
        message: '{VALUE} is not a valid workspace role',
      },
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// A user can be a member of a workspace only once
workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
workspaceMemberSchema.index({ userId: 1, role: 1 });

export const WorkspaceMember = mongoose.model<IWorkspaceMember>('WorkspaceMember', workspaceMemberSchema);
