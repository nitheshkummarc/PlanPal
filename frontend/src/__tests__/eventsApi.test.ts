/**
 * eventsApi.test.ts - getAllMyEvents reads every page of /my and /joined.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '../services/axiosInstance';
import { eventsApi } from '../api/eventsApi';

vi.mock('../services/axiosInstance', () => ({ default: { get: vi.fn() } }));

const event = (id: string, timestamp: string) => ({ event_id: id, timestamp });
const page = (events: unknown[], pageNumber: number, pages: number) => ({
  data: { events, pagination: { page: pageNumber, per_page: 100, total: events.length, pages } },
});

describe('eventsApi.getAllMyEvents', () => {
  beforeEach(() => {
    vi.mocked(axiosInstance.get).mockReset();
  });

  it('follows pagination on both lists and returns everything soonest first', async () => {
    vi.mocked(axiosInstance.get).mockImplementation((url, config) => {
      const pageNumber = (config?.params as { page: number }).page;
      if (url === '/api/events/my') {
        return Promise.resolve(pageNumber === 1
          ? page([event('m1', '2026-10-03T10:00:00Z')], 1, 2)
          : page([event('m2', '2026-10-01T10:00:00Z')], 2, 2));
      }
      return Promise.resolve(page([event('j1', '2026-10-02T10:00:00Z')], 1, 1));
    });

    const events = await eventsApi.getAllMyEvents({ upcoming: true });

    expect(events.map((e) => e.event_id)).toEqual(['m2', 'j1', 'm1']);
    expect(axiosInstance.get).toHaveBeenCalledTimes(3);
    const pagesRequested = vi.mocked(axiosInstance.get).mock.calls
      .filter(([url]) => url === '/api/events/my')
      .map(([, config]) => config?.params as Record<string, unknown>);
    expect(pagesRequested).toEqual([
      { upcoming: 'true', date_from: undefined, date_to: undefined, page: 1, per_page: 100 },
      { upcoming: 'true', date_from: undefined, date_to: undefined, page: 2, per_page: 100 },
    ]);
  });

  it('stops after the first page when a list is empty', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue(page([], 1, 0));
    expect(await eventsApi.getAllMyEvents()).toEqual([]);
    expect(axiosInstance.get).toHaveBeenCalledTimes(2);
  });
});
