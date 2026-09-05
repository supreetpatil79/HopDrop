import { z } from 'zod';

export const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  profilePhoto: z.string().url().optional()
});

export const verifyIdSchema = z.object({
  governmentIdType: z.enum(['aadhaar', 'pan', 'passport', 'dl']),
  governmentIdNumber: z.string().min(6).max(30)
});

export const verifyCarrierAadhaarSchema = z.object({
  aadhaarNumber: z.string().min(12).max(16),
  otp: z.string().optional()
});

export const saveCarrierPayoutSchema = z.object({
  method: z.enum(['upi', 'bank']),
  upiId: z.string().optional(),
  accountNumber: z.string().optional(),
  ifsc: z.string().optional(),
  holderName: z.string().optional()
});

export const saveCarrierPreferencesSchema = z.object({
  preferredModes: z.array(z.string()).optional(),
  maxCapacityKg: z.number().positive().max(50).optional(),
  allowedCategories: z.array(z.string()).optional(),
  instantBooking: z.boolean().optional(),
  bio: z.string().max(500).optional(),
  emergencyContact: z.string().max(20).optional()
});
