import type { FoodShareServices } from './contracts';
import type {
  AdminUser,
  AppNotification,
  Claim,
  Donation,
  Paginated,
  Pickup,
  Profile,
  ProfileInput,
} from '../types/domain';

const wait = (delay = 180) => new Promise((resolve) => window.setTimeout(resolve, delay));
const now = Date.now();
const hoursFromNow = (hours: number) => new Date(now + hours * 3_600_000).toISOString();
const daysAgo = (days: number) => new Date(now - days * 86_400_000).toISOString();
const id = () => crypto.randomUUID();

const paginate = <T,>(items: T[], page = 1, pageSize = 6): Paginated<T> => ({
  items: items.slice((page - 1) * pageSize, page * pageSize),
  page,
  pageSize,
  total: items.length,
});

let profile: Profile | null = null;

let donations: Donation[] = [
  {
    id: 'donation-1',
    foodType: 'Fresh produce',
    quantity: 24,
    pickupLocation: 'Harbour Market, Colombo',
    pickupWindowStart: hoursFromNow(2),
    expiryTime: hoursFromNow(9),
    notes: 'Mixed vegetables packed in reusable crates.',
    status: 'Posted',
    donorName: 'Harbour Kitchen',
    createdAt: daysAgo(0),
  },
  {
    id: 'donation-2',
    foodType: 'Prepared meals',
    quantity: 40,
    pickupLocation: 'Union Place, Colombo',
    pickupWindowStart: hoursFromNow(3),
    expiryTime: hoursFromNow(7),
    notes: 'Vegetarian rice and curry portions.',
    status: 'Posted',
    donorName: 'City Table',
    createdAt: daysAgo(0),
  },
  {
    id: 'donation-3',
    foodType: 'Bakery items',
    quantity: 18,
    pickupLocation: 'Galle Road, Dehiwala',
    pickupWindowStart: hoursFromNow(5),
    expiryTime: hoursFromNow(18),
    notes: 'Bread and plain buns boxed for transport.',
    status: 'Posted',
    donorName: 'North & Grain',
    createdAt: daysAgo(1),
  },
  {
    id: 'donation-4',
    foodType: 'Dry goods',
    quantity: 12,
    pickupLocation: 'Nugegoda',
    pickupWindowStart: hoursFromNow(-28),
    expiryTime: hoursFromNow(200),
    status: 'Delivered',
    donorName: 'Harbour Kitchen',
    createdAt: daysAgo(3),
  },
];

let claims: Claim[] = [];

let pickups: Pickup[] = [
  {
    id: 'pickup-1',
    donation: donations[0],
    donorAddress: 'Harbour Market, Colombo 01',
    recipientAddress: 'Community Hall, Borella',
    status: 'Available',
  },
  {
    id: 'pickup-2',
    donation: donations[1],
    donorAddress: 'Union Place, Colombo 02',
    recipientAddress: 'Hope Centre, Maradana',
    status: 'Available',
  },
];

let notifications: AppNotification[] = [
  { id: 'notification-1', eventType: 'DonationPosted', message: 'A new prepared-meal donation is available nearby.', sentAt: hoursFromNow(-1), readStatus: false },
  { id: 'notification-2', eventType: 'ProfileApproved', message: 'Your organization profile has been approved.', sentAt: daysAgo(1), readStatus: true },
];

let users: AdminUser[] = [
  { id: 'user-1', name: 'Harbour Kitchen', email: 'donor@foodshare.test', role: 'Donor', verificationStatus: 'Approved', createdAt: daysAgo(30) },
  { id: 'user-2', name: 'Hope Centre', email: 'recipient@foodshare.test', role: 'Recipient', verificationStatus: 'Pending', createdAt: daysAgo(2) },
  { id: 'user-3', name: 'Maya Perera', email: 'volunteer@foodshare.test', role: 'Volunteer', verificationStatus: 'Approved', createdAt: daysAgo(14) },
  { id: 'user-4', name: 'Community Table', email: 'community@foodshare.test', role: 'Recipient', verificationStatus: 'Rejected', createdAt: daysAgo(6) },
];

const notFound = (message: string) => Promise.reject({ code: 'NOT_FOUND', message, status: 404 });

