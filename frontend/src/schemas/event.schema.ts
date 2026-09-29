/**
 * event.schema.ts - Shape of an event as returned by the API (backend Event.to_dict()).
 */

import { z } from 'zod';
import { AppTagSchema } from './tag.schema';

export const AppEventSchema = z.object({
  event_id: z.uuid(),
  posted_by: z.uuid(),
  creator_name: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  timestamp: z.iso.datetime(),
  place: z.string(),
  location: z.string(),
  city: z.string(),
  state: z.string(),
  is_paid: z.boolean(),
  price: z.number().nullable(),
  max_participants: z.number().int().nullable(),
  current_participants: z.number().int(),
  tags: z.array(AppTagSchema),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
