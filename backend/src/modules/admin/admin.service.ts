import { ApprovalStatus, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { notFound } from '../../lib/errors';
import { assignRealmRole } from '../../lib/keycloakAdmin';
import { PageRequest, paginated, Paginated } from '../../lib/pagination';

export const getUsers = async (
  request: PageRequest,
  search?: string,
  sort?: string
): Promise<Paginated<any>> => {
  const where: Prisma.UserWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [field, direction] = (sort || 'createdAt:desc').split(':');
  const orderBy = { [field]: direction as Prisma.SortOrder };

  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip: request.skip,
      take: request.take,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verificationStatus: true,
        createdAt: true,
      },
    }),
  ]);

  return paginated(items, total, request);
};

export const verifyUser = async (userId: string, status: ApprovalStatus) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User not found');

  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { verificationStatus: status },
      select: {
        id: true,
        keycloakId: true,
        name: true,
        email: true,
        role: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    if (user.role === 'Donor') {
      await tx.donorProfile.updateMany({
        where: { userId },
        data: { verified: status === ApprovalStatus.Approved },
      });
    } else if (user.role === 'Recipient') {
      await tx.recipientProfile.updateMany({
        where: { userId },
        data: { approvalStatus: status },
      });
    }

    return updated;
  });

  if (status === ApprovalStatus.Approved) {
    // Sync to Keycloak so the user actually gets the realm role and can log in to their dashboard.
    await assignRealmRole(updatedUser.keycloakId, updatedUser.role);
  }

  // Remove keycloakId before returning to frontend
  const { keycloakId, ...safeUser } = updatedUser;
  return safeUser;
};

export const getStats = async () => {
  const [
    foodRescuedAgg,
    activeUsers,
    activeDonations,
    completedDeliveries
  ] = await prisma.$transaction([
    prisma.foodDonation.aggregate({
      _sum: { quantity: true },
      where: { status: 'Delivered' },
    }),
    prisma.user.count({
      where: { verificationStatus: ApprovalStatus.Approved },
    }),
    prisma.foodDonation.count({
      where: { status: { in: ['Posted', 'Claimed', 'Assigned'] } },
    }),
    prisma.pickupAssignment.count({
      where: { deliveryStatus: 'Delivered' },
    }),
  ]);

  return {
    totalFoodRescued: foodRescuedAgg._sum.quantity || 0,
    activeUsers,
    activeDonations,
    completedDeliveries,
  };
};
