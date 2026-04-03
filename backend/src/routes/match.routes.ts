import { Router } from 'express';
import {
  carrierAcceptController,
  carrierRejectController,
  disputeMatchController,
  generateDeliveryOtpController,
  generatePickupOtpController,
  getMatchController,
  rateMatchController,
  requestRapidoController,
  senderConfirmController,
  senderRejectController,
  verifyDeliveryOtpController,
  verifyPickupOtpController
} from '../controllers/match.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { matchRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { disputeSchema, rateMatchSchema, requestRapidoSchema, verifyOtpSchema } from '../validators/match.validators';

const router = Router();

router.use(matchRateLimiter);
router.use(requireAuth);

router.get('/:matchId', asyncHandler(getMatchController));

router.post('/:matchId/carrier-accept', asyncHandler(carrierAcceptController));
router.post('/:matchId/carrier-reject', asyncHandler(carrierRejectController));

router.post('/:matchId/sender-confirm', asyncHandler(senderConfirmController));
router.post('/:matchId/sender-reject', asyncHandler(senderRejectController));

router.post('/:matchId/generate-pickup-otp', asyncHandler(generatePickupOtpController));
router.post('/:matchId/verify-pickup-otp', validate(verifyOtpSchema), asyncHandler(verifyPickupOtpController));

router.post('/:matchId/generate-delivery-otp', asyncHandler(generateDeliveryOtpController));
router.post('/:matchId/verify-delivery-otp', validate(verifyOtpSchema), asyncHandler(verifyDeliveryOtpController));

router.post('/:matchId/rate', validate(rateMatchSchema), asyncHandler(rateMatchController));
router.post('/:matchId/dispute', validate(disputeSchema), asyncHandler(disputeMatchController));

router.post('/:matchId/request-rapido', validate(requestRapidoSchema), asyncHandler(requestRapidoController));

export default router;
