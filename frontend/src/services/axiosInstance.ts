/**
 * axiosInstance.ts - HTTP client for the PlanPal API.
 *
 * - Attaches the access token to every request.
 * - On a 401, refreshes the access token once (concurrent 401s share one refresh
 *   request) and retries the original request.
 * - If the refresh fails, clears the session and sends the user to /login.
 */

import axios, { type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config';
import { tokenService } from './tokenService';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Requests where a 401 means "wrong credentials", not "expired access token"
const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

// Generous timeout: the hosted backend can take ~30 s to wake from idle
const REQUEST_TIMEOUT_MS = 30000;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (refreshToken: string): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ access_token: string }>(`${API_BASE_URL}/api/auth/refresh`, {}, {
        headers: { Authorization: `Bearer ${refreshToken}` },
        timeout: REQUEST_TIMEOUT_MS,
      })
      .then((response) => {
        tokenService.setTokens(response.data.access_token);
        return response.data.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      throw error;
    }
    const request = error.config as RetryableRequestConfig;
    const isAuthRequest = NO_REFRESH_PATHS.some((path) => request.url?.startsWith(path));

    if (error.response?.status !== 401 || request._retry || isAuthRequest) {
      throw error;
    }

    const refreshToken = tokenService.getRefreshToken();
    if (!refreshToken) {
      throw error;
    }

    request._retry = true;
    try {
      const accessToken = await refreshAccessToken(refreshToken);
      request.headers.Authorization = `Bearer ${accessToken}`;
      return axiosInstance(request);
    } catch (refreshError) {
      // Only a rejected refresh token ends the session; a network failure keeps it
      if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
        tokenService.clearTokens();
        window.location.href = '/login';
      }
      throw error;
    }
  }
);

export default axiosInstance;
