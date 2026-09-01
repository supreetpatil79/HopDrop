import { createApp } from './app';
import { closeHttpServer, createServerRuntime } from './server';

describe('Server runtime factories', () => {
  it('starts and shuts down through injected runtime dependencies', async () => {
    const initTelemetry = jest.fn();
    const connectDatabase = jest.fn().mockResolvedValue(undefined);
    const pingCacheRedis = jest.fn().mockResolvedValue('PONG');
    const pingQueueRedis = jest.fn().mockResolvedValue('PONG');
    const startOutboxRelay = jest.fn().mockResolvedValue(undefined);
    const scheduleOtpCleanupAudit = jest.fn().mockResolvedValue(undefined);
    const exitProcess = jest.fn();
    const closeWorker = jest.fn().mockResolvedValue(undefined);

    const runtime = createServerRuntime({
      app: createApp(),
      port: 0,
      initTelemetry,
      connectDatabase,
      pingCacheRedis,
      pingQueueRedis,
      startOutboxRelay,
      scheduleOtpCleanupAudit,
      createWorkers: () => ({
        matchWorker: { close: closeWorker } as any,
        otpCleanupWorker: { close: closeWorker } as any,
        payoutWorker: { close: closeWorker } as any,
        reminderWorker: { close: closeWorker } as any,
        slaRematchWorker: { close: closeWorker } as any,
        paymentReconcilerWorker: { close: closeWorker } as any
      }),
      createShutdownSteps: (server, workers) => [
        {
          name: 'http_server',
          run: () => closeHttpServer(server)
        },
        {
          name: 'match_worker',
          run: () => workers.matchWorker!.close()
        }
      ],
      exitProcess
    });

    await runtime.start();
    await runtime.shutdown('SIGTERM');

    expect(initTelemetry).toHaveBeenCalledTimes(1);
    expect(connectDatabase).toHaveBeenCalledTimes(1);
    expect(pingCacheRedis).toHaveBeenCalledTimes(1);
    expect(pingQueueRedis).toHaveBeenCalledTimes(1);
    expect(startOutboxRelay).toHaveBeenCalledTimes(1);
    expect(scheduleOtpCleanupAudit).toHaveBeenCalledTimes(1);
    expect(closeWorker).toHaveBeenCalledTimes(1);
    expect(exitProcess).toHaveBeenCalledWith(0);
  });
});
