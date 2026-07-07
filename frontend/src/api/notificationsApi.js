/**
 * notificationsApi.js - Notifications API Service
 * 
 * Why: Handles all notification HTTP requests to backend
 * 
 * Functions:
 * - getNotifications(params): GET /api/notifications
 *   Fetch user notifications with pagination (page, per_page, unread_only)
 * 
 * - markAsRead(notificationId): PUT /api/notifications/:id/mark-read
 *   Mark specific notification as read
 * 
 * - markAllAsRead(): PUT /api/notifications/mark-all-read
 *   Mark all user notifications as read
 * 
 * - deleteNotification(notificationId): DELETE /api/notifications/:id
 *   Delete specific notification
 * 
 * - deleteAllNotifications(): DELETE /api/notifications
 *   Delete all user notifications
 * 
 * - getUnreadCount(): GET /api/notifications/unread_count
 *   Get count of unread notifications for badge display
 * 
 * - subscribePush(subscription): POST /api/notifications/push/subscribe
 *   Subscribe to push notifications with subscription object
 * 
 * - unsubscribePush(): DELETE /api/notifications/push/unsubscribe
 *   Unsubscribe from push notifications
 * 
 * - sendTestNotification(): POST /api/notifications/test
 *   Send test notification to current user
 * 
 * - getNotificationTypes(): GET /api/notifications/types
 *   Get available notification types
 * 
 * Notification Types:
 * - welcome, event_reminder, event_update, new_participant,
 *   participant_left, event_cancelled, system_announcement
 * 
 * Dependencies:
 * - axiosInstance for authenticated HTTP requests
 */

import axiosInstance from '../services/axiosInstance';

export const notificationsApi = {
  // Get all notifications for the current user
  getNotifications: async (params = {}) => {
    const response = await axiosInstance.get('/api/notifications', { params });
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const response = await axiosInstance.put(`/api/notifications/${notificationId}/mark-read`);
    return response.data;
  },

  // Mark notification as unread
  markAsUnread: async (notificationId) => {
    const response = await axiosInstance.put(`/api/notifications/${notificationId}/mark-unread`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await axiosInstance.put('/api/notifications/mark-all-read');
    return response.data;
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    const response = await axiosInstance.delete(`/api/notifications/${notificationId}`);
    return response.data;
  },

  // Delete all notifications
  deleteAllNotifications: async () => {
    const response = await axiosInstance.delete('/api/notifications');
    return response.data;
  },

  // Get unread notification count
  getUnreadCount: async () => {
    const response = await axiosInstance.get('/api/notifications/unread_count');
    return response.data;
  },

  // Subscribe to push notifications
  subscribePush: async (subscription) => {
    const response = await axiosInstance.post('/api/notifications/push/subscribe', subscription);
    return response.data;
  },

  // Unsubscribe from push notifications
  unsubscribePush: async () => {
    const response = await axiosInstance.delete('/api/notifications/push/unsubscribe');
    return response.data;
  },

  // Send test notification
  sendTestNotification: async () => {
    const response = await axiosInstance.post('/api/notifications/test');
    return response.data;
  },

  // Get notification types
  getNotificationTypes: async () => {
    const response = await axiosInstance.get('/api/notifications/types');
    return response.data;
  },
};
