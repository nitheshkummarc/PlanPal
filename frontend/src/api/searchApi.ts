/**
 * searchApi.ts - Search across events (past and upcoming) and people (/api/search).
 */

import axiosInstance from '../services/axiosInstance';
import type { AppEvent, AppUser } from '../types';
import type { EventSort } from './eventsApi';

export type SearchType = 'all' | 'events' | 'users';

export interface SearchParams {
  type?: SearchType;
  tag_ids?: string;    // comma-separated tag UUIDs
  location?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: EventSort; // 'date': upcoming first, soonest first; 'created_at': newest first
  limit?: number;      // 1-100 per type, default 50
}

export interface SearchResponse {
  query: string;
  tag_ids: string[];
  results: {
    events?: AppEvent[];
    users?: AppUser[];  // public fields only (no email)
  };
}

export interface SearchSuggestion {
  type: 'event' | 'user';
  id: string;
  label: string;
  subtitle: string;
}

export const searchApi = {
  search: async (query: string, params: SearchParams = {}): Promise<SearchResponse> => {
    const response = await axiosInstance.get<SearchResponse>('/api/search/', { params: { q: query, ...params } });
    return response.data;
  },

  /** Suggestions for the navbar search box; returns [] on error. */
  getSuggestions: async (query: string): Promise<SearchSuggestion[]> => {
    try {
      const { results } = await searchApi.search(query, { limit: 5 });
      return [
        ...(results.events ?? []).map((event): SearchSuggestion => ({
          type: 'event', id: event.event_id, label: event.title, subtitle: event.place,
        })),
        ...(results.users ?? []).map((user): SearchSuggestion => ({
          type: 'user', id: user.user_id, label: user.name, subtitle: `@${user.username}`,
        })),
      ];
    } catch {
      return [];
    }
  },
};
