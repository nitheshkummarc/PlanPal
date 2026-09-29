/**
 * dateUtils.test.ts - Local-day handling, run in India Standard Time (UTC+05:30) where
 * UTC and local calendar days differ for events between 00:00 and 05:29.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { localDateKey, localDayEndISO, localDayStartISO, localInputToISO, toLocalInputValue } from '../utils/dateUtils';

const originalTz = process.env.TZ;

beforeAll(() => {
  process.env.TZ = 'Asia/Kolkata';
});

afterAll(() => {
  process.env.TZ = originalTz;
});

describe('localDateKey', () => {
  it('uses the local calendar day, not the UTC day', () => {
    // 20:30 UTC on 30 Sep is 02:00 on 1 Oct in India
    expect(localDateKey('2026-09-30T20:30:00Z')).toBe('2026-10-01');
    expect(localDateKey('2026-09-30T10:00:00Z')).toBe('2026-09-30');
  });
});

describe('local day bounds for date filters', () => {
  it('converts a picked day to its exact UTC range', () => {
    expect(localDayStartISO('2026-10-01')).toBe('2026-09-30T18:30:00.000Z');
    expect(localDayEndISO('2026-10-01')).toBe('2026-10-01T18:29:59.999Z');
  });
});

describe('datetime-local conversion', () => {
  it('round-trips between the input value and UTC', () => {
    expect(localInputToISO('2026-10-01T02:00')).toBe('2026-09-30T20:30:00.000Z');
    expect(toLocalInputValue('2026-09-30T20:30:00Z')).toBe('2026-10-01T02:00');
  });
});
