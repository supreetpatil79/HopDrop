import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15)
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6)
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  otp: z.string().length(6)
});

export const loginSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});
