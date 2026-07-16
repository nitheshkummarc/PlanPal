/**
 * authApi.ts - Authentication API Service
 *
 * Why: Handles all auth-related HTTP requests to backend
 */

import axiosInstance from '../services/axiosInstance';
import type { AppUser } from '../types';
import type { ApiError } from '../types/api';
import axios from 'axios';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  username: string;
  password: string;
  bio?: string;
  profile_image_url?: string;
  preferences?: string[];
}

interface AuthResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  user: AppUser;
}

interface ProfileResponse {
  user: AppUser;
}

interface ProfileUpdateData {
  name?: string;
  username?: string;
  bio?: string;
  profile_image_url?: string;
  preferences?: string[];
}

interface ProfileUpdateResponse {
  message: string;
  user: AppUser;
}

interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

interface MessageResponse {
  message: string;
}

interface RefreshResponse {
  access_token: string;
}

export const authApi = {
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/api/auth/register', userData);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/api/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<MessageResponse> => {
    const response = await axiosInstance.post<MessageResponse>('/api/auth/logout');
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await axiosInstance.post<RefreshResponse>('/api/auth/refresh', {}, {
      headers: {
        'Authorization': `Bearer ${refreshToken}`
      }
    });
    return response.data;
  },

  getProfile: async (): Promise<ProfileResponse> => {
    const response = await axiosInstance.get<ProfileResponse>('/api/auth/profile');
    return response.data;
  },

  updateProfile: async (profileData: ProfileUpdateData): Promise<ProfileUpdateResponse> => {
    const response = await axiosInstance.put<ProfileUpdateResponse>('/api/auth/profile', profileData);
    return response.data;
  },

  changePassword: async (passwordData: ChangePasswordData): Promise<MessageResponse> => {
    const response = await axiosInstance.post<MessageResponse>('/api/auth/change-password', passwordData);
    return response.data;
  },
};
