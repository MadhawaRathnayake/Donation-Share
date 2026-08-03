import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { attachDbUser, requireAccount } from '../../middleware/user.middleware';
import { getProfileMe, postProfile, putProfileMe } from './user.controller';

/**
 * Member 3 - Epic 3.1: User Profile API.
 *
 * Mounted at /api/users by src/index.ts:
 *   POST /api/users/profile      create the account and its role profile
 *   GET  /api/users/profile/me   read own profile (404 drives onboarding)
 *   PUT  /api/users/profile/me   update own contact and address details
 */
const router = Router();

router.use(authenticate, attachDbUser);

router.post('/profile', postProfile);
router.get('/profile/me', requireAccount, getProfileMe);
router.put('/profile/me', requireAccount, putProfileMe);

export default router;
