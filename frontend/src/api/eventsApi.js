/**
 * eventsApi.js - Events API Service
 * 
 * Why: Handles all event-related HTTP requests to backend
 * 
 * Functions:
 * - getAllEvents(filters): GET /api/events/
 *   Fetch all events with optional filters (page, per_page, city, state, date)
 * 
 * - createEvent(eventData): POST /api/events/
 *   Create new event with title, description, location, date, etc.
 * 
 * - getEventDetails(eventId): GET /api/events/:id
 *   Get detailed event information including participants
 * 
 * - updateEvent(eventId, eventData): PUT /api/events/:id
 *   Update event details (creator only)
 * 
 * - deleteEvent(eventId): DELETE /api/events/:id
 *   Delete event (creator/admin only)
 * 
 * - joinEvent(eventId): POST /api/events/:id/join
 *   Join an event as a participant
 * 
 * - leaveEvent(eventId): DELETE /api/events/:id/leave
 *   Leave an event (remove participation)
 * 
 * - updateEventStatus(eventId, status): PUT /api/events/:id/update-status
 *   Update participation status ('interested' or 'going')
 * 
 * - getParticipationStatus(eventId): GET /api/events/:id/participation_status
 *   Check if current user joined the event
 * 
 * - getMyEvents(): GET /api/events/my
 *   Get events created by current user
 * 
 * - getJoinedEvents(): GET /api/events/joined
 *   Get events user has joined
 * 
 * - getMyCreatedEvents(): GET /api/events/my-events
 *   Get both created and joined events (legacy endpoint)
 * 
 * - searchEvents(query, filters): GET /api/events/
 *   Search events with query string and filters
 * 
 * Response Format:
 * - Event list: { events: [], pagination: {} }
 * - Event details: { event: {}, participants: [] }
 * - Success operations: { message, event }
 * 
 * Dependencies:
 * - axiosInstance for authenticated HTTP requests
 */

import axiosInstance from '../services/axiosInstance';

export const eventsApi = {
  // Get all events
  getAllEvents: async (filters = {}) => {
    const response = await axiosInstance.get('/api/events/', { params: filters });
    return response.data;
  },

  // Create new event
  createEvent: async (eventData) => {
    const response = await axiosInstance.post('/api/events/', eventData);
    return response.data;
  },

  // Get event details
  getEventDetails: async (eventId) => {
    const response = await axiosInstance.get(`/api/events/${eventId}`);
    return response.data;
  },

  // Join event
  joinEvent: async (eventId) => {
    const response = await axiosInstance.post(`/api/events/${eventId}/join`);
    return response.data;
  },

  // Leave event
  leaveEvent: async (eventId) => {
    const response = await axiosInstance.delete(`/api/events/${eventId}/leave`);
    return response.data;
  },

  // Update event
  updateEvent: async (eventId, eventData) => {
    const response = await axiosInstance.put(`/api/events/${eventId}`, eventData);
    return response.data;
  },

  // Delete event
  deleteEvent: async (eventId) => {
    const response = await axiosInstance.delete(`/api/events/${eventId}`);
    return response.data;
  },

  // Update event status
  updateEventStatus: async (eventId, status) => {
    const response = await axiosInstance.put(`/api/events/${eventId}/update-status`, {
      status,
    });
    return response.data;
  },

  // Get participation status
  getParticipationStatus: async (eventId) => {
    const response = await axiosInstance.get(`/api/events/${eventId}/participation_status`);
    return response.data;
  },

  // Get my events
  getMyEvents: async () => {
    const response = await axiosInstance.get('/api/events/my');
    return response.data;
  },

  // Get joined events
  getJoinedEvents: async () => {
    const response = await axiosInstance.get('/api/events/joined');
    return response.data;
  },

  // Get my created events
  getMyCreatedEvents: async () => {
    const response = await axiosInstance.get('/api/events/my-events');
    return response.data;
  },

  // Search events with filters
  searchEvents: async (query = '', filters = {}) => {
    const params = {
      q: query,
      ...filters
    };
    const response = await axiosInstance.get('/api/events/', { params });
    return response.data;
  },
};
