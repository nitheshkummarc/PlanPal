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

/** Paginated API response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Standard API error shape from backend.
 *
 * Canonical field is `error` — verified by grepping all Flask route handlers.
 * Every inline error uses `jsonify({'error': '...'})`, and the shared
 * `error_response()` utility in responses.py also uses `{'error': message}`.
 * The `message` key only appears in success responses (e.g., 'Login successful').
 */
export interface ApiError {
  error: string;
}
