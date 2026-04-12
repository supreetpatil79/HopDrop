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
import { matchReadRateLimiter, matchWriteRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { disputeSchema, rateMatchSchema, requestRapidoSchema, verifyOtpSchema } from '../validators/match.validators';

const router = Router();

router.use(requireAuth);

router.get('/:matchId', matchReadRateLimiter, asyncHandler(getMatchController));

router.post('/:matchId/carrier-accept', matchWriteRateLimiter, asyncHandler(carrierAcceptController));
router.post('/:matchId/carrier-reject', matchWriteRateLimiter, asyncHandler(carrierRejectController));

router.post('/:matchId/sender-confirm', matchWriteRateLimiter, asyncHandler(senderConfirmController));
router.post('/:matchId/sender-reject', matchWriteRateLimiter, asyncHandler(senderRejectController));

router.post('/:matchId/generate-pickup-otp', matchWriteRateLimiter, asyncHandler(generatePickupOtpController));
router.post('/:matchId/verify-pickup-otp', matchWriteRateLimiter, validate(verifyOtpSchema), asyncHandler(verifyPickupOtpController));

router.post('/:matchId/generate-delivery-otp', matchWriteRateLimiter, asyncHandler(generateDeliveryOtpController));
router.post('/:matchId/verify-delivery-otp', matchWriteRateLimiter, validate(verifyOtpSchema), asyncHandler(verifyDeliveryOtpController));

router.post('/:matchId/rate', matchWriteRateLimiter, validate(rateMatchSchema), asyncHandler(rateMatchController));
router.post('/:matchId/dispute', matchWriteRateLimiter, validate(disputeSchema), asyncHandler(disputeMatchController));

router.post('/:matchId/request-rapido', matchWriteRateLimiter, validate(requestRapidoSchema), asyncHandler(requestRapidoController));

export default router;
