import { z } from 'zod';

/**
 * Server-side validation for POST/PUT /api/users/profile*.
 *
 * These rules intentionally mirror the Zod schema Member 2 uses in
 * components/profile/ProfileForm.tsx, including the wording of the messages, so
 * a field rejected by the server reads the same as one rejected in the browser.
 * The client-side copy is a convenience; this copy is the one that is trusted.
 */

/**
 * A required free-text field.
 *
 * The message is attached twice on purpose. `.min(1, ...)` covers a field that
 * was sent but left blank, and the `error` option covers a field that was
 * omitted from the request body entirely or sent with the wrong type. Without
 * the second one, a request that simply drops a field gets Zod's internal
 * wording ("expected string, received undefined") instead of something the
 * donor can act on.
 */
const requiredText = (message: string, max: number) =>
  z.string({ error: message }).trim().min(1, message).max(max);

const phone = requiredText('Enter a valid contact number.', 40).min(5, 'Enter a valid contact number.');
const address = requiredText('Enter a complete address.', 300).min(5, 'Enter a complete address.');

const organisationFields = {
  phone,
  address,
  organizationName: requiredText('Enter the organization name.', 120),
  contactPerson: requiredText('Enter a contact person.', 120),
  taxId: requiredText('Enter the organization tax or registration ID.', 80),
  operatingHours: requiredText('Enter operating hours.', 200),
};

export const donorProfileSchema = z.object({
  role: z.literal('Donor'),
  ...organisationFields,
});

export const recipientProfileSchema = z.object({
  role: z.literal('Recipient'),
  ...organisationFields,
  serviceArea: requiredText('Enter the area your organization serves.', 200),
});

export const volunteerProfileSchema = z.object({
  role: z.literal('Volunteer'),
  phone,
  address,
  fullName: requiredText('Enter your full name.', 120),
  availability: requiredText('Describe when you are available.', 200),
});

export const profileInputSchema = z.discriminatedUnion('role', [
  donorProfileSchema,
  recipientProfileSchema,
  volunteerProfileSchema,
]);

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type DonorProfileInput = z.infer<typeof donorProfileSchema>;
export type RecipientProfileInput = z.infer<typeof recipientProfileSchema>;
export type VolunteerProfileInput = z.infer<typeof volunteerProfileSchema>;