export const mockServices: FoodShareServices = {
  profiles: {
    async getMe() {
      await wait();
      if (!profile) return notFound('Complete your profile to continue.');
      return structuredClone(profile);
    },
    async create(input: ProfileInput) {
      await wait();
      profile = { ...input, id: id(), verificationStatus: input.role === 'Recipient' ? 'Pending' : 'Approved' } as Profile;
      return structuredClone(profile);
    },
    async update(input: ProfileInput) {
      await wait();
      if (!profile) return notFound('Profile not found.');
      profile = { ...input, id: profile.id, verificationStatus: profile.verificationStatus } as Profile;
      return structuredClone(profile);
    },
  },
  donations: {
    async list(filters) {
      await wait();
      let filtered = donations.filter((item) => item.status === 'Posted');
      if (filters.type) filtered = filtered.filter((item) => item.foodType.toLowerCase().includes(filters.type!.toLowerCase()));
      if (filters.expiringSoon) filtered = filtered.filter((item) => new Date(item.expiryTime).getTime() - Date.now() <= 12 * 3_600_000);
      return paginate(filtered, filters.page, filters.pageSize);
    },
    async mine(page = 1) {
      await wait();
      return paginate(donations, page);
    },
    async create(input) {
      await wait();
      const donation: Donation = {
        ...input,
        id: id(),
        donorName: profile && 'organizationName' in profile ? profile.organizationName : 'Your organization',
        status: 'Posted',
        createdAt: new Date().toISOString(),
        imageUrl: input.image ? URL.createObjectURL(input.image) : undefined,
      };
      donations = [donation, ...donations];
      return structuredClone(donation);
    },
    async cancel(donationId) {
      await wait();
      const donation = donations.find((item) => item.id === donationId);
      if (!donation) return notFound('Donation not found.');
      donation.status = 'Cancelled';
      return structuredClone(donation);
    },
  },
  claims: {
    async mine(page = 1) {
      await wait();
      return paginate(claims, page);
    },
    async create(donationId) {
      await wait();
      const donation = donations.find((item) => item.id === donationId);
      if (!donation || donation.status !== 'Posted') {
        return Promise.reject({ code: 'ALREADY_CLAIMED', message: 'This donation is no longer available.', status: 409 });
      }
      donation.status = 'Claimed';
      const claim: Claim = { id: id(), donation: structuredClone(donation), claimTime: new Date().toISOString(), approvalStatus: 'Approved' };
      claims = [claim, ...claims];
      return claim;
    },
  },
  pickups: {
    async available(page = 1) {
      await wait();
      return paginate(pickups.filter((item) => item.status === 'Available'), page);
    },
    async active() {
      await wait();
      return structuredClone(pickups.find((item) => item.status !== 'Available' && item.status !== 'Delivered') || null);
    },
    async accept(pickupId) {
      await wait();
      const pickup = pickups.find((item) => item.id === pickupId);
      if (!pickup || pickup.status !== 'Available') return notFound('This pickup is no longer available.');
      pickup.status = 'Assigned';
      return structuredClone(pickup);
    },
    async updateStatus(pickupId, status) {
      await wait();
      const pickup = pickups.find((item) => item.id === pickupId);
      if (!pickup) return notFound('Pickup not found.');
      pickup.status = status;
      if (status === 'PickedUp') pickup.pickupTime = new Date().toISOString();
      if (status === 'Delivered') pickup.deliveryTime = new Date().toISOString();
      return structuredClone(pickup);
    },
  },
  notifications: {
    async list() {
      await wait(80);
      return structuredClone(notifications);
    },
    async markRead(notificationId) {
      await wait(80);
      notifications = notifications.map((item) => item.id === notificationId ? { ...item, readStatus: true } : item);
    },
    async markAllRead() {
      await wait(80);
      notifications = notifications.map((item) => ({ ...item, readStatus: true }));
    },
  },
  admin: {
    async stats() {
      await wait();
      return { totalFoodRescued: 1284, activeUsers: 86, activeDonations: 17, completedDeliveries: 143 };
    },
    async users(page = 1, search = '', sort = 'createdAt:desc') {
      await wait();
      const needle = search.toLowerCase();
      const filtered = users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(needle));
      const sorted = [...filtered].sort((a, b) => {
        if (sort === 'name:asc') return a.name.localeCompare(b.name);
        if (sort === 'name:desc') return b.name.localeCompare(a.name);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return paginate(sorted, page);
    },
    async verifyUser(userId, status) {
      await wait();
      const user = users.find((item) => item.id === userId);
      if (!user) return notFound('User not found.');
      user.verificationStatus = status;
      return structuredClone(user);
    },
  },
};

export const resetMockProfile = () => {
  profile = null;
};
