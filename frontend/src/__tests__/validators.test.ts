/**
 * validators.test.ts - Frontend form rules must match the backend.
 *
 * Why this matters: if the frontend accepts something the API rejects (or the
 * reverse), users see confusing errors. These cases mirror
 * backend/tests/test_end_to_end_fixes.py.
 */
import { describe, expect, it } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateName,
  validateHttpUrl,
} from '../utils/validators';

describe('validators (same rules as the backend)', () => {
  it('accepts passwords with any special character and rejects weak ones', () => {
    expect(validatePassword('Strong#Pass1')).toBe(true);
    expect(validatePassword('Str0ng_Pass!')).toBe(true);
    expect(validatePassword('Password1')).toBe(false);      // no special char + weak pattern
    expect(validatePassword('Strong#12345')).toBe(false);   // weak pattern
    expect(validatePassword('short#A1')).toBe(true);        // exactly 8 characters
    expect(validatePassword('Sh#A1')).toBe(false);          // too short
  });

  it('accepts plus-addressed emails and rejects malformed ones', () => {
    expect(validateEmail('first.last+events@gmail.com')).toBe(true);
    expect(validateEmail('a..b@example.com')).toBe(false);
    expect(validateEmail('no-at-sign.com')).toBe(false);
  });

  it('checks usernames: 3-20 letters, digits or underscores', () => {
    expect(validateUsername('new_person')).toBe(true);
    expect(validateUsername('ab')).toBe(false);
    expect(validateUsername('has space')).toBe(false);
  });

  it('accepts names in any language but rejects digits', () => {
    expect(validateName('நிதேஷ் குமார்')).toBe(true);
    expect(validateName("Mary-Jane O'Neil Jr.")).toBe(true);
    expect(validateName('John2')).toBe(false);
    expect(validateName('   ')).toBe(false);
  });

  it('only allows empty or http(s) image URLs', () => {
    expect(validateHttpUrl('')).toBe(true);
    expect(validateHttpUrl('https://example.com/me.png')).toBe(true);
    expect(validateHttpUrl('javascript:alert(1)')).toBe(false);
  });
});
