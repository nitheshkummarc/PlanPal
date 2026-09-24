/**
 * axiosInstance.ts - Configured Axios HTTP Client
 *
 * Why: Pre-configured HTTP client with auto JWT attachment and token refresh
 *
 * Features:
 * - Automatic token attachment via request interceptor
 * - Automatic token refresh on 401 via response interceptor
 *   (concurrent 401s share ONE refresh request)
 * - Auto-logout on refresh failure
 */

import axios, { type InternalAxiosRequestConfig } from 'axios';

const CONFIGURED_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Force HTTPS: on an https page, never call a non-local API over plain http
// (browsers block that as mixed content, and it would expose tokens).
const isLocal = (url: string) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(url);
const API_BASE_URL =
  typeof window !== 'undefined' && window.location.protocol === 'https:' && !isLocal(CONFIGURED_API_URL)
    ? CONFIGURED_API_URL.replace(/^http:\/\//, 'https://')
    : CONFIGURED_API_URL;

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

// The refresh request currently in flight, shared by every request that got a 401
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (refreshToken: string): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/api/auth/refresh`, {}, {
        headers: { Authorization: `Bearer ${refreshToken}` }
      })
      .then((response) => {
        const { access_token } = response.data as { access_token: string };
        localStorage.setItem('accessToken', access_token);
        return access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

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
          const accessToken = await refreshAccessToken(refreshToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch {
        // Refresh failed (expired or revoked): clear tokens and go to login
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
