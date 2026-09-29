/**
 * notification.schema.ts - Shape of a notification as returned by the API
 * (backend Notification.to_dict()).
 *
 * NotificationType must match NOTIFICATION_TYPES in backend/app/models/__init__.py
 * (checked by backend/tests/test_schema.py).
 */

import { z } from 'zod';

export const NotificationType = z.enum([
  'welcome',
  'event_joined',
  'event_reminder',
  'event_update',
  'new_participant',
  'participant_left',
  'event_cancelled',
]);

export const AppNotificationSchema = z.object({
  notification_id: z.uuid(),
  user_id: z.uuid(),
  event_id: z.uuid().nullable(),
  type: NotificationType,
  title: z.string(),
  message: z.string(),
  is_read: z.boolean(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type NotificationType = z.infer<typeof NotificationType>;
