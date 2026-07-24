/**
 * tokenService.test.ts - Tests for JWT token storage in localStorage.
 *
 * Why this matters: token validity is the gate for `isAuthenticated`, which
 * drives ProtectedRoute and the axios 401-refresh interceptor. A bug here
 * means either (a) locked-out users or (b) authenticated access for invalid
 * tokens. The expiry check is client-side UX only (no signature verification
 * by design), but it must at least reject expired and malformed tokens.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { tokenService } from '../services/tokenService';

// Helper: build a JWT-shaped string with a given exp claim (seconds since epoch).
function makeToken(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp, iat: exp - 3600, sub: 'user-1' }));
  // Signature is irrelevant for client-side parsing; tokenService doesn't verify.
  return `${header}.${payload}.signature`;
}

describe('tokenService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('setTokens / getAccessToken / getRefreshToken', () => {
    it('stores and returns the access token', () => {
      tokenService.setTokens('access-123', 'refresh-456');
      expect(tokenService.getAccessToken()).toBe('access-123');
      expect(tokenService.getRefreshToken()).toBe('refresh-456');
    });

    it('stores access token without a refresh token', () => {
      tokenService.setTokens('access-123');
      expect(tokenService.getAccessToken()).toBe('access-123');
      expect(tokenService.getRefreshToken()).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('removes both tokens', () => {
      tokenService.setTokens('access', 'refresh');
      tokenService.clearTokens();
      expect(tokenService.getAccessToken()).toBeNull();
      expect(tokenService.getRefreshToken()).toBeNull();
    });

    it('is safe to call when nothing is stored', () => {
      expect(() => tokenService.clearTokens()).not.toThrow();
    });
  });

  describe('isTokenValid', () => {
    it('returns false for null', () => {
      expect(tokenService.isTokenValid(null)).toBe(false);
    });

    it('returns false for a malformed token (not 3 parts)', () => {
      expect(tokenService.isTokenValid('not-a-jwt')).toBe(false);
    });

    it('returns false for a token whose payload is not valid base64-json', () => {
      expect(tokenService.isTokenValid('aaa.bbb.ccc')).toBe(false);
    });

    it('returns true for a token expiring in the future', () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      expect(tokenService.isTokenValid(makeToken(future))).toBe(true);
    });

    it('returns false for an expired token', () => {
      const past = Math.floor(Date.now() / 1000) - 3600;
      expect(tokenService.isTokenValid(makeToken(past))).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no token is stored', () => {
      expect(tokenService.isAuthenticated()).toBe(false);
    });

    it('returns false when the stored token is expired', () => {
      const past = Math.floor(Date.now() / 1000) - 1;
      tokenService.setTokens(makeToken(past));
      expect(tokenService.isAuthenticated()).toBe(false);
    });

    it('returns true when a valid (future-expiring) token is stored', () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      tokenService.setTokens(makeToken(future));
      expect(tokenService.isAuthenticated()).toBe(true);
    });
  });
});
