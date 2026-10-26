import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';
import { Invitation } from '../models/Invitation.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';

export class NotificationController {
  private static async syncPendingInvitations(userId: Types.ObjectId, email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Sync any pending invites that might have been created
    const pendingInvites = await Invitation.find({
      email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') },
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .populate('workspaceId', 'name')
      .populate('invitedBy', 'name email')
      .lean();

    for (const invite of pendingInvites) {
      const inviteIdStr = invite._id.toString();
      const inviter = invite.invitedBy as any;
      const workspace = invite.workspaceId as any;
      const inviterName = inviter?.name || 'A family admin';
      const workspaceName = workspace?.name || 'Family Workspace';

      // Atomic upsert: insert only if no matching notification exists for this invitation.
      // This prevents race conditions with eager creation in invitationController.
      await Notification.findOneAndUpdate(
        {
          userId,
          type: 'workspace_invite',
          'metadata.invitationId': inviteIdStr,
        },
        {
          $setOnInsert: {
            userId,
            type: 'workspace_invite',
            title: 'Family Workspace Invitation',
            message: `${inviterName} invited you to join "${workspaceName}" as ${invite.role}.`,
            isRead: false,
            linkUrl: '/family',
            metadata: {
              invitationId: inviteIdStr,
              workspaceId: workspace?._id?.toString() || '',
              role: invite.role,
            },
          },
        },
        { upsert: true, new: false }
      );
    }

    // Auto-mark notifications as read if their corresponding invitation has been resolved or expired
    const resolvedInvites = await Invitation.find({
      email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') },
      $or: [{ status: { $ne: 'pending' } }, { expiresAt: { $lte: new Date() } }],
    })
      .select('_id')
      .lean();

    if (resolvedInvites.length > 0) {
      const resolvedIds = resolvedInvites.map((i: any) => i._id.toString());
      await Notification.updateMany(
        { userId, 'metadata.invitationId': { $in: resolvedIds }, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );
    }

    // Run reminder check to ensure expiring documents generate unread notifications
    try {
      const { ReminderService } = await import('../services/reminderService.js');
      await ReminderService.checkAndGenerateReminders();
    } catch {
      // Non-blocking
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;
      const userEmail = req.user!.email;

      // Sync any pending invites that might have been created while user was not logged in
      await NotificationController.syncPendingInvitations(userId, userEmail);

      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      const unreadCount = await Notification.countDocuments({
        userId,
        isRead: false,
      });

      const formatted = notifications.map((n: any) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        readAt: n.readAt?.toISOString(),
        linkUrl: n.linkUrl,
        metadata: n.metadata,
        createdAt: n.createdAt?.toISOString(),
      }));

      sendSuccess(res, { notifications: formatted, unreadCount }, 'Notifications retrieved');
    } catch (error) {
      next(error);
    }
  }

  public static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;
      const userEmail = req.user!.email;

      await NotificationController.syncPendingInvitations(userId, userEmail);

      const unreadCount = await Notification.countDocuments({
        userId,
        isRead: false,
      });

      sendSuccess(res, { unreadCount }, 'Unread count retrieved');
    } catch (error) {
      next(error);
    }
  }

  public static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;
      const notificationId = req.params.id as string;

      if (!Types.ObjectId.isValid(notificationId)) {
        return next(new AppError('Invalid notification ID', 400));
      }

      const notif = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { $set: { isRead: true, readAt: new Date() } },
        { new: true }
      );

      if (!notif) return next(new AppError('Notification not found', 404));

      const unreadCount = await Notification.countDocuments({ userId, isRead: false });

      sendSuccess(res, { notification: notif, unreadCount }, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  public static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;

      await Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );

      sendSuccess(res, { unreadCount: 0 }, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;
      const notificationId = req.params.id as string;

      if (!Types.ObjectId.isValid(notificationId)) {
        return next(new AppError('Invalid notification ID', 400));
      }

      await Notification.deleteOne({ _id: notificationId, userId });
      sendSuccess(res, null, 'Notification deleted');
    } catch (error) {
      next(error);
    }
  }
}
