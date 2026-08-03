import { pageDefaults } from './env';

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PageRequest {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/**
 * Reads `?page=` and `?pageSize=` from a query string and clamps them into a
 * safe range. Invalid or missing values fall back to page 1 and the default
 * page size, so a malformed query never produces a 500 or an unbounded scan.
 */
export const parsePageRequest = (query: Record<string, unknown>): PageRequest => {
  const rawPage = Number.parseInt(String(query.page ?? ''), 10);
  const rawSize = Number.parseInt(String(query.pageSize ?? ''), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = Number.isFinite(rawSize) && rawSize > 0
    ? Math.min(rawSize, pageDefaults.maxSize)
    : pageDefaults.size;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};

export const paginated = <T>(items: T[], total: number, request: PageRequest): Paginated<T> => ({
  items,
  page: request.page,
  pageSize: request.pageSize,
  total,
});
