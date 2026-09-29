/**
 * user.schema.ts - Shape of a user as returned by the API (backend User.to_dict()).
 * email is only present on your own profile.
 */

import { z } from 'zod';
import { AppTagSchema } from './tag.schema';

export const UserRole = z.enum(['user', 'admin']);

export const AppUserSchema = z.object({
  user_id: z.uuid(),
  name: z.string(),
  email: z.email().optional(),
  username: z.string(),
  bio: z.string().nullable(),
  profile_image_url: z.string().nullable(),
  interests: z.array(AppTagSchema),
  role: UserRole,
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type UserRole = z.infer<typeof UserRole>;
