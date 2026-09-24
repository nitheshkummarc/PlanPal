/**
 * helpers.test.ts - Shared API error reading and cross-page refresh.
 */
import { describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { getApiErrorMessage, notifyEventsChanged, onEventsChanged } from '../utils/helpers';

const axiosErrorWith = (data: unknown, status = 400) => {
  const error = new AxiosError('Request failed');
  error.response = { data, status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } };
  return error;
};

describe('getApiErrorMessage', () => {
  it('returns the backend error message ({ success: false, error })', () => {
    expect(getApiErrorMessage(axiosErrorWith({ success: false, error: 'Event is full' }), 'fallback'))
      .toBe('Event is full');
  });

  it('explains network failures (no response, e.g. server asleep)', () => {
    expect(getApiErrorMessage(new AxiosError('Network Error'), 'fallback'))
      .toBe('Unable to reach the server. Please try again.');
  });

  it('uses the fallback for anything else', () => {
    expect(getApiErrorMessage(new Error('boom'), 'Failed to join event')).toBe('Failed to join event');
    expect(getApiErrorMessage(axiosErrorWith({}, 500), 'Failed to join event')).toBe('Failed to join event');
  });
});

describe('onEventsChanged / notifyEventsChanged', () => {
  it('calls subscribers in this tab and stops after unsubscribe', () => {
    const callback = vi.fn();
    const unsubscribe = onEventsChanged(callback);

    notifyEventsChanged();
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    notifyEventsChanged();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('reacts to changes made in other tabs (storage event)', () => {
    const callback = vi.fn();
    const unsubscribe = onEventsChanged(callback);

    window.dispatchEvent(new StorageEvent('storage', { key: 'eventUpdated' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'somethingElse' }));
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
