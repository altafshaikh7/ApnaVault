import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', NotificationController.list);
notificationsRouter.get('/unread-count', NotificationController.getUnreadCount);
notificationsRouter.post('/read-all', NotificationController.markAllAsRead);
notificationsRouter.patch('/:id/read', NotificationController.markAsRead);
notificationsRouter.delete('/:id', NotificationController.delete);
