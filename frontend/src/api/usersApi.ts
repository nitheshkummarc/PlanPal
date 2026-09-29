/**
 * usersApi.ts - Other users' profiles (/api/users). Your own account is in authApi.
 */

import axiosInstance from '../services/axiosInstance';
import type { AppUser } from '../types';

export const usersApi = {
  /** Public profile; email is only included for your own profile. */
  getUserProfile: async (userId: string): Promise<AppUser> => {
    const response = await axiosInstance.get<{ user: AppUser }>(`/api/users/${userId}`);
    return response.data.user;
  },
};
