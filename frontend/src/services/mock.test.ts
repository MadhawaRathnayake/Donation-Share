import { describe, expect, it } from 'vitest';
import { mockServices, resetMockProfile } from './mock';

describe('mock service workflows', () => {
  it('supports profile, donation, claim, pickup, notification, and approval flows', async () => {
    resetMockProfile();
    const profile = await mockServices.profiles.create({
      role: 'Donor',
      organizationName: 'Test Donor',
      contactPerson: 'Test Contact',
      phone: '0112345678',
      address: 'Colombo',
      taxId: 'REG-1',
      operatingHours: '08:00–17:00',
    });
    expect((await mockServices.profiles.getMe()).id).toBe(profile.id);

    const donation = await mockServices.donations.create({
      foodType: 'Prepared meals',
      quantity: 10,
      pickupLocation: 'Colombo',
      pickupWindowStart: new Date(Date.now() + 3_600_000).toISOString(),
      expiryTime: new Date(Date.now() + 7_200_000).toISOString(),
    });
    expect((await mockServices.donations.mine()).items.some((item) => item.id === donation.id)).toBe(true);
    expect((await mockServices.donations.cancel(donation.id)).status).toBe('Cancelled');

    const available = await mockServices.donations.list({ page: 1 });
    const claim = await mockServices.claims.create(available.items[0].id);
    expect(claim.donation.status).toBe('Claimed');

    const jobs = await mockServices.pickups.available();
    const accepted = await mockServices.pickups.accept(jobs.items[0].id);
    expect(accepted.status).toBe('Assigned');
    expect((await mockServices.pickups.updateStatus(accepted.id, 'Delivered')).status).toBe('Delivered');

    await mockServices.notifications.markAllRead();
    expect((await mockServices.notifications.list()).every((item) => item.readStatus)).toBe(true);

    const pendingUser = (await mockServices.admin.users()).items.find((user) => user.verificationStatus === 'Pending');
    expect(pendingUser).toBeDefined();
    expect((await mockServices.admin.verifyUser(pendingUser!.id, 'Approved')).verificationStatus).toBe('Approved');
  });
});
