/**
 * notification.schema.ts - Zod schema for Notification domain model
 *
 * Why: Runtime validation of Notification data from backend API responses.
 * Shape derived from backend Notification.to_dict() in models/__init__.py.
 *
 * Notification types sourced from notificationsApi.js docblock and
 * backend NotificationService.create_notification() usage.
 */

import { z } from 'zod';

export const NotificationType = z.enum([
  'welcome',
  'event_reminder',
  'event_update',
  'new_participant',
  'participant_left',
  'event_cancelled',
  'system_announcement',
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
