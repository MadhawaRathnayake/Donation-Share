import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { attachDbUser, requireAccount } from '../../middleware/user.middleware';
import { getAdminStats, getAdminUsers, putVerifyUser } from './admin.controller';

const router = Router();

// All admin routes require authentication, a valid account, and the Admin role.
router.use(authenticate, attachDbUser, requireAccount, requireRole('Admin'));

router.get('/users', getAdminUsers);
router.put('/users/:id/verify', putVerifyUser);
router.get('/stats', getAdminStats);

export default router;
