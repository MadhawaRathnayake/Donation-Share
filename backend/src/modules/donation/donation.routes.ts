import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { attachDbUser, requireAccount } from '../../middleware/user.middleware';
import { acceptDonationImage } from '../../lib/upload';
import {
  getDonations,
  getMyDonations,
  postDonation,
  putCancelDonation,
} from './donation.controller';

/**
 * Member 3 - Epic 3.2: Donation module.
 *
 * Mounted at /api/donations by src/index.ts:
 *   POST /api/donations             donor posts surplus food (multipart, optional photo)
 *   GET  /api/donations/me          donor's own history
 *   PUT  /api/donations/:id/cancel  donor cancels an unclaimed donation
 *   GET  /api/donations             public feed of available donations
 *
 * Middleware order matters: `attachDbUser` runs before `requireRole` because the
 * role check also accepts the role stored on the FoodShare account, not only the
 * roles present in the Keycloak token.
 */
const router = Router();

router.use(authenticate, attachDbUser);

router.post('/', requireRole('Donor'), requireAccount, acceptDonationImage, postDonation);
router.get('/me', requireRole('Donor'), requireAccount, getMyDonations);
router.put('/:id/cancel', requireRole('Donor'), requireAccount, putCancelDonation);

// Any authenticated user may browse. Member 4 adds filtering and search here.
router.get('/', getDonations);

export default router;
