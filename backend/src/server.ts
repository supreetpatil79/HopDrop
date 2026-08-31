import http from 'http';
import type { Worker } from 'bullmq';
import type { Express } from 'express';
import mongoose from 'mongoose';
import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { cacheRedis, matchQueue, otpCleanupQueue, payoutQueue, queueConnection, reminderQueue } from './config/redis';
import { logger } from './observability/logger';
import { shutdownOpenTelemetry } from './observability/openTelemetry';
import { initServerTelemetry } from './observability/sentry';
import { createMatchWorker } from './queues/matchQueue';
import { createOtpCleanupWorker, scheduleOtpCleanupAudit } from './queues/otpCleanup';
import { createPayoutWorker } from './queues/payoutQueue';
import { createReminderWorker } from './queues/reminderQueue';
import { startOutboxRelay, stopOutboxRelay } from './services/outboxRelay.service';

export type ShutdownStep = {
  name: string;
  run: () => Promise<unknown>;
};

export type ServerRuntime = {
  start: () => Promise<void>;
  shutdown: (signal: NodeJS.Signals) => Promise<void>;
};

export type RuntimeWorkers = {
  matchWorker: Worker;
  otpCleanupWorker: Worker;
  payoutWorker: Worker;
  reminderWorker: Worker;
};

export type ServerRuntimeOptions = {
  app?: Express;
  port?: number;
  initTelemetry?: () => void;
  connectDatabase?: () => Promise<unknown>;
  pingCacheRedis?: () => Promise<unknown>;
  pingQueueRedis?: () => Promise<unknown>;
  startOutboxRelay?: () => Promise<unknown>;
  scheduleOtpCleanupAudit?: () => Promise<unknown>;
  createWorkers?: () => RuntimeWorkers;
  createHttpServer?: (app: Express) => http.Server;
  createShutdownSteps?: (server: http.Server | null, workers: Partial<RuntimeWorkers>) => ShutdownStep[];
  exitProcess?: (code: number) => void;
};

export async function closeHttpServer(server: http.Server | null) {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function createShutdownSteps(server: http.Server | null, workers: Partial<RuntimeWorkers> = {}): ShutdownStep[] {
  const steps: ShutdownStep[] = [
    { name: 'http_server', run: () => closeHttpServer(server) },
    { name: 'outbox_relay', run: () => stopOutboxRelay() }
  ];

  if (workers.matchWorker) {
    steps.push({ name: 'match_worker', run: () => workers.matchWorker!.close() });
  }

  if (workers.otpCleanupWorker) {
    steps.push({ name: 'otp_cleanup_worker', run: () => workers.otpCleanupWorker!.close() });
  }

  if (workers.payoutWorker) {
    steps.push({ name: 'payout_worker', run: () => workers.payoutWorker!.close() });
  }

  if (workers.reminderWorker) {
    steps.push({ name: 'reminder_worker', run: () => workers.reminderWorker!.close() });
  }

  steps.push(
    { name: 'match_queue', run: () => matchQueue.close() },
    { name: 'otp_cleanup_queue', run: () => otpCleanupQueue.close() },
    { name: 'payout_queue', run: () => payoutQueue.close() },
    { name: 'reminder_queue', run: () => reminderQueue.close() },
    { name: 'cache_redis', run: () => cacheRedis.quit() },
    { name: 'queue_redis', run: () => queueConnection.quit() },
    { name: 'mongo', run: () => mongoose.disconnect() },
    { name: 'opentelemetry', run: () => shutdownOpenTelemetry() }
  );

  return steps;
}

export function createHttpServer(app: Express) {
  const server = http.createServer(app);
  server.requestTimeout = env.REQUEST_TIMEOUT_MS;
  server.headersTimeout = Math.max(env.HEADERS_TIMEOUT_MS, env.KEEP_ALIVE_TIMEOUT_MS + 1000);
  server.keepAliveTimeout = env.KEEP_ALIVE_TIMEOUT_MS;
  server.maxConnections = env.MAX_CONNECTIONS;
  return server;
}

export function createServerRuntime(options: ServerRuntimeOptions = {}): ServerRuntime {
  const app = options.app ?? createApp();
  const port = options.port ?? env.PORT;
  const initTelemetry = options.initTelemetry ?? initServerTelemetry;
  const connectDatabase = options.connectDatabase ?? connectDB;
  const pingCacheRedis = options.pingCacheRedis ?? (() => cacheRedis.ping());
  const pingQueueRedis = options.pingQueueRedis ?? (() => queueConnection.ping());
  const startOutbox = options.startOutboxRelay ?? startOutboxRelay;
  const scheduleOtpCleanup = options.scheduleOtpCleanupAudit ?? scheduleOtpCleanupAudit;
  const createWorkers =
    options.createWorkers ??
    (() => ({
      matchWorker: createMatchWorker(),
      otpCleanupWorker: createOtpCleanupWorker(),
      payoutWorker: createPayoutWorker(),
      reminderWorker: createReminderWorker()
    }));
  const buildHttpServer = options.createHttpServer ?? createHttpServer;
  const buildShutdownSteps = options.createShutdownSteps ?? createShutdownSteps;
  const exitProcess =
    options.exitProcess ??
    ((code: number) => {
      process.exit(code);
    });
  let server: http.Server | null = null;
  let workers: Partial<RuntimeWorkers> = {};
  let shuttingDown = false;

  return {
    async start(): Promise<void> {
      initTelemetry();
      await connectDatabase();
      await Promise.all([pingCacheRedis(), pingQueueRedis()]);
      await startOutbox();
      workers = createWorkers();
      await scheduleOtpCleanup();

      server = buildHttpServer(app);
      await new Promise<void>((resolve, reject) => {
        const handleListenError = (error: Error) => {
          server?.off('listening', handleListening);
          reject(error);
        };
        const handleListening = () => {
          server?.off('error', handleListenError);
          logger.info({ port }, 'server_started');
          resolve();
        };

        server!.once('error', handleListenError);
        server!.once('listening', handleListening);
        server!.listen(port);
      });
    },

    async shutdown(signal: NodeJS.Signals) {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      logger.info({ signal }, 'shutdown_started');

      const forcedExitTimer = setTimeout(() => {
        logger.error({ signal }, 'shutdown_forced_exit');
        exitProcess(1);
      }, 10_000);
      forcedExitTimer.unref();

      const steps = buildShutdownSteps(server, workers);
      const results = await Promise.allSettled(steps.map((step) => step.run()));
      const failures = results.flatMap((result, index) =>
        result.status === 'rejected'
          ? [
              {
                resource: steps[index].name,
                error: result.reason instanceof Error ? result.reason.message : String(result.reason)
              }
            ]
          : []
      );

      if (failures.length) {
        logger.error({ signal, failures }, 'shutdown_completed_with_errors');
        exitProcess(1);
        return;
      }

      clearTimeout(forcedExitTimer);
      logger.info({ signal }, 'shutdown_completed');
      exitProcess(0);
    }
  };
}
