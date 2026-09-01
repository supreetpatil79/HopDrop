import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express, type Router } from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { allowedOrigins, env } from './config/env';
import { cacheRedis, matchQueue, otpCleanupQueue, payoutQueue, queueConnection, reminderQueue } from './config/redis';
import { bullBoardBasicAuth } from './middleware/basicAuth';
import { errorHandler } from './middleware/errorHandler';
import { loadShedder } from './middleware/loadShedder';
import { requireHttps, requestContext } from './middleware/requestContext';
import { requestLogger } from './middleware/requestLogger';
import { metricsRegistry, refreshQueueMetrics } from './observability/metrics';
import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';
import tripRoutes from './routes/trip.routes';
import deliveryRoutes from './routes/delivery.routes';
import matchRoutes from './routes/match.routes';
import mapsRoutes from './routes/maps.routes';
import paymentRoutes from './routes/payment.routes';
import pricingRoutes from './routes/pricing.routes';
import userRoutes from './routes/user.routes';
import webhookRoutes from './routes/webhook.routes';
import internalRoutes from './routes/internal.routes';

function isRedisReady(status: string) {
  return ['ready', 'connect'].includes(status);
}

function createBullBoardRouter(): Router | null {
  if (env.NODE_ENV === 'test') {
    return null;
  }

  const { createBullBoard } = require('@bull-board/api');
  const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
  const { ExpressAdapter } = require('@bull-board/express');
  const bullBoardAdapter = new ExpressAdapter();
  const router = express.Router();

  bullBoardAdapter.setBasePath('/admin/queues');
  createBullBoard({
    queues: [
      new BullMQAdapter(matchQueue),
      new BullMQAdapter(otpCleanupQueue),
      new BullMQAdapter(payoutQueue),
      new BullMQAdapter(reminderQueue)
    ],
    serverAdapter: bullBoardAdapter
  });

  router.use('/', bullBoardAdapter.getRouter());
  return router;
}

export function createApp(): Express {
  const app = express();
  const bullBoardRouter = createBullBoardRouter();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(compression());
  app.use(requestContext);
  app.set('hopdrop.inFlight', 0);
  app.use(loadShedder);
  app.use(requireHttps);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.DEMO_MODE || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
          return;
        }
        callback(null, true);
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
  app.use(requestLogger);
  app.use('/api/v1/payments/razorpay/webhook', express.raw({ type: '*/*' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  app.get('/health', (req, res) => {
    res.status(200).json({ success: true, message: 'ok', requestId: req.requestId });
  });

  app.get('/ready', (req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    const cacheReady = isRedisReady(cacheRedis.status);
    const queueReady = isRedisReady(queueConnection.status);
    const ready = mongoReady && cacheReady && queueReady;

    res.status(ready ? 200 : 503).json({
      success: ready,
      status: ready ? 'ready' : 'degraded',
      requestId: req.requestId,
      dependencies: {
        mongo: mongoReady ? 'ready' : 'not_ready',
        redisCache: cacheReady ? 'ready' : 'not_ready',
        redisQueue: queueReady ? 'ready' : 'not_ready'
      }
    });
  });

  app.get('/metrics', async (_req, res, next) => {
    try {
      await refreshQueueMetrics();
      res.set('Content-Type', metricsRegistry.contentType);
      res.end(await metricsRegistry.metrics());
    } catch (error) {
      next(error);
    }
  });

  if (bullBoardRouter) {
    app.use('/admin/queues', bullBoardBasicAuth, bullBoardRouter);
  }

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/jobs', jobRoutes);
  app.use('/api/v1/trips', tripRoutes);
  app.use('/api/v1/deliveries', deliveryRoutes);
  app.use('/api/v1/matches', matchRoutes);
  app.use('/api/v1/maps', mapsRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/pricing', pricingRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);
  app.use('/internal/v1', internalRoutes);

  app.use(errorHandler);
  return app;
}

const app = createApp();
export default app;
