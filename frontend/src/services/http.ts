import api from '../lib/api';
import type { FoodShareServices } from './contracts';
import type { DonationInput } from '../types/domain';

const donationForm = (input: DonationInput) => {
  const body = new FormData();
  body.append('foodType', input.foodType);
  body.append('quantity', String(input.quantity));
  body.append('pickupLocation', input.pickupLocation);
  body.append('pickupWindowStart', input.pickupWindowStart);
  body.append('expiryTime', input.expiryTime);
  if (input.notes) body.append('notes', input.notes);
  if (input.image) body.append('image', input.image);
  return body;
};

export const httpServices: FoodShareServices = {
  profiles: {
    getMe: async () => (await api.get('/users/profile/me')).data,
    create: async (input) => (await api.post('/users/profile', input)).data,
    update: async (input) => (await api.put('/users/profile/me', input)).data,
  },
  donations: {
    list: async (filters) => (await api.get('/donations', { params: filters })).data,
    mine: async (page = 1) => (await api.get('/donations/me', { params: { page } })).data,
    create: async (input) => (await api.post('/donations', donationForm(input))).data,
    cancel: async (id) => (await api.put(`/donations/${id}/cancel`)).data,
  },
  claims: {
    mine: async (page = 1) => (await api.get('/claims/me', { params: { page } })).data,
    create: async (donationId) => (await api.post('/claims', { donationId })).data,
  },
  pickups: {
    available: async (page = 1) => (await api.get('/pickups/available', { params: { page } })).data,
    active: async () => (await api.get('/pickups/active')).data,
    accept: async (id) => (await api.post('/pickups/accept', { pickupId: id })).data,
    updateStatus: async (id, status) => (await api.put(`/pickups/${id}/status`, { status })).data,
  },
  notifications: {
    list: async () => (await api.get('/notifications')).data,
    markRead: async (id) => { await api.put(`/notifications/${id}/read`); },
    markAllRead: async () => { await api.put('/notifications/read-all'); },
  },
  admin: {
    stats: async () => (await api.get('/admin/stats')).data,
    users: async (page = 1, search = '', sort = 'createdAt:desc') =>
      (await api.get('/admin/users', { params: { page, search, sort } })).data,
    verifyUser: async (id, status) => (await api.put(`/admin/users/${id}/verify`, { status })).data,
  },
};
