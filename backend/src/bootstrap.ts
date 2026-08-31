import { logger } from './observability/logger';
import { registerOpenTelemetry } from './observability/openTelemetry';
import { createServerRuntime } from './server';

registerOpenTelemetry();

const runtime = createServerRuntime();

runtime.start().catch((error) => {
  logger.fatal({ error: error instanceof Error ? error.message : 'unknown' }, 'server_start_failed');
  process.exit(1);
});

process.on('SIGTERM', () => void runtime.shutdown('SIGTERM'));
process.on('SIGINT', () => void runtime.shutdown('SIGINT'));
