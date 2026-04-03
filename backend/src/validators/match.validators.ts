import { z } from 'zod';

export const verifyOtpSchema = z.object({
  otp: z.string().length(6)
});

export const rateMatchSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});

export const disputeSchema = z.object({
  reason: z.string().min(3),
  description: z.string().min(10)
});

export const requestRapidoSchema = z.object({
  pickupCoords: z.tuple([z.number(), z.number()]),
  dropAddress: z.string().min(5)
});
