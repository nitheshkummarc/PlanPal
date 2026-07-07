/**
 * tagsApi.js - Tags API Service
 * 
 * Why: Handles tag CRUD operations
 * 
 * Functions:
 * - getAllTags(): GET /api/tags/
 *   Fetch all available tags sorted alphabetically
 * 
 * - getPopularTags(limit): GET /api/tags/popular
 *   Get most used tags based on usage count
 *   Default limit: 20
 * 
 * - createTag(tagData): POST /api/tags/ (admin only)
 *   Create new tag with name, description, color
 * 
 * - getTagDetails(tagId): GET /api/tags/:id
 *   Get specific tag information
 * 
 * - updateTag(tagId, tagData): PUT /api/tags/:id (admin only)
 *   Update tag details (name, description, color)
 * 
 * - deleteTag(tagId): DELETE /api/tags/:id (admin only)
 *   Delete tag and all associations
 * 
 * - searchTags(query): GET /api/tags/search
 *   Search tags by name or description
 * 
 * Tag Properties:
 * - name: Unique tag identifier
 * - description: Optional detailed description
 * - color: Hex color code for UI display (#RRGGBB)
 * - usage_count: Number of times tag is used (popular tags)
 * 
 * Admin Restrictions:
 * - Only admin users can create, update, or delete tags
 * - Regular users can only view tags
 * 
 * Usage:
 * - Tags can be associated with events (EventTag)
 * - Tags can be associated with user interests (UserTag)
 * - Used for filtering and recommendations
 * 
 * Dependencies:
 * - axiosInstance for authenticated HTTP requests
 */

import axiosInstance from '../services/axiosInstance';

export const tagsApi = {
  // Get all tags
  getAllTags: async () => {
    const response = await axiosInstance.get('/api/tags/');
    return response.data;
  },

  // Get popular tags
  getPopularTags: async (limit = 20) => {
    const response = await axiosInstance.get('/api/tags/popular', {
      params: { limit },
    });
    return response.data;
  },

  // Create new tag
  createTag: async (tagData) => {
    const response = await axiosInstance.post('/api/tags/', tagData);
    return response.data;
  },

  // Get tag details
  getTagDetails: async (tagId) => {
    const response = await axiosInstance.get(`/api/tags/${tagId}`);
    return response.data;
  },

  // Update tag
  updateTag: async (tagId, tagData) => {
    const response = await axiosInstance.put(`/api/tags/${tagId}`, tagData);
    return response.data;
  },

  // Delete tag
  deleteTag: async (tagId) => {
    const response = await axiosInstance.delete(`/api/tags/${tagId}`);
    return response.data;
  },

  // Search tags
  searchTags: async (query) => {
    const response = await axiosInstance.get('/api/tags/search', {
      params: { q: query },
    });
    return response.data;
  },
};
