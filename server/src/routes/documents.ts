import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/documentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { AppError } from '../utils/AppError.js';
import { MAX_FILE_SIZE, validateFile } from '../utils/fileValidator.js';

export const documentsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 10, fieldSize: 16 * 1024 },
});

function receiveDocument(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (error: unknown) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File exceeds the 10 MiB limit', 413));
      }
      return next(new AppError('Invalid document upload', 400));
    }

    try {
      if (!req.file) throw new AppError('A document file is required', 400);
      validateFile(req.file);
      next();
    } catch (validationError) {
      next(validationError);
    }
  });
}

documentsRouter.use(requireAuth);
documentsRouter.post('/', receiveDocument, DocumentController.upload);
documentsRouter.get('/', DocumentController.list);
documentsRouter.get('/:id/download', DocumentController.download);
documentsRouter.get('/:id', DocumentController.get);
documentsRouter.delete('/:id', DocumentController.delete);
