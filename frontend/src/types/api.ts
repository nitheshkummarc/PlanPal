/**
 * types/api.ts - Shared shapes of API responses and context results.
 */

/** Result of an AuthContext action. */
export type ContextResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Pagination block returned by list endpoints (events, notifications) */
export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

/**
 * Body of every API error response: { success: false, error: "<message>" }.
 * Read it with getApiErrorMessage() in utils/helpers.ts.
 */
export interface ApiError {
  success?: false;
  error: string;
}
