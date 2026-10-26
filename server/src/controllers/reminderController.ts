import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { ReminderService } from '../services/reminderService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';

export class ReminderController {
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;
      const reminders = await ReminderService.listReminders(userId);
      sendSuccess(res, { reminders }, 'Reminders retrieved');
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;
      const { documentId, daysBefore, notes } = req.body as {
        documentId: string;
        daysBefore?: number;
        notes?: string;
      };

      if (!documentId) return next(new AppError('Document ID is required', 400));

      const reminder = await ReminderService.createReminder(userId, documentId, daysBefore, notes);
      sendSuccess(res, { reminder }, 'Reminder scheduled', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async dismiss(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id as Types.ObjectId;
      const id = req.params.id as string;
      const reminder = await ReminderService.dismissReminder(userId, id);
      sendSuccess(res, { reminder }, 'Reminder dismissed');
    } catch (error) {
      next(error);
    }
  }

  public static async triggerCheck(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ReminderService.checkAndGenerateReminders();
      sendSuccess(res, result, 'Reminder check completed');
    } catch (error) {
      next(error);
    }
  }
}
