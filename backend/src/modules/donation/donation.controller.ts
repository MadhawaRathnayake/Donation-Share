import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { publishEvent } from '../../lib/rabbitmq';

export const createDonation = async (req: Request, res: Response) => {
  try {
    const { foodType, quantity, pickupLocation, pickupWindowStart, expiryTime, notes } = req.body;
    const user = (req as any).user; // From auth middleware

    // Get the donor profile
    const donorProfile = await prisma.donorProfile.findUnique({
      where: { userId: user.id }
    });

    if (!donorProfile) {
      return res.status(400).json({ error: 'Donor profile not found for this user' });
    }

    const donation = await prisma.foodDonation.create({
      data: {
        foodType,
        quantity,
        pickupLocation,
        pickupWindowStart: new Date(pickupWindowStart),
        expiryTime: new Date(expiryTime),
        notes,
        donorId: donorProfile.id,
        status: 'Posted'
      }
    });

    // Publish Domain Event
    await publishEvent('notification_queue', {
      eventType: 'DonationPosted',
      donationId: donation.id,
      donorId: donorProfile.id,
      message: `New donation posted: ${foodType}`
    });

    res.status(201).json(donation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listDonations = async (req: Request, res: Response) => {
  try {
    // Only show active donations that haven't expired
    const donations = await prisma.foodDonation.findMany({
      where: {
        status: 'Posted',
        expiryTime: { gt: new Date() }
      },
      include: {
        donor: true
      }
    });
    res.json(donations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
