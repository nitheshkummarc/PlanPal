/**
 * types/api.ts - API response utility types
 *
 * Why: Provides ContextResponse<T> discriminated union for every API/context
 * return, and standard API error shape derived from backend Flask routes.
 */

/** Discriminated union for every API/context return */
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
 * Standard API error shape from backend: every error response is
 * { success: false, error: "<message>" } (route errors, 404/405/429/500, JWT errors).
 * The `message` key only appears in success responses (e.g., 'Login successful').
 * Use getApiErrorMessage() in utils/helpers.ts to read it.
 */
export interface ApiError {
  success?: false;
  error: string;
}
