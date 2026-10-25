import mongoose, { Schema, Document as MongooseDocument, Types } from 'mongoose';

export type ReminderStatus = 'active' | 'completed' | 'dismissed';

export interface IReminder extends MongooseDocument {
  documentId: Types.ObjectId;
  userId: Types.ObjectId;
  dueDate: Date;
  daysBefore: number;
  status: ReminderStatus;
  lastNotifiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Document ID is required for reminder'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for reminder'],
      index: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required for reminder'],
      index: true,
    },
    daysBefore: {
      type: Number,
      required: true,
      default: 30,
      enum: [1, 7, 15, 30, 60, 90],
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'dismissed'],
      default: 'active',
      index: true,
    },
    lastNotifiedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

reminderSchema.index({ userId: 1, status: 1, dueDate: 1 });
reminderSchema.index({ status: 1, dueDate: 1 });

export const Reminder = mongoose.model<IReminder>('Reminder', reminderSchema);
