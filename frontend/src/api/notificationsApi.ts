/**
 * notificationsApi.ts - Notifications API Service
 *
 * Why: Handles all notification HTTP requests to backend
 */

import axiosInstance from '../services/axiosInstance';
import type { AppNotification } from '../types';

interface NotificationParams {
  page?: number;
  per_page?: number;
  unread_only?: boolean;
  [key: string]: string | number | boolean | undefined;
}

interface NotificationListResponse {
  notifications: AppNotification[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

interface NotificationResponse {
  message: string;
  notification: AppNotification;
}

interface MessageResponse {
  message: string;
}

interface UnreadCountResponse {
  unread_count: number;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationTypesResponse {
  types: string[];
}

export const notificationsApi = {
  // Get all notifications for the current user
  getNotifications: async (params: NotificationParams = {}): Promise<NotificationListResponse> => {
    const response = await axiosInstance.get<NotificationListResponse>('/api/notifications', { params });
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<NotificationResponse> => {
    const response = await axiosInstance.put<NotificationResponse>(`/api/notifications/${notificationId}/mark-read`);
    return response.data;
  },

  // Mark notification as unread
  markAsUnread: async (notificationId: string): Promise<NotificationResponse> => {
    const response = await axiosInstance.put<NotificationResponse>(`/api/notifications/${notificationId}/mark-unread`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<MessageResponse> => {
    const response = await axiosInstance.put<MessageResponse>('/api/notifications/mark-all-read');
    return response.data;
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<MessageResponse> => {
    const response = await axiosInstance.delete<MessageResponse>(`/api/notifications/${notificationId}`);
    return response.data;
  },

  // Delete all notifications
  deleteAllNotifications: async (): Promise<MessageResponse> => {
    const response = await axiosInstance.delete<MessageResponse>('/api/notifications');
    return response.data;
  },

  // Get unread notification count
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await axiosInstance.get<UnreadCountResponse>('/api/notifications/unread_count');
    return response.data;
  },

  // Subscribe to push notifications
  subscribePush: async (subscription: PushSubscription): Promise<MessageResponse> => {
    const response = await axiosInstance.post<MessageResponse>('/api/notifications/push/subscribe', subscription);
    return response.data;
  },

  // Unsubscribe from push notifications
  unsubscribePush: async (): Promise<MessageResponse> => {
    const response = await axiosInstance.delete<MessageResponse>('/api/notifications/push/unsubscribe');
    return response.data;
  },

  // Send test notification
  sendTestNotification: async (): Promise<MessageResponse> => {
    const response = await axiosInstance.post<MessageResponse>('/api/notifications/test');
    return response.data;
  },

  // Get notification types
  getNotificationTypes: async (): Promise<NotificationTypesResponse> => {
    const response = await axiosInstance.get<NotificationTypesResponse>('/api/notifications/types');
    return response.data;
  },
};
