import { Router } from 'express';
import {
  createOrderController,
  razorpayWebhookController,
  transactionsController,
  verifyPaymentController
} from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { paymentRateLimiter, webhookRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/create-order', paymentRateLimiter, asyncHandler(createOrderController));
router.post('/verify-payment', paymentRateLimiter, asyncHandler(verifyPaymentController));
router.post('/razorpay/webhook', webhookRateLimiter, asyncHandler(razorpayWebhookController));
router.get('/transactions', paymentRateLimiter, requireAuth, asyncHandler(transactionsController));

export default router;
