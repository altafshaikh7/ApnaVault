import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { sendSuccess, sendPaginated, sendError } from '../utils/apiResponse.js';

function createMockResponse(): Response {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('API Response Formatter Utilities', () => {
  it('sendSuccess should return formatted payload with default 200 status', () => {
    const res = createMockResponse();
    const data = { user: 'test' };

    sendSuccess(res, data, 'Operation successful');

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data,
      message: 'Operation successful',
    });
  });

  it('sendPaginated should include pagination metadata', () => {
    const res = createMockResponse();
    const items = [{ id: '1' }, { id: '2' }];
    const meta = {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    };

    sendPaginated(res, items, meta);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: items,
      meta,
    });
  });

  it('sendError should format error payload with status code and error code', () => {
    const res = createMockResponse();

    sendError(res, 'Item not found', 404, 'NOT_FOUND', { id: '123' });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Item not found',
        code: 'NOT_FOUND',
        details: { id: '123' },
      },
    });
  });
});
