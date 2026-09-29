/**
 * eventsApi.ts - Event and participation endpoints (/api/events).
 * Response shapes match backend/app/routes/events.py.
 */

import axiosInstance from '../services/axiosInstance';
import type { AppEvent, EventDetail, Participation, ParticipationStatus } from '../types';
import type { Pagination } from '../types/api';

export type EventSort = 'date' | 'created_at';

/** Filters for the Discover list (upcoming events only). */
export interface EventFilters {
  q?: string;
  tag_ids?: string;        // comma-separated tag UUIDs
  location?: string;
  date_from?: string;      // ISO 8601
  date_to?: string;        // ISO 8601, inclusive
  sort_by?: EventSort;
  page?: number;
  per_page?: number;
}

/** Filters for the signed-in user's own lists (/my and /joined). */
export interface OwnEventFilters {
  upcoming?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface EventListResponse {
  events: AppEvent[];
  pagination: Pagination;
}

export interface EventInput {
  title: string;
  description: string | null;
  timestamp: string;
  place: string;
  location: string;
  city: string;
  state: string;
  is_paid: boolean;
  price: number | null;
  max_participants: number | null;
  tag_ids: string[];
}

interface ParticipationResponse {
  message: string;
  participation: Participation;
}

const MAX_PER_PAGE = 100;

/** Follow pagination until every page of a list endpoint has been read. */
const fetchAllPages = async (url: string, params: Record<string, string | number | boolean | undefined>) => {
  const events: AppEvent[] = [];
  for (let page = 1; ; page += 1) {
    const response = await axiosInstance.get<EventListResponse>(url, {
      params: { ...params, page, per_page: MAX_PER_PAGE },
    });
    events.push(...response.data.events);
    if (page >= response.data.pagination.pages) {
      return events;
    }
  }
};

const ownListParams = (filters: OwnEventFilters) => ({
  upcoming: filters.upcoming ? 'true' : undefined,
  date_from: filters.date_from,
  date_to: filters.date_to,
});

export const eventsApi = {
  /** Upcoming events with filters (Discover page). */
  getEvents: async (filters: EventFilters = {}): Promise<EventListResponse> => {
    const response = await axiosInstance.get<EventListResponse>('/api/events/', { params: filters });
    return response.data;
  },

  /** Event detail, including participants and the viewer's own participation. */
  getEventDetails: async (eventId: string): Promise<EventDetail> => {
    const response = await axiosInstance.get<{ event: EventDetail }>(`/api/events/${eventId}`);
    return response.data.event;
  },

  createEvent: async (data: EventInput): Promise<AppEvent> => {
    const response = await axiosInstance.post<{ event: AppEvent }>('/api/events/', data);
    return response.data.event;
  },

  updateEvent: async (eventId: string, data: Partial<EventInput>): Promise<AppEvent> => {
    const response = await axiosInstance.put<{ event: AppEvent }>(`/api/events/${eventId}`, data);
    return response.data.event;
  },

  /** Participants are notified if the event is still upcoming. */
  deleteEvent: async (eventId: string): Promise<void> => {
    await axiosInstance.delete(`/api/events/${eventId}`);
  },

  /** Join as 'interested'. */
  joinEvent: async (eventId: string): Promise<ParticipationResponse> => {
    const response = await axiosInstance.post<ParticipationResponse>(`/api/events/${eventId}/join`);
    return response.data;
  },

  leaveEvent: async (eventId: string): Promise<void> => {
    await axiosInstance.delete(`/api/events/${eventId}/leave`);
  },

  updateParticipationStatus: async (eventId: string, status: ParticipationStatus): Promise<ParticipationResponse> => {
    const response = await axiosInstance.put<ParticipationResponse>(`/api/events/${eventId}/update-status`, { status });
    return response.data;
  },

  /** One page of the events the user organises (use its pagination.total for counts). */
  getMyEvents: async (filters: OwnEventFilters = {}, page = 1, perPage = 1): Promise<EventListResponse> => {
    const response = await axiosInstance.get<EventListResponse>('/api/events/my', {
      params: { ...ownListParams(filters), page, per_page: perPage },
    });
    return response.data;
  },

  /** One page of the events the user joined, excluding their own. */
  getJoinedEvents: async (filters: OwnEventFilters = {}, page = 1, perPage = 1): Promise<EventListResponse> => {
    const response = await axiosInstance.get<EventListResponse>('/api/events/joined', {
      params: { ...ownListParams(filters), page, per_page: perPage },
    });
    return response.data;
  },

  /** Every event the user organises or joined (all pages), soonest first. */
  getAllMyEvents: async (filters: OwnEventFilters = {}): Promise<AppEvent[]> => {
    const params = ownListParams(filters);
    const [organised, joined] = await Promise.all([
      fetchAllPages('/api/events/my', params),
      fetchAllPages('/api/events/joined', params),
    ]);
    return [...organised, ...joined].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  },
};
