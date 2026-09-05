import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { parsePageRequest } from '../../lib/pagination';
import { removeUploadedFile } from '../../lib/upload';
import {
  cancelDonation,
  createDonation,
  listAvailableDonations,
  listMyDonations,
} from './donation.service';
import { createDonationSchema } from './donation.schema';

/**
 * Donation HTTP layer. Validation lives in donation.schema.ts, business rules in
 * donation.service.ts, and error formatting in lib/errors.ts, so these handlers
 * only translate between HTTP and the service.
 */

export const postDonation = async (req: Request, res: Response) => {
  const uploaded = req.file?.filename;

  try {
    const input = createDonationSchema.parse(req.body);
    const donation = await createDonation(req.dbUser!.id, input, uploaded);
    res.status(201).json(donation);
  } catch (error) {
    // Multer has already written the file to disk by the time validation runs,
    // so a rejected request must not leave an orphaned image behind.
    removeUploadedFile(uploaded);
    throw error;
  }
};

/** Task 3.2.2 - GET /api/donations/me */
export const getMyDonations = async (req: Request, res: Response) => {
  res.json(await listMyDonations(req.dbUser!.id, parsePageRequest(req.query)));
};

/** Task 3.2.2 - PUT /api/donations/:id/cancel */
export const putCancelDonation = async (req: Request, res: Response) => {
  res.json(await cancelDonation(req.dbUser!.id, String(req.params.id)));
};

/** Public feed. Member 4 extends this with filters (Task 4.1.1). */
export const getDonations = async (req: Request, res: Response) => {
  const type = typeof req.query.type === 'string' ? req.query.type : undefined;
  const maxDistance = req.query.maxDistance ? Number(req.query.maxDistance) : undefined;
  const expiringSoon = req.query.expiringSoon === 'true';

  let recipientCoords: { lat: number; lon: number } | undefined;
  
  if (maxDistance && req.dbUser?.id) {
    const profile = await prisma.recipientProfile.findUnique({
      where: { userId: req.dbUser.id },
      select: { latitude: true, longitude: true },
    });
    if (profile?.latitude && profile?.longitude) {
      recipientCoords = { lat: profile.latitude, lon: profile.longitude };
    }
  }

  res.json(await listAvailableDonations(
    parsePageRequest(req.query),
    type,
    maxDistance,
    recipientCoords,
    expiringSoon
  ));
};
