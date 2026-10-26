// Utility to validate uploaded files (size, MIME, checksum)
import crypto from 'crypto';
import path from 'path';
import { AppError } from './AppError.js';

/** Allowed MIME types for document uploads */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

/** Maximum file size (10 MiB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const MIME_EXTENSIONS: Record<(typeof ALLOWED_MIME_TYPES)[number], string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

export function validateFile(file: {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}): void {
  if (file.size === 0 || file.buffer.length === 0) {
    throw new AppError('Uploaded file must not be empty', 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError('File exceeds the 10 MiB limit', 413);
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new AppError('Only PDF, JPEG, and PNG files are supported', 400);
  }

  const allowedExtensions = MIME_EXTENSIONS[file.mimetype as (typeof ALLOWED_MIME_TYPES)[number]];
  if (!allowedExtensions.includes(path.extname(file.originalname).toLowerCase())) {
    throw new AppError('File extension does not match its media type', 400);
  }

  const isPdf = file.mimetype === 'application/pdf' && file.buffer.subarray(0, 5).toString() === '%PDF-';
  const isJpeg = file.mimetype === 'image/jpeg'
    && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isPng = file.mimetype === 'image/png'
    && file.buffer.subarray(0, pngSignature.length).equals(pngSignature);

  if (!isPdf && !isJpeg && !isPng) {
    throw new AppError('File contents do not match the declared media type', 400);
  }
}

export function sha256Checksum(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function sanitizeOriginalFilename(fileName: string): string {
  const baseName = path.posix.basename(fileName.replace(/\\/g, '/'));
  const sanitized = baseName.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255);
  return sanitized || 'document';
}
