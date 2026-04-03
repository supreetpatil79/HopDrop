import { z } from 'zod';

export const withdrawalSchema = z.object({
  amount: z.number().int().positive()
});
