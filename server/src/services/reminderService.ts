import { Types } from 'mongoose';
import { DocumentModel } from '../models/Document.js';
import { Notification } from '../models/Notification.js';
import { Reminder } from '../models/Reminder.js';

export interface ReminderCheckResult {
  documentsChecked: number;
  notificationsCreated: number;
}

export class ReminderService {
  /**
   * Scans non-deleted documents with expiry dates and generates
   * appropriate upcoming and expired notifications without duplicates.
   */
  public static async checkAndGenerateReminders(): Promise<ReminderCheckResult> {
    const documents = await DocumentModel.find({
      isDeleted: false,
      isArchived: false,
      expiryDate: { $exists: true, $ne: null },
    }).exec();

    let notificationsCreated = 0;
    const now = new Date();

    for (const doc of documents) {
      if (!doc.expiryDate) continue;

      const expiryTime = doc.expiryDate.getTime();
      const diffMs = expiryTime - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const dateStr = doc.expiryDate.toISOString().split('T')[0];

      let stage: 'expired' | '1_day' | '7_days' | '30_days' | null = null;
      let title = '';
      let message = '';

      if (diffDays <= 0) {
        stage = 'expired';
        title = `Document Expired: ${doc.title}`;
        message = `Your document "${doc.title}" expired on ${dateStr}. Please renew or update it.`;
      } else if (diffDays <= 1) {
        stage = '1_day';
        title = `Urgent Expiry Alert: ${doc.title}`;
        message = `Your document "${doc.title}" expires tomorrow (${dateStr})! Urgent renewal recommended.`;
      } else if (diffDays <= 7) {
        stage = '7_days';
        title = `Upcoming Expiry (7 Days): ${doc.title}`;
        message = `Your document "${doc.title}" expires in ${diffDays} days on ${dateStr}.`;
      } else if (diffDays <= 30) {
        stage = '30_days';
        title = `Advance Expiry Notice: ${doc.title}`;
        message = `Your document "${doc.title}" is due to expire on ${dateStr} (in ${diffDays} days).`;
      }

      if (stage) {
        // Prevent duplicate notifications for the same document and stage
        const existing = await Notification.findOne({
          userId: doc.ownerId,
          type: 'reminder',
          'metadata.documentId': doc._id.toString(),
          'metadata.stage': stage,
        });

        if (!existing) {
          await Notification.create({
            userId: doc.ownerId,
            type: 'reminder',
            title,
            message,
            isRead: false,
            linkUrl: `/documents/${doc._id.toString()}`,
            metadata: {
              documentId: doc._id.toString(),
              stage,
              expiryDate: dateStr,
            },
          });
          notificationsCreated++;
        }

        // Keep Reminder model in sync
        const reminderDays = stage === 'expired' ? 1 : diffDays <= 1 ? 1 : diffDays <= 7 ? 7 : 30;
        await Reminder.findOneAndUpdate(
          {
            documentId: doc._id,
            userId: doc.ownerId,
          },
          {
            $set: {
              dueDate: doc.expiryDate,
              daysBefore: reminderDays,
              status: stage === 'expired' ? 'completed' : 'active',
              lastNotifiedAt: now,
            },
          },
          { upsert: true }
        );
      }
    }

    return {
      documentsChecked: documents.length,
      notificationsCreated,
    };
  }

  public static async listReminders(userId: Types.ObjectId) {
    return Reminder.find({ userId })
      .populate('documentId', 'title category originalFileName expiryDate')
      .sort({ dueDate: 1 })
      .exec();
  }

  public static async createReminder(
    userId: Types.ObjectId,
    documentId: string,
    daysBefore = 30,
    notes?: string
  ) {
    const doc = await DocumentModel.findOne({ _id: documentId, ownerId: userId, isDeleted: false });
    if (!doc) throw new Error('Document not found');
    if (!doc.expiryDate) throw new Error('Document does not have an expiry date');

    return Reminder.findOneAndUpdate(
      { documentId: doc._id, userId },
      {
        $set: {
          dueDate: doc.expiryDate,
          daysBefore,
          status: 'active',
          notes,
        },
      },
      { upsert: true, new: true }
    );
  }

  public static async dismissReminder(userId: Types.ObjectId, reminderId: string) {
    return Reminder.findOneAndUpdate(
      { _id: reminderId, userId },
      { $set: { status: 'dismissed' } },
      { new: true }
    );
  }
}
