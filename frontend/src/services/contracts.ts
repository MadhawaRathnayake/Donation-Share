import type {
  AdminStats,
  AdminUser,
  AppNotification,
  Claim,
  Donation,
  DonationFilters,
  DonationInput,
  Paginated,
  Pickup,
  PickupStatus,
  Profile,
  ProfileInput,
} from '../types/domain';

export interface FoodShareServices {
  profiles: {
    getMe(): Promise<Profile>;
    create(input: ProfileInput): Promise<Profile>;
    update(input: ProfileInput): Promise<Profile>;
  };
  donations: {
    list(filters: DonationFilters): Promise<Paginated<Donation>>;
    mine(page?: number): Promise<Paginated<Donation>>;
    create(input: DonationInput): Promise<Donation>;
    cancel(id: string): Promise<Donation>;
  };
  claims: {
    mine(page?: number): Promise<Paginated<Claim>>;
    create(donationId: string): Promise<Claim>;
  };
  pickups: {
    available(page?: number): Promise<Paginated<Pickup>>;
    active(): Promise<Pickup | null>;
    accept(id: string): Promise<Pickup>;
    updateStatus(id: string, status: PickupStatus): Promise<Pickup>;
  };
  notifications: {
    list(): Promise<AppNotification[]>;
    markRead(id: string): Promise<void>;
    markAllRead(): Promise<void>;
  };
  admin: {
    stats(): Promise<AdminStats>;
    users(page?: number, search?: string, sort?: string): Promise<Paginated<AdminUser>>;
    verifyUser(id: string, status: 'Approved' | 'Rejected'): Promise<AdminUser>;
  };
}
