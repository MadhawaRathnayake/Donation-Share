import { z } from 'zod';

/**
 * Validation for POST /api/donations (Task 3.2.1).
 *
 * The request arrives as multipart/form-data because it may carry a photo, so
 * every scalar reaches the server as a string. `z.coerce` converts before
 * checking, which is why `quantity` is validated as a number even though the
 * wire value is `"24"`.
 */
export const createDonationSchema = z
  .object({
    foodType: z.string().trim().min(1, 'Choose a food type.').max(120),
    quantity: z.coerce.number().int('Quantity must be a whole number.').positive('Quantity must be greater than zero.'),
    pickupLocation: z.string().trim().min(5, 'Enter a pickup location.').max(300),
    pickupWindowStart: z.coerce.date({ message: 'Choose a valid pickup time.' }),
    expiryTime: z.coerce.date({ message: 'Choose a valid expiry time.' }),
    notes: z.string().trim().max(500, 'Keep notes below 500 characters.').optional(),
  })
  .superRefine((value, context) => {
    if (value.expiryTime <= value.pickupWindowStart) {
      context.addIssue({
        code: 'custom',
        path: ['expiryTime'],
        message: 'Expiry must be after pickup.',
      });
    }

    // The core rule: food that is already unsafe must never be listed.
    // The pickup time itself is allowed to be slightly in the past, because a
    // donor posting food that is ready right now is a normal case and browser
    // and server clocks are never exactly aligned.
    if (value.expiryTime.getTime() <= Date.now()) {
      context.addIssue({
        code: 'custom',
        path: ['expiryTime'],
        message: 'Expiry must be in the future.',
      });
    }
  });

export type CreateDonationInput = z.infer<typeof createDonationSchema>;
