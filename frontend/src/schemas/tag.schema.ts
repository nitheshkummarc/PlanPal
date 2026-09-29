/**
 * tag.schema.ts - Shape of a tag as returned by the API (backend Tag.to_dict()).
 *
 * The Zod schemas in this folder define the TypeScript types for API data
 * (see types/index.ts). Responses are not parsed with them at runtime.
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
