import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import authRoutes from './routes/auth.routes';
import tripRoutes from './routes/trip.routes';
import deliveryRoutes from './routes/delivery.routes';
import matchRoutes from './routes/match.routes';
import paymentRoutes from './routes/payment.routes';
import userRoutes from './routes/user.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(helmet());
app.use(compression());
app.use(requestLogger);
app.use('/api/v1/payments/razorpay/webhook', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'ok' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/deliveries', deliveryRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

app.use(errorHandler);

export default app;
