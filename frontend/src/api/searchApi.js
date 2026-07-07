/**
 * searchApi.js - Search API Service
 * 
 * Why: Handles search HTTP requests across events, users, tags
 * 
 * Functions:
 * - search(query, params): GET /api/search/
 *   Unified search across all resource types (events, users, tags)
 * 
 * - searchEvents(query, params): GET /api/search/?type=events
 *   Search only events with optional filters
 * 
 * - searchUsers(query, params): GET /api/search/?type=users
 *   Search only users by name, username, bio
 * 
 * - searchTags(query, params): GET /api/search/?type=tags
 *   Search only tags by name and description
 * 
 * - advancedEventSearch(filters): GET /api/events/
 *   Advanced event search with multiple filters
 * 
 * - getSearchSuggestions(query, type): GET /api/search/
 *   Get quick suggestions for auto-complete (limit 5)
 * 
 * - searchByLocation(location, radius, params): GET /api/events/
 *   Search events by location within radius
 * 
 * - searchByTags(tagIds, params): GET /api/events/
 *   Filter events by multiple tag IDs
 * 
 * - autoComplete(query, type): GET /api/search/
 *   Auto-complete suggestions (limit 3)
 * 
 * Search Parameters:
 * - q: Search query string
 * - type: 'all', 'events', 'users', 'tags'
 * - limit: Maximum results per type
 * - tag_ids: Comma-separated tag IDs
 * - location: Location filter
 * - sort_by: Sort method ('relevance', 'date')
 * 
 * Response Format:
 * - { query, results: { events: [], users: [], tags: [] } }
 * 
 * Dependencies:
 * - axiosInstance for HTTP requests
 */

import axiosInstance from '../services/axiosInstance';

export const searchApi = {
  // General search across events and users
  search: async (query, params = {}) => {
    const response = await axiosInstance.get('/api/search/', {
      params: { q: query, ...params }
    });
    return response.data;
  },

  // Search events (using main search endpoint with type filter)
  searchEvents: async (query, params = {}) => {
    const response = await axiosInstance.get('/api/search/', {
      params: { q: query, type: 'events', ...params }
    });
    return response.data;
  },

  // Search users (using main search endpoint with type filter)
  searchUsers: async (query, params = {}) => {
    const response = await axiosInstance.get('/api/search/', {
      params: { q: query, type: 'users', ...params }
    });
    return response.data;
  },

  // Search tags (using main search endpoint with type filter)
  searchTags: async (query, params = {}) => {
    const response = await axiosInstance.get('/api/search/', {
      params: { q: query, type: 'tags', ...params }
    });
    return response.data;
  },

  // Advanced event search (fallback to events API)
  advancedEventSearch: async (filters) => {
    const response = await axiosInstance.get('/api/events/', { params: filters });
    return response.data;
  },

  // Get search suggestions (fallback)
  getSearchSuggestions: async (query, type = 'all') => {
    try {
      const response = await axiosInstance.get('/api/search/', {
        params: { q: query, type, limit: 5 }
      });
      return response.data;
    } catch (error) {
      return { results: [] };
    }
  },

  // Search by location (using events API)
  searchByLocation: async (location, radius = 25, params = {}) => {
    const response = await axiosInstance.get('/api/events/', {
      params: { location, ...params }
    });
    return response.data;
  },

  // Search by tags (using events API)
  searchByTags: async (tagIds, params = {}) => {
    const response = await axiosInstance.get('/api/events/', {
      params: { tag_ids: tagIds.join(','), ...params }
    });
    return response.data;
  },

  // Auto-complete search (fallback)
  autoComplete: async (query, type = 'all') => {
    try {
      const response = await axiosInstance.get('/api/search/', {
        params: { q: query, type, limit: 3 }
      });
      return response.data;
    } catch (error) {
      return { results: [] };
    }
  },
};
