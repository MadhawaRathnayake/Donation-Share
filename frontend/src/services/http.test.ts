import { describe, expect, it } from 'vitest';
import { httpServices } from './http';

describe('HTTP service contract', () => {
  it('returns a typed current profile from the API', async () => {
    const profile = await httpServices.profiles.getMe();
    expect(profile.role).toBe('Donor');
    expect(profile).toMatchObject({ organizationName: 'Test Kitchen', verificationStatus: 'Approved' });
  });
});
