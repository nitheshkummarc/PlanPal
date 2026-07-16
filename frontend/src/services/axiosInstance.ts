/**
 * axiosInstance.ts - Configured Axios HTTP Client
 *
 * Why: Pre-configured HTTP client with auto JWT attachment and token refresh
 *
 * Features:
 * - Automatic token attachment via request interceptor
 * - Automatic token refresh on 401 via response interceptor
 * - Auto-logout on refresh failure
 */

import axios, { type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Extend AxiosRequestConfig to include our custom _retry flag
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject mock adapter if bypass is enabled
import { mockAdapter } from './mockAdapter';
const BYPASS_AUTH = true; // Use same flag as AuthContext
if (BYPASS_AUTH) {
  axiosInstance.defaults.adapter = mockAdapter as any;
}

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableRequestConfig;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, {
            headers: {
              'Authorization': `Bearer ${refreshToken}`
            }
          });

          const { access_token } = response.data as { access_token: string };
          localStorage.setItem('accessToken', access_token);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return axiosInstance(originalRequest);
        }
      } catch {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
