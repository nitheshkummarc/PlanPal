/**
 * usersApi.ts - User API calls that match backend routes.
 */

import axiosInstance from '../services/axiosInstance';
import type { AppUser } from '../types';

interface UserProfileResponse {
  user: AppUser;
}

interface UserSearchResponse {
  users: AppUser[];
  total: number;
}

interface UserSearchParams {
  page?: number;
  per_page?: number;
  [key: string]: string | number | undefined;
}

export const usersApi = {
  getProfile: async (): Promise<UserProfileResponse> => {
    const response = await axiosInstance.get<UserProfileResponse>('/api/users/profile');
    return response.data;
  },

  getUserProfile: async (userId: string): Promise<UserProfileResponse> => {
    const response = await axiosInstance.get<UserProfileResponse>(`/api/users/${userId}`);
    return response.data;
  },

  searchUsers: async (query: string, params: UserSearchParams = {}): Promise<UserSearchResponse> => {
    const response = await axiosInstance.get<UserSearchResponse>('/api/users/search', {
      params: { q: query, ...params }
    });
    return response.data;
  },
};
