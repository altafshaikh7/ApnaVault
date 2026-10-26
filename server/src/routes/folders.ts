import { Router } from 'express';
import { FolderController } from '../controllers/folderController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const foldersRouter = Router();

foldersRouter.use(requireAuth);

foldersRouter.get('/', FolderController.list);
foldersRouter.post('/', FolderController.create);
foldersRouter.patch('/:id', FolderController.rename);
foldersRouter.delete('/:id', FolderController.delete);
