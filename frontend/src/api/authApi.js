/**
 * authApi.js - Authentication API Service
 * 
 * Why: Handles all auth-related HTTP requests to backend
 * 
 * Functions:
 * - register(userData): POST /api/auth/register
 *   Create new user account with name, email, username, password
 * 
 * - login(credentials): POST /api/auth/login
 *   Authenticate user with email and password
 * 
 * - logout(): POST /api/auth/logout
 *   End user session and invalidate tokens
 * 
 * - refresh(refreshToken): POST /api/auth/refresh
 *   Get new access token using refresh token
 * 
 * - getProfile(): GET /api/auth/profile
 *   Retrieve current user's profile information
 * 
 * - updateProfile(profileData): PUT /api/auth/profile
 *   Update user profile (name, username, bio, image, preferences)
 * 
 * - changePassword(passwordData): POST /api/auth/change-password
 *   Change user password (requires current password)
 * 
 * Response Format:
 * - Login/Register returns: { access_token, refresh_token, user }
 * - Profile returns: { user }
 * - Success messages return: { message }
 * 
 * Error Handling:
 * - All methods throw errors on failure
 * - Errors should be caught by calling code
 * - Use with try/catch blocks or promise .catch()
 * 
 * Dependencies:
 * - axiosInstance for HTTP requests with auth interceptors
 */

import axiosInstance from '../services/axiosInstance';

export const authApi = {
  register: async (userData) => {
    const response = await axiosInstance.post('/api/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await axiosInstance.post('/api/auth/login', credentials);
    return response.data;
  },

  logout: async () => {
    const response = await axiosInstance.post('/api/auth/logout');
    return response.data;
  },

  refresh: async (refreshToken) => {
    const response = await axiosInstance.post('/api/auth/refresh', {}, {
      headers: {
        'Authorization': `Bearer ${refreshToken}`
      }
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await axiosInstance.get('/api/auth/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await axiosInstance.put('/api/auth/profile', profileData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await axiosInstance.post('/api/auth/change-password', passwordData);
    return response.data;
  },
};
