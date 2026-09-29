/**
 * notificationsApi.ts - The signed-in user's notifications (/api/notifications).
 */

import axiosInstance from '../services/axiosInstance';
import type { AppNotification } from '../types';
import type { Pagination } from '../types/api';

export type NotificationFilter = 'all' | 'unread' | 'read';

interface NotificationListResponse {
  notifications: AppNotification[];
  pagination: Pagination;
  unread_count: number;  // across all pages
}

export const notificationsApi = {
  getNotifications: async (
    params: { filter?: NotificationFilter; page?: number; per_page?: number } = {}
  ): Promise<NotificationListResponse> => {
    const response = await axiosInstance.get<NotificationListResponse>('/api/notifications/', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await axiosInstance.get<{ unread_count: number }>('/api/notifications/unread_count');
    return response.data.unread_count;
  },

  markAsRead: async (notificationId: string): Promise<AppNotification> => {
    const response = await axiosInstance.put<{ notification: AppNotification }>(
      `/api/notifications/${notificationId}/mark-read`
    );
    return response.data.notification;
  },

  markAsUnread: async (notificationId: string): Promise<AppNotification> => {
    const response = await axiosInstance.put<{ notification: AppNotification }>(
      `/api/notifications/${notificationId}/mark-unread`
    );
    return response.data.notification;
  },

  markAllAsRead: async (): Promise<void> => {
    await axiosInstance.put('/api/notifications/mark-all-read');
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await axiosInstance.delete(`/api/notifications/${notificationId}`);
  },

  deleteAllNotifications: async (): Promise<number> => {
    const response = await axiosInstance.delete<{ deleted_count: number }>('/api/notifications/');
    return response.data.deleted_count;
  },
};
