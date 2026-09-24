/**
 * searchApi.ts - Search API Service
 *
 * Why: Handles search HTTP requests across events, users, tags.
 * All functions call GET /api/search/ (see backend/app/routes/search.py).
 */

import axiosInstance from '../services/axiosInstance';
import type { AppEvent, AppUser, AppTag } from '../types';

interface SearchParams {
  type?: 'all' | 'events' | 'users' | 'tags';
  limit?: number;               // 1-100, default 50
  tag_ids?: string;             // comma-separated tag UUIDs
  location?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;             // 'relevance'/'date' = upcoming first; 'created_at' = newest first
  [key: string]: string | number | undefined;
}

interface SearchResults {
  events?: AppEvent[];
  users?: AppUser[];            // public fields only (no email)
  tags?: AppTag[];
}

interface SearchResponse {
  query: string;
  tag_ids?: string[];
  results: SearchResults;
}

export interface SearchSuggestion {
  type: 'event' | 'user';
  id: string;
  title?: string;
  name?: string;
  subtitle?: string;
}

export const searchApi = {
  // General search across events, users and tags
  search: async (query: string, params: SearchParams = {}): Promise<SearchResponse> => {
    const response = await axiosInstance.get<SearchResponse>('/api/search/', {
      params: { q: query, ...params }
    });
    return response.data;
  },

  // Search events only (past events included, upcoming first)
  searchEvents: async (query: string, params: SearchParams = {}): Promise<SearchResponse> => {
    const response = await axiosInstance.get<SearchResponse>('/api/search/', {
      params: { q: query, type: 'events', ...params }
    });
    return response.data;
  },

  // Suggestions for the navbar search box; never throws (returns [] on error)
  getSearchSuggestions: async (query: string, type: string = 'all'): Promise<{ suggestions: SearchSuggestion[] }> => {
    try {
      const response = await axiosInstance.get<SearchResponse>('/api/search/', {
        params: { q: query, type, limit: 5 }
      });

      const suggestions: SearchSuggestion[] = [];
      const results = response.data.results || {};

      (results.events || []).forEach((event: AppEvent) => {
        suggestions.push({ type: 'event', id: event.event_id, title: event.title, subtitle: event.place });
      });
      (results.users || []).forEach((user: AppUser) => {
        suggestions.push({ type: 'user', id: user.user_id, name: user.name, subtitle: `@${user.username}` });
      });

      return { suggestions };
    } catch {
      return { suggestions: [] };
    }
  },
};
