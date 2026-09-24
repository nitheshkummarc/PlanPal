/**
 * authApi.ts - Authentication API Service
 *
 * Why: Handles all auth-related HTTP requests to backend
 */

import axiosInstance from '../services/axiosInstance';
import { tokenService } from '../services/tokenService';
import type { AppUser } from '../types';

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

export const authApi = {
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/api/auth/register', userData);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/api/auth/login', credentials);
    return response.data;
  },

  // Revokes the access token (sent in the header) and the refresh token (sent in the body).
  // Token refresh itself is handled by the axios interceptor (services/axiosInstance.ts).
  logout: async (): Promise<MessageResponse> => {
    const response = await axiosInstance.post<MessageResponse>('/api/auth/logout', {
      refresh_token: tokenService.getRefreshToken()
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
