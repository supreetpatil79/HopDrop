import { z } from 'zod';

export const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  profilePhoto: z.string().url().optional()
});

export const verifyIdSchema = z.object({
  governmentIdType: z.enum(['aadhaar', 'pan', 'passport', 'dl']),
  governmentIdNumber: z.string().min(6)
});
