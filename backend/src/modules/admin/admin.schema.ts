import { z } from 'zod';

export const verifyUserSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
});
