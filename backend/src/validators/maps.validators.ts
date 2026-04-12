import { z } from 'zod';

export const mapSuggestSchema = z.object({
  q: z.string().min(2).max(120),
  region: z.string().default('IND'),
  actor: z.enum(['sender', 'carrier']).optional(),
  field: z.enum(['origin', 'destination']).optional(),
  limit: z.coerce.number().int().min(1).max(12).default(10)
});

export const mapSelectSchema = z.object({
  query: z.string().min(2).max(120),
  region: z.string().default('IND'),
  actor: z.enum(['sender', 'carrier']).optional(),
  field: z.enum(['origin', 'destination']).optional(),
  suggestion: z.object({
    placeName: z.string().min(1),
    placeAddress: z.string().default(''),
    eLoc: z.string().min(2),
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    city: z.string().optional(),
    state: z.string().optional()
  })
});

export const mapRouteSchema = z.object({
  originLng: z.coerce.number(),
  originLat: z.coerce.number(),
  destLng: z.coerce.number(),
  destLat: z.coerce.number()
});
