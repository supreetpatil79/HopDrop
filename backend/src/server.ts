import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { redis } from './config/redis';
import { shutdownOpenTelemetry } from './observability/openTelemetry';
import { initServerTelemetry } from './observability/sentry';
import { startOutboxRelay, stopOutboxRelay } from './services/outboxRelay.service';
import './queues/otpCleanup';
import './queues/payoutQueue';
import './queues/reminderQueue';

async function bootstrap(): Promise<void> {
  initServerTelemetry();
  await connectDB();
  await redis.ping();
  await startOutboxRelay();

  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`HopDrop backend listening on ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  void stopOutboxRelay();
  void shutdownOpenTelemetry();
});

process.on('SIGINT', () => {
  void stopOutboxRelay();
  void shutdownOpenTelemetry();
});
