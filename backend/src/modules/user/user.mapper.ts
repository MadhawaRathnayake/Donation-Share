import type {
  DonorProfile,
  RecipientProfile,
  User,
  VolunteerProfile,
} from '@prisma/client';
import { notFound } from '../../lib/errors';

/**
 * Database rows -> the `Profile` union in frontend/src/types/domain.ts.
 *
 * Two mismatches are resolved here rather than by renaming columns, so the
 * schema keeps the names used in the architecture report's class diagram:
 *
 *  - RecipientProfile.orgName is exposed as `organizationName`, matching the
 *    donor shape the UI already renders.
 *  - `verificationStatus` is read from the User row. DonorProfile.verified and
 *    RecipientProfile.approvalStatus still exist for the report's model and are
 *    written in step with the User row, but the account-level value is the one
 *    the API reports, so there is a single answer to "is this user approved".
 */

export interface UserWithProfiles extends User {
  donorProfile: DonorProfile | null;
  recipientProfile: RecipientProfile | null;
  volunteerProfile: VolunteerProfile | null;
}

export const userProfileInclude = {
  donorProfile: true,
  recipientProfile: true,
  volunteerProfile: true,
} as const;

export const toProfileResponse = (user: UserWithProfiles) => {
  if (user.donorProfile) {
    const profile = user.donorProfile;
    return {
      id: profile.id,
      role: 'Donor' as const,
      phone: user.phone ?? '',
      address: profile.address,
      verificationStatus: user.verificationStatus,
      organizationName: profile.organizationName,
      contactPerson: profile.contactPerson,
      taxId: profile.taxId ?? '',
      operatingHours: profile.operatingHours ?? '',
    };
  }

  if (user.recipientProfile) {
    const profile = user.recipientProfile;
    return {
      id: profile.id,
      role: 'Recipient' as const,
      phone: user.phone ?? '',
      address: profile.address ?? '',
      verificationStatus: user.verificationStatus,
      organizationName: profile.orgName,
      contactPerson: profile.contactPerson ?? '',
      taxId: profile.taxId ?? '',
      operatingHours: profile.operatingHours ?? '',
      serviceArea: profile.serviceArea,
    };
  }

  if (user.volunteerProfile) {
    const profile = user.volunteerProfile;
    return {
      id: profile.id,
      role: 'Volunteer' as const,
      phone: user.phone ?? '',
      address: profile.address ?? '',
      verificationStatus: user.verificationStatus,
      fullName: profile.fullName,
      availability: profile.availability,
    };
  }

  // An account row with no profile row should not exist: both are written in
  // one transaction. Treating it as "not onboarded" keeps the UI recoverable.
  throw notFound('Complete your profile to continue.');
};

export type ProfileResponse = ReturnType<typeof toProfileResponse>;
