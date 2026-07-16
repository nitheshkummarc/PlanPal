/**
 * participation.schema.ts - Zod schema for Participation domain model
 *
 * Why: Runtime validation of Participation data from backend API responses.
 * Shape derived from backend Participation.to_dict() in models/__init__.py.
 *
 * Note: NOT prefixed with "App" because "Participation" doesn't collide
 * with any DOM global type (unlike Event, Notification).
 */

import { z } from 'zod';

export const ParticipationStatus = z.enum(['interested', 'going']);

export const ParticipationSchema = z.object({
  participation_id: z.uuid(),
  event_id: z.uuid(),
  user_id: z.uuid(),
  status: ParticipationStatus,
  joined_at: z.iso.datetime(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
