import { z } from 'zod';

export const createClaimSchema = z.object({
  donationId: z.string().uuid(),
});
