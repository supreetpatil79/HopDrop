import { Router } from 'express';
import {
  loginController,
  logoutController,
  refreshController,
  registerController,
  sendOtpController,
  verifyOtpController
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { loginSchema, refreshSchema, registerSchema, sendOtpSchema, verifyOtpSchema } from '../validators/auth.validators';

const router = Router();

router.use(authRateLimiter);

router.post('/send-otp', validate(sendOtpSchema), asyncHandler(sendOtpController));
router.post('/verify-otp', validate(verifyOtpSchema), asyncHandler(verifyOtpController));
router.post('/register', validate(registerSchema), asyncHandler(registerController));
router.post('/login', validate(loginSchema), asyncHandler(loginController));
router.post('/refresh', validate(refreshSchema), asyncHandler(refreshController));
router.post('/logout', requireAuth, asyncHandler(logoutController));

export default router;
