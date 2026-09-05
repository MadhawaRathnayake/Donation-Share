import { Router } from 'express';
import { getNotifications, markAsRead } from './notification.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { attachDbUser, requireAccount } from '../../middleware/user.middleware';

const router = Router();

router.use(authenticate, attachDbUser, requireAccount);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);

export default router;
