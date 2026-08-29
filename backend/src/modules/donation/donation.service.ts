import { ApprovalStatus, DonationStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { env } from '../../lib/env';
import { AppError, conflict, forbidden, notFound } from '../../lib/errors';
import { DomainEvent, buildEvent, type DonationEventPayload } from '../../lib/events';
import { publishNotificationEvent } from '../../lib/rabbitmq';
import { paginated, type PageRequest, type Paginated } from '../../lib/pagination';
import { publicUrlFor } from '../../lib/upload';
import { donationInclude, toDonationResponse, type DonationResponse, type DonationWithDonor } from './donation.mapper';
import type { CreateDonationInput } from './donation.schema';

/** Builds the payload Member 5's worker needs to address a notification. */
const eventPayload = (donation: DonationWithDonor, donorUserId: string, previousStatus?: DonationStatus): DonationEventPayload => ({
  donationId: donation.id,
  donorId: donation.donorId,
  donorUserId,
  donorName: donation.donor.organizationName,
  foodType: donation.foodType,
  quantity: donation.quantity,
  pickupLocation: donation.pickupLocation,
  pickupWindowStart: donation.pickupWindowStart.toISOString(),
  expiryTime: donation.expiryTime.toISOString(),
  ...(previousStatus ? { previousStatus } : {}),
});

/** Resolves the donor profile that owns donations for this account. */
const requireDonorProfile = async (userId: string) => {
  const donorProfile = await prisma.donorProfile.findUnique({
    where: { userId },
    include: { user: { select: { verificationStatus: true } } },
  });

  if (!donorProfile) {
    throw new AppError(
      403,
      'DONOR_PROFILE_REQUIRED',
      'Complete your donor profile before posting a donation.',
    );
  }

  if (env.policy.requireDonorApproval && donorProfile.user.verificationStatus !== ApprovalStatus.Approved) {
    throw forbidden('An administrator has not approved this donor account yet.');
  }

  return donorProfile;
};

export const createDonation = async (
  userId: string,
  input: CreateDonationInput,
  imageFilename?: string,
): Promise<DonationResponse> => {
  const donorProfile = await requireDonorProfile(userId);

  const donation = (await prisma.foodDonation.create({
    data: {
      donorId: donorProfile.id,
      foodType: input.foodType,
      quantity: input.quantity,
      pickupLocation: input.pickupLocation,
      pickupWindowStart: input.pickupWindowStart,
      expiryTime: input.expiryTime,
      notes: input.notes,
      imageUrl: imageFilename ? publicUrlFor(imageFilename) : undefined,
      status: DonationStatus.Posted,
    },
    include: donationInclude,
  })) as DonationWithDonor;

  // FR12: the event is published after the write has committed, and publishing
  // is best-effort, so a broker outage cannot lose or delay the donation.
  await publishNotificationEvent(
    buildEvent(
      DomainEvent.DonationPosted,
      `${donorProfile.organizationName} posted ${input.quantity} of ${input.foodType}.`,
      eventPayload(donation, userId),
    ),
  );

  return toDonationResponse(donation);
};

/** Task 3.2.2: the donor's own history, newest first. */
export const listMyDonations = async (
  userId: string,
  page: PageRequest,
): Promise<Paginated<DonationResponse>> => {
  const donorProfile = await prisma.donorProfile.findUnique({ where: { userId } });
  if (!donorProfile) {
    // A donor with no profile has no history rather than an error, so the
    // dashboard renders its empty state instead of a failure banner.
    return paginated([], 0, page);
  }

  const [rows, total] = await prisma.$transaction([
    prisma.foodDonation.findMany({
      where: { donorId: donorProfile.id },
      include: donationInclude,
      orderBy: { createdAt: 'desc' },
      skip: page.skip,
      take: page.take,
    }),
    prisma.foodDonation.count({ where: { donorId: donorProfile.id } }),
  ]);

  return paginated((rows as DonationWithDonor[]).map(toDonationResponse), total, page);
};

/**
 * Task 3.2.2: cancel a donation that has not been claimed.
 *
 * The status check and the status write happen in a single conditional UPDATE
 * (`updateMany` with `status: Posted` in the where clause). Reading the row and
 * then writing it would leave a window in which Member 4's claim transaction
 * could claim the donation between the two statements, and the donor would
 * cancel food that a recipient had already been promised.
 */
export const cancelDonation = async (userId: string, donationId: string): Promise<DonationResponse> => {
  const donorProfile = await prisma.donorProfile.findUnique({ where: { userId } });
  if (!donorProfile) throw forbidden('Only the donor who posted a donation can cancel it.');

  const result = await prisma.foodDonation.updateMany({
    where: { id: donationId, donorId: donorProfile.id, status: DonationStatus.Posted },
    data: { status: DonationStatus.Cancelled },
  });

  if (result.count === 0) {
    // Nothing changed. Work out why, so the donor gets a useful message.
    const existing = await prisma.foodDonation.findUnique({ where: { id: donationId } });
    if (!existing) throw notFound('Donation not found.');
    if (existing.donorId !== donorProfile.id) throw forbidden('Only the donor who posted a donation can cancel it.');
    throw conflict(
      'DONATION_NOT_CANCELLABLE',
      `This donation can no longer be cancelled because it is already ${existing.status}.`,
    );
  }

  const donation = (await prisma.foodDonation.findUniqueOrThrow({
    where: { id: donationId },
    include: donationInclude,
  })) as DonationWithDonor;

  await publishNotificationEvent(
    buildEvent(
      DomainEvent.DonationCancelled,
      `${donation.donor.organizationName} cancelled the donation of ${donation.foodType}.`,
      eventPayload(donation, userId, DonationStatus.Posted),
    ),
  );

  return toDonationResponse(donation);
};

/**
 * Public feed of donations that are still available.
 *
 * Handover: Member 4 owns Task 4.1.1 and extends this with food-type, distance
 * and expiring-soon filters. It is kept here in paginated form so the recipient
 * dashboard has a working endpoint in the meantime; the response envelope will
 * not change when the filters are added.
 */
export const listAvailableDonations = async (page: PageRequest): Promise<Paginated<DonationResponse>> => {
  const where = { status: DonationStatus.Posted, expiryTime: { gt: new Date() } };

  const [rows, total] = await prisma.$transaction([
    prisma.foodDonation.findMany({
      where,
      include: donationInclude,
      orderBy: { expiryTime: 'asc' },
      skip: page.skip,
      take: page.take,
    }),
    prisma.foodDonation.count({ where }),
  ]);

  return paginated((rows as DonationWithDonor[]).map(toDonationResponse), total, page);
};
