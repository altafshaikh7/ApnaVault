import { Router } from 'express';
import { healthRouter } from './health.js';
import { authRouter } from './auth.js';
import { documentsRouter } from './documents.js';
import { invitationsRouter } from './invitations.js';
import { foldersRouter } from './folders.js';
import { notificationsRouter } from './notifications.js';
import { remindersRouter } from './reminders.js';

export const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/documents', documentsRouter);
v1Router.use('/invitations', invitationsRouter);
v1Router.use('/folders', foldersRouter);
v1Router.use('/notifications', notificationsRouter);
v1Router.use('/reminders', remindersRouter);
