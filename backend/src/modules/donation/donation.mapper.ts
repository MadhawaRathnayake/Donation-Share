import type { DonorProfile, FoodDonation } from '@prisma/client';

/**
 * Database row -> the `Donation` interface in frontend/src/types/domain.ts.
 *
 * The UI wants a flat `donorName` string, not a nested donor object, and all
 * timestamps as ISO-8601 UTC strings. Doing that conversion in one place means
 * the donor history, the public feed and the cancel response cannot drift into
 * three slightly different shapes.
 */
export interface DonationWithDonor extends FoodDonation {
  donor: DonorProfile;
}

export const donationInclude = { donor: true } as const;

export const toDonationResponse = (donation: DonationWithDonor) => ({
  id: donation.id,
  foodType: donation.foodType,
  quantity: donation.quantity,
  pickupLocation: donation.pickupLocation,
  pickupWindowStart: donation.pickupWindowStart.toISOString(),
  expiryTime: donation.expiryTime.toISOString(),
  notes: donation.notes ?? undefined,
  imageUrl: donation.imageUrl ?? undefined,
  status: donation.status,
  donorName: donation.donor.organizationName,
  createdAt: donation.createdAt.toISOString(),
});

export type DonationResponse = ReturnType<typeof toDonationResponse>;
