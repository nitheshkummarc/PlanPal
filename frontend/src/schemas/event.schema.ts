/**
 * event.schema.ts - Zod schema for Event domain model
 *
 * Why: Runtime validation of Event data from backend API responses.
 * Shape derived from backend Event.to_dict() in models/__init__.py.
 */

import { z } from 'zod';

export const SourceType = z.enum(['poster', 'text']);

export const AppEventSchema = z.object({
  event_id: z.uuid(),
  posted_by: z.uuid(),
  creator_name: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  timestamp: z.iso.datetime(),
  date: z.iso.date(),
  time: z.iso.time(),
  place: z.string(),
  location: z.string(),
  city: z.string(),
  state: z.string(),
  is_paid: z.boolean(),
  price: z.number().nullable(),
  source_type: SourceType,
  max_participants: z.number().int().nullable(),
  current_participants: z.number().int(),
  is_active: z.boolean(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
