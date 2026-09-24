/**
 * eventsApi.ts - Events API Service
 *
 * Why: Handles all event-related HTTP requests to backend
 * Response shapes match backend/app/routes/events.py.
 */

import axiosInstance from '../services/axiosInstance';
import type { AppEvent, Participation } from '../types';
import type { Pagination } from '../types/api';

interface EventFilters {
  page?: number;
  per_page?: number;
  city?: string;
  state?: string;
  location?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: 'date' | 'created_at' | string;
  [key: string]: string | number | boolean | undefined;
}

interface EventListResponse {
  events: AppEvent[];
  pagination?: Pagination;
}

export interface EventParticipant {
  user_id: string;
  name: string;
  profile_image_url: string | null;
  status: 'going' | 'interested';
}

interface EventDetailResponse {
  event: AppEvent & { participants?: EventParticipant[] };
}

interface EventMutationResponse {
  message: string;
  event: AppEvent;
}

interface MessageResponse {
  message: string;
}

interface ParticipationResponse {
  message: string;
  participation: Participation;
}

export interface ParticipationStatusResponse {
  status: 'going' | 'interested' | 'not_joined';
  is_creator: boolean;
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
  // Upcoming events (Discover page)
  getAllEvents: async (filters: EventFilters = {}): Promise<EventListResponse> => {
    const response = await axiosInstance.get<EventListResponse>('/api/events/', { params: filters });
    return response.data;
  },

  // Create new event
  createEvent: async (eventData: CreateEventData): Promise<EventMutationResponse> => {
    const response = await axiosInstance.post<EventMutationResponse>('/api/events/', eventData);
    return response.data;
  },

  // Get event details (includes tags and participants; past events too)
  getEventDetails: async (eventId: string): Promise<EventDetailResponse> => {
    const response = await axiosInstance.get<EventDetailResponse>(`/api/events/${eventId}`);
    return response.data;
  },

  // Join event (joins as 'interested')
  joinEvent: async (eventId: string): Promise<ParticipationResponse> => {
    const response = await axiosInstance.post<ParticipationResponse>(`/api/events/${eventId}/join`);
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

  // Delete event (participants are notified)
  deleteEvent: async (eventId: string): Promise<MessageResponse> => {
    const response = await axiosInstance.delete<MessageResponse>(`/api/events/${eventId}`);
    return response.data;
  },

  // Switch your participation between 'interested' and 'going'
  updateEventStatus: async (eventId: string, status: 'interested' | 'going'): Promise<ParticipationResponse> => {
    const response = await axiosInstance.put<ParticipationResponse>(`/api/events/${eventId}/update-status`, {
      status,
    });
    return response.data;
  },

  // Get participation status
  getParticipationStatus: async (eventId: string): Promise<ParticipationStatusResponse> => {
    const response = await axiosInstance.get<ParticipationStatusResponse>(`/api/events/${eventId}/participation_status`);
    return response.data;
  },

  // Events I created, past and upcoming (Dashboard/Calendar/Upcoming need them all,
  // not the default page of 10; 100 is the backend maximum)
  getMyEvents: async (): Promise<EventListResponse> => {
    const response = await axiosInstance.get<EventListResponse>('/api/events/my', { params: { per_page: 100 } });
    return response.data;
  },

  // Events I joined, past and upcoming
  getJoinedEvents: async (): Promise<EventListResponse> => {
    const response = await axiosInstance.get<EventListResponse>('/api/events/joined', { params: { per_page: 100 } });
    return response.data;
  },
};
