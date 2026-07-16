/**
 * types/index.ts - Domain types inferred from Zod schemas
 *
 * Why: Single source of truth — types are z.infer<> of schemas,
 * never hand-written duplicates. If the backend shape changes,
 * update the schema and the type updates automatically.
 */

import type { z } from 'zod';
import type { AppUserSchema } from '../schemas/user.schema';
import type { AppEventSchema } from '../schemas/event.schema';
import type { ParticipationSchema } from '../schemas/participation.schema';
import type { AppNotificationSchema } from '../schemas/notification.schema';
import type { AppTagSchema } from '../schemas/tag.schema';

// Domain types — inferred from Zod schemas, single source of truth
export type AppUser = z.infer<typeof AppUserSchema>;
export type AppEvent = z.infer<typeof AppEventSchema>;
export type Participation = z.infer<typeof ParticipationSchema>;
export type AppNotification = z.infer<typeof AppNotificationSchema>;
export type AppTag = z.infer<typeof AppTagSchema>;

// Re-export enum types for narrowing in consuming code
export type { UserRole } from '../schemas/user.schema';
export type { SourceType } from '../schemas/event.schema';
export type { ParticipationStatus } from '../schemas/participation.schema';
export type { NotificationType } from '../schemas/notification.schema';
