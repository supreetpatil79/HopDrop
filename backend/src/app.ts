import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { allowedOrigins, env } from './config/env';
import { redis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { requireHttps, requestContext } from './middleware/requestContext';
import { requestLogger } from './middleware/requestLogger';
import { metricsRegistry } from './observability/metrics';
import authRoutes from './routes/auth.routes';
import tripRoutes from './routes/trip.routes';
import deliveryRoutes from './routes/delivery.routes';
import matchRoutes from './routes/match.routes';
import mapsRoutes from './routes/maps.routes';
import paymentRoutes from './routes/payment.routes';
import userRoutes from './routes/user.routes';
import webhookRoutes from './routes/webhook.routes';
import internalRoutes from './routes/internal.routes';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(requestContext);
app.use(requireHttps);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin not allowed'));
    },
    credentials: true
  })
);
app.use(
  helmet({
    hsts: env.REQUIRE_HTTPS
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      : false
  })
);
app.use(compression());
app.use(requestLogger);
app.use('/api/v1/payments/razorpay/webhook', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'ok', requestId: req.requestId });
});

app.get('/ready', (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redisReady = ['ready', 'connect'].includes(redis.status);
  const ready = mongoReady && redisReady;

  res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? 'ready' : 'degraded',
    requestId: req.requestId,
    dependencies: {
      mongo: mongoReady ? 'ready' : 'not_ready',
      redis: redisReady ? 'ready' : 'not_ready'
    }
  });
});

app.get('/metrics', async (_req, res, next) => {
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch (error) {
    next(error);
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/deliveries', deliveryRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/maps', mapsRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/internal/v1', internalRoutes);

app.use(errorHandler);

export default app;
