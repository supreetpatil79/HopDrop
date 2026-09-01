import { Router } from 'express';
import {
  deleteMeController,
  getCarrierSetupStatusController,
  meController,
  publicProfileController,
  saveCarrierPayoutController,
  saveCarrierPreferencesController,
  updateMeController,
  verifyCarrierAadhaarController,
  verifyIdController,
  walletController
} from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { userRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { updateMeSchema, verifyIdSchema } from '../validators/user.validators';

const router = Router();

router.use(userRateLimiter);

router.get('/me', requireAuth, asyncHandler(meController));
router.put('/me', requireAuth, validate(updateMeSchema), asyncHandler(updateMeController));
router.delete('/me', requireAuth, asyncHandler(deleteMeController));
router.post('/me/verify-id', requireAuth, validate(verifyIdSchema), asyncHandler(verifyIdController));
router.get('/me/wallet', requireAuth, asyncHandler(walletController));

// ── 🛡️ Carrier Setup & Verification Endpoints ───────────────────────────────
router.get('/carrier/setup-status', requireAuth, asyncHandler(getCarrierSetupStatusController));
router.post('/carrier/verify-aadhaar', requireAuth, asyncHandler(verifyCarrierAadhaarController));
router.post('/carrier/payout-method', requireAuth, asyncHandler(saveCarrierPayoutController));
router.post('/carrier/preferences', requireAuth, asyncHandler(saveCarrierPreferencesController));

router.get('/:userId/public', requireAuth, asyncHandler(publicProfileController));

export default router;
