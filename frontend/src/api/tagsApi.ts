/**
 * tagsApi.ts - Tags (/api/tags). Creating, updating and deleting require the admin role.
 */

import axiosInstance from '../services/axiosInstance';
import type { AppTag } from '../types';

export interface TagInput {
  name: string;
  description?: string | null;
  color?: string | null;  // '#RRGGBB'
}

export const tagsApi = {
  getAllTags: async (): Promise<AppTag[]> => {
    const response = await axiosInstance.get<{ tags: AppTag[] }>('/api/tags/');
    return response.data.tags;
  },

  createTag: async (data: TagInput): Promise<AppTag> => {
    const response = await axiosInstance.post<{ tag: AppTag }>('/api/tags/', data);
    return response.data.tag;
  },

  updateTag: async (tagId: string, data: Partial<TagInput>): Promise<AppTag> => {
    const response = await axiosInstance.put<{ tag: AppTag }>(`/api/tags/${tagId}`, data);
    return response.data.tag;
  },

  deleteTag: async (tagId: string): Promise<void> => {
    await axiosInstance.delete(`/api/tags/${tagId}`);
  },
};
