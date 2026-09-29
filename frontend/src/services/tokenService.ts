/**
 * tokenService.ts - Access and refresh tokens in localStorage.
 *
 * The expiry check only decides whether a token is worth sending; the backend
 * always verifies the signature, expiry and revocation.
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

interface JwtPayload {
  exp: number;
  sub: string;
}

/** Decode the payload of a JWT (base64url-encoded JSON). Returns null if malformed. */
export const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
};

export const tokenService = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),

  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),

  setTokens: (accessToken: string, refreshToken?: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  clearTokens: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /** True when the token is well-formed and its exp claim is in the future. */
  isTokenValid: (token: string | null): boolean => {
    if (!token) return false;
    const payload = decodeJwtPayload(token);
    return !!payload && typeof payload.exp === 'number' && payload.exp > Date.now() / 1000;
  },

  isAuthenticated: (): boolean => tokenService.isTokenValid(tokenService.getAccessToken()),

  /**
   * A session can be restored when either token is still valid: an expired access
   * token is renewed from the refresh token by the axios interceptor.
   */
  hasSession: (): boolean =>
    tokenService.isTokenValid(tokenService.getAccessToken()) ||
    tokenService.isTokenValid(tokenService.getRefreshToken()),
};

export type TokenServiceType = typeof tokenService;
