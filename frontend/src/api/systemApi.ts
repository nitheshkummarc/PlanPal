/**
 * systemApi.ts - System and Platform API Service
 *
 * Why: Handles system health, version, support requests
 */

import axiosInstance from '../services/axiosInstance';

interface HealthResponse {
  status: string;
  timestamp: string;
  database: string;
}

interface VersionResponse {
  version: string;
  api_name: string;
  build_date: string;
}

interface SystemStatsResponse {
  [key: string]: unknown;
}

interface MessageResponse {
  message: string;
}

interface BugReport {
  title: string;
  description: string;
  steps_to_reproduce?: string;
}

interface FeedbackData {
  subject: string;
  message: string;
  rating?: number;
}

interface SupportRequest {
  subject: string;
  message: string;
  email?: string;
}

interface LogParams {
  level?: string;
  limit?: number;
  [key: string]: string | number | undefined;
}

export const systemApi = {
  // Get system health status
  getHealthStatus: async (): Promise<HealthResponse> => {
    const response = await axiosInstance.get<HealthResponse>('/system/health');
    return response.data;
  },

  // Get system statistics
  getSystemStats: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/stats');
    return response.data;
  },

  // Get application version
  getVersion: async (): Promise<VersionResponse> => {
    const response = await axiosInstance.get<VersionResponse>('/system/version');
    return response.data;
  },

  // Get system configuration
  getConfig: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/config');
    return response.data;
  },

  // Get system announcements
  getAnnouncements: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/announcements');
    return response.data;
  },

  // Get system maintenance status
  getMaintenanceStatus: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/maintenance');
    return response.data;
  },

  // Report a bug
  reportBug: async (bugReport: BugReport): Promise<MessageResponse> => {
    const response = await axiosInstance.post<MessageResponse>('/system/bug-report', bugReport);
    return response.data;
  },

  // Send feedback
  sendFeedback: async (feedback: FeedbackData): Promise<MessageResponse> => {
    const response = await axiosInstance.post<MessageResponse>('/system/feedback', feedback);
    return response.data;
  },

  // Contact support
  contactSupport: async (supportRequest: SupportRequest): Promise<MessageResponse> => {
    const response = await axiosInstance.post<MessageResponse>('/system/contact', supportRequest);
    return response.data;
  },

  // Get FAQ items
  getFAQ: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/faq');
    return response.data;
  },

  // Get terms of service
  getTermsOfService: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/terms');
    return response.data;
  },

  // Get privacy policy
  getPrivacyPolicy: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/privacy');
    return response.data;
  },

  // Get supported timezones
  getTimezones: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/timezones');
    return response.data;
  },

  // Get supported countries
  getCountries: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/countries');
    return response.data;
  },

  // Get supported languages
  getLanguages: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/languages');
    return response.data;
  },

  // Check for updates
  checkUpdates: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/updates');
    return response.data;
  },

  // Get system logs (admin only)
  getLogs: async (params: LogParams = {}): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/logs', { params });
    return response.data;
  },

  // Clear cache
  clearCache: async (): Promise<MessageResponse> => {
    const response = await axiosInstance.post<MessageResponse>('/system/clear-cache');
    return response.data;
  },

  // Test database connection
  testDatabase: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/test-db');
    return response.data;
  },

  // Get server metrics
  getMetrics: async (): Promise<SystemStatsResponse> => {
    const response = await axiosInstance.get<SystemStatsResponse>('/system/metrics');
    return response.data;
  },
};
