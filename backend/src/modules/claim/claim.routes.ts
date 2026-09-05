import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { attachDbUser, requireAccount } from '../../middleware/user.middleware';
import { getMyClaims, postClaim } from './claim.controller';

const router = Router();

router.use(authenticate, attachDbUser, requireAccount, requireRole('Recipient'));

router.get('/me', getMyClaims);
router.post('/', postClaim);

export default router;
