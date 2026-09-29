/**
 * config.ts - Runtime configuration derived from Vite environment variables.
 *
 * VITE_API_BASE_URL: backend origin, e.g. https://api.example.com.
 *   Unset:  http://localhost:5000 (local development).
 *   '/':    same origin as the page (the Docker setup proxies /api through nginx).
 */

const DEFAULT_API_BASE_URL = 'http://localhost:5000';

const isLocalHttp = (url: string): boolean => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(url);

/**
 * Normalise the configured API origin: no trailing slash ('' means same origin), and
 * never plain HTTP to a remote host from an HTTPS page (mixed content would be blocked).
 */
export const resolveApiBaseUrl = (configured: string | undefined, pageProtocol: string | undefined): string => {
  const url = (configured ?? DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '');
  if (pageProtocol === 'https:' && url.startsWith('http://') && !isLocalHttp(url)) {
    return url.replace(/^http:\/\//, 'https://');
  }
  return url;
};

export const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
  typeof window !== 'undefined' ? window.location.protocol : undefined
);
