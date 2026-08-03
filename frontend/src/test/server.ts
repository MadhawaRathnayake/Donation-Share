import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  http.get('http://localhost:3000/api/users/profile/me', () => HttpResponse.json({
    id: 'profile-test',
    role: 'Donor',
    phone: '0112345678',
    address: 'Colombo',
    verificationStatus: 'Approved',
    organizationName: 'Test Kitchen',
    contactPerson: 'Test User',
    taxId: 'T-01',
    operatingHours: '08:00–17:00',
  })),
);
