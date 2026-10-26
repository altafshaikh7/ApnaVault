import { Router } from 'express';
import { ReminderController } from '../controllers/reminderController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const remindersRouter = Router();

remindersRouter.use(requireAuth);

remindersRouter.get('/', ReminderController.list);
remindersRouter.post('/', ReminderController.create);
remindersRouter.post('/check', ReminderController.triggerCheck);
remindersRouter.patch('/:id/dismiss', ReminderController.dismiss);
