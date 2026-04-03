import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

export const coordinatesSchema = z.object({
  type: z.literal('Point').default('Point'),
  coordinates: z.tuple([z.number(), z.number()])
});

export const locationSchema = z.object({
  city: z.string().min(1),
  state: z.string().optional(),
  coordinates: coordinatesSchema.optional(),
  placeId: z.string().optional(),
  fullAddress: z.string().optional()
});
