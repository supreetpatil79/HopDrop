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

router.post('/create-order', requireAuth, paymentRateLimiter, asyncHandler(createOrderController));
router.post('/verify-payment', requireAuth, paymentRateLimiter, asyncHandler(verifyPaymentController));
router.post('/razorpay/webhook', webhookRateLimiter, asyncHandler(razorpayWebhookController));
router.get('/transactions', requireAuth, paymentRateLimiter, asyncHandler(transactionsController));

export default router;
