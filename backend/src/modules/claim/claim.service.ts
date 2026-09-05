import { ApprovalStatus, DonationStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { env } from '../../lib/env';
import { AppError, conflict, forbidden, notFound } from '../../lib/errors';
import { DomainEvent, buildEvent } from '../../lib/events';
import { publishNotificationEvent } from '../../lib/rabbitmq';
import { paginated, type PageRequest, type Paginated } from '../../lib/pagination';
import { toDonationResponse } from '../donation/donation.mapper';

const requireRecipientProfile = async (userId: string) => {
  const profile = await prisma.recipientProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new AppError(
      403,
      'RECIPIENT_PROFILE_REQUIRED',
      'Complete your recipient profile before claiming a donation.',
    );
  }

  // Usually checked in requireRole, but good to double check profile status
  if (profile.approvalStatus !== ApprovalStatus.Approved) {
    throw forbidden('Your recipient profile is pending administrative approval.');
  }

  return profile;
};

export const createClaim = async (userId: string, donationId: string) => {
  const profile = await requireRecipientProfile(userId);

  // Optimistic locking: try to update the donation from Posted to Claimed
  const result = await prisma.foodDonation.updateMany({
    where: { id: donationId, status: DonationStatus.Posted },
    data: { status: DonationStatus.Claimed },
  });

  if (result.count === 0) {
    const existing = await prisma.foodDonation.findUnique({ where: { id: donationId } });
    if (!existing) throw notFound('Donation not found.');
    throw conflict(
      'DONATION_NOT_AVAILABLE',
      `This donation cannot be claimed because it is currently ${existing.status}.`
    );
  }

  // Donation is successfully locked and marked as Claimed, now create the Claim record
  const claim = await prisma.claim.create({
    data: {
      donationId,
      recipientId: profile.id,
      approvalStatus: profile.approvalStatus,
    },
    include: {
      donation: {
        include: { donor: true }
      }
    }
  });

  const donation = claim.donation;

  // Fire event to notify donor and system
  await publishNotificationEvent(
    buildEvent(
      DomainEvent.DonationClaimed,
      `${profile.orgName} claimed your donation of ${donation.quantity} ${donation.foodType}.`,
      {
        donationId: donation.id,
        donorId: donation.donorId,
        donorUserId: donation.donor.userId,
        donorName: donation.donor.organizationName,
        foodType: donation.foodType,
        quantity: donation.quantity,
        pickupLocation: donation.pickupLocation,
        pickupWindowStart: donation.pickupWindowStart.toISOString(),
        expiryTime: donation.expiryTime.toISOString(),
      }
    )
  );

  return {
    id: claim.id,
    claimTime: claim.claimTime,
    approvalStatus: claim.approvalStatus,
    donation: toDonationResponse(donation as any),
  };
};

export const listMyClaims = async (userId: string, page: PageRequest): Promise<Paginated<any>> => {
  const profile = await prisma.recipientProfile.findUnique({ where: { userId } });
  if (!profile) return paginated([], 0, page);

  const [rows, total] = await prisma.$transaction([
    prisma.claim.findMany({
      where: { recipientId: profile.id },
      include: {
        donation: {
          include: { donor: true }
        }
      },
      orderBy: { claimTime: 'desc' },
      skip: page.skip,
      take: page.take,
    }),
    prisma.claim.count({ where: { recipientId: profile.id } }),
  ]);

  const items = rows.map(claim => ({
    id: claim.id,
    claimTime: claim.claimTime,
    approvalStatus: claim.approvalStatus,
    donation: toDonationResponse(claim.donation as any),
  }));

  return paginated(items, total, page);
};
