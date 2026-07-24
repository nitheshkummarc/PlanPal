/**
 * searchApi.ts - Search API Service
 *
 * Why: Handles search HTTP requests across events, users, tags
 */

import axiosInstance from '../services/axiosInstance';
import type { AppEvent, AppUser, AppTag } from '../types';
import type { ApiError } from '../types/api';
import axios from 'axios';

interface SearchParams {
  type?: 'all' | 'events' | 'users' | 'tags';
  limit?: number;
  tag_ids?: string;
  location?: string;
  sort_by?: string;
  [key: string]: string | number | undefined;
}

interface SearchResults {
  events?: AppEvent[];
  users?: AppUser[];
  tags?: AppTag[];
}

interface SearchResponse {
  query: string;
  results: SearchResults;
}

interface EventSearchResponse {
  events: AppEvent[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export const searchApi = {
  // General search across events and users
  search: async (query: string, params: SearchParams = {}): Promise<SearchResponse> => {
    const response = await axiosInstance.get<SearchResponse>('/api/search/', {
      params: { q: query, ...params }
    });
    return response.data;
  },

  // Search events (using main search endpoint with type filter)
  searchEvents: async (query: string, params: SearchParams = {}): Promise<SearchResponse> => {
    const response = await axiosInstance.get<SearchResponse>('/api/search/', {
      params: { q: query, type: 'events', ...params }
    });
    return response.data;
  },

  // Search users (using main search endpoint with type filter)
  searchUsers: async (query: string, params: SearchParams = {}): Promise<SearchResponse> => {
    const response = await axiosInstance.get<SearchResponse>('/api/search/', {
      params: { q: query, type: 'users', ...params }
    });
    return response.data;
  },

  // Search tags (using main search endpoint with type filter)
  searchTags: async (query: string, params: SearchParams = {}): Promise<SearchResponse> => {
    const response = await axiosInstance.get<SearchResponse>('/api/search/', {
      params: { q: query, type: 'tags', ...params }
    });
    return response.data;
  },

  // Advanced event search (fallback to events API)
  advancedEventSearch: async (filters: SearchParams): Promise<EventSearchResponse> => {
    const response = await axiosInstance.get<EventSearchResponse>('/api/events/', { params: filters });
    return response.data;
  },

  // Get search suggestions (fallback)
  getSearchSuggestions: async (query: string, type: string = 'all'): Promise<any> => {
    try {
      const response = await axiosInstance.get<SearchResponse>('/api/search/', {
        params: { q: query, type, limit: 5 }
      });
      
      const suggestions = [];
      const results = response.data.results || {};
      
      if (results.events) {
        results.events.forEach((event: AppEvent) => {
          suggestions.push({ type: 'event', id: event.event_id, title: event.title, subtitle: event.place });
        });
      }
      if (results.users) {
        results.users.forEach((user: AppUser) => {
          suggestions.push({ type: 'user', id: user.user_id, name: user.name, subtitle: `@${user.username}` });
        });
      }
      
      return { suggestions };
    } catch {
      return { suggestions: [] };
    }
  },

  // Search by location (using events API)
  searchByLocation: async (location: string, _radius = 25, params: SearchParams = {}): Promise<EventSearchResponse> => {
    const response = await axiosInstance.get<EventSearchResponse>('/api/events/', {
      params: { location, ...params }
    });
    return response.data;
  },

  // Search by tags (using events API)
  searchByTags: async (tagIds: string[], params: SearchParams = {}): Promise<EventSearchResponse> => {
    const response = await axiosInstance.get<EventSearchResponse>('/api/events/', {
      params: { tag_ids: tagIds.join(','), ...params }
    });
    return response.data;
  },

  // Auto-complete search (fallback)
  autoComplete: async (query: string, type: string = 'all'): Promise<SearchResponse> => {
    try {
      const response = await axiosInstance.get<SearchResponse>('/api/search/', {
        params: { q: query, type, limit: 3 }
      });
      return response.data;
    } catch {
      return { query, results: {} };
    }
  },
};
