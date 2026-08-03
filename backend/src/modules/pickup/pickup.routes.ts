import { Router } from 'express';
import { acceptPickup, updatePickupStatus, getAvailablePickups, getActivePickup } from './pickup.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/available', getAvailablePickups);
router.get('/active', getActivePickup);
router.post('/accept', acceptPickup);
router.put('/:id/status', updatePickupStatus);

export default router;
