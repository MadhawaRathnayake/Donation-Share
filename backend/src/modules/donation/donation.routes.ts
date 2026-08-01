import { Router } from 'express';
import { createDonation, listDonations } from './donation.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// Only logged in Donors can post
router.post('/', authenticate, requireRole('Donor'), createDonation);

// Any logged in user (e.g. Recipient) can list active donations
router.get('/', authenticate, listDonations);

export default router;
