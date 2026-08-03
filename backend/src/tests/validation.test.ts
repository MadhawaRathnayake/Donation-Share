import { describe, expect, it } from 'vitest';
import { profileInputSchema } from '../modules/user/user.schema';
import { createDonationSchema } from '../modules/donation/donation.schema';
import { parsePageRequest, paginated } from '../lib/pagination';
import { toDonationResponse, type DonationWithDonor } from '../modules/donation/donation.mapper';
import { toProfileResponse, type UserWithProfiles } from '../modules/user/user.mapper';
import { zodFieldErrors } from '../lib/errors';

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000);

const donorInput = {
  role: 'Donor',
  phone: '+94 11 234 5678',
  address: 'Harbour Market, Colombo 01',
  organizationName: 'Harbour Kitchen',
  contactPerson: 'Nimal Perera',
  taxId: 'TAX-99120',
  operatingHours: 'Monday-Friday, 08:00-17:00',
};

describe('profile validation', () => {
  it('accepts a complete donor profile', () => {
    expect(profileInputSchema.safeParse(donorInput).success).toBe(true);
  });

  it('requires a service area for recipients but not for donors', () => {
    const recipient = { ...donorInput, role: 'Recipient' };
    const result = profileInputSchema.safeParse(recipient);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).serviceArea).toBe('Enter the area your organization serves.');
    }
  });

  it('asks a volunteer for a name and availability rather than organisation details', () => {
    const result = profileInputSchema.safeParse({
      role: 'Volunteer',
      phone: '+94 77 111 2222',
      address: 'Nugegoda',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = zodFieldErrors(result.error);
      expect(errors.fullName).toBe('Enter your full name.');
      expect(errors.availability).toBe('Describe when you are available.');
      expect(errors.organizationName).toBeUndefined();
    }
  });

  it('rejects an unknown role', () => {
    expect(profileInputSchema.safeParse({ ...donorInput, role: 'Superuser' }).success).toBe(false);
  });

  it('trims surrounding whitespace so blank-looking input is still rejected', () => {
    const result = profileInputSchema.safeParse({ ...donorInput, organizationName: '   ' });
    expect(result.success).toBe(false);
  });
});

describe('donation validation', () => {
  const base = {
    foodType: 'Fresh produce',
    quantity: '24', // multipart form values arrive as strings
    pickupLocation: 'Harbour Market, Colombo',
    pickupWindowStart: hoursFromNow(2).toISOString(),
    expiryTime: hoursFromNow(9).toISOString(),
  };

  it('coerces a string quantity into a number', () => {
    const result = createDonationSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.quantity).toBe(24);
  });

  it('rejects a quantity of zero or less', () => {
    for (const quantity of ['0', '-3']) {
      const result = createDonationSchema.safeParse({ ...base, quantity });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(zodFieldErrors(result.error).quantity).toBe('Quantity must be greater than zero.');
      }
    }
  });

  it('rejects a fractional quantity', () => {
    expect(createDonationSchema.safeParse({ ...base, quantity: '2.5' }).success).toBe(false);
  });

  it('rejects food that has already expired', () => {
    const result = createDonationSchema.safeParse({
      ...base,
      pickupWindowStart: hoursFromNow(-5).toISOString(),
      expiryTime: hoursFromNow(-1).toISOString(),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).expiryTime).toBe('Expiry must be in the future.');
    }
  });

  it('rejects an expiry that falls before the pickup window', () => {
    const result = createDonationSchema.safeParse({
      ...base,
      pickupWindowStart: hoursFromNow(9).toISOString(),
      expiryTime: hoursFromNow(2).toISOString(),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).expiryTime).toBe('Expiry must be after pickup.');
    }
  });

  it('allows a pickup window that has just started, for food ready right now', () => {
    const result = createDonationSchema.safeParse({
      ...base,
      pickupWindowStart: hoursFromNow(-0.1).toISOString(),
      expiryTime: hoursFromNow(6).toISOString(),
    });
    expect(result.success).toBe(true);
  });
});

describe('pagination', () => {
  it('falls back to page 1 and the default size when the query is missing', () => {
    expect(parsePageRequest({})).toMatchObject({ page: 1, skip: 0 });
  });

  it('ignores values that are not usable page numbers', () => {
    for (const page of ['0', '-4', 'abc', '']) {
      expect(parsePageRequest({ page }).page).toBe(1);
    }
  });

  it('computes skip from the page and page size', () => {
    expect(parsePageRequest({ page: '3', pageSize: '10' })).toMatchObject({ skip: 20, take: 10 });
  });

  it('clamps an oversized page size so one request cannot pull the whole table', () => {
    expect(parsePageRequest({ pageSize: '100000' }).pageSize).toBeLessThanOrEqual(50);
  });

  it('wraps results in the envelope the frontend expects', () => {
    const request = parsePageRequest({ page: '2', pageSize: '5' });
    expect(paginated(['a'], 6, request)).toEqual({ items: ['a'], page: 2, pageSize: 5, total: 6 });
  });
});

describe('donation mapper', () => {
  const donation = {
    id: 'donation-1',
    foodType: 'Fresh produce',
    quantity: 24,
    pickupLocation: 'Harbour Market, Colombo',
    pickupWindowStart: new Date('2026-08-03T12:00:00.000Z'),
    expiryTime: new Date('2026-08-03T19:00:00.000Z'),
    notes: null,
    imageUrl: null,
    status: 'Posted',
    createdAt: new Date('2026-08-03T10:00:00.000Z'),
    updatedAt: new Date('2026-08-03T10:00:00.000Z'),
    donorId: 'donor-1',
    donor: { organizationName: 'Harbour Kitchen' },
  } as unknown as DonationWithDonor;

  it('flattens the donor into a donorName string', () => {
    expect(toDonationResponse(donation).donorName).toBe('Harbour Kitchen');
  });

  it('emits ISO-8601 UTC timestamps', () => {
    const result = toDonationResponse(donation);
    expect(result.pickupWindowStart).toBe('2026-08-03T12:00:00.000Z');
    expect(result.createdAt).toBe('2026-08-03T10:00:00.000Z');
  });

  it('omits optional fields instead of sending null', () => {
    const result = toDonationResponse(donation);
    expect(result.notes).toBeUndefined();
    expect(result.imageUrl).toBeUndefined();
  });
});

describe('profile mapper', () => {
  const user = {
    id: 'user-1',
    phone: '+94 11 234 5678',
    verificationStatus: 'Pending',
    donorProfile: null,
    volunteerProfile: null,
    recipientProfile: {
      id: 'recipient-1',
      orgName: 'Hope Centre',
      serviceArea: 'Colombo District',
      address: 'Maradana',
      contactPerson: 'Sanduni Silva',
      taxId: 'REG-4471',
      operatingHours: 'Daily',
    },
  } as unknown as UserWithProfiles;

  it('exposes RecipientProfile.orgName as organizationName', () => {
    const result = toProfileResponse(user);
    expect(result).toMatchObject({ role: 'Recipient', organizationName: 'Hope Centre' });
  });

  it('reads verificationStatus from the account, not the profile row', () => {
    expect(toProfileResponse(user).verificationStatus).toBe('Pending');
  });

  it('treats an account with no profile row as not onboarded', () => {
    const bare = { ...user, recipientProfile: null } as unknown as UserWithProfiles;
    expect(() => toProfileResponse(bare)).toThrowError(/Complete your profile/);
  });
});
