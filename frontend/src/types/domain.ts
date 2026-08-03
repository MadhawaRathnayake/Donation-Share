export type Role = 'Donor' | 'Recipient' | 'Volunteer' | 'Admin';
export type SelectableRole = Exclude<Role, 'Admin'>;

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
export type DonationStatus =
  | 'Posted'
  | 'Claimed'
  | 'Assigned'
  | 'PickedUp'
  | 'Delivered'
  | 'Cancelled'
  | 'Expired';
export type PickupStatus = 'Available' | 'Assigned' | 'PickedUp' | 'InTransit' | 'Delivered';

interface BaseProfile {
  id: string;
  role: SelectableRole;
  phone: string;
  address: string;
  verificationStatus: ApprovalStatus;
}

export interface DonorProfile extends BaseProfile {
  role: 'Donor';
  organizationName: string;
  contactPerson: string;
  taxId: string;
  operatingHours: string;
}

export interface RecipientProfile extends BaseProfile {
  role: 'Recipient';
  organizationName: string;
  contactPerson: string;
  taxId: string;
  serviceArea: string;
  operatingHours: string;
}

export interface VolunteerProfile extends BaseProfile {
  role: 'Volunteer';
  fullName: string;
  availability: string;
}

export type Profile = DonorProfile | RecipientProfile | VolunteerProfile;
export type ProfileInput = Omit<DonorProfile, 'id' | 'verificationStatus'> | Omit<RecipientProfile, 'id' | 'verificationStatus'> | Omit<VolunteerProfile, 'id' | 'verificationStatus'>;

export interface Donation {
  id: string;
  foodType: string;
  quantity: number;
  pickupLocation: string;
  pickupWindowStart: string;
  expiryTime: string;
  notes?: string;
  imageUrl?: string;
  status: DonationStatus;
  donorName: string;
  createdAt: string;
}

export interface DonationFilters {
  page?: number;
  pageSize?: number;
  type?: string;
  maxDistance?: number;
  expiringSoon?: boolean;
}

export interface DonationInput {
  foodType: string;
  quantity: number;
  pickupLocation: string;
  pickupWindowStart: string;
  expiryTime: string;
  notes?: string;
  image?: File;
}

export interface Claim {
  id: string;
  donation: Donation;
  claimTime: string;
  approvalStatus: ApprovalStatus;
}

export interface Pickup {
  id: string;
  donation: Donation;
  donorAddress: string;
  recipientAddress: string;
  status: PickupStatus;
  pickupTime?: string;
  deliveryTime?: string;
}

export interface AppNotification {
  id: string;
  eventType: string;
  message: string;
  sentAt: string;
  readStatus: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  verificationStatus: ApprovalStatus;
  createdAt: string;
}

export interface AdminStats {
  totalFoodRescued: number;
  activeUsers: number;
  activeDonations: number;
  completedDeliveries: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
}
