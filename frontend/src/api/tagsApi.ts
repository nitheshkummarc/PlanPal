/**
 * tagsApi.ts - Tags API Service
 *
 * Why: Handles tag CRUD operations
 */

import axiosInstance from '../services/axiosInstance';
import type { AppTag } from '../types';

interface TagListResponse {
  tags: AppTag[];
}

interface TagDetailResponse {
  tag: AppTag;
}

interface TagMutationResponse {
  message: string;
  tag: AppTag;
}

interface MessageResponse {
  message: string;
}

interface TagData {
  name: string;
  description?: string;
  color?: string;
}

interface PopularTag extends AppTag {
  usage_count: number;
}

interface PopularTagsResponse {
  tags: PopularTag[];
}

export const tagsApi = {
  // Get all tags
  getAllTags: async (): Promise<TagListResponse> => {
    const response = await axiosInstance.get<TagListResponse>('/api/tags/');
    return response.data;
  },

  // Get popular tags
  getPopularTags: async (limit = 20): Promise<PopularTagsResponse> => {
    const response = await axiosInstance.get<PopularTagsResponse>('/api/tags/popular', {
      params: { limit },
    });
    return response.data;
  },

  // Create new tag
  createTag: async (tagData: TagData): Promise<TagMutationResponse> => {
    const response = await axiosInstance.post<TagMutationResponse>('/api/tags/', tagData);
    return response.data;
  },

  // Get tag details
  getTagDetails: async (tagId: string): Promise<TagDetailResponse> => {
    const response = await axiosInstance.get<TagDetailResponse>(`/api/tags/${tagId}`);
    return response.data;
  },

  // Update tag
  updateTag: async (tagId: string, tagData: Partial<TagData>): Promise<TagMutationResponse> => {
    const response = await axiosInstance.put<TagMutationResponse>(`/api/tags/${tagId}`, tagData);
    return response.data;
  },

  // Delete tag
  deleteTag: async (tagId: string): Promise<MessageResponse> => {
    const response = await axiosInstance.delete<MessageResponse>(`/api/tags/${tagId}`);
    return response.data;
  },

  // Search tags
  searchTags: async (query: string): Promise<TagListResponse> => {
    const response = await axiosInstance.get<TagListResponse>('/api/tags/search', {
      params: { q: query },
    });
    return response.data;
  },
};
