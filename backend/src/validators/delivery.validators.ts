import { z } from 'zod';
import { locationSchema } from './common';

const categorySchema = z.enum(['documents', 'clothing', 'electronics', 'food', 'fragile', 'medicine', 'other']);

export const createDeliverySchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  package: z.object({
    description: z.string().min(3),
    category: categorySchema,
    weightKg: z.number().positive(),
    dimensionsCm: z
      .object({
        length: z.number().positive().optional(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional()
      })
      .optional(),
    isFragile: z.boolean().default(false),
    declaredValue: z.number().int().nonnegative().optional(),
    photoUrl: z.string().url().optional()
  }),
  recipient: z.object({
    name: z.string().min(2),
    phone: z.string().min(10).max(15),
    address: z.string().min(5)
  }),
  preferredDeliveryWindow: z.object({
    earliest: z.coerce.date(),
    latest: z.coerce.date()
  })
});

export const updateDeliverySchema = createDeliverySchema.partial();

export const confirmDeliveryPaymentSchema = z.object({
  requestId: z.string().min(1),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string()
});
