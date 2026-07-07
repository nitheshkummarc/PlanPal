/**
 * systemApi.js - System and Platform API Service
 * 
 * Why: Handles system health, version, support requests
 * 
 * Functions:
 * Health & Status:
 * - getHealthStatus(): GET /system/health
 *   System health check with database connectivity
 * 
 * - getSystemStats(): GET /system/stats
 *   Platform statistics and metrics
 * 
 * - getVersion(): GET /system/version
 *   Application version information
 * 
 * Configuration:
 * - getConfig(): GET /system/config
 *   System configuration settings
 * 
 * - getTimezones(): GET /system/timezones
 *   List of supported timezones
 * 
 * - getCountries(): GET /system/countries
 *   List of supported countries
 * 
 * - getLanguages(): GET /system/languages
 *   List of supported languages
 * 
 * Support & Feedback:
 * - reportBug(bugReport): POST /system/bug-report
 *   Submit bug report
 * 
 * - sendFeedback(feedback): POST /system/feedback
 *   Submit user feedback
 * 
 * - contactSupport(supportRequest): POST /system/contact
 *   Contact support team
 * 
 * Information:
 * - getAnnouncements(): GET /system/announcements
 *   Platform announcements
 * 
 * - getMaintenanceStatus(): GET /system/maintenance
 *   Maintenance schedule and status
 * 
 * - getFAQ(): GET /system/faq
 *   Frequently asked questions
 * 
 * - getTermsOfService(): GET /system/terms
 *   Terms of service document
 * 
 * - getPrivacyPolicy(): GET /system/privacy
 *   Privacy policy document
 * 
 * Administrative:
 * - getLogs(params): GET /system/logs (admin only)
 *   System logs with filtering
 * 
 * - getMetrics(): GET /system/metrics
 *   Server performance metrics
 * 
 * - clearCache(): POST /system/clear-cache
 *   Clear system cache
 * 
 * - testDatabase(): GET /system/test-db
 *   Test database connection
 * 
 * - checkUpdates(): GET /system/updates
 *   Check for application updates
 * 
 * Note:
 * - Some endpoints may not be implemented in backend
 * - Admin endpoints require admin privileges
 * 
 * Dependencies:
 * - axiosInstance for HTTP requests
 */

import axiosInstance from '../services/axiosInstance';

export const systemApi = {
  // Get system health status
  getHealthStatus: async () => {
    const response = await axiosInstance.get('/system/health');
    return response.data;
  },

  // Get system statistics
  getSystemStats: async () => {
    const response = await axiosInstance.get('/system/stats');
    return response.data;
  },

  // Get application version
  getVersion: async () => {
    const response = await axiosInstance.get('/system/version');
    return response.data;
  },

  // Get system configuration
  getConfig: async () => {
    const response = await axiosInstance.get('/system/config');
    return response.data;
  },

  // Get system announcements
  getAnnouncements: async () => {
    const response = await axiosInstance.get('/system/announcements');
    return response.data;
  },

  // Get system maintenance status
  getMaintenanceStatus: async () => {
    const response = await axiosInstance.get('/system/maintenance');
    return response.data;
  },

  // Report a bug
  reportBug: async (bugReport) => {
    const response = await axiosInstance.post('/system/bug-report', bugReport);
    return response.data;
  },

  // Send feedback
  sendFeedback: async (feedback) => {
    const response = await axiosInstance.post('/system/feedback', feedback);
    return response.data;
  },

  // Contact support
  contactSupport: async (supportRequest) => {
    const response = await axiosInstance.post('/system/contact', supportRequest);
    return response.data;
  },

  // Get FAQ items
  getFAQ: async () => {
    const response = await axiosInstance.get('/system/faq');
    return response.data;
  },

  // Get terms of service
  getTermsOfService: async () => {
    const response = await axiosInstance.get('/system/terms');
    return response.data;
  },

  // Get privacy policy
  getPrivacyPolicy: async () => {
    const response = await axiosInstance.get('/system/privacy');
    return response.data;
  },

  // Get supported timezones
  getTimezones: async () => {
    const response = await axiosInstance.get('/system/timezones');
    return response.data;
  },

  // Get supported countries
  getCountries: async () => {
    const response = await axiosInstance.get('/system/countries');
    return response.data;
  },

  // Get supported languages
  getLanguages: async () => {
    const response = await axiosInstance.get('/system/languages');
    return response.data;
  },

  // Check for updates
  checkUpdates: async () => {
    const response = await axiosInstance.get('/system/updates');
    return response.data;
  },

  // Get system logs (admin only)
  getLogs: async (params = {}) => {
    const response = await axiosInstance.get('/system/logs', { params });
    return response.data;
  },

  // Clear cache
  clearCache: async () => {
    const response = await axiosInstance.post('/system/clear-cache');
    return response.data;
  },

  // Test database connection
  testDatabase: async () => {
    const response = await axiosInstance.get('/system/test-db');
    return response.data;
  },

  // Get server metrics
  getMetrics: async () => {
    const response = await axiosInstance.get('/system/metrics');
    return response.data;
  },
};
