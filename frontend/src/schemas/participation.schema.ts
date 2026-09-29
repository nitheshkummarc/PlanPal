/**
 * participation.schema.ts - Shape of a participation as returned by the API
 * (backend Participation.to_dict()).
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

export type ParticipationStatus = z.infer<typeof ParticipationStatus>;
