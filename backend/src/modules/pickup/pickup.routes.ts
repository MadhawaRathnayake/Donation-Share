import { Router } from 'express';
import { acceptPickup, updatePickupStatus, getAvailablePickups, getActivePickup } from './pickup.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { attachDbUser, requireAccount } from '../../middleware/user.middleware';

const router = Router();

router.use(authenticate, attachDbUser, requireRole('Volunteer'), requireAccount);

router.get('/available', getAvailablePickups);
router.get('/active', getActivePickup);
router.post('/accept', acceptPickup);
router.put('/:id/status', updatePickupStatus);

export default router;
