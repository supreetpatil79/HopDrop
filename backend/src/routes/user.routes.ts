import { Router } from 'express';
import {
  meController,
  publicProfileController,
  updateMeController,
  verifyIdController,
  walletController
} from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { updateMeSchema, verifyIdSchema } from '../validators/user.validators';

const router = Router();

router.get('/me', requireAuth, asyncHandler(meController));
router.put('/me', requireAuth, validate(updateMeSchema), asyncHandler(updateMeController));
router.post('/me/verify-id', requireAuth, validate(verifyIdSchema), asyncHandler(verifyIdController));
router.get('/me/wallet', requireAuth, asyncHandler(walletController));
router.get('/:userId/public', requireAuth, asyncHandler(publicProfileController));

export default router;
