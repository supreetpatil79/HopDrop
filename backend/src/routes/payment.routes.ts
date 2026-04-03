import { Router } from 'express';
import { razorpayWebhookController, transactionsController } from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/razorpay/webhook', asyncHandler(razorpayWebhookController));
router.get('/transactions', requireAuth, asyncHandler(transactionsController));

export default router;
