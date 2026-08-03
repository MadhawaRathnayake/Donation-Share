/**
 * Domain event contract (FR12 / ADR-002).
 *
 * Every significant state change is published to the notification queue so that
 * Member 5's worker can fan it out to email and in-app channels without the
 * publishing request having to wait for delivery.
 *
 * Member 3 publishes DonationPosted and DonationCancelled.
 * Member 4 publishes DonationClaimed. Member 5 publishes the pickup events.
 * Adding a new event means adding it here first, so the worker and the
 * publishers share one list of names.
 */
export const DomainEvent = {
  DonationPosted: 'DonationPosted',
  DonationCancelled: 'DonationCancelled',
  DonationClaimed: 'DonationClaimed',
  PickupAssigned: 'PickupAssigned',
  PickupPickedUp: 'PickupPickedUp',
  DeliveryCompleted: 'DeliveryCompleted',
} as const;

export type DomainEventName = (typeof DomainEvent)[keyof typeof DomainEvent];

export interface DomainEventEnvelope<TPayload = Record<string, unknown>> {
  /** Event name from `DomainEvent`. */
  eventType: DomainEventName;
  /** Unique id so a consumer can detect a redelivery and stay idempotent. */
  eventId: string;
  /** ISO-8601 UTC timestamp of when the state change happened. */
  occurredAt: string;
  /** Human-readable fallback message the worker can send as-is. */
  message: string;
  /** Event-specific data. */
  payload: TPayload;
}

export interface DonationEventPayload {
  donationId: string;
  donorId: string;
  donorUserId: string;
  donorName: string;
  foodType: string;
  quantity: number;
  pickupLocation: string;
  pickupWindowStart: string;
  expiryTime: string;
  /** Present on DonationCancelled so the worker can explain the change. */
  previousStatus?: string;
}

export const buildEvent = <TPayload>(
  eventType: DomainEventName,
  message: string,
  payload: TPayload,
): DomainEventEnvelope<TPayload> => ({
  eventType,
  eventId: globalThis.crypto.randomUUID(),
  occurredAt: new Date().toISOString(),
  message,
  payload,
});
