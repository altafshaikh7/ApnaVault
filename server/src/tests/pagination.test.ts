import { describe, it, expect } from 'vitest';
import {
  parsePaginationParams,
  buildPaginationMeta,
  parseSortOrder,
} from '../utils/pagination.js';

describe('Pagination Utilities', () => {
  it('parsePaginationParams should parse valid page and limit query', () => {
    const result = parsePaginationParams({ page: '2', limit: '15' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(15);
    expect(result.skip).toBe(15);
  });

  it('parsePaginationParams should fallback to defaults for invalid inputs', () => {
    const result = parsePaginationParams({ page: '-5', limit: 'abc' });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
  });

  it('parsePaginationParams should enforce max limit', () => {
    const result = parsePaginationParams({ page: '1', limit: '500' }, 20, 100);
    expect(result.limit).toBe(100);
  });

  it('buildPaginationMeta should calculate correct page counts and booleans', () => {
    const meta = buildPaginationMeta(45, 2, 20);
    expect(meta.total).toBe(45);
    expect(meta.page).toBe(2);
    expect(meta.limit).toBe(20);
    expect(meta.totalPages).toBe(3);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPrevPage).toBe(true);
  });

  it('parseSortOrder should safely parse asc/desc order and filter allowed fields', () => {
    expect(parseSortOrder('-createdAt', ['createdAt', 'title'])).toEqual({ createdAt: -1 });
    expect(parseSortOrder('title', ['createdAt', 'title'])).toEqual({ title: 1 });
    // Unknown field should fallback to default
    expect(parseSortOrder('-maliciousField', ['createdAt', 'title'])).toEqual({ createdAt: -1 });
  });
});
