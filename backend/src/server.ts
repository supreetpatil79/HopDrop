import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { redis } from './config/redis';
import { initSocket } from './config/socket';
import './queues/matchQueue';
import './queues/otpCleanup';
import './queues/payoutQueue';
import './queues/reminderQueue';

async function bootstrap(): Promise<void> {
  await connectDB();
  await redis.ping();

  const server = http.createServer(app);
  initSocket(server);

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
