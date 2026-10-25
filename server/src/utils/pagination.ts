import type { PaginationMeta } from './apiResponse.js';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationQueryInput {
  page?: unknown;
  limit?: unknown;
}

export function parsePaginationParams(
  query: PaginationQueryInput,
  defaultLimit = 20,
  maxLimit = 100
): PaginationParams {
  let page = Number(query.page);
  let limit = Number(query.limit);

  if (isNaN(page) || page < 1) {
    page = 1;
  } else {
    page = Math.floor(page);
  }

  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  } else {
    limit = Math.floor(limit);
    if (limit > maxLimit) {
      limit = maxLimit;
    }
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function parseSortOrder(
  sortQuery?: string,
  allowedFields: string[] = ['createdAt'],
  defaultField = 'createdAt',
  defaultOrder: 1 | -1 = -1
): Record<string, 1 | -1> {
  if (!sortQuery) {
    return { [defaultField]: defaultOrder };
  }

  const isDescending = sortQuery.startsWith('-');
  const fieldName = isDescending ? sortQuery.substring(1) : sortQuery;

  if (allowedFields.includes(fieldName)) {
    return { [fieldName]: isDescending ? -1 : 1 };
  }

  return { [defaultField]: defaultOrder };
}
