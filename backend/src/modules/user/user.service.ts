import { ApprovalStatus, Prisma, Role } from '@prisma/client';
import prisma from '../../lib/prisma';
import { env } from '../../lib/env';
import { conflict, notFound } from '../../lib/errors';
import { geocodeAddress } from '../../lib/geocode';
import { assignRealmRole } from '../../lib/keycloakAdmin';
import type { AuthenticatedUser } from '../../types/auth';
import { toProfileResponse, userProfileInclude, type ProfileResponse, type UserWithProfiles } from './user.mapper';
import type { ProfileInput } from './user.schema';

/**
 * Approval policy for a newly created account.
 *
 * FR2 has administrators approving donor and recipient registrations. Member 2
 * built the UI against a rule where only recipients wait, so that is the
 * default here and mock mode and integrated mode behave identically. Setting
 * REQUIRE_DONOR_APPROVAL=true switches to the strict FR2 reading without a code
 * change, which is what Member 1 will do once the admin approval queue exists.
 */
const initialVerificationStatus = (role: Role): ApprovalStatus => {
  if (role === Role.Recipient) return ApprovalStatus.Pending;
  if (role === Role.Donor && env.policy.requireDonorApproval) return ApprovalStatus.Pending;
  return ApprovalStatus.Approved;
};

/** The account's display name comes from whichever field identifies it best. */
const displayNameFor = (input: ProfileInput) =>
  input.role === 'Volunteer' ? input.fullName : input.organizationName;

const emailFor = (auth: AuthenticatedUser) =>
  auth.email || `${auth.username || auth.keycloakId}@foodshare.local`;

const loadWithProfiles = async (userId: string): Promise<UserWithProfiles> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userProfileInclude,
  });
  if (!user) throw notFound('Complete your profile to continue.');
  return user as UserWithProfiles;
};

export const getMyProfile = async (userId: string): Promise<ProfileResponse> =>
  toProfileResponse(await loadWithProfiles(userId));

/**
 * Creates the FoodShare account and its role-specific profile in one
 * transaction, then mirrors the chosen role into Keycloak.
 *
 * The account row and the profile row are written together because a user with
 * one and not the other cannot be rendered by the UI: the profile response is
 * built from both.
 */
export const createProfile = async (
  auth: AuthenticatedUser,
  input: ProfileInput,
): Promise<ProfileResponse> => {
  const existing = await prisma.user.findUnique({
    where: { keycloakId: auth.keycloakId },
    include: userProfileInclude,
  });

  if (existing?.donorProfile || existing?.recipientProfile || existing?.volunteerProfile) {
    throw conflict('PROFILE_EXISTS', 'A profile already exists for this account. Edit it instead.');
  }

  const role = input.role as Role;
  const verificationStatus = initialVerificationStatus(role);
  const coordinates = await geocodeAddress(input.address);

  try {
    const userId = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { keycloakId: auth.keycloakId },
        create: {
          keycloakId: auth.keycloakId,
          name: displayNameFor(input),
          email: emailFor(auth),
          phone: input.phone,
          role,
          verificationStatus,
        },
        update: {
          name: displayNameFor(input),
          phone: input.phone,
          role,
          verificationStatus,
        },
      });

      if (input.role === 'Donor') {
        await tx.donorProfile.create({
          data: {
            userId: user.id,
            organizationName: input.organizationName,
            address: input.address,
            contactPerson: input.contactPerson,
            taxId: input.taxId,
            operatingHours: input.operatingHours,
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
            verified: verificationStatus === ApprovalStatus.Approved,
          },
        });
      } else if (input.role === 'Recipient') {
        await tx.recipientProfile.create({
          data: {
            userId: user.id,
            orgName: input.organizationName,
            serviceArea: input.serviceArea,
            address: input.address,
            contactPerson: input.contactPerson,
            taxId: input.taxId,
            operatingHours: input.operatingHours,
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
            approvalStatus: verificationStatus,
          },
        });
      } else {
        await tx.volunteerProfile.create({
          data: {
            userId: user.id,
            fullName: input.fullName,
            availability: input.availability,
            address: input.address,
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
          },
        });
      }

      return user.id;
    });

    // Outside the transaction: a slow or unreachable Keycloak must not hold a
    // database transaction open, and a failed sync must not undo onboarding.
    await assignRealmRole(auth.keycloakId, role);

    return toProfileResponse(await loadWithProfiles(userId));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('ACCOUNT_EXISTS', 'An account already exists for this email address.');
    }
    throw error;
  }
};

/**
 * Updates the caller's own profile. The role is fixed after onboarding: it
 * decides which profile table holds the row and which workspace the UI shows,
 * so changing it is an administrative action, not a self-service edit.
 */
export const updateMyProfile = async (
  userId: string,
  input: ProfileInput,
): Promise<ProfileResponse> => {
  const current = await loadWithProfiles(userId);

  if (current.role !== (input.role as Role)) {
    throw conflict('ROLE_IMMUTABLE', 'Contact an administrator to change your account role.');
  }

  const previousAddress =
    current.donorProfile?.address ?? current.recipientProfile?.address ?? current.volunteerProfile?.address ?? null;

  // Only re-geocode when the address actually changed: it is a network call.
  const coordinates = previousAddress === input.address ? undefined : await geocodeAddress(input.address);
  const geo = coordinates === undefined
    ? {}
    : { latitude: coordinates?.latitude ?? null, longitude: coordinates?.longitude ?? null };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { name: displayNameFor(input), phone: input.phone },
    });

    if (input.role === 'Donor') {
      await tx.donorProfile.update({
        where: { userId },
        data: {
          organizationName: input.organizationName,
          address: input.address,
          contactPerson: input.contactPerson,
          taxId: input.taxId,
          operatingHours: input.operatingHours,
          ...geo,
        },
      });
    } else if (input.role === 'Recipient') {
      await tx.recipientProfile.update({
        where: { userId },
        data: {
          orgName: input.organizationName,
          serviceArea: input.serviceArea,
          address: input.address,
          contactPerson: input.contactPerson,
          taxId: input.taxId,
          operatingHours: input.operatingHours,
          ...geo,
        },
      });
    } else {
      await tx.volunteerProfile.update({
        where: { userId },
        data: {
          fullName: input.fullName,
          availability: input.availability,
          address: input.address,
          ...geo,
        },
      });
    }
  });

  return toProfileResponse(await loadWithProfiles(userId));
};
