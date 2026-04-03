import { z } from 'zod';
import { locationSchema } from './common';

const transportMode = z.enum(['bus', 'train', 'car', 'bike', 'flight', 'other']);
const categorySchema = z.enum(['documents', 'clothing', 'electronics', 'food', 'fragile', 'medicine', 'other']);

export const createTripSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  departureTime: z.coerce.date(),
  estimatedArrivalTime: z.coerce.date().optional(),
  modeOfTransport: transportMode,
  transportDetails: z
    .object({
      name: z.string().optional(),
      pnr: z.string().optional(),
      seatNumber: z.string().optional()
    })
    .optional(),
  availableCapacity: z.object({
    weightKg: z.number().positive().max(30),
    dimensionsCm: z
      .object({
        length: z.number().positive().optional(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional()
      })
      .optional(),
    allowedCategories: z.array(categorySchema).min(1)
  }),
  pricePerKg: z.number().positive(),
  pickupInstructions: z.string().optional(),
  dropoffInstructions: z.string().optional()
});

export const updateTripSchema = createTripSchema.partial();

export const tripFilterSchema = z.object({
  origin_city: z.string().optional(),
  destination_city: z.string().optional(),
  date: z.string().optional(),
  mode: transportMode.optional(),
  min_capacity_kg: z.coerce.number().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10)
});

export const confirmDepositSchema = z.object({
  tripId: z.string().min(1),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string()
});
