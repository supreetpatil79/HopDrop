import { z } from 'zod';

export const coordinatesSchema = z.tuple([z.number(), z.number()]);

export const routePointSchema = z.object({
  city: z.string().min(1),
  placeId: z.string().min(1),
  coords: coordinatesSchema
});

export const postTripRouteSchema = z.object({
  origin: routePointSchema,
  destination: routePointSchema,
  modeOfTransport: z.enum(['bus', 'train', 'car', 'bike', 'flight', 'other'])
});
