/**
 * types/index.ts - Types of the data returned by the API, inferred from the schemas
 * in ../schemas so there is a single definition of each shape.
 */

import type { z } from 'zod';
import type { AppUserSchema } from '../schemas/user.schema';
import type { AppEventSchema } from '../schemas/event.schema';
import type { ParticipationSchema, ParticipationStatus } from '../schemas/participation.schema';
import type { AppNotificationSchema } from '../schemas/notification.schema';
import type { AppTagSchema } from '../schemas/tag.schema';

export type AppUser = z.infer<typeof AppUserSchema>;
export type AppEvent = z.infer<typeof AppEventSchema>;
export type Participation = z.infer<typeof ParticipationSchema>;
export type AppNotification = z.infer<typeof AppNotificationSchema>;
export type AppTag = z.infer<typeof AppTagSchema>;

export type { UserRole } from '../schemas/user.schema';
export type { ParticipationStatus } from '../schemas/participation.schema';
export type { NotificationType } from '../schemas/notification.schema';

/** A participant as listed on the event detail page. */
export interface EventParticipant {
  user_id: string;
  name: string;
  profile_image_url: string | null;
  status: ParticipationStatus;
}

/** The signed-in user's relation to an event (from the event detail endpoint). */
export interface EventViewer {
  status: ParticipationStatus | 'not_joined';
  is_creator: boolean;
}

export type EventDetail = AppEvent & {
  participants: EventParticipant[];
  viewer: EventViewer;
};
