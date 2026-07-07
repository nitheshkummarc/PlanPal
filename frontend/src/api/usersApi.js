/**
 * usersApi.js - User API calls that match backend routes.
 */

import axiosInstance from '../services/axiosInstance';

export const usersApi = {
  getProfile: async () => {
    const response = await axiosInstance.get('/api/users/profile');
    return response.data;
  },

  getUserProfile: async (userId) => {
    const response = await axiosInstance.get(`/api/users/${userId}`);
    return response.data;
  },

  searchUsers: async (query, params = {}) => {
    const response = await axiosInstance.get('/api/users/search', {
      params: { q: query, ...params }
    });
    return response.data;
  },
};
