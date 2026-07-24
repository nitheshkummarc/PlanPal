/**
 * mockAdapter.ts - Axios mock adapter for offline UI preview
 *
 * Why: When VITE_BYPASS_AUTH === 'true' (opt-in, off by default), this
 *      intercepts axios requests and returns canned responses so the UI
 *      can be exercised without a live backend. This file exists ONLY to
 *      satisfy the conditional import in axiosInstance.ts and to provide a
 *      safe default; it is never used in production builds unless the env
 *      flag is explicitly set.
 *
 * Scope: Deliberately minimal. It returns 200 with an empty/safe body for
 *        GETs and a generic success object for writes. The AuthContext's
 *        BYPASS_AUTH path short-circuits real auth independently of this
 *        adapter, so this adapter only needs to keep data-fetching pages
 *        from throwing network errors during preview.
 *
 * Security: No real credentials, no real data. Returned tokens are static
 *           placeholders. This adapter MUST NOT be enabled in production.
 */

import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios';

const MOCK_TOKEN =
  'mock-preview-token-not-valid-against-any-real-backend.' + btoa('mock');

/**
 * Build a deterministic mock response. The shape is intentionally permissive
 * (records indexed by string) so consumers using `as any` continue to work,
 * while typed callers get a 200 with plausible fields.
 */
function buildBody(config: AxiosRequestConfig): unknown {
  const url = config.url ?? '';
  const method = (config.method ?? 'get').toLowerCase();

  // Auth profile / current user
  if (url.includes('/api/auth/profile') || url.includes('/api/users/profile')) {
    return {
      user: {
        user_id: '00000000-0000-0000-0000-000000000001',
        name: 'Preview User',
        email: 'preview@example.com',
        username: 'preview',
        bio: 'Offline preview user',
        profile_image_url: null,
        preferences: ['Technology'],
        role: 'user',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  }

  // Login / register: return tokens
  if (url.endsWith('/api/auth/login') || url.endsWith('/api/auth/register')) {
    return {
      message: 'Mock authentication (preview mode)',
      access_token: MOCK_TOKEN,
      refresh_token: MOCK_TOKEN,
      user: {
        user_id: '00000000-0000-0000-0000-000000000001',
        name: 'Preview User',
        email: 'preview@example.com',
        username: 'preview',
        bio: 'Offline preview user',
        profile_image_url: null,
        preferences: ['Technology'],
        role: 'user',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  }

  // Generic list endpoints
  if (url.includes('/api/events')) {
    return { events: [], pagination: { page: 1, per_page: 10, total: 0, pages: 0 } };
  }
  if (url.includes('/api/notifications')) {
    return { notifications: [], pagination: { page: 1, per_page: 20, total: 0, pages: 0 }, unread_count: 0 };
  }
  if (url.includes('/api/tags')) {
    return { tags: [] };
  }
  if (url.includes('/api/search')) {
    return { query: '', results: {} };
  }
  if (url.includes('/api/system/')) {
    return { status: 'mock', database: 'mock' };
  }

  // Writes: optimistic success
  if (method !== 'get') {
    return { message: 'Mock success (preview mode)' };
  }

  // Fallback
  return { message: 'Mock response (preview mode)' };
}

/**
 * Adapter function consumed by axios. Returns a promise resolving to an
 * AxiosResponse-shaped object so axios's interceptor pipeline works normally.
 */
export const mockAdapter: AxiosAdapter = (config: AxiosRequestConfig): Promise<AxiosResponse> => {
  const body = buildBody(config);
  const response: AxiosResponse = {
    data: body,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  };
  // Simulate a small network delay to exercise loading states in the UI.
  return new Promise((resolve) => {
    setTimeout(() => resolve(response), 150);
  });
};
