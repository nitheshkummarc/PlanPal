/**
 * tokenService.ts - JWT Token Management Service
 *
 * Why: Manages JWT tokens in localStorage with validation
 *
 * Functions:
 * - getAccessToken(): Retrieve access token from localStorage
 * - getRefreshToken(): Retrieve refresh token from localStorage
 * - setTokens(accessToken, refreshToken): Store tokens in localStorage
 * - clearTokens(): Remove all tokens from localStorage (logout)
 * - isTokenValid(token): Check if JWT token is not expired
 * - isAuthenticated(): Check if user has valid access token
 */

interface JwtPayload {
  exp: number;
  iat: number;
  sub: string;
  [key: string]: unknown;
}

export interface TokenServiceType {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  clearTokens: () => void;
  isTokenValid: (token: string | null) => boolean;
  isAuthenticated: () => boolean;
}

export const tokenService: TokenServiceType = {
  getAccessToken: () => {
    return localStorage.getItem('accessToken');
  },

  getRefreshToken: () => {
    return localStorage.getItem('refreshToken');
  },

  setTokens: (accessToken: string, refreshToken?: string) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  },

  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  isTokenValid: (token: string | null): boolean => {
    if (!token) {
      return false;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  },

  isAuthenticated: (): boolean => {
    const token = tokenService.getAccessToken();
    return !!token && tokenService.isTokenValid(token);
  }
};
