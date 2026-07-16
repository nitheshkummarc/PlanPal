/**
 * user.schema.ts - Zod schema for User domain model
 *
 * Why: Runtime validation of User data from backend API responses.
 * Shape derived from backend User.to_dict() in models/__init__.py.
 */

import { z } from 'zod';

export const UserRole = z.enum(['user', 'admin']);

export const AppUserSchema = z.object({
  user_id: z.uuid(),
  name: z.string(),
  email: z.email(),
  username: z.string(),
  bio: z.string().nullable(),
  profile_image_url: z.string().nullable(),
  preferences: z.array(z.string()),
  role: UserRole,
  is_active: z.boolean(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
