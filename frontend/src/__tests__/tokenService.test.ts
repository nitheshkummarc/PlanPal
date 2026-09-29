/**
 * tokenService.test.ts - Token storage and the client-side expiry check.
 * The check only decides whether a token is worth sending; the server verifies it.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { tokenService } from '../services/tokenService';

/** A JWT-shaped string with the given exp claim (seconds since the epoch); the signature is not checked client-side. */
function makeToken(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp, iat: exp - 3600, sub: 'user-1' }));
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

  describe('base64url payloads', () => {
    it('decodes payloads that use the URL-safe alphabet and no padding', () => {
      // Real JWTs are base64url: '-' and '_' instead of '+' and '/', without '=' padding.
      // These non-ASCII characters make the encoded payload contain '-' or '_'.
      const future = Math.floor(Date.now() / 1000) + 3600;
      const json = JSON.stringify({ exp: future, sub: 'user-1', name: 'ÿþý~~~' });
      const base64url = btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(base64url).toMatch(/[-_]/);
      expect(tokenService.isTokenValid(`header.${base64url}.sig`)).toBe(true);
    });
  });

  describe('hasSession', () => {
    it('is true when only the refresh token is still valid', () => {
      const now = Math.floor(Date.now() / 1000);
      tokenService.setTokens(makeToken(now - 60), makeToken(now + 3600));
      expect(tokenService.isAuthenticated()).toBe(false);
      expect(tokenService.hasSession()).toBe(true);
    });

    it('is false when both tokens are expired or missing', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(tokenService.hasSession()).toBe(false);
      tokenService.setTokens(makeToken(now - 60), makeToken(now - 30));
      expect(tokenService.hasSession()).toBe(false);
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
