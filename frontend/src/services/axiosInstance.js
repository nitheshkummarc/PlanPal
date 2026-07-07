/**
 * axiosInstance.js - Configured Axios HTTP Client
 * 
 * Why: Pre-configured HTTP client with auto JWT attachment and token refresh
 * 
 * Features:
 * - Base URL: From VITE_API_BASE_URL env or http://localhost:5000
 * - Timeout: 10 seconds
 * - Default headers: Content-Type: application/json
 * 
 * Request Interceptor:
 * - Automatically adds JWT access token to Authorization header
 * - Token retrieved from localStorage
 * - Applied to all outgoing requests
 * 
 * Response Interceptor:
 * - Handles 401 Unauthorized responses
 * - Automatically attempts token refresh
 * - Retries failed request with new token
 * - Redirects to login on refresh failure
 * - Prevents infinite retry loops with _retry flag
 * 
 * Token Refresh Flow:
 * 1. API request fails with 401
 * 2. Interceptor catches error
 * 3. Calls refresh endpoint with refresh token
 * 4. Stores new access token
 * 5. Retries original request
 * 6. On refresh failure: clears tokens and redirects to /login
 * 
 * Features:
 * - Automatic token attachment
 * - Seamless token refresh
 * - Auto-logout on session expiry
 * - Request retry mechanism
 * - Centralized error handling
 * 
 * Usage:
 *   import axiosInstance from './services/axiosInstance';
 *   const response = await axiosInstance.get('/api/events');
 * 
 * Environment Variables:
 * - VITE_API_BASE_URL: Backend API base URL
 * 
 * Dependencies:
 * - axios library
 * - localStorage for token storage
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response ?. status === 401 && ! originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, {
            headers: {
              'Authorization': `Bearer ${refreshToken}`
            }
          });

          const { access_token } = response.data;
          localStorage.setItem('accessToken', access_token);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
