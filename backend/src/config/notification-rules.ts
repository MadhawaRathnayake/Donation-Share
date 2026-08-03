export const NotificationRules = {
  DonationClaimed: {
    notifyDonor: true,
    notifyRecipient: true,
    channels: ['Email', 'InApp'],
  },
  PickupStatusChanged: {
    notifyDonor: true,
    notifyRecipient: true,
    notifyVolunteer: true,
    channels: ['Email', 'SMS', 'InApp'],
  },
  DonationCancelled: {
    notifyRecipient: true,
    channels: ['Email', 'InApp'],
  },
};
