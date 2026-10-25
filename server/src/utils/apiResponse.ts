import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiErrorPayload {
  message: string;
  code?: string;
  details?: unknown;
  stack?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: PaginationMeta
): void {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
    ...(meta ? { meta } : {}),
  };
  res.status(statusCode).json(payload);
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  meta: PaginationMeta,
  message?: string,
  statusCode = 200
): void {
  sendSuccess(res, items, message, statusCode, meta);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  code?: string,
  details?: unknown
): void {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      message,
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
    },
  };
  res.status(statusCode).json(payload);
}
