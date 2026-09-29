/**
 * config.test.ts - API base URL resolution.
 *
 * The URL decides where tokens are sent, so it must never downgrade an HTTPS page
 * to plain HTTP for a remote host, and the offline "bypass auth" mode that used to
 * live here must stay removed.
 */
import { describe, expect, it } from 'vitest';
import * as config from '../config';
import { resolveApiBaseUrl } from '../config';

describe('resolveApiBaseUrl', () => {
  it('defaults to the local backend', () => {
    expect(resolveApiBaseUrl(undefined, 'http:')).toBe('http://localhost:5000');
  });

  it('uses the configured origin without a trailing slash', () => {
    expect(resolveApiBaseUrl('https://api.example.com/', 'https:')).toBe('https://api.example.com');
  });

  it("treats '/' as the page's own origin (requests go to /api/...)", () => {
    expect(resolveApiBaseUrl('/', 'https:')).toBe('');
  });

  it('upgrades a remote http origin to https on an https page', () => {
    expect(resolveApiBaseUrl('http://api.example.com', 'https:')).toBe('https://api.example.com');
  });

  it.each([
    ['http://localhost:5000'],
    ['http://127.0.0.1:5000'],
  ])('leaves local development origin %s unchanged', (url) => {
    expect(resolveApiBaseUrl(url, 'https:')).toBe(url);
  });

  it('keeps http on an http page', () => {
    expect(resolveApiBaseUrl('http://api.example.com', 'http:')).toBe('http://api.example.com');
  });
});

describe('authentication cannot be bypassed', () => {
  it('exposes no bypass flag', () => {
    expect(Object.keys(config)).not.toContain('BYPASS_AUTH');
  });
});
