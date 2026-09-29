/**
 * authApi.ts - Account endpoints (/api/auth).
 * Token refresh is handled by the axios interceptor (services/axiosInstance.ts).
 */

import axiosInstance from '../services/axiosInstance';
import { tokenService } from '../services/tokenService';
import type { AppUser } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  username: string;
  password: string;
  bio?: string;
  profile_image_url?: string;
  interest_tag_ids?: string[];
}

export interface ProfileUpdateData {
  name?: string;
  username?: string;
  bio?: string;
  profile_image_url?: string;
  interest_tag_ids?: string[];
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

interface AuthResponse extends TokenPair {
  message: string;
  user: AppUser;
}

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/api/auth/login', credentials);
    return response.data;
  },

  /** Revokes the access token (header) and the refresh token (body). */
  logout: async (): Promise<void> => {
    await axiosInstance.post('/api/auth/logout', { refresh_token: tokenService.getRefreshToken() });
  },

  getProfile: async (): Promise<{ user: AppUser }> => {
    const response = await axiosInstance.get<{ user: AppUser }>('/api/auth/profile');
    return response.data;
  },

  updateProfile: async (data: ProfileUpdateData): Promise<{ message: string; user: AppUser }> => {
    const response = await axiosInstance.put<{ message: string; user: AppUser }>('/api/auth/profile', data);
    return response.data;
  },

  /** Ends every other session; the response carries new tokens for this one. */
  changePassword: async (data: ChangePasswordData): Promise<TokenPair & { message: string }> => {
    const response = await axiosInstance.post<TokenPair & { message: string }>('/api/auth/change-password', data);
    return response.data;
  },
};
