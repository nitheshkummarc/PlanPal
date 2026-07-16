/**
 * eventsApi.ts - Events API Service
 *
 * Why: Handles all event-related HTTP requests to backend
 */

import axiosInstance from '../services/axiosInstance';
import type { AppEvent, Participation } from '../types';

interface EventFilters {
  page?: number;
  per_page?: number;
  city?: string;
  state?: string;
  date_from?: string;
  date_to?: string;
  is_paid?: boolean;
  tag_ids?: string;
  q?: string;
  sort_by?: string;
  [key: string]: string | number | boolean | undefined;
}

interface EventListResponse {
  events: AppEvent[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

interface EventDetailResponse {
  event: AppEvent;
  participants?: Participation[];
}

interface EventMutationResponse {
  message: string;
  event: AppEvent;
}

interface MessageResponse {
  message: string;
}

interface ParticipationStatusResponse {
  is_participating: boolean;
  status: string | null;
}

interface CreateEventData {
  title: string;
  description: string;
  timestamp: string;
  place: string;
  location: string;
  city: string;
  state: string;
  source_type: string;
  is_paid?: boolean;
  price?: number;
  max_participants?: number;
  tag_ids?: string[];
}

interface UpdateEventData {
  title?: string;
  description?: string;
  timestamp?: string;
  place?: string;
  location?: string;
  city?: string;
  state?: string;
  source_type?: string;
  is_paid?: boolean;
  price?: number;
  max_participants?: number;
  tag_ids?: string[];
}

export const eventsApi = {
  // Get all events
  getAllEvents: async (filters: EventFilters = {}): Promise<EventListResponse> => {
    const response = await axiosInstance.get<EventListResponse>('/api/events/', { params: filters });
    return response.data;
  },

  // Create new event
  createEvent: async (eventData: CreateEventData): Promise<EventMutationResponse> => {
    const response = await axiosInstance.post<EventMutationResponse>('/api/events/', eventData);
    return response.data;
  },

  // Get event details
  getEventDetails: async (eventId: string): Promise<EventDetailResponse> => {
    const response = await axiosInstance.get<EventDetailResponse>(`/api/events/${eventId}`);
    return response.data;
  },

  // Join event
  joinEvent: async (eventId: string): Promise<MessageResponse> => {
    const response = await axiosInstance.post<MessageResponse>(`/api/events/${eventId}/join`);
    return response.data;
  },

  // Leave event
  leaveEvent: async (eventId: string): Promise<MessageResponse> => {
    const response = await axiosInstance.delete<MessageResponse>(`/api/events/${eventId}/leave`);
    return response.data;
  },

  // Update event
  updateEvent: async (eventId: string, eventData: UpdateEventData): Promise<EventMutationResponse> => {
    const response = await axiosInstance.put<EventMutationResponse>(`/api/events/${eventId}`, eventData);
    return response.data;
  },

  // Delete event
  deleteEvent: async (eventId: string): Promise<MessageResponse> => {
    const response = await axiosInstance.delete<MessageResponse>(`/api/events/${eventId}`);
    return response.data;
  },

  // Update event status
  updateEventStatus: async (eventId: string, status: string): Promise<MessageResponse> => {
    const response = await axiosInstance.put<MessageResponse>(`/api/events/${eventId}/update-status`, {
      status,
    });
    return response.data;
  },

  // Get participation status
  getParticipationStatus: async (eventId: string): Promise<ParticipationStatusResponse> => {
    const response = await axiosInstance.get<ParticipationStatusResponse>(`/api/events/${eventId}/participation_status`);
    return response.data;
  },

  // Get my events
  getMyEvents: async (): Promise<EventListResponse> => {
    const response = await axiosInstance.get<EventListResponse>('/api/events/my');
    return response.data;
  },

  // Get joined events
  getJoinedEvents: async (): Promise<EventListResponse> => {
    const response = await axiosInstance.get<EventListResponse>('/api/events/joined');
    return response.data;
  },

  // Get my created events
  getMyCreatedEvents: async (): Promise<EventListResponse> => {
    const response = await axiosInstance.get<EventListResponse>('/api/events/my-events');
    return response.data;
  },

  // Search events with filters
  searchEvents: async (query = '', filters: EventFilters = {}): Promise<EventListResponse> => {
    const params: EventFilters = {
      q: query,
      ...filters
    };
    const response = await axiosInstance.get<EventListResponse>('/api/events/', { params });
    return response.data;
  },
};
