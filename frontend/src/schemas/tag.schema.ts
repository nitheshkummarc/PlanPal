/**
 * tag.schema.ts - Zod schema for Tag domain model
 *
 * Why: Runtime validation of Tag data from backend API responses.
 * Shape derived from backend Tag.to_dict() in models/__init__.py.
 */

import { z } from 'zod';

export const AppTagSchema = z.object({
  tag_id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
